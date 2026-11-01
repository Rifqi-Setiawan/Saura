import csv
import io
from typing import Any


def generate_weekly_csv(site_name: str, days_data: list[dict[str, Any]]) -> str:
    """Generate CSV string of daily solar metrics for a site."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(
        [
            "Tanggal",
            "Situs",
            "Aktual (kWh)",
            "Perkiraan (kWh)",
            "Selisih (kWh)",
            "Kinerja (%)",
            "Status",
            "Potensi Kerugian (IDR)",
            "Sumber Cuaca",
        ]
    )

    for d in days_data:
        perf = d.get("performance")
        perf_pct = f"{round(perf * 100, 1)}%" if perf is not None else "-"
        writer.writerow(
            [
                d.get("date"),
                site_name,
                d.get("actual_kwh", "-"),
                d.get("expected_kwh", "-"),
                d.get("gap_kwh", "-"),
                perf_pct,
                d.get("status", "-"),
                d.get("loss_idr", 0),
                d.get("weather_source", "-"),
            ]
        )

    return output.getvalue()
