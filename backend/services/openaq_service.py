"""
Live air-quality data provider using the Open-Meteo Air Quality API (no API key required).
Fetches real atmospheric model data for any coordinate on Earth.
"""
import asyncio
from datetime import datetime
import json
import os
import aiohttp
from typing import Optional, Dict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(BASE_DIR, "data", "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

# Fields to request from Open-Meteo Air Quality API
AQ_CURRENT_FIELDS = (
    "us_aqi,european_aqi,"
    "pm2_5,pm10,"
    "nitrogen_dioxide,sulphur_dioxide,ozone,"
    "carbon_monoxide"
)


class OpenAQService:
    """
    Fetches real air quality data from the Open-Meteo Air Quality API.
    No API key required. Covers the entire globe using atmospheric models.
    Data source: Copernicus Atmosphere Monitoring Service (CAMS) via Open-Meteo.
    """

    async def get_latest_data(self, lat: float, lon: float) -> Dict:
        """
        Fetch current AQI and pollutant concentrations for any global coordinate.
        Returns structured data with US AQI, European AQI, PM2.5, PM10, O3, NO2, SO2, CO.
        """
        target_lat = round(float(lat), 4)
        target_lon = round(float(lon), 4)

        # 10-minute file cache to avoid hammering the API
        bucket = datetime.now().strftime("%Y%m%d%H%M")[:-1]  # 10-min bucket
        cache_key = f"aq_{target_lat}_{target_lon}_{bucket}"
        cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")

        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass

        params = {
            "latitude": target_lat,
            "longitude": target_lon,
            "current": AQ_CURRENT_FIELDS,
            "timezone": "auto",
        }

        try:
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(AIR_QUALITY_URL, params=params) as resp:
                    if resp.status != 200:
                        text = await resp.text()
                        print(f"[AQ] Open-Meteo returned {resp.status}: {text[:200]}")
                        return self._unavailable_response(target_lat, target_lon)

                    raw = await resp.json()

            current = raw.get("current", {})
            if not current:
                return self._unavailable_response(target_lat, target_lon)

            us_aqi = current.get("us_aqi")
            eu_aqi = current.get("european_aqi")
            pm25 = current.get("pm2_5")
            pm10 = current.get("pm10")
            no2 = current.get("nitrogen_dioxide")
            so2 = current.get("sulphur_dioxide")
            ozone = current.get("ozone")
            co = current.get("carbon_monoxide")
            updated_at = current.get("time", datetime.now().isoformat())

            # At minimum we need either us_aqi or pm25 to be valid
            if us_aqi is None and pm25 is None:
                return self._unavailable_response(target_lat, target_lon)

            result = {
                "available": True,
                "source": "Open-Meteo / CAMS Atmospheric Model",
                "source_note": "Coordinate-based atmospheric model data. Not a physical ground sensor.",
                "location": {"lat": target_lat, "lon": target_lon},
                "aqi": {
                    "us_aqi": us_aqi,
                    "european_aqi": eu_aqi,
                    "scale": "US AQI (EPA standard)"
                },
                "pollutants": {
                    "pm2_5": pm25,
                    "pm10": pm10,
                    "ozone": ozone,
                    "nitrogen_dioxide": no2,
                    "sulphur_dioxide": so2,
                    "carbon_monoxide": co,
                },
                "updated_at": updated_at,
                # Legacy compat field used by some existing endpoints
                "results": [{
                    "location": "Open-Meteo CAMS Model",
                    "coordinates": {"latitude": target_lat, "longitude": target_lon},
                    "measurements": {
                        "us_aqi": us_aqi,
                        "pm25": pm25,
                        "pm10": pm10,
                        "ozone": ozone,
                        "no2": no2,
                        "so2": so2,
                        "co": co,
                    },
                    "last_updated": updated_at,
                }],
                "timestamp": datetime.now().isoformat(),
            }

            # Write to cache
            try:
                with open(cache_file, "w", encoding="utf-8") as f:
                    json.dump(result, f)
            except Exception:
                pass

            return result

        except asyncio.TimeoutError:
            print(f"[AQ] Timeout fetching air quality for ({target_lat}, {target_lon})")
            return self._unavailable_response(target_lat, target_lon)
        except Exception as e:
            print(f"[AQ] Error fetching air quality for ({target_lat}, {target_lon}): {e}")
            return self._unavailable_response(target_lat, target_lon)

    @staticmethod
    def _unavailable_response(lat: float, lon: float) -> Dict:
        """
        Returns an honest 'data unavailable' response without fake numbers.
        """
        return {
            "available": False,
            "source": "Open-Meteo / CAMS Atmospheric Model",
            "source_note": "Air quality data is temporarily unavailable for this location.",
            "location": {"lat": lat, "lon": lon},
            "aqi": {"us_aqi": None, "european_aqi": None, "scale": "US AQI (EPA standard)"},
            "pollutants": {
                "pm2_5": None,
                "pm10": None,
                "ozone": None,
                "nitrogen_dioxide": None,
                "sulphur_dioxide": None,
                "carbon_monoxide": None,
            },
            "updated_at": datetime.now().isoformat(),
            "results": [],
            "timestamp": datetime.now().isoformat(),
        }
