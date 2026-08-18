"""
Weather service using the Open-Meteo Weather Forecast API (no API key required).
Fetches real current weather for any coordinate on Earth.
"""
import aiohttp
from datetime import datetime
from typing import Optional, Dict
import os
import json

WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(BASE_DIR, "data", "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

WEATHER_CODE_DESCRIPTIONS: Dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snowfall", 73: "Snowfall", 75: "Heavy snowfall",
    77: "Snow grains",
    80: "Light rain showers", 81: "Rain showers", 82: "Heavy rain showers",
    85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
}

WIND_DIRECTION_LABELS = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
]


def _wind_direction_label(degrees: Optional[float]) -> Optional[str]:
    if degrees is None:
        return None
    index = round(degrees / 22.5) % 16
    return WIND_DIRECTION_LABELS[index]


class WeatherService:
    """
    Fetches real current weather from the Open-Meteo Forecast API.
    No API key required. Global coverage.
    """

    async def get_weather_data(self, lat: float, lon: float) -> Optional[Dict]:
        """
        Fetch current weather for any coordinate.
        Returns temperature, apparent_temperature, humidity, wind speed/direction, condition.
        """
        target_lat = round(float(lat), 4)
        target_lon = round(float(lon), 4)

        # 10-minute cache
        bucket = datetime.now().strftime("%Y%m%d%H%M")[:-1]
        cache_file = os.path.join(CACHE_DIR, f"wx_{target_lat}_{target_lon}_{bucket}.json")

        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass

        params = {
            "latitude": target_lat,
            "longitude": target_lon,
            "current": (
                "temperature_2m,apparent_temperature,"
                "relative_humidity_2m,"
                "wind_speed_10m,wind_direction_10m,"
                "surface_pressure,weather_code,"
                "precipitation"
            ),
            "timezone": "auto",
        }

        try:
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(WEATHER_URL, params=params) as resp:
                    if resp.status != 200:
                        print(f"[WX] Open-Meteo weather returned {resp.status}")
                        return None
                    raw = await resp.json()

            current = raw.get("current", {})
            if not current:
                return None

            weather_code = current.get("weather_code")
            wind_deg = current.get("wind_direction_10m")

            result = {
                "available": True,
                "source": "Open-Meteo Weather Forecast API",
                "temperature": current.get("temperature_2m"),
                "feels_like": current.get("apparent_temperature"),
                "humidity": current.get("relative_humidity_2m"),
                "wind_speed": current.get("wind_speed_10m"),
                "wind_direction_degrees": wind_deg,
                "wind_direction": _wind_direction_label(wind_deg),
                "pressure": current.get("surface_pressure"),
                "precipitation": current.get("precipitation"),
                "weather_code": weather_code,
                "condition": WEATHER_CODE_DESCRIPTIONS.get(weather_code, "Unknown"),
                "updated_at": current.get("time", datetime.now().isoformat()),
            }

            try:
                with open(cache_file, "w", encoding="utf-8") as f:
                    json.dump(result, f)
            except Exception:
                pass

            return result

        except Exception as e:
            print(f"[WX] Error fetching weather for ({target_lat}, {target_lon}): {e}")
            return None

    async def get_temperature(self, lat: float, lon: float) -> Optional[float]:
        data = await self.get_weather_data(lat, lon)
        return data.get("temperature") if data else None
