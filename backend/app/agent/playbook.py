"""Approved safe playbook for operator guided checks.

Per decisions.md #7: Physical maintenance guidance (roof access, opening panels, cleaning)
is strictly disabled pending expert review. Only safe ground-level visual inspection is permitted.
"""

from typing import Any

SAFE_GUIDED_STEPS: list[dict[str, Any]] = [
    {
        "step_id": "pln_outage",
        "question": "Apakah listrik PLN di lokasi sempat padam hari ini?",
        "options": [
            {"label": "Ya, sempat padam", "value": True},
            {"label": "Tidak, menyala normal", "value": False},
        ],
        "help_text": "Inverter on-grid otomatis berhenti bekerja saat PLN padam demi keselamatan.",
    },
    {
        "step_id": "inverter_light",
        "question": "Bagaimana kondisi lampu indikator pada inverter?",
        "options": [
            {"label": "Hijau normal", "value": "green"},
            {"label": "Merah / Berkedip", "value": "red"},
            {"label": "Mati total", "value": "off"},
        ],
        "help_text": "Cukup amati dari jarak aman di lantai tanpa menyentuh perangkat.",
    },
    {
        "step_id": "has_error_code",
        "question": "Apakah ada kode error atau tulisan peringatan di layar inverter?",
        "options": [
            {"label": "Ada kode error", "value": True},
            {"label": "Tidak ada / normal", "value": False},
        ],
        "help_text": "Contoh: E04, Grid Fault, Isol Error.",
    },
]

PROHIBITED_INSTRUCTIONS: list[str] = [
    "naik atap",
    "ke atap",
    "bersihkan panel",
    "cuci panel",
    "lap panel",
    "buka panel listrik",
    "buka inverter",
    "buka penutup",
    "periksa kabel",
    "pegang kabel",
    "colok kabel",
    "ukur tegangan",
    "multimeter",
    "kabel dc",
    "bongkar",
]


def get_step_by_id(step_id: str) -> dict[str, Any] | None:
    for step in SAFE_GUIDED_STEPS:
        if step["step_id"] == step_id:
            return step
    return None
