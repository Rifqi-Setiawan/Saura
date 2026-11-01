import argparse
import datetime
import logging
from typing import Any

from app.db.session import SessionLocal
from app.engine.recovery import evaluate_recovery_status
from app.models import (
    AppUser,
    Config,
    DailyAssessment,
    DailyReport,
    Site,
    Ticket,
    TicketEvent,
)

logger = logging.getLogger(__name__)

# Daily scripted values for MA Nurul Huda during recovery phase
HUDA_SCRIPTED = {
    datetime.date(2026, 10, 27): {
        "kwh": 26.0,
        "perf": 0.8125,
        "gap": 6.0,
        "loss": 9000,
        "status": "ACTION",
        "reason": "action_streak",
    },
    datetime.date(2026, 10, 28): {
        "kwh": 29.0,
        "perf": 0.90625,
        "gap": 3.0,
        "loss": 4500,
        "status": "NORMAL",
        "reason": "normal",
    },
    datetime.date(2026, 10, 29): {
        "kwh": 30.0,
        "perf": 0.9375,
        "gap": 2.0,
        "loss": 3000,
        "status": "NORMAL",
        "reason": "normal",
    },
    datetime.date(2026, 10, 30): {
        "kwh": 31.0,
        "perf": 0.96875,
        "gap": 1.0,
        "loss": 1500,
        "status": "NORMAL",
        "reason": "normal",
    },
}


def advance_simulation(db, target_date_str: str) -> dict[str, Any]:
    target_date = datetime.date.fromisoformat(target_date_str)

    # 1. Fetch current clock
    sim_clock_cfg = db.query(Config).filter_by(key="sim_clock").first()
    if not sim_clock_cfg:
        current_date = datetime.date(2026, 10, 26)
    else:
        current_date = datetime.date.fromisoformat(sim_clock_cfg.value["current_date"])

    if target_date <= current_date:
        return {
            "status": "no_op",
            "message": f"Target date {target_date_str} <= current {current_date}",
            "current_date": str(current_date),
        }

    huda = db.query(Site).filter(Site.name == "MA Nurul Huda", Site.is_simulated.is_(True)).first()
    cibiru = (
        db.query(Site).filter(Site.name == "Balai Desa Cibiru", Site.is_simulated.is_(True)).first()
    )
    sukamaju = (
        db.query(Site).filter(Site.name == "SDN Sukamaju", Site.is_simulated.is_(True)).first()
    )
    cendekia = (
        db.query(Site).filter(Site.name == "SMP Cendekia", Site.is_simulated.is_(True)).first()
    )

    ahmad = db.query(AppUser).filter_by(email="ahmad@saura.id").first()
    rina = db.query(AppUser).filter_by(email="rina@saura.id").first()

    step_date = current_date + datetime.timedelta(days=1)
    while step_date <= target_date:
        # Step A: Handle 2026-10-27 technician visit on SA-024
        if step_date == datetime.date(2026, 10, 27) and huda:
            ticket_24 = db.query(Ticket).filter_by(code="SA-024", site_id=huda.id).first()
            # Replay only the original approved demo quote, never a revised human quote.
            quote_changed = ticket_24 and any(e.type == "cost_change" for e in ticket_24.events)
            if (
                ticket_24
                and not quote_changed
                and ticket_24.estimated_cost_idr == 150000
                and ticket_24.status in ["AWAITING_APPROVAL", "SCHEDULED"]
            ):
                # Approval
                ticket_24.status = "DONE_BY_TECH"
                ticket_24.approved_by = rina.id if rina else None
                ticket_24.approved_at = datetime.datetime(
                    2026, 10, 26, 17, 30, tzinfo=datetime.timezone.utc
                )
                db.add(
                    TicketEvent(
                        ticket_id=ticket_24.id,
                        type="approved",
                        actor_user_id=rina.id if rina else None,
                        note="[SIMULATION] Persetujuan estimasi demo awal oleh Bu Rina (Pengelola)",
                    )
                )
                # Technician done
                db.add(
                    TicketEvent(
                        ticket_id=ticket_24.id,
                        type="done_by_tech",
                        actor_user_id=ahmad.id if ahmad else None,
                        note="Kunjungan selesai: MCB string 2 diganti dan diaktifkan kembali. Pembersihan debu ringan dilakukan. [SIMULATION]",
                    )
                )

        # Step B: Add MA Nurul Huda report & assessment
        if huda and step_date in HUDA_SCRIPTED:
            info = HUDA_SCRIPTED[step_date]
            # Check if report already exists
            rep = db.query(DailyReport).filter_by(site_id=huda.id, date=step_date).first()
            if not rep:
                rep = DailyReport(
                    site_id=huda.id,
                    date=step_date,
                    kwh=info["kwh"],
                    source="sim",
                    confirmed_by_operator=True,
                )
                db.add(rep)
                db.flush()

                ass = DailyAssessment(
                    site_id=huda.id,
                    date=step_date,
                    report_id=rep.id,
                    expected_kwh=32.0,
                    actual_kwh=info["kwh"],
                    gap_kwh=info["gap"],
                    performance=info["perf"],
                    loss_idr=info["loss"],
                    status=info["status"],
                    reason_code=info["reason"],
                    weather_source="open_meteo",
                )
                db.add(ass)

        # Step C: Evaluate Ticket SA-024 Recovery
        ticket_24 = db.query(Ticket).filter_by(code="SA-024").first()
        if (
            ticket_24
            and ticket_24.status == "DONE_BY_TECH"
            and step_date >= datetime.date(2026, 10, 28)
            and huda
        ):
            # Gather valid reports after intervention (from 2026-10-28 onwards)
            post_reports = (
                db.query(DailyReport)
                .filter(
                    DailyReport.site_id == huda.id,
                    DailyReport.date >= datetime.date(2026, 10, 28),
                    DailyReport.date <= step_date,
                )
                .order_by(DailyReport.date)
                .all()
            )
            ratios = [r.kwh / 32.0 for r in post_reports]
            rec_status = evaluate_recovery_status(ratios)
            if rec_status == "RESOLVED":
                ticket_24.status = "RESOLVED"
                db.add(
                    TicketEvent(
                        ticket_id=ticket_24.id,
                        type="resolved",
                        actor_user_id=None,
                        note="Kinerja pulih 3 hari berturut-turut >= 90% (29, 30, 31 kWh). Tiket ditutup otomatis oleh sistem.",
                    )
                )

        # Step D: Other sites continuation
        if cibiru:
            if not db.query(DailyReport).filter_by(site_id=cibiru.id, date=step_date).first():
                c_kwh = 23.5 if step_date > datetime.date(2026, 10, 26) else 0.0
                c_rep = DailyReport(
                    site_id=cibiru.id,
                    date=step_date,
                    kwh=c_kwh,
                    source="sim",
                    confirmed_by_operator=True,
                )
                db.add(c_rep)
                db.flush()
                c_ass = DailyAssessment(
                    site_id=cibiru.id,
                    date=step_date,
                    report_id=c_rep.id,
                    expected_kwh=24.0,
                    actual_kwh=c_kwh,
                    gap_kwh=round(24.0 - c_kwh, 2),
                    performance=round(c_kwh / 24.0, 4),
                    loss_idr=int((24.0 - c_kwh) * 1500),
                    status="NORMAL" if c_kwh > 20 else "CRITICAL",
                    reason_code="normal" if c_kwh > 20 else "below_critical_ratio",
                    weather_source="open_meteo",
                )
                db.add(c_ass)

        if sukamaju:
            if not db.query(DailyReport).filter_by(site_id=sukamaju.id, date=step_date).first():
                s_kwh = 15.6
                s_rep = DailyReport(
                    site_id=sukamaju.id,
                    date=step_date,
                    kwh=s_kwh,
                    source="sim",
                    confirmed_by_operator=True,
                )
                db.add(s_rep)
                db.flush()
                s_ass = DailyAssessment(
                    site_id=sukamaju.id,
                    date=step_date,
                    report_id=s_rep.id,
                    expected_kwh=16.0,
                    actual_kwh=s_kwh,
                    gap_kwh=0.4,
                    performance=round(s_kwh / 16.0, 4),
                    loss_idr=int(0.4 * 1500),
                    status="NORMAL",
                    reason_code="normal",
                    weather_source="open_meteo",
                )
                db.add(s_ass)

        if cendekia:
            if not db.query(DailyReport).filter_by(site_id=cendekia.id, date=step_date).first():
                ce_kwh = 19.0
                ce_rep = DailyReport(
                    site_id=cendekia.id,
                    date=step_date,
                    kwh=ce_kwh,
                    source="sim",
                    confirmed_by_operator=True,
                )
                db.add(ce_rep)
                db.flush()
                ce_ass = DailyAssessment(
                    site_id=cendekia.id,
                    date=step_date,
                    report_id=ce_rep.id,
                    expected_kwh=19.2,  # 6.0 * 4.05 * 0.79 = 19.197 -> 19.2
                    actual_kwh=ce_kwh,
                    gap_kwh=0.2,
                    performance=round(ce_kwh / 19.2, 4),
                    loss_idr=int(0.2 * 1500),
                    status="NORMAL",
                    reason_code="normal",
                    weather_source="open_meteo",
                )
                db.add(ce_ass)

        step_date += datetime.timedelta(days=1)

    # Update sim_clock to target date
    if not sim_clock_cfg:
        db.add(
            Config(key="sim_clock", value={"current_date": target_date_str, "cutoff_passed": True})
        )
    else:
        sim_clock_cfg.value = {"current_date": target_date_str, "cutoff_passed": True}

    db.commit()
    logger.info(f"Simulation advanced from {current_date} to {target_date_str}")
    return {
        "status": "success",
        "previous_date": str(current_date),
        "current_date": target_date_str,
    }


def main():
    parser = argparse.ArgumentParser(description="Advance SAURA simulation clock")
    parser.add_argument("--to", required=True, help="Target date in YYYY-MM-DD format")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        res = advance_simulation(db, target_date_str=args.to)
        print(f"Advance complete: {res}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
