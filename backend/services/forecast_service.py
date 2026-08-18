"""
Forecast service using the Open-Meteo Air Quality API hourly forecast.
Provides real 48-hour AQI forecasts for any coordinate globally.
No API key required. Data source: Copernicus CAMS via Open-Meteo.
"""
import aiohttp
from datetime import datetime, timezone
from typing import Dict, List, Optional


FORECAST_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"


def _get_aqi_category(aqi: Optional[float]) -> str:
    if aqi is None:
        return "Unknown"
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"


def _get_health_advisory(aqi: Optional[float]) -> str:
    if aqi is None:
        return "Data unavailable."
    if aqi <= 50:
        return "Air quality is satisfactory. Outdoor activities are safe for all."
    if aqi <= 100:
        return "Air quality is acceptable. Unusually sensitive individuals may experience symptoms."
    if aqi <= 150:
        return "Sensitive groups (elderly, children, those with respiratory conditions) should reduce prolonged outdoor exertion."
    if aqi <= 200:
        return "Everyone may begin to experience health effects. Sensitive groups should avoid prolonged outdoor exertion."
    if aqi <= 300:
        return "Health alert: Everyone may experience more serious health effects. Avoid outdoor physical activities."
    return "Health warning of emergency conditions. The entire population is likely to be affected. Stay indoors."


class ForecastService:
    """
    Provides real 48-hour AQI forecasts from the Open-Meteo Air Quality API.
    Uses the Copernicus Atmosphere Monitoring Service (CAMS) hourly model data.
    """

    async def get_forecast(self, lat: float, lon: float) -> Dict:
        """
        Fetch 48-hour hourly AQI forecast for any coordinate.
        Returns hourly data with AQI, category, and health advisory.
        """
        target_lat = round(float(lat), 4)
        target_lon = round(float(lon), 4)

        params = {
            "latitude": target_lat,
            "longitude": target_lon,
            "hourly": "us_aqi,pm2_5,pm10",
            "forecast_days": 3,  # gives ~72 hours; we'll slice to 48
            "timezone": "auto",
        }

        try:
            timeout = aiohttp.ClientTimeout(total=12)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(FORECAST_URL, params=params) as resp:
                    if resp.status != 200:
                        text = await resp.text()
                        print(f"[Forecast] Open-Meteo returned {resp.status}: {text[:200]}")
                        return self._unavailable_response(target_lat, target_lon)
                    raw = await resp.json()

            hourly = raw.get("hourly", {})
            times = hourly.get("time", [])
            us_aqis = hourly.get("us_aqi", [])
            pm25s = hourly.get("pm2_5", [])
            pm10s = hourly.get("pm10", [])

            if not times:
                return self._unavailable_response(target_lat, target_lon)

            now = datetime.now(timezone.utc)
            forecasts: List[Dict] = []

            for i, time_str in enumerate(times):
                if len(forecasts) >= 48:
                    break

                aqi_val = us_aqis[i] if i < len(us_aqis) else None
                pm25_val = pm25s[i] if i < len(pm25s) else None
                pm10_val = pm10s[i] if i < len(pm10s) else None

                # Parse time
                try:
                    dt = datetime.fromisoformat(time_str)
                except ValueError:
                    continue

                forecasts.append({
                    "timestamp": time_str,
                    "hour": dt.strftime("%H:00"),
                    "date": dt.strftime("%Y-%m-%d"),
                    "day_label": dt.strftime("%a %d %b"),
                    "aqi": round(aqi_val, 1) if aqi_val is not None else None,
                    "aqi_scale": "US AQI",
                    "category": _get_aqi_category(aqi_val),
                    "health_advisory": _get_health_advisory(aqi_val),
                    "pm2_5": round(pm25_val, 1) if pm25_val is not None else None,
                    "pm10": round(pm10_val, 1) if pm10_val is not None else None,
                })

            if not forecasts:
                return self._unavailable_response(target_lat, target_lon)

            valid_aqis = [f["aqi"] for f in forecasts if f["aqi"] is not None]
            stats = {}
            if valid_aqis:
                max_aqi = max(valid_aqis)
                min_aqi = min(valid_aqis)
                avg_aqi = sum(valid_aqis) / len(valid_aqis)
                worst_idx = next(i for i, f in enumerate(forecasts) if f["aqi"] == max_aqi)
                best_idx = next(i for i, f in enumerate(forecasts) if f["aqi"] == min_aqi)
                stats = {
                    "min_aqi": round(min_aqi, 1),
                    "max_aqi": round(max_aqi, 1),
                    "avg_aqi": round(avg_aqi, 1),
                    "worst_hour": forecasts[worst_idx]["timestamp"],
                    "best_hour": forecasts[best_idx]["timestamp"],
                }

            daily = self._daily_summary(forecasts)

            return {
                "available": True,
                "source": "Open-Meteo / CAMS (Copernicus Atmosphere Monitoring Service)",
                "source_note": "48-hour AQI forecast from the Copernicus atmospheric model. Not a ground sensor reading.",
                "aqi_scale": "US AQI (EPA standard)",
                "location": {"lat": target_lat, "lon": target_lon},
                "generated_at": datetime.now().isoformat(),
                "forecasts": forecasts,
                "statistics": stats,
                "daily_summary": daily,
            }

        except Exception as e:
            print(f"[Forecast] Error for ({target_lat}, {target_lon}): {e}")
            return self._unavailable_response(target_lat, target_lon)

    @staticmethod
    def _daily_summary(forecasts: List[Dict]) -> List[Dict]:
        daily: Dict[str, List] = {}
        for f in forecasts:
            date = f["date"]
            if date not in daily:
                daily[date] = []
            if f["aqi"] is not None:
                daily[date].append(f["aqi"])

        result = []
        for date, values in sorted(daily.items()):
            if not values:
                continue
            avg = sum(values) / len(values)
            result.append({
                "date": date,
                "min_aqi": round(min(values), 1),
                "max_aqi": round(max(values), 1),
                "avg_aqi": round(avg, 1),
                "category": _get_aqi_category(avg),
            })
        return result

    @staticmethod
    def _unavailable_response(lat: float, lon: float) -> Dict:
        return {
            "available": False,
            "source": "Open-Meteo / CAMS",
            "source_note": "Forecast data is temporarily unavailable for this location.",
            "aqi_scale": "US AQI (EPA standard)",
            "location": {"lat": lat, "lon": lon},
            "generated_at": datetime.now().isoformat(),
            "forecasts": [],
            "statistics": {},
            "daily_summary": [],
        }
