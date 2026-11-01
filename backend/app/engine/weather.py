import datetime
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Default Bandung/Java climatology averages by month (kWh/m2/day)
DEFAULT_CLIMATOLOGY: dict[int, float] = {
    1: 3.85,
    2: 4.00,
    3: 4.25,
    4: 4.30,
    5: 4.20,
    6: 4.10,
    7: 4.15,
    8: 4.45,
    9: 4.60,
    10: 4.05,  # Matches demo fixture October value
    11: 3.90,
    12: 3.75,
}


def get_climatology_irradiance(month: int) -> float:
    """Return historical climatology irradiance in kWh/m2/day."""
    return DEFAULT_CLIMATOLOGY.get(month, 4.05)


def parse_open_meteo_response(data: dict[str, Any], date_str: str) -> float | None:
    """Parse Open-Meteo forecast JSON and return irradiance in kWh/m2/day.

    Open-Meteo returns shortwave_radiation_sum in MJ/m2. Divide by 3.6 for kWh/m2.
    """
    daily = data.get("daily", {})
    times = daily.get("time", [])
    rad_sums = daily.get("shortwave_radiation_sum", [])

    if date_str in times:
        idx = times.index(date_str)
        if idx < len(rad_sums):
            val_mj = rad_sums[idx]
            if val_mj is not None and val_mj >= 0:
                return round(float(val_mj) / 3.6, 2)
    return None


def parse_nasa_power_response(data: dict[str, Any], date_str: str) -> float | None:
    """Parse NASA POWER JSON and return irradiance in kWh/m2/day.

    NASA returns ALLSKY_SFC_SW_DWN directly in kWh/m2/day. -999 indicates missing.
    """
    compact_date = date_str.replace("-", "")
    params = data.get("properties", {}).get("parameter", {})
    allsky = params.get("ALLSKY_SFC_SW_DWN", {})

    if compact_date in allsky:
        val = allsky[compact_date]
        if val is not None and val != -999 and val >= 0:
            return round(float(val), 2)
    return None


async def fetch_open_meteo_radiation(
    lat: float,
    lon: float,
    date_str: str,
    timezone: str = "Asia/Jakarta",
    client: httpx.AsyncClient | None = None,
) -> float | None:
    """Fetch daily shortwave radiation from Open-Meteo."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "shortwave_radiation_sum",
        "timezone": timezone,
        "past_days": 7,
    }
    try:
        if client:
            resp = await client.get(url, params=params, timeout=5.0)
            if resp.status_code == 200:
                return parse_open_meteo_response(resp.json(), date_str)
        else:
            async with httpx.AsyncClient() as c:
                resp = await c.get(url, params=params, timeout=5.0)
                if resp.status_code == 200:
                    return parse_open_meteo_response(resp.json(), date_str)
    except Exception as e:
        logger.warning(f"Open-Meteo fetch failed: {e}")
    return None


async def fetch_nasa_power_radiation(
    lat: float,
    lon: float,
    date_str: str,
    client: httpx.AsyncClient | None = None,
) -> float | None:
    """Fetch daily allsky surface solar radiation from NASA POWER."""
    compact_date = date_str.replace("-", "")
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": "ALLSKY_SFC_SW_DWN",
        "community": "RE",
        "latitude": lat,
        "longitude": lon,
        "start": compact_date,
        "end": compact_date,
        "format": "JSON",
    }
    try:
        if client:
            resp = await client.get(url, params=params, timeout=5.0)
            if resp.status_code == 200:
                return parse_nasa_power_response(resp.json(), date_str)
        else:
            async with httpx.AsyncClient() as c:
                resp = await c.get(url, params=params, timeout=5.0)
                if resp.status_code == 200:
                    return parse_nasa_power_response(resp.json(), date_str)
    except Exception as e:
        logger.warning(f"NASA POWER fetch failed: {e}")
    return None


async def resolve_daily_irradiance(
    lat: float,
    lon: float,
    date_str: str,
    timezone: str = "Asia/Jakarta",
    client: httpx.AsyncClient | None = None,
) -> tuple[float, str, str]:
    """Resolve irradiance in order: Open-Meteo -> NASA POWER -> Climatology.

    Returns (irradiance_kwh_m2, weather_source, display_label)
    """
    # 1. Open-Meteo
    om_val = await fetch_open_meteo_radiation(lat, lon, date_str, timezone, client)
    if om_val is not None:
        return om_val, "open_meteo", "Perkiraan menyesuaikan cuaca hari ini."

    # 2. NASA POWER
    nasa_val = await fetch_nasa_power_radiation(lat, lon, date_str, client)
    if nasa_val is not None:
        return nasa_val, "nasa_power", "Perkiraan menyesuaikan cuaca hari ini."

    # 3. Climatology fallback
    try:
        dt = datetime.date.fromisoformat(date_str)
        month = dt.month
    except Exception:
        month = 10
    clim_val = get_climatology_irradiance(month)
    return clim_val, "nasa_climatology", "Perkiraan menyesuaikan cuaca historis."
