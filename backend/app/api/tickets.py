import datetime
from typing import Annotated, Any

from app.api.deps import get_current_user, get_db, require_role
from app.models import AppUser, Site, Ticket, TicketEvent
from app.ticket_policy import can_access_ticket, validate_ticket_transition
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

router = APIRouter(prefix="/tickets", tags=["tickets"])


class PostponeRequest(BaseModel):
    note: str


class DoneRequest(BaseModel):
    note: str


class CostUpdateRequest(BaseModel):
    estimated_cost_idr: int = Field(ge=0, strict=True)
    note: str | None = None


def get_authorized_ticket(db: Session, ticket_id: str, user: AppUser) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tiket tidak ditemukan")
    if not can_access_ticket(
        role=user.role,
        user_id=user.id,
        site_exists=ticket.site is not None,
        manager_id=ticket.site.manager_id if ticket.site else None,
        technician_id=ticket.technician_id,
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses tiket ditolak")
    return ticket


def require_transition(ticket: Ticket, action: str) -> None:
    try:
        validate_ticket_transition(
            action=action,
            status=ticket.status,
            technician_id=ticket.technician_id,
            scheduled=ticket.scheduled_at is not None,
            estimated_cost_idr=ticket.estimated_cost_idr,
            approved=ticket.approved_by is not None and ticket.approved_at is not None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("")
def list_tickets(
    current_user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
    site_id: str | None = Query(None),
) -> list[dict[str, Any]]:
    query = db.query(Ticket).join(Site, Ticket.site_id == Site.id)

    if current_user.role == "manager":
        query = query.filter(Site.manager_id == current_user.id)
    elif current_user.role == "technician":
        query = query.filter(Ticket.technician_id == current_user.id)
    elif current_user.role != "admin":
        return []

    if status_filter:
        query = query.filter(Ticket.status == status_filter)
    if site_id:
        query = query.filter(Ticket.site_id == site_id)

    tickets = query.order_by(Ticket.created_at.desc()).all()

    return [
        {
            "id": t.id,
            "code": t.code,
            "site_id": t.site_id,
            "site_name": t.site.name if t.site else None,
            "status": t.status,
            "priority": t.priority,
            "reason": t.reason,
            "cause": t.cause,
            "technician_name": t.technician.name if t.technician else None,
            "estimated_cost_idr": t.estimated_cost_idr,
            "scheduled_at": t.scheduled_at.isoformat() if t.scheduled_at else None,
            "approved_at": t.approved_at.isoformat() if t.approved_at else None,
            "created_at": t.created_at.isoformat(),
        }
        for t in tickets
    ]


@router.get("/{ticket_id}")
def get_ticket_detail(
    ticket_id: str,
    current_user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    ticket = get_authorized_ticket(db, ticket_id, current_user)

    events = [
        {
            "id": e.id,
            "type": e.type,
            "note": e.note,
            "actor_name": e.actor.name if e.actor else "Sistem / SauraAI",
            "created_at": e.created_at.isoformat(),
        }
        for e in ticket.events
    ]

    return {
        "id": ticket.id,
        "code": ticket.code,
        "site_id": ticket.site_id,
        "site_name": ticket.site.name if ticket.site else None,
        "status": ticket.status,
        "priority": ticket.priority,
        "reason": ticket.reason,
        "cause": ticket.cause,
        "technician": {
            "id": ticket.technician.id,
            "name": ticket.technician.name,
            "phone": ticket.technician.phone,
        }
        if ticket.technician
        else None,
        "estimated_cost_idr": ticket.estimated_cost_idr,
        "scheduled_at": ticket.scheduled_at.isoformat() if ticket.scheduled_at else None,
        "approved_by_name": ticket.approver.name if ticket.approver else None,
        "approved_at": ticket.approved_at.isoformat() if ticket.approved_at else None,
        "created_at": ticket.created_at.isoformat(),
        "events": events,
    }


@router.post("/{ticket_id}/approve")
def approve_ticket(
    ticket_id: str,
    current_user: Annotated[AppUser, Depends(require_role(["manager", "admin"]))],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    ticket = get_authorized_ticket(db, ticket_id, current_user)

    require_transition(ticket, "approve")

    ticket.status = "SCHEDULED"
    ticket.approved_by = current_user.id
    ticket.approved_at = datetime.datetime.now(datetime.timezone.utc)

    # Event
    event = TicketEvent(
        ticket_id=ticket.id,
        type="approved",
        actor_user_id=current_user.id,
        note=f"Disetujui oleh {current_user.name} ({current_user.role})",
    )
    db.add(event)
    db.commit()

    return {
        "status": "success",
        "ticket_status": ticket.status,
        "message": "Tiket berhasil disetujui",
    }


@router.post("/{ticket_id}/postpone")
def postpone_ticket(
    ticket_id: str,
    req: PostponeRequest,
    current_user: Annotated[AppUser, Depends(require_role(["manager", "admin"]))],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    ticket = get_authorized_ticket(db, ticket_id, current_user)

    require_transition(ticket, "postpone")
    ticket.status = "POSTPONED"
    event = TicketEvent(
        ticket_id=ticket.id,
        type="postponed",
        actor_user_id=current_user.id,
        note=f"Ditunda: {req.note}",
    )
    db.add(event)
    db.commit()

    return {"status": "success", "ticket_status": ticket.status, "message": "Tiket ditunda"}


@router.post("/{ticket_id}/done")
def mark_ticket_done(
    ticket_id: str,
    req: DoneRequest,
    current_user: Annotated[AppUser, Depends(require_role(["technician", "manager", "admin"]))],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    ticket = get_authorized_ticket(db, ticket_id, current_user)

    require_transition(ticket, "done")
    ticket.status = "DONE_BY_TECH"
    event = TicketEvent(
        ticket_id=ticket.id,
        type="done_by_tech",
        actor_user_id=current_user.id,
        note=req.note,
    )
    db.add(event)
    db.commit()

    return {
        "status": "success",
        "ticket_status": ticket.status,
        "message": "Pekerjaan teknisi selesai dicatat",
    }


@router.post("/{ticket_id}/cost")
def update_ticket_cost(
    ticket_id: str,
    req: CostUpdateRequest,
    current_user: Annotated[AppUser, Depends(require_role(["manager", "technician", "admin"]))],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    ticket = get_authorized_ticket(db, ticket_id, current_user)

    require_transition(ticket, "cost")
    old_cost = ticket.estimated_cost_idr
    if old_cost == req.estimated_cost_idr:
        return {
            "status": "success",
            "estimated_cost_idr": old_cost,
            "message": "Estimasi biaya tidak berubah",
        }
    ticket.estimated_cost_idr = req.estimated_cost_idr
    ticket.status = "AWAITING_APPROVAL"
    ticket.approved_by = None
    ticket.approved_at = None

    old_cost_text = f"Rp{old_cost:,}" if old_cost is not None else "belum ditetapkan"
    note_text = (
        f"Perubahan estimasi biaya dari {old_cost_text} menjadi Rp{req.estimated_cost_idr:,}. "
        "Persetujuan baru diperlukan."
    )
    if req.note:
        note_text += f" Catatan: {req.note}"

    event = TicketEvent(
        ticket_id=ticket.id,
        type="cost_change",
        actor_user_id=current_user.id,
        note=note_text,
    )
    db.add(event)
    db.commit()

    return {
        "status": "success",
        "estimated_cost_idr": ticket.estimated_cost_idr,
        "message": "Biaya berhasil diperbarui",
    }
