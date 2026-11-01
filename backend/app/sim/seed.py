import argparse
import datetime
import logging
from typing import Any

from app.auth import hash_password
from app.db.session import Base, SessionLocal
from app.engine.status import DEFAULT_THRESHOLDS
from app.models import (
    AppUser,
    Config,
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
)

logger = logging.getLogger(__name__)


def seed_demo_data(db, reset: bool = True, demo_date_str: str = "2026-10-26") -> dict[str, Any]:
    # Ensure tables exist
    Base.metadata.create_all(bind=db.get_bind())

    demo_date = datetime.date.fromisoformat(demo_date_str)

    # 1. Reset simulated data transactionally if requested
    if reset:
        sim_sites = db.query(Site).filter(Site.is_simulated.is_(True)).all()
        sim_site_ids = [s.id for s in sim_sites]

        if sim_site_ids:
            # Delete notifications
            db.query(Notification).filter(Notification.site_id.in_(sim_site_ids)).delete(
                synchronize_session=False
            )
            # Delete ticket events, ticket photos, tickets
            sim_tickets = db.query(Ticket).filter(Ticket.site_id.in_(sim_site_ids)).all()
            sim_ticket_ids = [t.id for t in sim_tickets]
            if sim_ticket_ids:
                db.query(TicketPhoto).filter(TicketPhoto.ticket_id.in_(sim_ticket_ids)).delete(
                    synchronize_session=False
                )
                db.query(TicketEvent).filter(TicketEvent.ticket_id.in_(sim_ticket_ids)).delete(
                    synchronize_session=False
                )
                db.query(Ticket).filter(Ticket.id.in_(sim_ticket_ids)).delete(
                    synchronize_session=False
                )

            # Delete assessments, reports, weather, photos
            db.query(DailyAssessment).filter(DailyAssessment.site_id.in_(sim_site_ids)).delete(
                synchronize_session=False
            )
            db.query(DailyReport).filter(DailyReport.site_id.in_(sim_site_ids)).delete(
                synchronize_session=False
            )
            db.query(WeatherDaily).filter(WeatherDaily.site_id.in_(sim_site_ids)).delete(
                synchronize_session=False
            )
            db.query(Photo).filter(Photo.site_id.in_(sim_site_ids)).delete(
                synchronize_session=False
            )
            # Delete simulated sites
            db.query(Site).filter(Site.id.in_(sim_site_ids)).delete(synchronize_session=False)

        db.flush()

    # 2. Config thresholds & simulation clock
    for k, v in DEFAULT_THRESHOLDS.items():
        cfg = db.query(Config).filter_by(key=k).first()
        if not cfg:
            db.add(Config(key=k, value={"value": v}))
        else:
            cfg.value = {"value": v}

    sim_clock_cfg = db.query(Config).filter_by(key="sim_clock").first()
    clock_val = {"current_date": demo_date_str, "cutoff_passed": True}
    if not sim_clock_cfg:
        db.add(Config(key="sim_clock", value=clock_val))
    else:
        sim_clock_cfg.value = clock_val

    # 3. Users
    def get_or_create_user(name: str, email: str, role: str, phone: str = "08123456789") -> AppUser:
        u = db.query(AppUser).filter_by(email=email).first()
        if not u:
            u = AppUser(
                name=name,
                email=email,
                role=role,
                phone=phone,
                password_hash=hash_password("password123"),
            )
            db.add(u)
            db.flush()
        return u

    rina = get_or_create_user("Bu Rina", "rina@saura.id", "manager")
    ahmad = get_or_create_user("Ahmad", "ahmad@saura.id", "technician")
    get_or_create_user("Admin SAURA", "admin@saura.id", "admin")

    # 4. Operator
    budi = db.query(Operator).filter_by(telegram_user_id=1001).first()
    if not budi:
        budi = Operator(
            telegram_user_id=1001,
            telegram_chat_id=1001,
            name="Pak Budi",
            honorific="Pak",
        )
        db.add(budi)
        db.flush()

    # 5. Create 4 demo sites
    huda = Site(
        name="MA Nurul Huda",
        city="Bandung",
        province="Jawa Barat",
        lat=-6.9147,
        lon=107.6098,
        kwp=10.0,
        system_type="on_grid",
        has_battery=False,
        panel_mount="roof",
        timezone="Asia/Jakarta",
        tariff_idr_per_kwh=1500,
        pr_default=0.790,
        manager_id=rina.id,
        technician_id=ahmad.id,
        operator_id=budi.id,
        is_simulated=True,
    )
    cibiru = Site(
        name="Balai Desa Cibiru",
        city="Bandung",
        province="Jawa Barat",
        lat=-6.9270,
        lon=107.7180,
        kwp=7.5,
        system_type="on_grid",
        has_battery=False,
        panel_mount="roof",
        timezone="Asia/Jakarta",
        tariff_idr_per_kwh=1500,
        pr_default=0.790,
        manager_id=rina.id,
        technician_id=ahmad.id,
        is_simulated=True,
    )
    sukamaju = Site(
        name="SDN Sukamaju",
        city="Bandung",
        province="Jawa Barat",
        lat=-6.8900,
        lon=107.6200,
        kwp=5.0,
        system_type="on_grid",
        has_battery=False,
        panel_mount="roof",
        timezone="Asia/Jakarta",
        tariff_idr_per_kwh=1500,
        pr_default=0.790,
        manager_id=rina.id,
        technician_id=ahmad.id,
        is_simulated=True,
    )
    cendekia = Site(
        name="SMP Cendekia",
        city="Bandung",
        province="Jawa Barat",
        lat=-6.9050,
        lon=107.6400,
        kwp=6.0,
        system_type="on_grid",
        has_battery=False,
        panel_mount="roof",
        timezone="Asia/Jakarta",
        tariff_idr_per_kwh=1500,
        pr_default=0.790,
        manager_id=rina.id,
        technician_id=ahmad.id,
        is_simulated=True,
    )
    db.add_all([huda, cibiru, sukamaju, cendekia])
    db.flush()

    # 6. Seed weather for all sites
    sites = [huda, cibiru, sukamaju, cendekia]
    start_dt = datetime.date(2026, 10, 20)
    end_dt = datetime.date(2026, 10, 30)

    cur = start_dt
    while cur <= end_dt:
        for s in sites:
            w = WeatherDaily(
                site_id=s.id,
                date=cur,
                irradiance_kwh_m2=4.05,
                source="open_meteo",
            )
            db.add(w)
        cur += datetime.timedelta(days=1)
    db.flush()

    # 7. Seed Balai Desa Cibiru on demo_date (2026-10-26): Critical
    cibiru_report = DailyReport(
        site_id=cibiru.id,
        date=demo_date,
        kwh=0.0,
        source="sim",
        confirmed_by_operator=True,
    )
    db.add(cibiru_report)
    db.flush()

    cibiru_assessment = DailyAssessment(
        site_id=cibiru.id,
        date=demo_date,
        report_id=cibiru_report.id,
        expected_kwh=24.0,  # 7.5 * 4.05 * 0.79 = 24.0
        actual_kwh=0.0,
        gap_kwh=24.0,
        performance=0.0,
        loss_idr=36000,
        status="CRITICAL",
        reason_code="below_critical_ratio",
        weather_source="open_meteo",
    )
    db.add(cibiru_assessment)

    cibiru_ticket = Ticket(
        code="SA-023",
        site_id=cibiru.id,
        status="AWAITING_APPROVAL",
        priority="critical",
        reason="Produksi nol saat cuaca cerah (0 / 24,0 kWh)",
        cause="inverter_trip",
        technician_id=ahmad.id,
        estimated_cost_idr=200000,
    )
    db.add(cibiru_ticket)

    # 8. Seed SDN Sukamaju on demo_date (2026-10-26): Normal
    sukamaju_report = DailyReport(
        site_id=sukamaju.id,
        date=demo_date,
        kwh=15.4,
        source="sim",
        confirmed_by_operator=True,
    )
    db.add(sukamaju_report)
    db.flush()

    sukamaju_assessment = DailyAssessment(
        site_id=sukamaju.id,
        date=demo_date,
        report_id=sukamaju_report.id,
        expected_kwh=16.0,  # 5.0 * 4.05 * 0.79 = 15.9975 -> 16.0
        actual_kwh=15.4,
        gap_kwh=0.6,
        performance=0.9625,
        loss_idr=900,
        status="NORMAL",
        reason_code="normal",
        weather_source="open_meteo",
    )
    db.add(sukamaju_assessment)

    # 9. Seed SMP Cendekia on demo_date (2026-10-26): NO_DATA
    cendekia_assessment = DailyAssessment(
        site_id=cendekia.id,
        date=demo_date,
        report_id=None,
        expected_kwh=None,
        actual_kwh=None,
        gap_kwh=None,
        performance=None,
        loss_idr=None,
        status="NO_DATA",
        reason_code="no_data_cutoff",
        weather_source="open_meteo",
    )
    db.add(cendekia_assessment)

    # 10. Seed MA Nurul Huda series (2026-10-20 to demo_date)
    huda_data = [
        ("2026-10-20", 30.0, 0.9375, 2.0, 3000, "NORMAL", "normal"),
        ("2026-10-21", 28.0, 0.8750, 4.0, 6000, "NORMAL", "normal"),
        ("2026-10-22", 26.0, 0.8125, 6.0, 9000, "ACTION", "action_streak"),
        ("2026-10-23", 24.0, 0.7500, 8.0, 12000, "ACTION", "action_streak"),
        ("2026-10-24", 23.0, 0.7188, 9.0, 13500, "ACTION", "below_action_ratio"),
        ("2026-10-25", 21.0, 0.6562, 11.0, 16500, "ACTION", "below_action_ratio"),
        ("2026-10-26", 20.0, 0.6250, 12.0, 18000, "ACTION", "below_action_ratio"),
    ]

    # Create dummy photo for 26th
    photo_26 = Photo(
        site_id=huda.id,
        kind="inverter",
        storage_path="sim_inverter_26.jpg",
    )
    db.add(photo_26)
    db.flush()

    for d_str, act, perf, gap, loss, st, reason in huda_data:
        d = datetime.date.fromisoformat(d_str)
        if d <= demo_date:
            rep = DailyReport(
                site_id=huda.id,
                date=d,
                kwh=act,
                source="ocr" if d_str == "2026-10-26" else "sim",
                photo_id=photo_26.id if d_str == "2026-10-26" else None,
                ocr_confidence=0.96 if d_str == "2026-10-26" else None,
                confirmed_by_operator=True,
            )
            db.add(rep)
            db.flush()

            ass = DailyAssessment(
                site_id=huda.id,
                date=d,
                report_id=rep.id,
                expected_kwh=32.0,
                actual_kwh=act,
                gap_kwh=gap,
                performance=perf,
                loss_idr=loss,
                status=st,
                reason_code=reason,
                weather_source="open_meteo",
            )
            db.add(ass)

    # Ticket SA-024 for MA Nurul Huda
    ticket_24 = Ticket(
        code="SA-024",
        site_id=huda.id,
        status="AWAITING_APPROVAL",
        priority="normal",
        reason="Dugaan perlu pemeriksaan",
        cause="Dugaan perlu pemeriksaan",
        technician_id=ahmad.id,
        scheduled_at=datetime.datetime(2026, 10, 27, 2, 0, tzinfo=datetime.timezone.utc),
        estimated_cost_idr=150000,
    )
    db.add(ticket_24)
    db.flush()

    event_created = TicketEvent(
        ticket_id=ticket_24.id,
        type="created",
        actor_user_id=None,
        note="Dibuat oleh SauraAI",
    )
    db.add(event_created)

    tp24 = TicketPhoto(ticket_id=ticket_24.id, photo_id=photo_26.id)
    db.add(tp24)

    notif_rina = Notification(
        user_id=rina.id,
        site_id=huda.id,
        ticket_id=ticket_24.id,
        text="Tiket SA-024 memerlukan persetujuan biaya Rp150.000",
    )
    db.add(notif_rina)

    db.commit()
    logger.info(f"Seeded demo data for date {demo_date_str}")
    return {
        "status": "success",
        "demo_date": demo_date_str,
        "sites": [s.name for s in sites],
    }


def main():
    parser = argparse.ArgumentParser(description="Seed SAURA simulation demo data")
    parser.add_argument("--reset", action="store_true", help="Reset simulated data first")
    parser.add_argument("--demo-date", default="2026-10-26", help="Demo date in YYYY-MM-DD format")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        res = seed_demo_data(db, reset=args.reset, demo_date_str=args.demo_date)
        print(f"Seed complete: {res}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
