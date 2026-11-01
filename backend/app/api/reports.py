import datetime
from typing import Annotated, Any

from app.api.deps import get_current_user, get_db
from app.engine.money import calculate_weekly_totals
from app.models import AppUser, Config, DailyAssessment, Site
from app.reports.csv_export import generate_weekly_csv
from app.reports.pdf import generate_weekly_pdf
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/reports", tags=["reports"])


def get_sim_date(db: Session) -> datetime.date:
    cfg = db.query(Config).filter_by(key="sim_clock").first()
    if cfg and "current_date" in cfg.value:
        return datetime.date.fromisoformat(cfg.value["current_date"])
    return datetime.date(2026, 10, 26)


def get_site_and_weekly_data(
    site_id: str,
    end_date_str: str | None,
    current_user: AppUser,
    db: Session,
) -> tuple[Site, dict[str, Any], list[dict[str, Any]], str]:
    site = db.query(Site).filter_by(id=site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Situs PLTS tidak ditemukan"
        )

    # Scoped authorization
    if current_user.role == "manager" and site.manager_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses laporan ditolak")
    if current_user.role == "technician" and site.technician_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses laporan ditolak")

    end_d = datetime.date.fromisoformat(end_date_str) if end_date_str else get_sim_date(db)
    start_d = end_d - datetime.timedelta(days=6)
    period_str = f"{start_d.strftime('%d %b %Y')} - {end_d.strftime('%d %b %Y')}"

    assessments = (
        db.query(DailyAssessment)
        .filter(
            DailyAssessment.site_id == site.id,
            DailyAssessment.date >= start_d,
            DailyAssessment.date <= end_d,
        )
        .order_by(DailyAssessment.date.asc())
        .all()
    )

    days_data = []
    actuals = []
    expecteds = []

    for a in assessments:
        act = a.actual_kwh or 0.0
        exp = a.expected_kwh or 0.0
        actuals.append(act)
        expecteds.append(exp)
        days_data.append(
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
        )

    totals = calculate_weekly_totals(
        actuals=actuals,
        expecteds=expecteds,
        tariff_idr=site.tariff_idr_per_kwh,
    )

    return site, totals, days_data, period_str


@router.get("/weekly/{site_id}")
def get_weekly_report(
    site_id: str,
    current_user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    end_date: str | None = Query(None),
) -> dict[str, Any]:
    site, totals, days_data, period_str = get_site_and_weekly_data(
        site_id, end_date, current_user, db
    )
    return {
        "site_id": site.id,
        "site_name": site.name,
        "kwp": site.kwp,
        "period": period_str,
        "totals": totals,
        "days": days_data,
    }


@router.get("/weekly/{site_id}/pdf")
def download_weekly_pdf(
    site_id: str,
    current_user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    end_date: str | None = Query(None),
):
    site, totals, days_data, period_str = get_site_and_weekly_data(
        site_id, end_date, current_user, db
    )
    pdf_bytes = generate_weekly_pdf(
        site_name=site.name,
        kwp=site.kwp,
        city=site.city,
        period_str=period_str,
        totals=totals,
        days_data=days_data,
        incident_notes="Kinerja dipantau secara berkala. Intervensi teknisi dicatat pada sistem tiket.",
    )
    safe_name = site.name.replace(" ", "_").lower()
    filename = f"saura_laporan_mingguan_{safe_name}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/weekly/{site_id}/csv")
def download_weekly_csv(
    site_id: str,
    current_user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    end_date: str | None = Query(None),
):
    site, totals, days_data, _ = get_site_and_weekly_data(site_id, end_date, current_user, db)
    csv_text = generate_weekly_csv(site_name=site.name, days_data=days_data)
    safe_name = site.name.replace(" ", "_").lower()
    filename = f"saura_laporan_mingguan_{safe_name}.csv"
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/overview")
def get_reports_overview(
    current_user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    end_date: str | None = Query(None),
) -> list[dict[str, Any]]:
    query = db.query(Site)
    if current_user.role == "manager":
        query = query.filter(Site.manager_id == current_user.id)
    elif current_user.role == "technician":
        query = query.filter(Site.technician_id == current_user.id)
    sites = query.order_by(Site.name.asc()).all()

    results = []
    for s in sites:
        try:
            site, totals, days_data, period_str = get_site_and_weekly_data(
                s.id, end_date, current_user, db
            )
            results.append(
                {
                    "site_id": site.id,
                    "site_name": site.name,
                    "city": site.city,
                    "province": site.province,
                    "kwp": site.kwp,
                    "period": period_str,
                    "totals": totals,
                    "days": days_data,
                }
            )
        except Exception:
            continue
    return results
