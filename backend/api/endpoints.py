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

# Pydantic models for request bodies
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

# ============ Original Endpoints ============
@router.get("/aqi/live")
async def get_live_aqi(
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude")
):
    """Fetch real-time AQ data from OpenAQ for any location."""
    return await openaq_service.get_latest_data(lat, lon)

@router.get("/aqi/grid")
async def get_aqi_grid(
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude")
):
    """Get the predicted AQI for the 250m x 250m grid."""
    return await prediction_service.get_full_grid(lat=lat, lon=lon)

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
    Get AQI and weather data (including temperature) for any location worldwide
    """
    try:
        # Get AQI prediction for the location
        aqi_data = await prediction_service.get_alerts(lat, lon)
        aqi = aqi_data.get("aqi", 0)
        
        # Get weather data including temperature
        weather_data = await weather_service.get_weather_data(lat, lon)
        
        # Get location name via reverse geocoding
        location_info = location_service.reverse_geocode(lat, lon)
        
        return {
            "location": {
                "lat": lat,
                "lon": lon,
                "address": location_info.get("address") if location_info else "Unknown Location"
            },
            "aqi": aqi,
            "aqi_category": health_service._get_category(aqi),
            "weather": weather_data,
            "temperature": weather_data.get("temperature") if weather_data else None,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching location data: {str(e)}")

# Helper logic is now centralized in HealthService

@router.get("/alerts")
async def get_alerts(lat: float, lon: float):
    """Get smart user alerts for a specific location."""
    return await prediction_service.get_alerts(lat, lon)

# ============ New Feature Endpoints ============

@router.get("/health/recommendations")
async def get_health_recommendations(
    aqi: float,
    sensitive_group: bool = Query(False, description="Are you in a sensitive group?")
):
    """
    Get personalized health recommendations based on AQI level.
    Includes activity advice, mask requirements, and detailed recommendations.
    """
    return health_service.get_health_recommendations(aqi, sensitive_group)

@router.get("/forecast")
async def get_forecast(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """
    Get 48-hour AQI forecast for a specific location.
    Includes hourly predictions, trends, and alerts.
    """
    return await forecast_service.get_forecast(lat, lon)

@router.get("/forecast/regional")
async def get_regional_forecast():
    """
    Get regional forecast for major Delhi-NCR areas.
    """
    return await forecast_service.get_regional_forecast()

@router.get("/historical")
async def get_historical_data(
    start_time: Optional[datetime] = Query(None, description="Start time (ISO format)"),
    end_time: Optional[datetime] = Query(None, description="End time (ISO format)"),
    lat: Optional[float] = Query(None, description="Latitude for location-based query"),
    lon: Optional[float] = Query(None, description="Longitude for location-based query"),
    radius_km: float = Query(1.0, description="Search radius in kilometers"),
    limit: int = Query(1000, description="Maximum number of records")
):
    """
    Query historical AQI data with filters.
    Can filter by time range, location, and radius.
    """
    readings = db.get_readings(start_time, end_time, lat, lon, radius_km, limit)
    return {
        "count": len(readings),
        "readings": [r.model_dump(mode="json") for r in readings]
    }

@router.post("/favorites")
async def add_favorite(favorite: FavoriteRequest):
    """
    Add a location to favorites.
    """
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
    """
    Get all favorite locations with current AQI.
    """
    favorites = db.get_favorites()
    result = []
    
    for fav in favorites:
        # Get current AQI for each favorite
        alerts = await prediction_service.get_alerts(fav.lat, fav.lon)
        result.append({
            "id": fav.id,
            "name": fav.name,
            "lat": fav.lat,
            "lon": fav.lon,
            "added_at": fav.added_at.isoformat(),
            "current_aqi": alerts.get("aqi", None)
        })
    
    return {"favorites": result}

@router.delete("/favorites/{favorite_id}")
async def delete_favorite(favorite_id: str):
    """
    Delete a favorite location.
    """
    db.delete_favorite(favorite_id)
    return {"message": "Favorite deleted successfully"}

@router.get("/export/csv")
async def export_csv(
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    include_pollutants: bool = Query(True)
):
    """
    Export historical data as CSV.
    """
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
    """
    Export historical data as JSON.
    """
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
    """
    Export historical data as GeoJSON for mapping applications.
    """
    readings = db.get_readings(start_time, end_time)
    
    if not readings:
        raise HTTPException(status_code=404, detail="No data found for the specified range")
    
    geojson_data = export_service.export_to_geojson(readings)
    
    return StreamingResponse(
        iter([geojson_data]),
        media_type="application/geo+json",
        headers={"Content-Disposition": f"attachment; filename=aqi_data_{datetime.now().strftime('%Y%m%d')}.geojson"}
    )

@router.get("/analytics/summary")
async def get_analytics_summary(
    days: int = Query(7, description="Number of days to analyze")
):
    """
    Get analytics summary for the past N days.
    Includes averages, trends, and comparisons.
    """
    end_time = datetime.now()
    start_time = end_time - timedelta(days=days)
    
    readings = db.get_readings(start_time, end_time)
    
    if not readings:
        return {
            "message": "No historical data available",
            "days_analyzed": days
        }
    
    aqi_values = [r.aqi for r in readings]
    
    # Calculate statistics
    avg_aqi = sum(aqi_values) / len(aqi_values)
    max_reading = max(readings, key=lambda r: r.aqi)
    min_reading = min(readings, key=lambda r: r.aqi)
    
    # Daily averages
    daily_stats = {}
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
        "period": {
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
            "days": days
        },
        "total_readings": len(readings),
        "overall_statistics": {
            "average_aqi": round(avg_aqi, 2),
            "min_aqi": round(min_reading.aqi, 2),
            "max_aqi": round(max_reading.aqi, 2),
            "worst_location": {"lat": max_reading.lat, "lon": max_reading.lon},
            "best_location": {"lat": min_reading.lat, "lon": min_reading.lon}
        },
        "daily_averages": daily_averages,
        "category_distribution": health_service.get_category_distribution(aqi_values)
    }


# ============ Global Location Features ============

@router.get("/locations/cities")
async def get_supported_cities():
    """
    Get list of major cities supported globally
    """
    cities = location_service.get_all_cities()
    countries = location_service.get_countries()
    
    return {
        "total_cities": len(cities),
        "total_countries": len(countries),
        "cities": cities,
        "countries": countries
    }

@router.get("/locations/cities/{country}")
async def get_cities_by_country(country: str):
    """
    Get cities in a specific country
    """
    cities = location_service.get_cities_by_country(country)
    return {
        "country": country,
        "cities": cities
    }

@router.get("/locations/geocode")
async def geocode_location(address: str = Query(..., description="Address to geocode")):
    """
    Convert address to coordinates (works globally)
    Examples: "Times Square, New York", "Eiffel Tower, Paris"
    """
    result = location_service.geocode_address(address)
    if result:
        return result
    raise HTTPException(status_code=404, detail="Location not found")

@router.get("/locations/reverse")
async def reverse_geocode(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """
    Get address from coordinates
    """
    result = location_service.reverse_geocode(lat, lon)
    if result:
        return result
    raise HTTPException(status_code=404, detail="Address not found")

@router.get("/locations/nearest-city")
async def find_nearest_city(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """
    Find the nearest major city to given coordinates
    """
    result = location_service.find_nearest_city(lat, lon)
    if result:
        return result
    raise HTTPException(status_code=404, detail="No nearby city found")

# ============ Comparison Features ============

@router.post("/compare/locations")
async def compare_locations(locations: List[Dict]):
    """
    Compare AQI across multiple locations
    Body: [{"name": "Home", "lat": 28.6, "lon": 77.2}, {"name": "Office", "lat": 28.5, "lon": 77.3}]
    """
    if len(locations) < 2:
        raise HTTPException(status_code=400, detail="At least 2 locations required for comparison")
    
    return comparison_service.compare_locations(locations)

@router.get("/compare/cities")
async def compare_cities(
    cities: str = Query(..., description="Comma-separated city names (e.g., delhi,london,new_york)")
):
    """
    Compare AQI across multiple cities globally
    """
    city_list = [city.strip() for city in cities.split(",")]
    
    if len(city_list) < 2:
        raise HTTPException(status_code=400, detail="At least 2 cities required for comparison")
    
    return comparison_service.compare_cities(city_list)

@router.get("/compare/timeperiods")
async def compare_time_periods(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    periods: str = Query("today,yesterday,last_week", description="Comma-separated periods")
):
    """
    Compare AQI for a location across different time periods
    Available periods: today, yesterday, last_week, last_month
    """
    period_list = [period.strip() for period in periods.split(",")]
    return comparison_service.compare_time_periods(lat, lon, period_list)

# ============ Global AQI Grid ============

@router.get("/aqi/grid/custom")
async def get_custom_aqi_grid(
    center_lat: float = Query(..., description="Center latitude"),
    center_lon: float = Query(..., description="Center longitude"),
    radius_km: float = Query(10, description="Radius in kilometers")
):
    """
    Get AQI grid for any location globally
    """
    # Create prediction service for this specific location
    custom_prediction_service = PredictionService(
        center_lat=center_lat,
        center_lon=center_lon,
        radius_km=radius_km
    )
    
    return await custom_prediction_service.get_full_grid()

# ============ Advanced Real-World Problem Solving Features ============

@router.post("/health/symptoms")
async def log_symptoms(request: SymptomRequest):
    """Log symptoms for correlation with AQI"""
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
    """Get correlation analysis of symptoms vs AQI"""
    logs = db.get_symptoms()
    if not logs:
        return {"correlation": "Insufficient data"}
    
    # Simple correlation logic: group symptoms by AQI ranges
    correlation = {}
    for log in logs:
        # Range: 0-50, 50-100, etc.
        range_key = f"{(int(log.aqi_at_time)//50)*50}-{(int(log.aqi_at_time)//50 + 1)*50}"
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
    """Add institutional venue for safety monitoring"""
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
    """Get risk assessment for all venues"""
    venues = db.get_venues()
    results = []
    for v in venues:
        # Get current AQI for venue
        alerts = await prediction_service.get_alerts(v.lat, v.lon)
        aqi = alerts.get("aqi", 0)
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
    """Submit crowdsourced pollution report"""
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
    """Get all active pollution reports"""
    return {"reports": db.get_reports()}

@router.get("/impact/cigarettes")
async def get_cigarette_equivalence(aqi: float):
    """
    Calculate cigarette equivalence of breathing air at a given AQI.
    Based on Berkeley Earth formula: 1 cigarette per day is roughly 22 μg/m3 PM2.5.
    """
    # AQI to PM2.5 approx (very rough simplified conversion for visual impact)
    # Using a common approximation: AQI of 100 ~ 35 ug/m3, 200 ~ 150 ug/m3
    if aqi <= 50: pm25 = aqi * 0.24
    elif aqi <= 100: pm25 = (aqi - 50) * 0.46 + 12
    elif aqi <= 150: pm25 = (aqi - 100) * 0.8 + 35
    elif aqi <= 200: pm25 = (aqi - 150) * 1.9 + 55
    elif aqi <= 300: pm25 = (aqi - 200) * 1.0 + 150
    else: pm25 = (aqi - 300) * 1.0 + 250
    
    cigarettes = pm25 / 22.0
    return {
        "aqi": aqi,
        "pm25_est": round(pm25, 1),
        "cigarettes_equivalent": round(cigarettes, 2),
        "message": f"Breathing this air for 24 hours is equivalent to smoking {round(cigarettes, 1)} cigarettes."
    }
