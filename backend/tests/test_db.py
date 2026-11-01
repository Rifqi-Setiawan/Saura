import datetime

import pytest
from app.db.session import Base
from app.models import (
    AgentLog,
    AppUser,
    CheckSession,
    Config,
    Conversation,
    DailyAssessment,
    DailyReport,
    Notification,
    Operator,
    Photo,
    Site,
    Ticket,
    TicketEvent,
    TicketPhoto,
    WeatherDaily,
    WeeklyReport,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def db_session():
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(test_engine)
    Session = sessionmaker(bind=test_engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


def test_crud_all_tables(db_session):
    # 1. AppUser
    user = AppUser(
        name="Bu Rina",
        email="rina@example.com",
        password_hash="fakehash",
        role="manager",
    )
    db_session.add(user)
    db_session.flush()
    assert user.id is not None

    # 2. Operator
    operator = Operator(
        telegram_user_id=12345678,
        telegram_chat_id=12345678,
        name="Pak Budi",
        honorific="Pak",
    )
    db_session.add(operator)
    db_session.flush()
    assert operator.id is not None

    # 3. Site
    site = Site(
        name="MA Nurul Huda",
        city="Bandung",
        province="Jawa Barat",
        lat=-6.9147,
        lon=107.6098,
        kwp=10.0,
        system_type="on_grid",
        manager_id=user.id,
        operator_id=operator.id,
    )
    db_session.add(site)
    db_session.flush()
    assert site.id is not None

    # 4. Photo
    photo = Photo(
        site_id=site.id,
        kind="inverter",
        storage_path="photo_01.jpg",
    )
    db_session.add(photo)
    db_session.flush()
    assert photo.id is not None

    # 5. DailyReport
    report = DailyReport(
        site_id=site.id,
        date=datetime.date(2026, 10, 26),
        kwh=20.0,
        source="ocr",
        photo_id=photo.id,
        ocr_confidence=0.95,
    )
    db_session.add(report)
    db_session.flush()
    assert report.id is not None

    # 6. WeatherDaily
    weather = WeatherDaily(
        site_id=site.id,
        date=datetime.date(2026, 10, 26),
        irradiance_kwh_m2=4.05,
        source="open_meteo",
    )
    db_session.add(weather)
    db_session.flush()

    # 7. DailyAssessment
    assessment = DailyAssessment(
        site_id=site.id,
        date=datetime.date(2026, 10, 26),
        report_id=report.id,
        expected_kwh=32.0,
        actual_kwh=20.0,
        gap_kwh=12.0,
        performance=0.625,
        loss_idr=18000,
        status="ACTION",
        reason_code="below_action_ratio",
        weather_source="open_meteo",
    )
    db_session.add(assessment)
    db_session.flush()
    assert assessment.id is not None

    # 8. Conversation
    conv = Conversation(
        operator_id=operator.id,
        state="IDLE",
        context={"step": 1},
    )
    db_session.add(conv)
    db_session.flush()

    # 9. CheckSession
    check = CheckSession(
        site_id=site.id,
        assessment_id=assessment.id,
        answers={"pln_outage": False},
        cause="unknown",
        confidence="rendah",
    )
    db_session.add(check)
    db_session.flush()
    assert check.id is not None

    # 10. Ticket
    ticket = Ticket(
        code="SA-024",
        site_id=site.id,
        status="AWAITING_APPROVAL",
        priority="normal",
        reason="Dugaan perlu pemeriksaan",
        estimated_cost_idr=150000,
    )
    db_session.add(ticket)
    db_session.flush()
    assert ticket.id is not None

    # 11. TicketEvent
    event = TicketEvent(
        ticket_id=ticket.id,
        type="created",
        note="Dibuat oleh SauraAI",
    )
    db_session.add(event)
    db_session.flush()
    assert event.id is not None

    # 12. TicketPhoto
    tp = TicketPhoto(ticket_id=ticket.id, photo_id=photo.id)
    db_session.add(tp)
    db_session.flush()

    # 13. Notification
    notif = Notification(
        user_id=user.id,
        site_id=site.id,
        ticket_id=ticket.id,
        text="Tiket SA-024 menunggu persetujuan",
    )
    db_session.add(notif)
    db_session.flush()
    assert notif.id is not None

    # 14. AgentLog
    log = AgentLog(
        operator_id=operator.id,
        site_id=site.id,
        event="assessment_ready",
        context_summary={"status": "ACTION"},
        tool_calls=[],
        final_message="Perlu diperiksa",
    )
    db_session.add(log)
    db_session.flush()
    assert log.id is not None

    # 15. WeeklyReport
    weekly = WeeklyReport(
        site_id=site.id,
        week_start=datetime.date(2026, 10, 24),
        totals={"actual_kwh": 180, "expected_kwh": 224},
    )
    db_session.add(weekly)
    db_session.flush()
    assert weekly.id is not None

    # 16. Config
    cfg = Config(key="action_ratio", value={"val": 0.75})
    db_session.add(cfg)
    db_session.commit()

    # Verification: query each
    assert db_session.query(AppUser).filter_by(email="rina@example.com").first() is not None
    assert db_session.query(Site).filter_by(name="MA Nurul Huda").first() is not None
    assert db_session.query(Ticket).filter_by(code="SA-024").first() is not None
    assert db_session.query(Config).filter_by(key="action_ratio").first().value["val"] == 0.75
