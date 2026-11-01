from typing import Any

from app.agent.guardrails import validate_agent_output


def format_daily_reminder(site_name: str, operator_name: str, honorific: str = "Pak") -> str:
    msg = (
        f"Selamat sore, {honorific} {operator_name}.\n\n"
        f"Mohon kirimkan foto angka E-Today pada layar inverter PLTS {site_name} "
        f"untuk pencatatan kinerja hari ini. Terima kasih!"
    )
    sanitized, _ = validate_agent_output(msg)
    return sanitized


def format_ocr_confirmation(
    kwh: float, confidence: float, operator_name: str = "", honorific: str = "Pak"
) -> str:
    conf_pct = int(round(confidence * 100))
    msg = (
        f"Terbaca E-Today: *{kwh:.1f} kWh* (keyakinan {conf_pct}%).\n\n"
        f"Apakah angka ini sudah sesuai dengan yang tertera di layar inverter, {honorific}?"
    )
    sanitized, _ = validate_agent_output(msg)
    return sanitized


def format_assessment_feedback(
    assessment: dict[str, Any],
    site_name: str,
    honorific: str = "Pak",
    weather_label: str = "Perkiraan menyesuaikan cuaca hari ini.",
) -> str:
    status = assessment.get("status")
    actual = assessment.get("actual_kwh", 0.0)
    expected = assessment.get("expected_kwh", 0.0)
    perf = assessment.get("performance", 0.0)
    perf_pct = int(round((perf or 0.0) * 100))
    gap = assessment.get("gap_kwh", 0.0)
    loss = assessment.get("loss_idr", 0)

    if status == "NORMAL":
        msg = (
            f"Terima kasih {honorific}. Hasil analisis PLTS {site_name} hari ini:\n\n"
            f"• Produksi aktual: *{actual:.1f} kWh*\n"
            f"• Perkiraan cuaca: {expected:.1f} kWh\n"
            f"• Kinerja: *{perf_pct}%* (Status: NORMAL)\n\n"
            f"_{weather_label}_\n"
            f"Kinerja pembangkit terpantau optimal dan sesuai kondisi radiasi matahari."
        )
    elif status == "CRITICAL":
        msg = (
            f"⚠️ *PERINGATAN KRITIS - PLTS {site_name}*\n\n"
            f"• Produksi aktual: *{actual:.1f} kWh*\n"
            f"• Perkiraan cuaca: {expected:.1f} kWh saat cerah\n"
            f"• Status: *CRITICAL*\n\n"
            f"_{weather_label}_\n"
            f"Produksi mendekati nol saat cuaca cerah. Sistem telah membuat usulan tiket pemeriksaan teknisi segera."
        )
    elif status == "ACTION":
        loss_formatted = f"Rp{loss:,}".replace(",", ".")
        msg = (
            f"Laporan tercatat, {honorific}. Hasil analisis PLTS {site_name} hari ini:\n\n"
            f"• Produksi aktual: *{actual:.1f} kWh*\n"
            f"• Perkiraan cuaca: {expected:.1f} kWh\n"
            f"• Kinerja: *{perf_pct}%* (Status: PERLU PERHATIAN / ACTION)\n"
            f"• Selisih produksi: {gap:.1f} kWh (potensi dampak: {loss_formatted})\n\n"
            f"_{weather_label}_\n"
            f"Produksi hari ini di bawah perkiraan optimal. Mohon bantu jawab 3 pertanyaan pemeriksaan ringan."
        )
    else:
        msg = f"Data harian PLTS {site_name} telah tercatat."

    sanitized, _ = validate_agent_output(msg)
    return sanitized


def format_triage_result(triage: dict[str, Any], site_name: str, honorific: str = "Pak") -> str:
    desc = triage.get("description", "")
    action = triage.get("recommended_action")

    if action == "wait_tomorrow":
        msg = (
            f"Terima kasih atas informasinya, {honorific}.\n\n"
            f"💡 *Kesimpulan Awal*: {desc}\n\n"
            f"Karena gangguan bersumber dari jaringan PLN luar, inverter berhenti sementara secara normal demi keamanan. "
            f"Sistem tidak memerlukan kunjungan teknisi saat ini. Kita akan pantau kembali besok."
        )
    else:
        msg = (
            f"Terima kasih atas pemeriksaannya, {honorific}.\n\n"
            f"📋 *Hasil Pemeriksaan*: {desc}\n\n"
            f"Sistem telah mengajukan permohonan tiket teknisi ke Manajer (Bu Rina) "
            f"untuk penjadwalan inspeksi lebih lanjut. Mohon tetap berada di area aman dan tidak mencoba membuka panel kelistrikan."
        )

    sanitized, _ = validate_agent_output(msg)
    return sanitized
