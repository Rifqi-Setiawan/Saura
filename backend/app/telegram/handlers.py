import datetime
import logging
from typing import Any

from app.agent.playbook import SAFE_GUIDED_STEPS
from app.agent.synthesizer import (
    format_assessment_feedback,
    format_ocr_confirmation,
    format_triage_result,
)
from app.engine.expected import calculate_expected_energy
from app.engine.status import assess_status
from app.engine.triage import classify_cause
from app.engine.weather import resolve_daily_irradiance
from app.models import (
    Conversation,
    DailyAssessment,
    DailyReport,
    Notification,
    Operator,
    Photo,
    Site,
    Ticket,
    TicketEvent,
    WeatherDaily,
)
from app.ocr.extractor import extract_kwh_from_image
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def get_or_create_conversation(db: Session, operator_id: str) -> Conversation:
    conv = db.query(Conversation).filter_by(operator_id=operator_id).first()
    if not conv:
        conv = Conversation(operator_id=operator_id, state="IDLE", context={})
        db.add(conv)
        db.flush()
    return conv


async def handle_start(telegram_user_id: int, db: Session) -> dict[str, Any]:
    """Handle /start command from Telegram user."""
    operator = db.query(Operator).filter_by(telegram_user_id=telegram_user_id).first()
    if not operator:
        return {
            "text": (
                "Halo! Anda belum terdaftar sebagai operator PLTS di SAURA. "
                "Silakan hubungi administrator sistem untuk mendaftarkan akun Anda."
            ),
            "buttons": [],
        }

    site = db.query(Site).filter_by(operator_id=operator.id).first()
    site_name = site.name if site else "Lokasi Anda"

    conv = get_or_create_conversation(db, operator.id)
    conv.state = "IDLE"
    conv.context = {}
    db.commit()

    return {
        "text": (
            f"Halo {operator.honorific} {operator.name}! Saya Saura, asisten pemantau PLTS {site_name}.\n\n"
            f"Setiap sore sekitar pukul 16:00, saya akan mengingatkan Anda untuk mencatat produksi harian (E-Today). "
            f"Anda cukup mengirimkan foto layar inverter ke chat ini."
        ),
        "buttons": [
            [{"text": "📸 Kirim Laporan Sekarang", "callback_data": "cmd_report"}],
            [{"text": "ℹ️ Panduan Foto", "callback_data": "cmd_guide"}],
        ],
    }


async def handle_photo_upload(
    telegram_user_id: int,
    image_bytes_or_path: bytes | str,
    db: Session,
    target_date: datetime.date | None = None,
) -> dict[str, Any]:
    """Process uploaded inverter photo through OCR and ask operator confirmation."""
    operator = db.query(Operator).filter_by(telegram_user_id=telegram_user_id).first()
    if not operator:
        return {"text": "Operator tidak ditemukan.", "buttons": []}

    site = db.query(Site).filter_by(operator_id=operator.id).first()
    if not site:
        return {"text": "Tidak ada situs PLTS yang terhubung dengan akun Anda.", "buttons": []}

    if target_date is None:
        target_date = datetime.date(2026, 10, 26)  # Default demo date or today

    # Save photo record
    photo = Photo(
        site_id=site.id,
        kind="inverter",
        storage_path=f"photo_{operator.id}_{target_date.isoformat()}.jpg",
    )
    db.add(photo)
    db.flush()

    # Extract OCR
    ocr_result = extract_kwh_from_image(image_bytes_or_path)
    kwh = ocr_result["kwh"]
    conf = ocr_result["confidence"]

    conv = get_or_create_conversation(db, operator.id)
    if kwh is not None:
        conv.state = "AWAITING_CONFIRMATION"
        conv.context = {
            "date": target_date.isoformat(),
            "kwh": kwh,
            "confidence": conf,
            "photo_id": photo.id,
            "site_id": site.id,
        }
        db.commit()

        text = format_ocr_confirmation(
            kwh=kwh,
            confidence=conf,
            operator_name=operator.name,
            honorific=operator.honorific,
        )
        buttons = [
            [
                {"text": "✅ Ya, Benar", "callback_data": f"confirm_kwh:{kwh}"},
                {"text": "✏️ Koreksi Angka", "callback_data": "correct_kwh"},
            ]
        ]
        return {"text": text, "buttons": buttons}
    else:
        conv.state = "AWAITING_MANUAL_KWH"
        conv.context = {
            "date": target_date.isoformat(),
            "photo_id": photo.id,
            "site_id": site.id,
        }
        db.commit()
        return {
            "text": (
                f"Foto telah diterima, namun angka pada layar kurang jelas terbaca, {operator.honorific} {operator.name}.\n\n"
                f"Mohon ketikkan angka kWh harian (E-Today) secara manual (contoh: 20.5):"
            ),
            "buttons": [],
        }


async def process_confirmed_reading(
    operator: Operator,
    site: Site,
    kwh: float,
    source: str,
    photo_id: str | None,
    conf: float | None,
    report_date: datetime.date,
    db: Session,
) -> dict[str, Any]:
    """Save confirmed daily report, run engine assessment, and route status feedback."""
    # Check if report already exists for site & date
    existing_rep = db.query(DailyReport).filter_by(site_id=site.id, date=report_date).first()
    if existing_rep:
        existing_rep.kwh = kwh
        existing_rep.source = source
        existing_rep.photo_id = photo_id or existing_rep.photo_id
        existing_rep.ocr_confidence = conf or existing_rep.ocr_confidence
        existing_rep.confirmed_by_operator = True
        rep = existing_rep
    else:
        rep = DailyReport(
            site_id=site.id,
            date=report_date,
            kwh=kwh,
            source=source,
            photo_id=photo_id,
            ocr_confidence=conf,
            confirmed_by_operator=True,
        )
        db.add(rep)
    db.flush()

    # Resolve irradiance
    weather_row = db.query(WeatherDaily).filter_by(site_id=site.id, date=report_date).first()
    if weather_row:
        irradiance = weather_row.irradiance_kwh_m2
        w_source = weather_row.source
        w_label = "Perkiraan menyesuaikan cuaca hari ini."
    else:
        irradiance, w_source, w_label = await resolve_daily_irradiance(
            lat=site.lat,
            lon=site.lon,
            date_str=report_date.isoformat(),
            timezone=site.timezone,
        )
        # Store weather cache
        db.add(
            WeatherDaily(
                site_id=site.id,
                date=report_date,
                irradiance_kwh_m2=irradiance,
                source=w_source,
            )
        )
        db.flush()

    # Calculate expected energy
    pr = site.pr_calibrated or site.pr_default or 0.79
    expected_kwh = calculate_expected_energy(site.kwp, irradiance, pr)

    # Fetch previous 7 days performance ratios for streak check
    prev_assessments = (
        db.query(DailyAssessment)
        .filter(
            DailyAssessment.site_id == site.id,
            DailyAssessment.date < report_date,
            DailyAssessment.date >= report_date - datetime.timedelta(days=7),
            DailyAssessment.performance.is_not(None),
        )
        .order_by(DailyAssessment.date.asc())
        .all()
    )
    prev_ratios = tuple(a.performance for a in prev_assessments if a.performance is not None)

    # Engine status assessment
    engine_res = assess_status(
        actual_kwh=kwh,
        expected_kwh=expected_kwh,
        irradiance=irradiance,
        previous_ratios=prev_ratios,
        tariff=site.tariff_idr_per_kwh,
    )

    # Upsert DailyAssessment
    existing_ass = db.query(DailyAssessment).filter_by(site_id=site.id, date=report_date).first()
    if existing_ass:
        ass = existing_ass
        ass.report_id = rep.id
        ass.expected_kwh = expected_kwh
        ass.actual_kwh = kwh
        ass.gap_kwh = engine_res["gap_kwh"]
        ass.performance = engine_res["performance"]
        ass.loss_idr = engine_res["loss_idr"]
        ass.status = engine_res["status"]
        ass.reason_code = engine_res["reason_code"]
        ass.weather_source = w_source
    else:
        ass = DailyAssessment(
            site_id=site.id,
            date=report_date,
            report_id=rep.id,
            expected_kwh=expected_kwh,
            actual_kwh=kwh,
            gap_kwh=engine_res["gap_kwh"],
            performance=engine_res["performance"],
            loss_idr=engine_res["loss_idr"],
            status=engine_res["status"],
            reason_code=engine_res["reason_code"],
            weather_source=w_source,
        )
        db.add(ass)
    db.flush()

    # Prepare feedback message
    feedback_text = format_assessment_feedback(
        assessment={
            "status": ass.status,
            "actual_kwh": ass.actual_kwh,
            "expected_kwh": ass.expected_kwh,
            "performance": ass.performance,
            "gap_kwh": ass.gap_kwh,
            "loss_idr": ass.loss_idr,
        },
        site_name=site.name,
        honorific=operator.honorific,
        weather_label=w_label,
    )

    conv = get_or_create_conversation(db, operator.id)

    # Route next steps based on status
    if ass.status in ["ACTION", "CRITICAL"]:
        # Transition to guided check step 1 (PLN Outage)
        conv.state = "GUIDED_CHECK_PLN"
        conv.context = {
            "site_id": site.id,
            "assessment_id": ass.id,
            "status": ass.status,
            "answers": {},
        }
        db.commit()

        step1 = SAFE_GUIDED_STEPS[0]
        question_text = (
            f"{feedback_text}\n\n🔍 *Pemeriksaan Ringan (Langkah 1/3)*:\n{step1['question']}"
        )
        buttons = [
            [
                {"text": "Ya, sempat padam", "callback_data": "check:pln_outage:yes"},
                {"text": "Tidak, normal", "callback_data": "check:pln_outage:no"},
            ]
        ]
        return {"text": question_text, "buttons": buttons}

    else:
        # NORMAL status
        conv.state = "IDLE"
        conv.context = {}
        db.commit()
        return {"text": feedback_text, "buttons": []}


async def handle_callback_query(
    telegram_user_id: int, callback_data: str, db: Session
) -> dict[str, Any]:
    """Handle inline button callback queries from Telegram operator."""
    operator = db.query(Operator).filter_by(telegram_user_id=telegram_user_id).first()
    if not operator:
        return {"text": "Operator tidak terdaftar.", "buttons": []}

    conv = get_or_create_conversation(db, operator.id)
    site = db.query(Site).filter_by(operator_id=operator.id).first()

    # 1. Confirm OCR Reading
    if callback_data.startswith("confirm_kwh:"):
        kwh = float(callback_data.split(":")[1])
        photo_id = conv.context.get("photo_id")
        conf = conv.context.get("confidence")
        d_str = conv.context.get("date", "2026-10-26")
        rep_date = datetime.date.fromisoformat(d_str)

        return await process_confirmed_reading(
            operator=operator,
            site=site,
            kwh=kwh,
            source="ocr",
            photo_id=photo_id,
            conf=conf,
            report_date=rep_date,
            db=db,
        )

    # 2. Correct OCR Reading
    elif callback_data == "correct_kwh":
        conv.state = "AWAITING_MANUAL_KWH"
        db.commit()
        return {
            "text": (
                f"Silakan ketikkan angka kWh harian (E-Today) yang benar, {operator.honorific} (contoh: 20.5):"
            ),
            "buttons": [],
        }

    # 3. Guided Check: PLN Outage
    elif callback_data.startswith("check:pln_outage:"):
        val = callback_data.split(":")[2] == "yes"
        conv.context["answers"]["pln_outage"] = val
        conv.state = "GUIDED_CHECK_LIGHT"
        db.commit()

        step2 = SAFE_GUIDED_STEPS[1]
        return {
            "text": f"🔍 *Pemeriksaan Ringan (Langkah 2/3)*:\n{step2['question']}",
            "buttons": [
                [{"text": "🟢 Hijau normal", "callback_data": "check:light:green"}],
                [{"text": "🔴 Merah / Berkedip", "callback_data": "check:light:red"}],
                [{"text": "⚫ Mati total", "callback_data": "check:light:off"}],
            ],
        }

    # 4. Guided Check: Inverter Light
    elif callback_data.startswith("check:light:"):
        val = callback_data.split(":")[2]
        conv.context["answers"]["inverter_light"] = val
        conv.state = "GUIDED_CHECK_ERROR_CODE"
        db.commit()

        step3 = SAFE_GUIDED_STEPS[2]
        return {
            "text": f"🔍 *Pemeriksaan Ringan (Langkah 3/3)*:\n{step3['question']}",
            "buttons": [
                [
                    {"text": "Ada kode error", "callback_data": "check:error:yes"},
                    {"text": "Tidak ada / normal", "callback_data": "check:error:no"},
                ]
            ],
        }

    # 5. Guided Check: Error Code
    elif callback_data.startswith("check:error:"):
        val = callback_data.split(":")[2] == "yes"
        conv.context["answers"]["has_error_code"] = val

        # Triage evaluation
        answers = conv.context.get("answers", {})
        status = conv.context.get("status")

        triage_res = classify_cause(answers, status=status)
        conv.state = "IDLE"
        db.commit()

        # If technician required, create ticket & notification
        if triage_res["recommended_action"] == "call_technician" and site:
            # Generate ticket code e.g. SA-025
            existing_count = db.query(Ticket).count()
            code = f"SA-{existing_count + 1:03d}"

            ticket = Ticket(
                code=code,
                site_id=site.id,
                status="AWAITING_APPROVAL",
                priority="critical" if status == "CRITICAL" else "normal",
                reason=triage_res["description"],
                cause=triage_res["cause"],
                technician_id=site.technician_id,
                estimated_cost_idr=150000,
            )
            db.add(ticket)
            db.flush()

            # Event
            db.add(
                TicketEvent(
                    ticket_id=ticket.id,
                    type="created",
                    actor_user_id=None,
                    note=f"Dibuat otomatis oleh SauraAI berdasarkan triage: {triage_res['cause']}",
                )
            )

            # Notification to manager
            if site.manager_id:
                db.add(
                    Notification(
                        user_id=site.manager_id,
                        site_id=site.id,
                        ticket_id=ticket.id,
                        text=f"Tiket {code} ({site.name}) memerlukan persetujuan jadwal dan biaya Rp150.000",
                    )
                )
            db.commit()

        final_text = format_triage_result(
            triage_res,
            site_name=site.name if site else "PLTS",
            honorific=operator.honorific,
        )
        return {"text": final_text, "buttons": []}

    return {"text": "Perintah tidak dikenali.", "buttons": []}


async def handle_text_message(telegram_user_id: int, text: str, db: Session) -> dict[str, Any]:
    """Handle text input from operator (e.g. manual kWh input or questions)."""
    operator = db.query(Operator).filter_by(telegram_user_id=telegram_user_id).first()
    if not operator:
        return {"text": "Operator tidak terdaftar.", "buttons": []}

    conv = get_or_create_conversation(db, operator.id)
    site = db.query(Site).filter_by(operator_id=operator.id).first()

    # Manual kWh input
    if conv.state == "AWAITING_MANUAL_KWH":
        clean_num = text.replace(",", ".").strip()
        try:
            kwh = float(clean_num)
            if kwh < 0 or kwh > 500:
                return {
                    "text": "Angka kWh tidak valid (harus antara 0 s.d. 500). Mohon ketikkan kembali:",
                    "buttons": [],
                }

            photo_id = conv.context.get("photo_id")
            d_str = conv.context.get("date", "2026-10-26")
            rep_date = datetime.date.fromisoformat(d_str)

            return await process_confirmed_reading(
                operator=operator,
                site=site,
                kwh=kwh,
                source="manual",
                photo_id=photo_id,
                conf=1.0,
                report_date=rep_date,
                db=db,
            )

        except ValueError:
            return {
                "text": "Format angka tidak dikenali. Mohon ketikkan hanya angka kWh (contoh: 20.5):",
                "buttons": [],
            }

    # General questions / chat
    return {
        "text": (
            f"Halo {operator.honorific} {operator.name}. Silakan kirimkan foto layar inverter "
            f"atau gunakan tombol menu untuk bantuan."
        ),
        "buttons": [[{"text": "📸 Kirim Laporan Hari Ini", "callback_data": "cmd_report"}]],
    }
