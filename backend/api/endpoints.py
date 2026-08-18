from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from pydantic import BaseModel
import uuid

from services.openaq_service import OpenAQService
from services.prediction_service import PredictionService
from services.hotspot_service import HotspotService
from services.health_service import HealthService
from services.forecast_service import ForecastService
from services.export_service import ExportService
from services.location_service import LocationService
from services.comparison_service import ComparisonService
from services.weather_service import WeatherService
from models.database import HistoricalDatabase, AQIReading, FavoriteLocation
from models.schemas import SymptomLog, Venue, UserReport

router = APIRouter()
openaq_service = OpenAQService()
prediction_service = PredictionService()
hotspot_service = HotspotService()
health_service = HealthService()
forecast_service = ForecastService()
export_service = ExportService()
location_service = LocationService()
comparison_service = ComparisonService()
weather_service = WeatherService()
db = HistoricalDatabase()


# ── Pydantic request models ──────────────────────────────────────────────────

class FavoriteRequest(BaseModel):
    name: str
    lat: float
    lon: float

class SymptomRequest(BaseModel):
    lat: float
    lon: float
    aqi: float
    symptoms: List[str]
    severity: int

class VenueRequest(BaseModel):
    name: str
    type: str
    lat: float
    lon: float
    safety_threshold: float

class ReportRequest(BaseModel):
    lat: float
    lon: float
    type: str
    description: str
    image_url: Optional[str] = None

class ProfileRequest(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


# ── Core AQI Endpoints ───────────────────────────────────────────────────────

@router.get("/aqi/live")
async def get_live_aqi(
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude")
):
    """Fetch real-time AQ data from Open-Meteo/CAMS for any location."""
    if lat is None or lon is None:
        raise HTTPException(status_code=400, detail="lat and lon are required")
    return await openaq_service.get_latest_data(lat, lon)


@router.get("/aqi/grid")
async def get_aqi_grid(
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
    radius_km: float = Query(5, ge=1, le=25, description="Map radius in kilometres")
):
    """Get a bounded AQI grid suitable for rendering in a browser map."""
    return await prediction_service.get_full_grid(lat=lat, lon=lon, radius_km=radius_km)


@router.get("/aqi/hotspots")
async def get_hotspots(
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude")
):
    """Identify pollution hotspots and corridors."""
    return await hotspot_service.get_hotspots(lat=lat, lon=lon)


@router.get("/aqi/location")
async def get_location_aqi(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """
    Get real AQI and weather data for any location worldwide.
    Returns null for unavailable fields rather than fake placeholder values.
    """
    # Fetch AQI and weather concurrently
    import asyncio
    aq_task = asyncio.create_task(openaq_service.get_latest_data(lat, lon))
    wx_task = asyncio.create_task(weather_service.get_weather_data(lat, lon))

    aq_data = await aq_task
    wx_data = await wx_task

    # Reverse geocode for location name (best-effort)
    address = f"{lat:.4f}, {lon:.4f}"
    try:
        geo = location_service.reverse_geocode(lat, lon)
        if geo and geo.get("address"):
            address = geo["address"]
    except Exception as ge:
        print(f"[Location] Reverse geocode failed: {ge}")

    aqi_val = None
    if aq_data.get("available") and aq_data.get("aqi"):
        aqi_val = aq_data["aqi"].get("us_aqi")

    return {
        "location": {"lat": lat, "lon": lon, "address": address},
        "aqi": aqi_val,
        "aqi_scale": "US AQI (EPA standard)",
        "aqi_category": health_service._get_category(aqi_val) if aqi_val is not None else None,
        "pollutants": aq_data.get("pollutants") if aq_data.get("available") else None,
        "weather": wx_data,
        "temperature": wx_data.get("temperature") if wx_data else None,
        "data_available": aq_data.get("available", False),
        "source": aq_data.get("source"),
        "source_note": aq_data.get("source_note"),
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/alerts")
async def get_alerts(lat: float, lon: float):
    """Get real-time AQI and health status for a specific location."""
    return await prediction_service.get_alerts(lat, lon)


# ── Aggregate Location Data (single call for dashboard) ─────────────────────

@router.get("/location-data")
async def get_location_data(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """
    Aggregate endpoint: returns real AQI + weather + reverse geocode in one call.
    Used by the dashboard to minimise round trips.
    """
    import asyncio
    aq_task = asyncio.create_task(openaq_service.get_latest_data(lat, lon))
    wx_task = asyncio.create_task(weather_service.get_weather_data(lat, lon))

    aq_data = await aq_task
    wx_data = await wx_task

    address = f"{lat:.4f}, {lon:.4f}"
    try:
        geo = location_service.reverse_geocode(lat, lon)
        if geo and geo.get("address"):
            address = geo["address"]
    except Exception:
        pass

    aqi_val = None
    if aq_data.get("available") and aq_data.get("aqi"):
        aqi_val = aq_data["aqi"].get("us_aqi")

    return {
        "location": {"lat": lat, "lon": lon, "address": address},
        "aqi": aqi_val,
        "aqi_scale": "US AQI (EPA standard)",
        "aqi_category": health_service._get_category(aqi_val) if aqi_val is not None else None,
        "pollutants": aq_data.get("pollutants") if aq_data.get("available") else None,
        "weather": wx_data,
        "aq_available": aq_data.get("available", False),
        "wx_available": wx_data is not None,
        "source": aq_data.get("source"),
        "source_note": aq_data.get("source_note"),
        "timestamp": datetime.now().isoformat(),
    }


# ── Weather ──────────────────────────────────────────────────────────────────

@router.get("/weather")
async def get_weather(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """Get current weather for any coordinate from Open-Meteo."""
    data = await weather_service.get_weather_data(lat, lon)
    if data is None:
        raise HTTPException(status_code=503, detail="Weather data temporarily unavailable")
    return data


# ── User Profile ─────────────────────────────────────────────────────────────

@router.get("/profile")
async def get_profile():
    """Get the saved user profile."""
    profile = db.get_profile()
    return {"profile": profile}


@router.post("/profile")
async def save_profile(request: ProfileRequest):
    """
    Save or update the user profile (name, city, country, home coordinates).
    If city is provided but lat/lon are not, attempts to geocode the city.
    """
    profile = request.model_dump(exclude_none=True)

    # Auto-geocode if city given but coordinates missing
    if ("city" in profile) and ("lat" not in profile or "lon" not in profile):
        query = f"{profile.get('city')}, {profile.get('country', '')}"
        try:
            geo = location_service.geocode_address(query.strip(", "))
            if geo:
                profile["lat"] = geo["lat"]
                profile["lon"] = geo["lon"]
        except Exception as e:
            print(f"[Profile] Geocoding failed: {e}")

    db.save_profile(profile)
    return {"message": "Profile saved", "profile": profile}


# ── Health Recommendations ───────────────────────────────────────────────────

@router.get("/health/recommendations")
async def get_health_recommendations(
    aqi: float,
    sensitive_group: bool = Query(False, description="Are you in a sensitive group?")
):
    """Get personalized health recommendations based on AQI level."""
    return health_service.get_health_recommendations(aqi, sensitive_group)


# ── Forecast ─────────────────────────────────────────────────────────────────

@router.get("/forecast")
async def get_forecast(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """Get 48-hour AQI forecast from Open-Meteo/CAMS for any location."""
    return await forecast_service.get_forecast(lat, lon)


# ── Historical Data ──────────────────────────────────────────────────────────

@router.get("/historical")
async def get_historical_data(
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    radius_km: float = Query(1.0),
    limit: int = Query(1000)
):
    """Query historical AQI data with optional filters."""
    readings = db.get_readings(start_time, end_time, lat, lon, radius_km, limit)
    return {
        "count": len(readings),
        "readings": [r.model_dump(mode="json") for r in readings]
    }


# ── Favorites ─────────────────────────────────────────────────────────────────

@router.post("/favorites")
async def add_favorite(favorite: FavoriteRequest):
    fav = FavoriteLocation(
        id=str(uuid.uuid4()),
        name=favorite.name,
        lat=favorite.lat,
        lon=favorite.lon,
        added_at=datetime.now()
    )
    db.save_favorite(fav)
    return {"message": "Favorite added successfully", "favorite": fav.model_dump(mode="json")}


@router.get("/favorites")
async def get_favorites():
    favorites = db.get_favorites()
    result = []
    for fav in favorites:
        alerts = await prediction_service.get_alerts(fav.lat, fav.lon)
        result.append({
            "id": fav.id,
            "name": fav.name,
            "lat": fav.lat,
            "lon": fav.lon,
            "added_at": fav.added_at.isoformat(),
            "current_aqi": alerts.get("aqi"),
        })
    return {"favorites": result}


@router.delete("/favorites/{favorite_id}")
async def delete_favorite(favorite_id: str):
    db.delete_favorite(favorite_id)
    return {"message": "Favorite deleted successfully"}


# ── Export ────────────────────────────────────────────────────────────────────

@router.get("/export/csv")
async def export_csv(
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    include_pollutants: bool = Query(True)
):
    readings = db.get_readings(start_time, end_time)
    if not readings:
        raise HTTPException(status_code=404, detail="No data found for the specified range")
    csv_data = export_service.export_to_csv(readings, include_pollutants)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=aqi_data_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


@router.get("/export/json")
async def export_json(
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None)
):
    readings = db.get_readings(start_time, end_time)
    if not readings:
        raise HTTPException(status_code=404, detail="No data found for the specified range")
    json_data = export_service.export_to_json(readings)
    return StreamingResponse(
        iter([json_data]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=aqi_data_{datetime.now().strftime('%Y%m%d')}.json"}
    )


@router.get("/export/geojson")
async def export_geojson(
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None)
):
    readings = db.get_readings(start_time, end_time)
    if not readings:
        raise HTTPException(status_code=404, detail="No data found for the specified range")
    geojson_data = export_service.export_to_geojson(readings)
    return StreamingResponse(
        iter([geojson_data]),
        media_type="application/geo+json",
        headers={"Content-Disposition": f"attachment; filename=aqi_data_{datetime.now().strftime('%Y%m%d')}.geojson"}
    )


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/analytics/summary")
async def get_analytics_summary(days: int = Query(7, description="Number of days to analyze")):
    end_time = datetime.now()
    start_time = end_time - timedelta(days=days)
    readings = db.get_readings(start_time, end_time)

    if not readings:
        return {"message": "No historical data available", "days_analyzed": days}

    aqi_values = [r.aqi for r in readings]
    avg_aqi = sum(aqi_values) / len(aqi_values)
    max_reading = max(readings, key=lambda r: r.aqi)
    min_reading = min(readings, key=lambda r: r.aqi)

    daily_stats: Dict[str, list] = {}
    for reading in readings:
        date_key = reading.timestamp.date().isoformat()
        if date_key not in daily_stats:
            daily_stats[date_key] = []
        daily_stats[date_key].append(reading.aqi)

    daily_averages = [
        {
            "date": date,
            "avg_aqi": sum(values) / len(values),
            "min_aqi": min(values),
            "max_aqi": max(values)
        }
        for date, values in sorted(daily_stats.items())
    ]

    return {
        "period": {"start": start_time.isoformat(), "end": end_time.isoformat(), "days": days},
        "total_readings": len(readings),
        "overall_statistics": {
            "average_aqi": round(avg_aqi, 2),
            "min_aqi": round(min_reading.aqi, 2),
            "max_aqi": round(max_reading.aqi, 2),
        },
        "daily_averages": daily_averages,
        "category_distribution": health_service.get_category_distribution(aqi_values),
    }


# ── Location Services ─────────────────────────────────────────────────────────

@router.get("/locations/cities")
async def get_supported_cities():
    cities = location_service.get_all_cities()
    countries = location_service.get_countries()
    return {"total_cities": len(cities), "total_countries": len(countries), "cities": cities, "countries": countries}


@router.get("/locations/cities/{country}")
async def get_cities_by_country(country: str):
    cities = location_service.get_cities_by_country(country)
    return {"country": country, "cities": cities}


@router.get("/locations/geocode")
async def geocode_location(address: str = Query(..., description="Address to geocode")):
    result = location_service.geocode_address(address)
    if result:
        return result
    raise HTTPException(status_code=404, detail="Location not found")


@router.get("/locations/reverse")
async def reverse_geocode(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    result = location_service.reverse_geocode(lat, lon)
    if result:
        return result
    raise HTTPException(status_code=404, detail="Address not found")


@router.get("/locations/nearest-city")
async def find_nearest_city(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    result = location_service.find_nearest_city(lat, lon)
    if result:
        return result
    raise HTTPException(status_code=404, detail="No nearby city found")


# ── Comparison ────────────────────────────────────────────────────────────────

@router.post("/compare/locations")
async def compare_locations(locations: List[Dict]):
    if len(locations) < 2:
        raise HTTPException(status_code=400, detail="At least 2 locations required for comparison")
    return comparison_service.compare_locations(locations)


@router.get("/compare/cities")
async def compare_cities(cities: str = Query(..., description="Comma-separated city names")):
    city_list = [c.strip() for c in cities.split(",")]
    if len(city_list) < 2:
        raise HTTPException(status_code=400, detail="At least 2 cities required for comparison")
    return comparison_service.compare_cities(city_list)


@router.get("/compare/timeperiods")
async def compare_time_periods(
    lat: float = Query(...),
    lon: float = Query(...),
    periods: str = Query("today,yesterday,last_week")
):
    period_list = [p.strip() for p in periods.split(",")]
    return comparison_service.compare_time_periods(lat, lon, period_list)


# ── Advanced Features ─────────────────────────────────────────────────────────

@router.post("/health/symptoms")
async def log_symptoms(request: SymptomRequest):
    log = SymptomLog(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(),
        lat=request.lat,
        lon=request.lon,
        aqi_at_time=request.aqi,
        symptoms=request.symptoms,
        severity=request.severity
    )
    db.save_symptom(log)
    return {"message": "Symptom logged", "log": log}


@router.get("/health/correlation")
async def get_symptom_correlation():
    logs = db.get_symptoms()
    if not logs:
        return {"correlation": "Insufficient data"}

    correlation: Dict = {}
    for log in logs:
        range_key = f"{(int(log.aqi_at_time) // 50) * 50}-{(int(log.aqi_at_time) // 50 + 1) * 50}"
        if range_key not in correlation:
            correlation[range_key] = {"count": 0, "avg_severity": 0, "common_symptoms": {}}
        c = correlation[range_key]
        c["avg_severity"] = (c["avg_severity"] * c["count"] + log.severity) / (c["count"] + 1)
        c["count"] += 1
        for s in log.symptoms:
            c["common_symptoms"][s] = c["common_symptoms"].get(s, 0) + 1
    return {"correlation": correlation}


@router.post("/venues")
async def add_venue(request: VenueRequest):
    venue = Venue(
        id=str(uuid.uuid4()),
        name=request.name,
        type=request.type,
        lat=request.lat,
        lon=request.lon,
        safety_threshold=request.safety_threshold
    )
    db.save_venue(venue)
    return {"message": "Venue added", "venue": venue}


@router.get("/venues/risk")
async def get_venues_risk():
    venues = db.get_venues()
    results = []
    for v in venues:
        alerts = await prediction_service.get_alerts(v.lat, v.lon)
        aqi = alerts.get("aqi") or 0
        risk_level = "low"
        if aqi > v.safety_threshold:
            risk_level = "high"
        elif aqi > v.safety_threshold * 0.7:
            risk_level = "medium"
        results.append({
            "venue": v,
            "current_aqi": aqi,
            "risk_level": risk_level,
            "recommendation": "Stay indoors, use air purifiers" if risk_level == "high" else "Safe for now"
        })
    return {"venues_risk": results}


@router.post("/reports")
async def submit_report(request: ReportRequest):
    report = UserReport(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(),
        lat=request.lat,
        lon=request.lon,
        type=request.type,
        description=request.description,
        image_url=request.image_url
    )
    db.save_report(report)
    return {"message": "Report submitted", "report": report}


@router.get("/reports")
async def get_reports():
    return {"reports": db.get_reports()}


@router.get("/impact/cigarettes")
async def get_cigarette_equivalence(aqi: float):
    """
    Cigarette equivalence of breathing air at a given AQI.
    Based on Berkeley Earth formula: 1 cigarette/day ≈ 22 μg/m³ PM2.5.
    """
    if aqi <= 50:
        pm25 = aqi * 0.24
    elif aqi <= 100:
        pm25 = (aqi - 50) * 0.46 + 12
    elif aqi <= 150:
        pm25 = (aqi - 100) * 0.8 + 35
    elif aqi <= 200:
        pm25 = (aqi - 150) * 1.9 + 55
    elif aqi <= 300:
        pm25 = (aqi - 200) * 1.0 + 150
    else:
        pm25 = (aqi - 300) * 1.0 + 250

    cigarettes = pm25 / 22.0
    return {
        "aqi": aqi,
        "pm25_est": round(pm25, 1),
        "cigarettes_equivalent": round(cigarettes, 2),
        "message": f"Breathing this air for 24 hours is equivalent to smoking {round(cigarettes, 1)} cigarettes.",
    }
