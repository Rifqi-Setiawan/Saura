import datetime
import random
from typing import Any

from app.engine.expected import calculate_expected_energy


def generate_synthetic_series(
    kwp: float = 10.0,
    pr_base: float = 0.79,
    start_date: datetime.date = datetime.date(2026, 8, 1),
    days: int = 60,
    anomaly_scenario: str | None = None,
    seed: int = 42,
) -> list[dict[str, Any]]:
    """Generate synthetic daily solar production data with labeled anomalies.

    Scenarios:
    - 'normal': slight noise N(1, 0.04)
    - 'soiling': gradual decline starting day 20 (-1% / day)
    - 'string_down': drop to 50% or 67% starting day 30
    - 'inverter_trip': 0 generation for 2 days
    - 'grid_outage': 40% generation on day 25 with pln outage flag
    - 'cloudy': low irradiance days with normal performance
    """
    rng = random.Random(seed)
    records = []

    for i in range(days):
        d = start_date + datetime.timedelta(days=i)

        # Baseline weather: typically 4.0 - 4.5 kWh/m2
        h = round(rng.uniform(3.9, 4.4), 2)
        expected = calculate_expected_energy(kwp, h, pr_base)

        actual = expected * rng.gauss(1.0, 0.03)
        pln_outage = False
        anomaly_label = "normal"

        if anomaly_scenario == "soiling" and i >= 20:
            factor = max(0.60, 1.0 - (i - 20) * 0.012)
            actual = expected * factor * rng.gauss(1.0, 0.02)
            anomaly_label = "soiling"

        elif anomaly_scenario == "string_down" and i >= 30:
            actual = (expected * 0.67) * rng.gauss(1.0, 0.02)
            anomaly_label = "string_down"

        elif anomaly_scenario == "inverter_trip" and 25 <= i <= 26:
            actual = 0.0
            anomaly_label = "inverter_trip"

        elif anomaly_scenario == "grid_outage" and i == 25:
            actual = expected * 0.45
            pln_outage = True
            anomaly_label = "grid_outage"

        elif anomaly_scenario == "cloudy" and 15 <= i <= 17:
            h = round(rng.uniform(1.1, 1.4), 2)
            expected = calculate_expected_energy(kwp, h, pr_base)
            actual = expected * rng.gauss(0.98, 0.03)
            anomaly_label = "cloudy"

        actual = max(0.0, round(actual, 2))
        perf = round(actual / expected, 4) if expected > 0 else 0.0

        records.append(
            {
                "date": d.isoformat(),
                "irradiance": h,
                "expected_kwh": expected,
                "actual_kwh": actual,
                "performance": perf,
                "pln_outage": pln_outage,
                "anomaly_label": anomaly_label,
            }
        )

    return records
