from typing import Any


def calculate_metrics(
    actual_kwh: float, expected_kwh: float, tariff_idr: int = 1500
) -> dict[str, Any]:
    """Calculate performance ratio, energy gap (kWh), and financial loss (IDR).

    Formula:
    performance = actual / expected
    gap = max(0, expected - actual)
    loss = gap * tariff
    """
    if expected_kwh <= 0:
        return {
            "performance": None,
            "gap_kwh": 0.0,
            "loss_idr": 0,
        }

    performance = float(actual_kwh) / float(expected_kwh)
    gap_kwh = max(0.0, float(expected_kwh) - float(actual_kwh))
    loss_idr = int(round(gap_kwh * tariff_idr))

    return {
        "performance": performance,
        "gap_kwh": gap_kwh,
        "loss_idr": loss_idr,
    }


def calculate_weekly_totals(
    actuals: list[float], expecteds: list[float], tariff_idr: int = 1500
) -> dict[str, Any]:
    """Calculate weekly totals per document 04:

    Total energy = sum(actual)
    Total expected = sum(expected)
    Total gap = sum(daily gaps) (not net gap)
    Total loss IDR = sum(daily gap * tariff)
    """
    if len(actuals) != len(expecteds):
        raise ValueError("actuals and expecteds lists must have the same length")

    total_actual = float(sum(actuals))
    total_expected = float(sum(expecteds))

    total_gap = 0.0
    total_loss = 0

    for act, exp in zip(actuals, expecteds, strict=False):
        gap = max(0.0, float(exp) - float(act))
        total_gap += gap
        total_loss += int(round(gap * tariff_idr))

    return {
        "actual_kwh": int(total_actual) if total_actual.is_integer() else round(total_actual, 2),
        "expected_kwh": (
            int(total_expected) if total_expected.is_integer() else round(total_expected, 2)
        ),
        "gap_kwh": int(total_gap) if total_gap.is_integer() else round(total_gap, 2),
        "loss_idr": total_loss,
    }


def format_currency_idr(amount: int) -> str:
    """Format integer rupiah with dot separator: e.g. 18000 -> 'Rp18.000'"""
    formatted = f"{amount:,}".replace(",", ".")
    return f"Rp{formatted}"


def format_kwh(value: float) -> str:
    """Format kWh with comma decimal: e.g. 20.0 -> '20,0 kWh'"""
    formatted = f"{value:.1f}".replace(".", ",")
    return f"{formatted} kWh"


def format_percent(ratio: float) -> str:
    """Format ratio to percent: e.g. 0.97 -> '97%'"""
    pct = round(ratio * 100)
    return f"{pct}%"
