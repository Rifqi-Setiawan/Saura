from app.agent.guardrails import validate_agent_output
from app.agent.playbook import PROHIBITED_INSTRUCTIONS, SAFE_GUIDED_STEPS
from app.agent.synthesizer import (
    format_assessment_feedback,
    format_daily_reminder,
    format_ocr_confirmation,
    format_triage_result,
)


def test_guardrails_blocks_physical_advice():
    raw_unsafe = "Tolong bapak naik atap lalu bersihkan panel dengan kain basah."
    sanitized, hits = validate_agent_output(raw_unsafe)

    assert len(hits) >= 1
    assert any("prohibited_physical_guidance" in h for h in hits)
    assert "Pemberitahuan Keselamatan" in sanitized
    assert "teknisi bersertifikasi" in sanitized


def test_guardrails_blocks_financial_approval():
    raw_approval = "Tiket disetujui oleh sistem dan dana disetujui otomatis."
    sanitized, hits = validate_agent_output(raw_approval)

    assert len(hits) >= 1
    assert any("financial_approval_attempt" in h for h in hits)
    assert "Persetujuan biaya hanya dapat dilakukan oleh Manajer" in sanitized


def test_playbook_safety():
    for step in SAFE_GUIDED_STEPS:
        q = step["question"].lower()
        ht = step["help_text"].lower()
        for kw in PROHIBITED_INSTRUCTIONS:
            assert kw not in q
            assert kw not in ht


def test_synthesizer_messages():
    # Reminder
    rem = format_daily_reminder("MA Nurul Huda", "Budi", "Pak")
    assert "Pak Budi" in rem
    assert "MA Nurul Huda" in rem

    # OCR confirmation
    ocr_conf = format_ocr_confirmation(20.0, 0.95, "Budi", "Pak")
    assert "20.0 kWh" in ocr_conf
    assert "95%" in ocr_conf

    # Feedback Action
    fb = format_assessment_feedback(
        {
            "status": "ACTION",
            "actual_kwh": 20.0,
            "expected_kwh": 32.0,
            "performance": 0.625,
            "gap_kwh": 12.0,
            "loss_idr": 18000,
        },
        site_name="MA Nurul Huda",
        honorific="Pak",
    )
    assert "PERLU PERHATIAN" in fb or "ACTION" in fb
    assert "20.0 kWh" in fb
    assert "32.0 kWh" in fb
    assert "Rp18.000" in fb

    # Triage Grid Outage
    t_outage = format_triage_result(
        {
            "cause": "grid_outage",
            "description": "PLN padam",
            "recommended_action": "wait_tomorrow",
        },
        site_name="MA Nurul Huda",
    )
    assert "PLN" in t_outage
    assert "tanpa perlu tiket teknisi" in t_outage or "pantau kembali besok" in t_outage
