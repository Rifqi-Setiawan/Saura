import datetime

import pytest
from app.db.session import Base
from app.models import DailyReport, Notification, Site, Ticket
from app.sim.seed import seed_demo_data
from app.telegram.service import TelegramMockClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        # Seed base data
        seed_demo_data(session, reset=True, demo_date_str="2026-10-26")
        yield session
    finally:
        session.close()


@pytest.mark.asyncio
async def test_telegram_onboarding(db):
    client = TelegramMockClient(db)

    # 1. Unregistered user
    res1 = await client.send_start(999999)
    assert "belum terdaftar" in res1["text"]

    # 2. Registered operator Pak Budi (1001)
    res2 = await client.send_start(1001)
    assert "Pak Budi" in res2["text"]
    assert "MA Nurul Huda" in res2["text"]


@pytest.mark.asyncio
async def test_telegram_photo_and_normal_feedback(db):
    client = TelegramMockClient(db)

    # Upload photo with reading 31.0 kWh (normal for 10 kWp)
    photo_res = await client.upload_photo(
        user_id=1001,
        photo_bytes_or_path="photo_inverter_31.0_kwh.jpg",
        target_date=datetime.date(2026, 10, 26),
    )
    assert len(photo_res["buttons"]) > 0
    assert "confirm_kwh:31.0" in photo_res["buttons"][0][0]["callback_data"]

    # Click confirm 31.0 kWh
    confirm_res = await client.click_button(
        user_id=1001,
        callback_data="confirm_kwh:31.0",
    )
    assert "NORMAL" in confirm_res["text"]
    assert len(confirm_res["buttons"]) == 0  # No guided check required for normal


@pytest.mark.asyncio
async def test_telegram_action_guided_check_and_ticket_flow(db):
    client = TelegramMockClient(db)
    huda = db.query(Site).filter_by(name="MA Nurul Huda").first()

    # 1. Confirm reading 20.0 kWh (Action status on 10 kWp @ 4.05 H -> 20/32)
    step1_res = await client.click_button(
        user_id=1001,
        callback_data="confirm_kwh:20.0",
    )
    assert "ACTION" in step1_res["text"] or "PERHATIAN" in step1_res["text"]
    assert "Langkah 1/3" in step1_res["text"]
    assert "PLN" in step1_res["text"]

    # 2. Operator answers PLN outage: No
    step2_res = await client.click_button(
        user_id=1001,
        callback_data="check:pln_outage:no",
    )
    assert "Langkah 2/3" in step2_res["text"]
    assert "lampu indikator" in step2_res["text"]

    # 3. Operator answers indicator light: Red
    step3_res = await client.click_button(
        user_id=1001,
        callback_data="check:light:red",
    )
    assert "Langkah 3/3" in step3_res["text"]
    assert "kode error" in step3_res["text"]

    # 4. Operator answers error code: Yes
    triage_res = await client.click_button(
        user_id=1001,
        callback_data="check:error:yes",
    )
    assert "Hasil Pemeriksaan" in triage_res["text"]
    assert "Bu Rina" in triage_res["text"]

    # Verify that a Ticket was generated in DB for MA Nurul Huda
    ticket = (
        db.query(Ticket).filter(Ticket.site_id == huda.id, Ticket.cause == "inverter_fault").first()
    )
    assert ticket is not None
    assert ticket.status == "AWAITING_APPROVAL"

    # Verify Notification generated for Manager
    notif = db.query(Notification).filter_by(ticket_id=ticket.id).first()
    assert notif is not None
    assert "Rp150.000" in notif.text


@pytest.mark.asyncio
async def test_telegram_manual_correction(db):
    client = TelegramMockClient(db)
    huda = db.query(Site).filter_by(name="MA Nurul Huda").first()

    # Click correction
    res = await client.click_button(user_id=1001, callback_data="correct_kwh")
    assert "ketikkan angka" in res["text"]

    # Send manual text
    text_res = await client.send_text(user_id=1001, text="20.5")
    assert "20.5 kWh" in text_res["text"]

    # Check report saved as manual for MA Nurul Huda
    rep = db.query(DailyReport).filter_by(site_id=huda.id, date=datetime.date(2026, 10, 26)).first()
    assert rep is not None
    assert rep.kwh == 20.5
    assert rep.source == "manual"
