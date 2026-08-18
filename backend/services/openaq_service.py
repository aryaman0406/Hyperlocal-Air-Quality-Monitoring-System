"""Live air-quality provider using Open-Meteo's no-key API."""
import asyncio
from datetime import datetime
import json
import os

import requests


class OpenAQService:
    """Kept under its original name to preserve the existing API wiring."""

    def __init__(self):
        self.base_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        self.lat = 28.6139
        self.lon = 77.2090
        self.cache_dir = "data/cache"
        os.makedirs(self.cache_dir, exist_ok=True)

    async def get_latest_data(self, lat: float = None, lon: float = None):
        """Fetch current AQI and pollutant concentrations without an API key."""
        target_lat = lat if lat is not None else self.lat
        target_lon = lon if lon is not None else self.lon
        cache_key = f"latest_aqi_{target_lat:.3f}_{target_lon:.3f}_{datetime.now().strftime('%Y%m%d%H%M')[:-1]}"
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")

        try:
            if os.path.exists(cache_file):
                with open(cache_file, "r", encoding="utf-8") as cache:
                    return json.load(cache)

            params = {
                "latitude": target_lat,
                "longitude": target_lon,
                "current": "us_aqi,pm2_5,pm10,nitrogen_dioxide,carbon_monoxide",
                "timezone": "auto",
            }
            response = await asyncio.to_thread(requests.get, self.base_url, params=params, timeout=10)
            response.raise_for_status()
            current = response.json().get("current", {})
            if not current:
                raise ValueError("Air-quality provider returned no current data")

            result = {
                "results": [{
                    "location": "Open-Meteo modelled air quality",
                    "coordinates": {"latitude": target_lat, "longitude": target_lon},
                    "measurements": {
                        "us_aqi": current.get("us_aqi"),
                        "pm25": current.get("pm2_5"),
                        "pm10": current.get("pm10"),
                        "no2": current.get("nitrogen_dioxide"),
                        "co": current.get("carbon_monoxide"),
                    },
                    "last_updated": current.get("time"),
                }],
                "timestamp": datetime.now().isoformat(),
                "source": "Open-Meteo",
            }
            with open(cache_file, "w", encoding="utf-8") as cache:
                json.dump(result, cache)
            return result
        except Exception as error:
            print(f"Air-quality provider error: {error}. Returning temporary fallback data.")
            return self._get_fallback_data(target_lat, target_lon)

    @staticmethod
    def _get_fallback_data(lat: float, lon: float):
        return {
            "results": [{
                "location": "Live provider temporarily unavailable",
                "coordinates": {"latitude": lat, "longitude": lon},
                "measurements": {"us_aqi": 0, "pm25": 0, "pm10": 0, "no2": 0, "co": 0},
                "last_updated": datetime.now().isoformat(),
            }],
            "timestamp": datetime.now().isoformat(),
            "source": "fallback",
        }
