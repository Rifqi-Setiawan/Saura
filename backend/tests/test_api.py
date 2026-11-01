import pytest
from app.api.deps import get_db
from app.db.session import Base
from app.main import app
from app.sim.seed import seed_demo_data
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    init_db = Session()
    try:
        seed_demo_data(init_db, reset=True, demo_date_str="2026-10-26")
    finally:
        init_db.close()

    def override_get_db():
        s = Session()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_healthcheck(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_auth_login_and_me(client):
    # Valid login
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "rina@saura.id", "password": "password123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "manager"
    token = data["access_token"]

    # Get /me
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "rina@saura.id"

    # Invalid login
    bad_res = client.post(
        "/api/v1/auth/login",
        json={"email": "rina@saura.id", "password": "wrongpassword"},
    )
    assert bad_res.status_code == 401


def test_sites_and_details(client):
    # Login as manager
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "rina@saura.id", "password": "password123"},
    )
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List sites
    sites_res = client.get("/api/v1/sites", headers=headers)
    assert sites_res.status_code == 200
    sites = sites_res.json()
    assert len(sites) >= 4

    # Site detail for MA Nurul Huda
    huda = next(s for s in sites if s["name"] == "MA Nurul Huda")
    detail_res = client.get(f"/api/v1/sites/{huda['id']}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["name"] == "MA Nurul Huda"
    assert detail["today_assessment"]["status"] == "ACTION"
    assert detail["today_assessment"]["actual_kwh"] == 20.0
    assert len(detail["last_7_days"]) > 0


def test_ticket_approval_and_workflow(client):
    # Manager token
    m_res = client.post(
        "/api/v1/auth/login",
        json={"email": "rina@saura.id", "password": "password123"},
    )
    m_token = m_res.json()["access_token"]
    m_headers = {"Authorization": f"Bearer {m_token}"}

    # Tech token
    t_res = client.post(
        "/api/v1/auth/login",
        json={"email": "ahmad@saura.id", "password": "password123"},
    )
    t_token = t_res.json()["access_token"]
    t_headers = {"Authorization": f"Bearer {t_token}"}

    # Get tickets
    tickets_res = client.get("/api/v1/tickets", headers=m_headers)
    assert tickets_res.status_code == 200
    tickets = tickets_res.json()
    assert len(tickets) > 0

    sa024 = next(t for t in tickets if t["code"] == "SA-024")
    assert sa024["status"] == "AWAITING_APPROVAL"

    # Manager approves
    appr_res = client.post(
        f"/api/v1/tickets/{sa024['id']}/approve",
        headers=m_headers,
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["ticket_status"] == "SCHEDULED"

    # Technician marks done
    done_res = client.post(
        f"/api/v1/tickets/{sa024['id']}/done",
        json={"note": "Pemeriksaan selesai, inverter beroperasi normal"},
        headers=t_headers,
    )
    assert done_res.status_code == 200
    assert done_res.json()["ticket_status"] == "DONE_BY_TECH"

    # Update cost
    cost_res = client.post(
        f"/api/v1/tickets/{sa024['id']}/cost",
        json={"estimated_cost_idr": 175000, "note": "Penggantian konektor MC4"},
        headers=m_headers,
    )
    assert cost_res.status_code == 200
    assert cost_res.json()["estimated_cost_idr"] == 175000


def test_reports_pdf_and_csv(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "rina@saura.id", "password": "password123"},
    )
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    sites = client.get("/api/v1/sites", headers=headers).json()
    huda = next(s for s in sites if s["name"] == "MA Nurul Huda")

    # JSON weekly summary
    rep_res = client.get(f"/api/v1/reports/weekly/{huda['id']}", headers=headers)
    assert rep_res.status_code == 200
    data = rep_res.json()
    assert "totals" in data
    assert "days" in data

    # PDF download
    pdf_res = client.get(f"/api/v1/reports/weekly/{huda['id']}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-")

    # CSV download
    csv_res = client.get(f"/api/v1/reports/weekly/{huda['id']}/csv", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Tanggal" in csv_res.text
    assert "MA Nurul Huda" in csv_res.text


def test_simulation_advance_via_api(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "rina@saura.id", "password": "password123"},
    )
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Check initial sim status
    st_res = client.get("/api/v1/sim/status", headers=headers)
    assert st_res.status_code == 200
    assert st_res.json()["current_date"] == "2026-10-26"

    # Advance to 2026-10-30
    adv_res = client.post(
        "/api/v1/sim/advance",
        json={"to_date": "2026-10-30"},
        headers=headers,
    )
    assert adv_res.status_code == 200
    assert adv_res.json()["current_date"] == "2026-10-30"

    # Verify weekly report on 2026-10-30 matches exact 180 / 224 / 44 / 66000
    sites = client.get("/api/v1/sites", headers=headers).json()
    huda = next(s for s in sites if s["name"] == "MA Nurul Huda")

    rep = client.get(
        f"/api/v1/reports/weekly/{huda['id']}?end_date=2026-10-30",
        headers=headers,
    ).json()

    totals = rep["totals"]
    assert round(totals["actual_kwh"], 1) == 180.0
    assert round(totals["expected_kwh"], 1) == 224.0
    assert round(totals["gap_kwh"], 1) == 44.0
    assert totals["loss_idr"] == 66000
