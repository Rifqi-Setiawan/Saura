"""Protected regression contract authored before remediation; implementer must not edit."""

import pytest
from app.api.deps import get_current_user, get_db
from app.db.session import Base
from app.main import app
from app.models.entities import AppUser, Site, Ticket
from app.sim.seed import seed_demo_data
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def isolated_api():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    with sessions() as db:
        seed_demo_data(db, reset=True, demo_date_str="2026-10-26")

    def database():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_db] = database
    try:
        with TestClient(app) as client:
            yield client, sessions
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


@pytest.mark.parametrize(
    "action,role,payload",
    [
        ("approve", "manager", {}),
        ("postpone", "manager", {"note": "Unauthorized change"}),
        ("cost", "manager", {"estimated_cost_idr": 250000}),
        ("done", "technician", {"note": "Unauthorized completion"}),
    ],
)
def test_unrelated_principal_cannot_mutate_ticket(isolated_api, action, role, payload):
    client, sessions = isolated_api
    with sessions() as db:
        ticket = db.query(Ticket).filter_by(code="SA-024").one()
        ticket_id = ticket.id
        original_status, original_cost = ticket.status, ticket.estimated_cost_idr
        outsider = AppUser(
            name="Unrelated principal",
            email=f"outsider-{role}@example.invalid",
            password_hash="not-a-login",
            role=role,
        )
        db.add(outsider)
        db.commit()
        db.refresh(outsider)
        db.expunge(outsider)
    app.dependency_overrides[get_current_user] = lambda: outsider
    response = client.post(f"/api/v1/tickets/{ticket_id}/{action}", json=payload)
    assert response.status_code in (403, 404)
    with sessions() as db:
        ticket = db.get(Ticket, ticket_id)
        assert (ticket.status, ticket.estimated_cost_idr) == (original_status, original_cost)


def test_changed_approved_cost_requires_fresh_approval(isolated_api):
    client, sessions = isolated_api
    with sessions() as db:
        ticket = db.query(Ticket).filter_by(code="SA-024").one()
        ticket_id = ticket.id
        site = db.get(Site, ticket.site_id)
        manager = db.get(AppUser, site.manager_id)
        db.expunge(manager)
    app.dependency_overrides[get_current_user] = lambda: manager
    approved = client.post(f"/api/v1/tickets/{ticket_id}/approve")
    assert approved.status_code == 200
    response = client.post(
        f"/api/v1/tickets/{ticket_id}/cost",
        json={"estimated_cost_idr": 275000, "note": "Changed approved quote"},
    )
    assert response.status_code == 200
    with sessions() as db:
        ticket = db.get(Ticket, ticket_id)
        assert ticket.status == "AWAITING_APPROVAL"
        assert ticket.approved_by is None
        assert ticket.approved_at is None
    reapproved = client.post(f"/api/v1/tickets/{ticket_id}/approve")
    assert reapproved.status_code == 200
