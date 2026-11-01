"""Pure ticket authorization and lifecycle rules, independent of HTTP and storage."""


def can_access_ticket(
    *,
    role: str,
    user_id: str,
    site_exists: bool,
    manager_id: str | None,
    technician_id: str | None,
) -> bool:
    if role == "admin":
        return True
    if not site_exists:
        return False
    if role == "manager":
        return manager_id is not None and manager_id == user_id
    if role == "technician":
        # A site's default technician is not authority over another technician's ticket.
        return technician_id is not None and technician_id == user_id
    return False


def validate_ticket_transition(
    *,
    action: str,
    status: str,
    technician_id: str | None = None,
    scheduled: bool = False,
    estimated_cost_idr: int | None = None,
    approved: bool = False,
) -> None:
    allowed_statuses = {
        "approve": {"AWAITING_APPROVAL", "POSTPONED", "REOPENED"},
        "postpone": {"AWAITING_APPROVAL"},
        "done": {"SCHEDULED"},
        "cost": {"AWAITING_APPROVAL", "POSTPONED", "REOPENED", "SCHEDULED", "DONE_BY_TECH"},
    }
    if status not in allowed_statuses[action]:
        raise ValueError(f"Tindakan '{action}' tidak diizinkan pada tiket berstatus '{status}'")
    if action == "approve" and (
        not technician_id or not scheduled or estimated_cost_idr is None or estimated_cost_idr < 0
    ):
        raise ValueError("Persetujuan memerlukan teknisi, jadwal, dan estimasi biaya yang valid")
    if action == "done" and not approved:
        raise ValueError("Pekerjaan memerlukan persetujuan biaya terbaru dari manusia")
