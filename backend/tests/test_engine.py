import pytest
from app.engine.expected import calculate_expected_energy, calibrate_pr
from app.engine.money import calculate_metrics, calculate_weekly_totals
from app.engine.recovery import evaluate_recovery_status
from app.engine.status import assess_status
from app.engine.triage import classify_cause
from app.engine.weather import (
    parse_nasa_power_response,
    parse_open_meteo_response,
    resolve_daily_irradiance,
)


def test_ut01_expected():
    res = calculate_expected_energy(10, 4.05, 0.79)
    assert abs(res - 32.0) <= 0.1


def test_ut02_status_action():
    res = assess_status(20, 32, 4.05)
    assert res["status"] == "ACTION"
    assert res["performance"] == pytest.approx(0.625)
    assert res["loss_idr"] == 18000


def test_ut03_money():
    metrics = calculate_metrics(20, 32, 1500)
    assert metrics["gap_kwh"] == 12.0
    assert metrics["loss_idr"] == 18000


def test_ut04_status_critical():
    res = assess_status(0, 24, 4.05)
    assert res["status"] == "CRITICAL"


def test_ut05_status_cloudy_guard():
    res = assess_status(0.5, 20, 1.2)
    assert res["status"] == "ACTION"
    assert res["reason_code"] == "cloudy_guard"


def test_ut06_status_normal():
    res = assess_status(15.4, 16, 4.05)
    assert res["status"] == "NORMAL"


def test_ut07_status_suspicious():
    res = assess_status(45, 32, 4.05)
    assert res["status"] is None
    assert res["reason_code"] == "suspicious_reading"


def test_ut08_status_streak():
    res = assess_status(25.28, 32, 4.0, previous_ratios=(0.82, 0.80))
    assert res["status"] == "ACTION"
    assert res["reason_code"] == "action_streak"


def test_ut10_recovery_resolved():
    assert evaluate_recovery_status([29 / 32, 30 / 32, 31 / 32]) == "RESOLVED"


def test_ut11_recovery_reopened():
    assert evaluate_recovery_status([29 / 32, 20 / 32]) == "REOPENED"


def test_ut12_weekly():
    actuals = [23, 21, 20, 26, 29, 30, 31]
    expecteds = [32] * 7
    res = calculate_weekly_totals(actuals, expecteds, 1500)
    assert res == {
        "actual_kwh": 180,
        "expected_kwh": 224,
        "gap_kwh": 44,
        "loss_idr": 66000,
    }


def test_ut13_weather_open_meteo():
    payload = {
        "daily": {
            "time": ["2026-10-26"],
            "shortwave_radiation_sum": [14.58],
        }
    }
    val = parse_open_meteo_response(payload, "2026-10-26")
    assert val == 4.05  # 14.58 / 3.6 == 4.05


def test_ut14_weather_nasa_missing():
    payload = {
        "properties": {
            "parameter": {
                "ALLSKY_SFC_SW_DWN": {"20261026": -999},
            }
        }
    }
    val = parse_nasa_power_response(payload, "2026-10-26")
    assert val is None


@pytest.mark.asyncio
async def test_weather_fallback_to_climatology():
    val, source, label = await resolve_daily_irradiance(
        lat=-6.9,
        lon=107.6,
        date_str="2026-10-26",
    )
    # If network fails or in test environment, it resolves
    assert val > 0
    assert source in ["open_meteo", "nasa_power", "nasa_climatology"]
    if source == "nasa_climatology":
        assert label == "Perkiraan menyesuaikan cuaca historis."


def test_triage_patterns():
    # 1. PLN outage
    t1 = classify_cause({"pln_outage": True})
    assert t1["cause"] == "grid_outage"
    assert t1["recommended_action"] == "wait_tomorrow"

    # 2. Error code
    t2 = classify_cause({"has_error_code": True, "error_code": "E04"})
    assert t2["cause"] == "inverter_fault"
    assert t2["recommended_action"] == "call_technician"

    # 3. Critical sunny zero
    t3 = classify_cause({}, status="CRITICAL", actual_kwh=0, irradiance=4.05)
    assert t3["cause"] == "inverter_trip"
    assert t3["recommended_action"] == "call_technician"

    # 4. Gradual decline (soiling)
    t4 = classify_cause(
        {},
        performance=0.68,
        previous_performances=[0.82, 0.77, 0.72],
    )
    assert t4["cause"] == "soiling"
    assert t4["recommended_action"] == "call_technician"

    # 5. String down drop
    t5 = classify_cause(
        {},
        performance=0.48,
        previous_performances=[0.95],
    )
    assert t5["cause"] == "string_down"
    assert t5["recommended_action"] == "call_technician"


def test_calibrate_pr():
    # 7 valid reports
    readings = [(25, 10, 4.0)] * 7  # 25 / 40 = 0.625
    calibrated = calibrate_pr(readings)
    assert calibrated == pytest.approx(0.625)

    # Less than 7 reports -> None
    assert calibrate_pr(readings[:5]) is None

    # Median < 0.60 -> None
    low_readings = [(15, 10, 4.0)] * 7  # 15 / 40 = 0.375 < 0.60
    assert calibrate_pr(low_readings) is None
