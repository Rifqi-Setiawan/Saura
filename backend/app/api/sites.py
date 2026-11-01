import datetime
from typing import Annotated, Any

from app.api.deps import get_current_user, get_db
from app.models import AppUser, Config, DailyAssessment, Site
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/sites", tags=["sites"])


def get_current_sim_date(db: Session) -> datetime.date:
    sim_clock = db.query(Config).filter_by(key="sim_clock").first()
    if sim_clock and "current_date" in sim_clock.value:
        return datetime.date.fromisoformat(sim_clock.value["current_date"])
    return datetime.date(2026, 10, 26)


@router.get("")
def list_sites(
    current_user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict[str, Any]]:
    # Scope to principal
    query = db.query(Site)
    if current_user.role == "manager":
        query = query.filter(Site.manager_id == current_user.id)
    elif current_user.role == "technician":
        query = query.filter(Site.technician_id == current_user.id)

    sites = query.all()
    sim_date = get_current_sim_date(db)

    results = []
    for s in sites:
        today_ass = db.query(DailyAssessment).filter_by(site_id=s.id, date=sim_date).first()
        status_val = today_ass.status if today_ass else "NO_DATA"

        results.append(
            {
                "id": s.id,
                "name": s.name,
                "city": s.city,
                "province": s.province,
                "kwp": s.kwp,
                "system_type": s.system_type,
                "has_battery": s.has_battery,
                "status": status_val,
                "actual_kwh": today_ass.actual_kwh if today_ass else None,
                "expected_kwh": today_ass.expected_kwh if today_ass else None,
                "gap_kwh": today_ass.gap_kwh if today_ass else None,
                "loss_idr": today_ass.loss_idr if today_ass else None,
                "performance": today_ass.performance if today_ass else None,
                "operator_name": s.operator.name if s.operator else None,
            }
        )

    return results


@router.get("/{site_id}")
def get_site_detail(
    site_id: str,
    current_user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    site = db.query(Site).filter_by(id=site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Situs PLTS tidak ditemukan"
        )

    # Authorization check
    if current_user.role == "manager" and site.manager_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Akses ke situs ini ditolak"
        )
    if current_user.role == "technician" and site.technician_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Akses ke situs ini ditolak"
        )

    sim_date = get_current_sim_date(db)

    # Today's assessment
    today_ass = db.query(DailyAssessment).filter_by(site_id=site.id, date=sim_date).first()

    # Past 7 days assessments
    past_7_days = (
        db.query(DailyAssessment)
        .filter(
            DailyAssessment.site_id == site.id,
            DailyAssessment.date <= sim_date,
            DailyAssessment.date >= sim_date - datetime.timedelta(days=6),
        )
        .order_by(DailyAssessment.date.asc())
        .all()
    )

    history = [
        {
            "date": a.date.isoformat(),
            "actual_kwh": a.actual_kwh,
            "expected_kwh": a.expected_kwh,
            "gap_kwh": a.gap_kwh,
            "performance": a.performance,
            "loss_idr": a.loss_idr,
            "status": a.status,
            "weather_source": a.weather_source,
        }
        for a in past_7_days
    ]

    return {
        "id": site.id,
        "name": site.name,
        "city": site.city,
        "province": site.province,
        "lat": site.lat,
        "lon": site.lon,
        "kwp": site.kwp,
        "system_type": site.system_type,
        "has_battery": site.has_battery,
        "panel_mount": site.panel_mount,
        "timezone": site.timezone,
        "tariff_idr_per_kwh": site.tariff_idr_per_kwh,
        "pr_default": site.pr_default,
        "pr_calibrated": site.pr_calibrated,
        "operator": {
            "name": site.operator.name,
            "honorific": site.operator.honorific,
        }
        if site.operator
        else None,
        "today_assessment": {
            "date": today_ass.date.isoformat(),
            "status": today_ass.status,
            "actual_kwh": today_ass.actual_kwh,
            "expected_kwh": today_ass.expected_kwh,
            "gap_kwh": today_ass.gap_kwh,
            "performance": today_ass.performance,
            "loss_idr": today_ass.loss_idr,
            "reason_code": today_ass.reason_code,
            "weather_source": today_ass.weather_source,
        }
        if today_ass
        else None,
        "last_7_days": history,
    }
