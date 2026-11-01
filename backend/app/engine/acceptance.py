from typing import Any

from app.engine.expected import calculate_expected_energy
from app.engine.money import calculate_weekly_totals
from app.engine.recovery import evaluate_recovery_status
from app.engine.status import assess_status


def expected_energy(kwp: float, irradiance: float, pr: float = 0.79) -> float:
    """Thin facade delegating to calculate_expected_energy."""
    return calculate_expected_energy(kwp=kwp, irradiance=irradiance, pr=pr)


def assess(
    actual_kwh: float,
    expected_kwh: float,
    irradiance: float,
    previous_ratios: tuple[float, ...] | list[float] = (),
    tariff: int = 1500,
) -> dict[str, Any]:
    """Thin facade delegating to assess_status."""
    return assess_status(
        actual_kwh=actual_kwh,
        expected_kwh=expected_kwh,
        irradiance=irradiance,
        previous_ratios=previous_ratios,
        tariff=tariff,
    )


def weekly_totals(actual: list[float], expected: list[float], tariff: int = 1500) -> dict[str, Any]:
    """Thin facade delegating to calculate_weekly_totals."""
    return calculate_weekly_totals(actuals=actual, expecteds=expected, tariff_idr=tariff)


def recovery_status(ratios: list[float] | tuple[float, ...]) -> str:
    """Thin facade delegating to evaluate_recovery_status."""
    return evaluate_recovery_status(ratios=ratios)
