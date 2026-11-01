import math
from typing import Any

from app.engine.money import calculate_metrics

# Default thresholds from docs/source/04-mesin-analisis.md
DEFAULT_THRESHOLDS = {
    "critical_ratio": 0.05,
    "critical_min_irradiance": 2.5,
    "critical_two_day_ratio": 0.30,
    "action_ratio": 0.75,
    "action_streak_ratio": 0.85,
    "action_streak_days": 3,
    "cloudy_irradiance": 1.5,
    "suspicious_ratio": 1.3,
    "recovery_ratio": 0.90,
    "recovery_days": 3,
    "no_data_cutoff": "20:00",
}


def assess_status(
    actual_kwh: float,
    expected_kwh: float,
    irradiance: float,
    previous_ratios: tuple[float, ...] | list[float] = (),
    tariff: int = 1500,
    thresholds: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Pure deterministic engine to assess daily solar generation status.

    Returns dict with keys:
    - status: 'NORMAL', 'ACTION', 'CRITICAL', or None
    - performance: float or None
    - gap_kwh: float or None
    - loss_idr: int or None
    - reason_code: str
    """
    cfg = {**DEFAULT_THRESHOLDS, **(thresholds or {})}

    # Validate numeric inputs
    for name, val in [
        ("actual_kwh", actual_kwh),
        ("expected_kwh", expected_kwh),
        ("irradiance", irradiance),
    ]:
        if math.isnan(val) or math.isinf(val):
            raise ValueError(f"{name} must be a finite number")
        if val < 0:
            raise ValueError(f"{name} cannot be negative: {val}")

    # Irradiance or expected zero -> unavailable assessment, no division by zero
    if expected_kwh <= 0 or irradiance <= 0:
        return {
            "status": None,
            "performance": None,
            "gap_kwh": None,
            "loss_idr": None,
            "reason_code": "unavailable_irradiance" if irradiance <= 0 else "zero_expected",
        }

    metrics = calculate_metrics(actual_kwh, expected_kwh, tariff)
    performance = metrics["performance"]
    gap_kwh = metrics["gap_kwh"]
    loss_idr = metrics["loss_idr"]

    # Suspicious reading (> suspicious_ratio * expected)
    if actual_kwh > cfg["suspicious_ratio"] * expected_kwh:
        return {
            "status": None,
            "performance": performance,
            "gap_kwh": gap_kwh,
            "loss_idr": loss_idr,
            "reason_code": "suspicious_reading",
        }

    # Evaluate Critical conditions
    is_rule_critical_single = (
        actual_kwh < cfg["critical_ratio"] * expected_kwh
        and irradiance >= cfg["critical_min_irradiance"]
    )
    is_rule_critical_streak = (
        performance < cfg["critical_two_day_ratio"]
        and len(previous_ratios) >= 1
        and previous_ratios[-1] < cfg["critical_two_day_ratio"]
    )
    is_raw_critical_candidate = (
        actual_kwh < cfg["critical_ratio"] * expected_kwh or is_rule_critical_streak
    )

    # Cloudy guard: irradiance < cloudy_irradiance caps severity at ACTION
    if irradiance < cfg["cloudy_irradiance"]:
        if is_raw_critical_candidate:
            return {
                "status": "ACTION",
                "performance": performance,
                "gap_kwh": gap_kwh,
                "loss_idr": loss_idr,
                "reason_code": "cloudy_guard",
            }

    if is_rule_critical_single or is_rule_critical_streak:
        return {
            "status": "CRITICAL",
            "performance": performance,
            "gap_kwh": gap_kwh,
            "loss_idr": loss_idr,
            "reason_code": (
                "below_critical_ratio" if is_rule_critical_single else "critical_streak"
            ),
        }

    # Evaluate Action conditions
    is_rule_action_single = performance < cfg["action_ratio"]
    is_rule_action_streak = (
        performance < cfg["action_streak_ratio"]
        and len(previous_ratios) >= 2
        and previous_ratios[-1] < cfg["action_streak_ratio"]
        and previous_ratios[-2] < cfg["action_streak_ratio"]
    )

    if is_rule_action_single or is_rule_action_streak:
        return {
            "status": "ACTION",
            "performance": performance,
            "gap_kwh": gap_kwh,
            "loss_idr": loss_idr,
            "reason_code": "below_action_ratio" if is_rule_action_single else "action_streak",
        }

    # Normal condition
    return {
        "status": "NORMAL",
        "performance": performance,
        "gap_kwh": gap_kwh,
        "loss_idr": loss_idr,
        "reason_code": "normal",
    }
