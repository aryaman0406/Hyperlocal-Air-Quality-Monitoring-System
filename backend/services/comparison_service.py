from typing import List, Dict
from datetime import datetime, timedelta
from models.database import HistoricalDatabase

class ComparisonService:
    """
    Compare air quality across multiple locations, cities, or time periods
    """
    
    def __init__(self):
        self.db = HistoricalDatabase()
    
    def compare_locations(self, locations: List[Dict]) -> Dict:
        """
        Compare AQI across multiple locations
        locations: [{"name": "Home", "lat": 28.6, "lon": 77.2}, ...]
        """
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=24)
        
        comparison_data = []
        
        for location in locations:
            readings = self.db.get_readings(
                start_time=start_time,
                end_time=end_time,
                lat=location["lat"],
                lon=location["lon"],
                radius_km=2.0,
                limit=1000
            )
            
            if readings:
                aqi_values = [r.aqi for r in readings]
                comparison_data.append({
                    "location": location["name"],
                    "lat": location["lat"],
                    "lon": location["lon"],
                    "current_aqi": aqi_values[-1] if aqi_values else None,
                    "avg_aqi_24h": round(sum(aqi_values) / len(aqi_values), 2),
                    "min_aqi_24h": round(min(aqi_values), 2),
                    "max_aqi_24h": round(max(aqi_values), 2),
                    "readings_count": len(readings)
                })
        
        # Rank locations by average AQI
        comparison_data.sort(key=lambda x: x.get("avg_aqi_24h", float('inf')))
        
        # Add rankings
        for idx, location in enumerate(comparison_data, 1):
            location["rank"] = idx
            location["rank_label"] = self._get_rank_label(idx, len(comparison_data))
        
        return {
            "comparison_type": "locations",
            "time_period": "24_hours",
            "generated_at": datetime.now().isoformat(),
            "locations": comparison_data,
            "summary": {
                "best_location": comparison_data[0]["location"] if comparison_data else None,
                "worst_location": comparison_data[-1]["location"] if comparison_data else None,
                "avg_difference": self._calculate_avg_difference(comparison_data)
            }
        }
    
    def compare_cities(self, cities: List[str]) -> Dict:
        """
        Compare AQI across multiple cities globally
        cities: ["delhi", "london", "new_york", ...]
        """
        from services.location_service import LocationService
        location_service = LocationService()
        
        city_locations = []
        for city in cities:
            city_info = location_service.get_city_info(city)
            if city_info:
                city_locations.append({
                    "name": city.replace("_", " ").title(),
                    "lat": city_info["lat"],
                    "lon": city_info["lon"]
                })
        
        return self.compare_locations(city_locations)
    
    def compare_time_periods(self, lat: float, lon: float, periods: List[str]) -> Dict:
        """
        Compare AQI for a location across different time periods
        periods: ["today", "yesterday", "last_week", "last_month"]
        """
        end_time = datetime.now()
        comparisons = []
        
        period_configs = {
            "today": {"hours": 24, "label": "Last 24 Hours"},
            "yesterday": {"hours": 48, "start_offset": 24, "label": "Yesterday"},
            "last_week": {"days": 7, "label": "Last 7 Days"},
            "last_month": {"days": 30, "label": "Last 30 Days"},
        }
        
        for period in periods:
            if period not in period_configs:
                continue
            
            config = period_configs[period]
            
            if "hours" in config:
                period_start = end_time - timedelta(hours=config["hours"])
                period_end = end_time - timedelta(hours=config.get("start_offset", 0))
            elif "days" in config:
                period_start = end_time - timedelta(days=config["days"])
                period_end = end_time
            
            readings = self.db.get_readings(
                start_time=period_start,
                end_time=period_end,
                lat=lat,
                lon=lon,
                radius_km=2.0,
                limit=10000
            )
            
            if readings:
                aqi_values = [r.aqi for r in readings]
                comparisons.append({
                    "period": period,
                    "period_label": config["label"],
                    "start_time": period_start.isoformat(),
                    "end_time": period_end.isoformat(),
                    "avg_aqi": round(sum(aqi_values) / len(aqi_values), 2),
                    "min_aqi": round(min(aqi_values), 2),
                    "max_aqi": round(max(aqi_values), 2),
                    "readings_count": len(readings)
                })
        
        return {
            "comparison_type": "time_periods",
            "location": {"lat": lat, "lon": lon},
            "generated_at": datetime.now().isoformat(),
            "periods": comparisons,
            "trend": self._calculate_trend(comparisons)
        }
    
    def _get_rank_label(self, rank: int, total: int) -> str:
        """Get descriptive label for ranking"""
        if rank == 1:
            return "Best"
        elif rank == total:
            return "Worst"
        elif rank <= total * 0.33:
            return "Good"
        elif rank <= total * 0.67:
            return "Average"
        else:
            return "Poor"
    
    def _calculate_avg_difference(self, locations: List[Dict]) -> float:
        """Calculate average difference between best and worst"""
        if len(locations) < 2:
            return 0.0
        
        aqi_values = [loc.get("avg_aqi_24h", 0) for loc in locations]
        return round(max(aqi_values) - min(aqi_values), 2)
    
    def _calculate_trend(self, periods: List[Dict]) -> str:
        """Determine if AQI is improving, worsening, or stable"""
        if len(periods) < 2:
            return "insufficient_data"
        
        # Compare most recent to older periods
        recent_aqi = periods[0]["avg_aqi"]
        older_aqi = periods[-1]["avg_aqi"]
        
        diff_percent = ((recent_aqi - older_aqi) / older_aqi) * 100
        
        if diff_percent > 10:
            return "worsening"
        elif diff_percent < -10:
            return "improving"
        else:
            return "stable"
