"""Jarvis-authored immutable acceptance; implementer must not edit."""
import pytest
from app.engine.acceptance import assess, expected_energy, recovery_status, weekly_totals


def test_expected_energy():
    assert expected_energy(10, 4.05) == pytest.approx(31.995)


@pytest.mark.parametrize('actual,expected,h,status', [
    (20,32,4.05,'ACTION'), (0,24,4.05,'CRITICAL'),
    (15.4,16,4.05,'NORMAL'), (.5,20,1.2,'ACTION'),
])
def test_status_examples(actual, expected, h, status):
    assert assess(actual, expected, h)['status'] == status


def test_money_and_performance():
    result = assess(20,32,4.05)
    assert result['performance'] == pytest.approx(.625)
    assert result['gap_kwh'] == 12
    assert result['loss_idr'] == 18000


def test_suspicious_has_no_operational_status():
    assert assess(45,32,4.05)['status'] is None


def test_no_division_by_zero():
    assert assess(0,0,0)['status'] is None


def test_action_streak():
    assert assess(25.28,32,4, previous_ratios=(.82,.80))['status'] == 'ACTION'


def test_critical_streak():
    assert assess(8,32,4, previous_ratios=(.25,))['status'] == 'CRITICAL'


def test_cloudy_caps_critical_streak():
    assert assess(.5,20,1.2, previous_ratios=(.02,))['status'] == 'ACTION'


def test_weekly_fixture():
    totals = weekly_totals([23,21,20,26,29,30,31], [32]*7)
    assert totals == {'actual_kwh':180,'expected_kwh':224,'gap_kwh':44,'loss_idr':66000}


def test_daily_gap_not_net_gap():
    assert weekly_totals([35,20], [32,32])['gap_kwh'] == 12


def test_recovery():
    assert recovery_status([29/32,30/32,31/32]) == 'RESOLVED'
    assert recovery_status([29/32,20/32]) == 'REOPENED'
    assert recovery_status([.92,.88,.94,.95]) == 'MONITORING'
    assert recovery_status([.92,.88,.94,.95,.96]) == 'RESOLVED'


@pytest.mark.parametrize('value', [-1, float('nan'), float('inf')])
def test_invalid_actual_rejected(value):
    with pytest.raises(ValueError):
        assess(value,32,4.05)
