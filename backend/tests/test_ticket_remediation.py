"""Supplementary ticket scope and lifecycle coverage; protected tests stay untouched."""

import datetime

import pytest
from app.api.deps import get_current_user, get_db
from app.db.session import Base
from app.main import app
from app.models import AppUser, Ticket, TicketEvent
from app.sim.advance import advance_simulation
from app.sim.seed import seed_demo_data
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def ticket_api():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    with sessions() as db:
        seed_demo_data(db, reset=True, demo_date_str="2026-10-26")
        ticket = db.query(Ticket).filter_by(code="SA-024").one()
        ticket_id = ticket.id

    def database():
        with sessions() as db:
            yield db

    def authenticate(role):
        with sessions() as db:
            user = db.query(AppUser).filter_by(role=role).first()
            db.expunge(user)
        app.dependency_overrides[get_current_user] = lambda: user
        return user.id

    app.dependency_overrides[get_db] = database
    try:
        with TestClient(app) as client:
            yield client, sessions, ticket_id, authenticate
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def test_unchanged_cost_preserves_approval_and_audit(ticket_api):
    client, sessions, ticket_id, authenticate = ticket_api
    authenticate("manager")
    assert client.post(f"/api/v1/tickets/{ticket_id}/approve").status_code == 200
    with sessions() as db:
        ticket = db.get(Ticket, ticket_id)
        approval = (ticket.approved_by, ticket.approved_at)
        events = db.query(TicketEvent).filter_by(ticket_id=ticket_id).count()
    response = client.post(f"/api/v1/tickets/{ticket_id}/cost", json={"estimated_cost_idr": 150000})
    assert response.status_code == 200
    with sessions() as db:
        ticket = db.get(Ticket, ticket_id)
        assert ticket.status == "SCHEDULED"
        assert (ticket.approved_by, ticket.approved_at) == approval
        assert db.query(TicketEvent).filter_by(ticket_id=ticket_id).count() == events


@pytest.mark.parametrize(
    "action,payload",
    [
        ("postpone", {"note": "later"}),
        ("done", {"note": "done"}),
        ("cost", {"estimated_cost_idr": 200000}),
    ],
)
def test_resolved_ticket_cannot_be_regressed(ticket_api, action, payload):
    client, sessions, ticket_id, authenticate = ticket_api
    authenticate("technician" if action == "done" else "manager")
    with sessions() as db:
        db.get(Ticket, ticket_id).status = "RESOLVED"
        db.commit()
    assert client.post(f"/api/v1/tickets/{ticket_id}/{action}", json=payload).status_code == 400
    with sessions() as db:
        assert db.get(Ticket, ticket_id).status == "RESOLVED"


def test_done_cannot_bypass_fresh_cost_approval(ticket_api):
    client, sessions, ticket_id, authenticate = ticket_api
    authenticate("manager")
    assert client.post(f"/api/v1/tickets/{ticket_id}/approve").status_code == 200
    with sessions() as db:
        approved_event = db.query(TicketEvent).filter_by(ticket_id=ticket_id, type="approved").one()
        original = (approved_event.id, approved_event.note, approved_event.created_at)
    authenticate("technician")
    assert (
        client.post(
            f"/api/v1/tickets/{ticket_id}/cost", json={"estimated_cost_idr": 200000}
        ).status_code
        == 200
    )
    assert (
        client.post(f"/api/v1/tickets/{ticket_id}/done", json={"note": "done"}).status_code == 400
    )
    with sessions() as db:
        event = db.get(TicketEvent, original[0])
        assert (event.id, event.note, event.created_at) == original
        changed = db.query(TicketEvent).filter_by(ticket_id=ticket_id, type="cost_change").one()
        assert "150,000" in changed.note and "200,000" in changed.note
    authenticate("manager")
    assert client.post(f"/api/v1/tickets/{ticket_id}/approve").status_code == 200
    authenticate("technician")
    assert (
        client.post(f"/api/v1/tickets/{ticket_id}/done", json={"note": "done"}).status_code == 200
    )


@pytest.mark.parametrize("field", ["technician_id", "scheduled_at", "estimated_cost_idr"])
def test_approval_requires_complete_visit(ticket_api, field):
    client, sessions, ticket_id, authenticate = ticket_api
    authenticate("manager")
    with sessions() as db:
        setattr(db.get(Ticket, ticket_id), field, None)
        db.commit()
    assert client.post(f"/api/v1/tickets/{ticket_id}/approve").status_code == 400


@pytest.mark.parametrize("cost", [-1, 1.5, "NaN"])
def test_invalid_cost_rejected(ticket_api, cost):
    client, _, ticket_id, authenticate = ticket_api
    authenticate("manager")
    assert (
        client.post(
            f"/api/v1/tickets/{ticket_id}/cost", json={"estimated_cost_idr": cost}
        ).status_code
        == 422
    )


@pytest.mark.parametrize("role", ["manager", "technician", "unknown"])
def test_ticket_reads_and_mutations_fail_closed(ticket_api, role):
    client, sessions, ticket_id, _ = ticket_api
    with sessions() as db:
        user = AppUser(
            name="Outsider", email="outside@example.invalid", password_hash="unused", role=role
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.expunge(user)
        count = db.query(TicketEvent).filter_by(ticket_id=ticket_id).count()
    app.dependency_overrides[get_current_user] = lambda: user
    assert client.get(f"/api/v1/tickets/{ticket_id}").status_code == 403
    assert client.get("/api/v1/tickets").json() == []
    for action, payload in [
        ("approve", {}),
        ("postpone", {"note": "later"}),
        ("done", {"note": "done"}),
        ("cost", {"estimated_cost_idr": 200000}),
    ]:
        assert client.post(f"/api/v1/tickets/{ticket_id}/{action}", json=payload).status_code == 403
    with sessions() as db:
        assert db.query(TicketEvent).filter_by(ticket_id=ticket_id).count() == count


def test_site_default_technician_cannot_access_reassigned_ticket(ticket_api):
    client, sessions, ticket_id, authenticate = ticket_api
    authenticate("technician")
    with sessions() as db:
        ticket = db.get(Ticket, ticket_id)
        assert ticket.site.technician_id == ticket.technician_id
        ticket.technician_id = None
        db.commit()
    assert client.get(f"/api/v1/tickets/{ticket_id}").status_code == 403
    assert ticket_id not in {ticket["id"] for ticket in client.get("/api/v1/tickets").json()}


@pytest.mark.parametrize("role", ["manager", "technician"])
def test_missing_site_denies_ticket_access(ticket_api, role):
    client, sessions, ticket_id, authenticate = ticket_api
    authenticate(role)
    with sessions() as db:
        db.get(Ticket, ticket_id).site_id = "missing-site"
        db.commit()
    assert client.get(f"/api/v1/tickets/{ticket_id}").status_code == 403
    assert ticket_id not in {ticket["id"] for ticket in client.get("/api/v1/tickets").json()}


def test_admin_scope_bypass_is_explicit(ticket_api):
    client, sessions, ticket_id, authenticate = ticket_api
    authenticate("admin")
    with sessions() as db:
        ticket = db.get(Ticket, ticket_id)
        ticket.site.manager_id = None
        ticket.site.technician_id = None
        db.commit()
    assert client.get(f"/api/v1/tickets/{ticket_id}").status_code == 200
    assert client.post(f"/api/v1/tickets/{ticket_id}/approve").status_code == 200


@pytest.mark.parametrize("initial_status", ["POSTPONED", "REOPENED"])
def test_manager_can_approve_follow_up_visit(ticket_api, initial_status):
    client, sessions, ticket_id, authenticate = ticket_api
    authenticate("manager")
    with sessions() as db:
        db.get(Ticket, ticket_id).status = initial_status
        db.commit()
    assert client.post(f"/api/v1/tickets/{ticket_id}/approve").status_code == 200


def test_done_requires_recorded_human_approval(ticket_api):
    client, sessions, ticket_id, authenticate = ticket_api
    authenticate("technician")
    with sessions() as db:
        ticket = db.get(Ticket, ticket_id)
        ticket.status = "SCHEDULED"
        ticket.approved_by = None
        ticket.approved_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()
    assert (
        client.post(f"/api/v1/tickets/{ticket_id}/done", json={"note": "done"}).status_code == 400
    )


def test_simulation_cannot_approve_changed_quote(ticket_api):
    client, sessions, ticket_id, authenticate = ticket_api
    authenticate("manager")
    assert client.post(f"/api/v1/tickets/{ticket_id}/approve").status_code == 200
    assert (
        client.post(
            f"/api/v1/tickets/{ticket_id}/cost", json={"estimated_cost_idr": 250000}
        ).status_code
        == 200
    )
    with sessions() as db:
        advance_simulation(db, "2026-10-30")
        ticket = db.get(Ticket, ticket_id)
        assert ticket.status == "AWAITING_APPROVAL"
        assert ticket.approved_by is None
        assert ticket.approved_at is None
