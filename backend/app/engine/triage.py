from typing import Any


def classify_cause(
    answers: dict[str, Any],
    performance: float | None = None,
    actual_kwh: float | None = None,
    irradiance: float | None = None,
    status: str | None = None,
    previous_performances: list[float] | None = None,
) -> dict[str, str]:
    """Classify likely cause of generation anomalies based on guided check answers and data.

    Returns dict with:
    - cause: code ('grid_outage', 'inverter_fault', 'inverter_trip', 'soiling', 'string_down', 'unknown')
    - confidence: 'rendah' | 'sedang' | 'tinggi'
    - recommended_action: 'wait_tomorrow' | 'call_technician'
    - description: localized explanation (using 'dugaan' or 'belum pasti')
    """
    # 1. PLN outage on-grid: inverter stops following PLN; normal behaviour
    if answers.get("pln_outage") is True:
        return {
            "cause": "grid_outage",
            "confidence": "sedang",
            "recommended_action": "wait_tomorrow",
            "description": "Dugaan produksi turun karena pemadaman PLN sehingga inverter otomatis berhenti mengikuti jaringan. Pantau besok.",
        }

    # 2. Inverter error code reported
    if answers.get("has_error_code") is True or bool(answers.get("error_code")):
        return {
            "cause": "inverter_fault",
            "confidence": "tinggi",
            "recommended_action": "call_technician",
            "description": "Dugaan gangguan internal inverter berdasarkan kode error yang tampil di layar. Perlu pemeriksaan teknisi.",
        }

    # 3. Near zero generation when sunny (status CRITICAL)
    if (
        status == "CRITICAL"
        or (actual_kwh is not None and actual_kwh <= 0.5)
        and (irradiance is not None and irradiance >= 2.5)
    ):
        return {
            "cause": "inverter_trip",
            "confidence": "tinggi",
            "recommended_action": "call_technician",
            "description": "Dugaan inverter trip atau mati total saat cuaca cerah. Perlu pemeriksaan teknisi segera.",
        }

    # 4. Gradual performance degradation over several sunny days (soiling)
    # Note: physical cleaning advice disabled pending expert review (Decisions.md #7)
    if (
        previous_performances
        and len(previous_performances) >= 3
        and performance is not None
        and 0.60 <= performance <= 0.80
        and all(p > performance for p in previous_performances[-3:])
    ):
        return {
            "cause": "soiling",
            "confidence": "sedang",
            "recommended_action": "call_technician",
            "description": "Dugaan penurunan bertahap akibat akumulasi debu/kotoran pada panel. Pemeriksaan teknisi disarankan.",
        }

    # 5. Sudden drop to roughly (n-1)/n fraction (string disconnection)
    if (
        previous_performances
        and len(previous_performances) >= 1
        and performance is not None
        and performance < 0.75
    ):
        prev = previous_performances[-1]
        if prev > 0.85:
            ratio_to_prev = performance / prev
            # ~ 0.5 (1 of 2 strings), ~ 0.67 (1 of 3 strings), ~ 0.75 (1 of 4 strings)
            if any(abs(ratio_to_prev - target) < 0.08 for target in [0.50, 0.67, 0.75]):
                return {
                    "cause": "string_down",
                    "confidence": "sedang",
                    "recommended_action": "call_technician",
                    "description": "Dugaan satu string panel terputus atau sekring terbuka. Perlu pemeriksaan teknisi.",
                }

    # 6. Default / unknown
    return {
        "cause": "unknown",
        "confidence": "rendah",
        "recommended_action": "call_technician",
        "description": "Penyebab belum pasti. Perlu pemeriksaan lanjutan atau kunjungan teknisi.",
    }
