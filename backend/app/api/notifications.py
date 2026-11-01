import datetime
from typing import Annotated, Any

from app.api.deps import get_current_user, get_db
from app.models import AppUser, Notification
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    current_user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict[str, Any]]:
    notifs = (
        db.query(Notification)
        .filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return [
        {
            "id": n.id,
            "site_id": n.site_id,
            "ticket_id": n.ticket_id,
            "text": n.text,
            "read": n.read_at is not None,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifs
    ]


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: str,
    current_user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    n = db.query(Notification).filter_by(id=notification_id, user_id=current_user.id).first()
    if not n:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notifikasi tidak ditemukan"
        )
    n.read_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    return {"status": "success", "id": n.id}
