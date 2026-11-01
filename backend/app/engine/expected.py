import statistics


def calculate_expected_energy(kwp: float, irradiance: float, pr: float = 0.79) -> float:
    """Calculate expected energy generation in kWh.

    Formula: E_expected = P_kWp * H * PR
    """
    if kwp < 0 or irradiance < 0 or pr < 0:
        raise ValueError("Parameters kwp, irradiance, and pr must be non-negative")
    return float(kwp) * float(irradiance) * float(pr)


def calibrate_pr(
    valid_actual_kwp_h: list[tuple[float, float, float]],
) -> float | None:
    """Calibrate PR from at least 7 valid non-critical reports.

    Tuples: (actual_kwh, kwp, irradiance_h)
    Returns median clamped in [0.60, 0.90].
    If median < 0.60, returns None (system requires technician check).
    """
    if len(valid_actual_kwp_h) < 7:
        return None

    ratios: list[float] = []
    for actual, kwp, h in valid_actual_kwp_h:
        ideal = kwp * h
        if ideal > 0 and actual >= 0:
            ratios.append(actual / ideal)

    if not ratios:
        return None

    med = statistics.median(ratios)
    if med < 0.60:
        return None
    return float(min(0.90, max(0.60, med)))
