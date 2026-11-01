import re

from app.agent.playbook import PROHIBITED_INSTRUCTIONS

FINANCIAL_APPROVAL_PATTERNS = [
    r"saya menyetujui biaya",
    r"tiket disetujui oleh sistem",
    r"dana disetujui oleh ai",
    r"anggaran disetujui otomatis",
    r"biaya telah kami setujui",
]

STATUS_TAMPER_PATTERNS = [
    r"status diubah menjadi normal secara manual",
    r"mengabaikan status critical",
    r"mengabaikan status action",
]


def validate_agent_output(message: str) -> tuple[str, list[str]]:
    """Enforce security, safety, and non-override boundaries on synthesized messages.

    Returns (sanitized_message, list_of_guardrail_hits).
    """
    hits = []
    sanitized = message
    lower = message.lower()

    # 1. Prohibited Physical Maintenance instructions check
    found_physical = []
    for keyword in PROHIBITED_INSTRUCTIONS:
        if keyword in lower:
            found_physical.append(keyword)

    if found_physical:
        hits.append(f"prohibited_physical_guidance: {', '.join(found_physical)}")
        # Append clear safety override
        safety_notice = (
            "\n\n⚠️ *Pemberitahuan Keselamatan*: Pemeriksaan atap, pembersihan panel, "
            "atau penanganan kelistrikan bertegangan tinggi hanya boleh dilakukan oleh "
            "teknisi bersertifikasi dengan APD lengkap. Operator tidak disarankan melakukan tindakan fisik mandiri."
        )
        sanitized = f"{sanitized}{safety_notice}"

    # 2. Financial approval boundary check
    for pat in FINANCIAL_APPROVAL_PATTERNS:
        if re.search(pat, lower):
            hits.append(f"financial_approval_attempt: {pat}")
            sanitized = re.sub(
                pat,
                "[Persetujuan biaya hanya dapat dilakukan oleh Manajer melalui portal web]",
                sanitized,
                flags=re.IGNORECASE,
            )

    # 3. Status override boundary check
    for pat in STATUS_TAMPER_PATTERNS:
        if re.search(pat, lower):
            hits.append(f"status_tamper_attempt: {pat}")
            sanitized = re.sub(
                pat,
                "[Status operasional ditentukan secara deterministik oleh mesin analisis]",
                sanitized,
                flags=re.IGNORECASE,
            )

    return sanitized, hits
