import datetime

import pytest
from app.db.session import Base
from app.engine.money import calculate_weekly_totals
from app.models import DailyReport, Site, Ticket
from app.sim.advance import advance_simulation
from app.sim.generator import generate_synthetic_series
from app.sim.seed import seed_demo_data
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


def test_seed_demo_data(test_db):
    res = seed_demo_data(test_db, reset=True, demo_date_str="2026-10-26")
    assert res["status"] == "success"

    # Verify 4 sites
    sites = test_db.query(Site).all()
    assert len(sites) == 4
    names = {s.name for s in sites}
    assert "Balai Desa Cibiru" in names
    assert "MA Nurul Huda" in names
    assert "SDN Sukamaju" in names
    assert "SMP Cendekia" in names

    # Verify Ticket SA-024
    ticket_24 = test_db.query(Ticket).filter_by(code="SA-024").first()
    assert ticket_24 is not None
    assert ticket_24.status == "AWAITING_APPROVAL"
    assert ticket_24.estimated_cost_idr == 150000

    # Verify Ticket SA-023
    ticket_23 = test_db.query(Ticket).filter_by(code="SA-023").first()
    assert ticket_23 is not None
    assert ticket_23.status == "AWAITING_APPROVAL"
    assert ticket_23.priority == "critical"


def test_advance_to_recovery(test_db):
    # Seed initially at 2026-10-26
    seed_demo_data(test_db, reset=True, demo_date_str="2026-10-26")

    # Advance to 2026-10-30
    res = advance_simulation(test_db, target_date_str="2026-10-30")
    assert res["status"] == "success"
    assert res["current_date"] == "2026-10-30"

    # Verify Ticket SA-024 is RESOLVED
    ticket_24 = test_db.query(Ticket).filter_by(code="SA-024").first()
    assert ticket_24.status == "RESOLVED"

    # Verify MA Nurul Huda weekly series from 24 to 30 Oct
    huda = test_db.query(Site).filter_by(name="MA Nurul Huda").first()
    reports = (
        test_db.query(DailyReport)
        .filter(
            DailyReport.site_id == huda.id,
            DailyReport.date >= datetime.date(2026, 10, 24),
            DailyReport.date <= datetime.date(2026, 10, 30),
        )
        .order_by(DailyReport.date)
        .all()
    )
    actuals = [r.kwh for r in reports]
    expecteds = [32.0] * 7
    assert actuals == [23.0, 21.0, 20.0, 26.0, 29.0, 30.0, 31.0]

    weekly = calculate_weekly_totals(actuals, expecteds, 1500)
    assert weekly["actual_kwh"] == 180.0
    assert weekly["expected_kwh"] == 224.0
    assert weekly["gap_kwh"] == 44.0
    assert weekly["loss_idr"] == 66000


def test_generator_scenarios():
    normal_series = generate_synthetic_series(days=30, anomaly_scenario="normal")
    assert len(normal_series) == 30
    assert all(s["anomaly_label"] == "normal" for s in normal_series)

    soiling_series = generate_synthetic_series(days=40, anomaly_scenario="soiling")
    assert any(s["anomaly_label"] == "soiling" for s in soiling_series)

    trip_series = generate_synthetic_series(days=30, anomaly_scenario="inverter_trip")
    assert any(s["actual_kwh"] == 0.0 for s in trip_series)
