import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict
from ml.model import AirQualityModel, prepare_features

class ForecastService:
    """
    Provides 48-hour AQI forecasts for locations
    """
    
    def __init__(self):
        self.model = AirQualityModel()
        self.forecast_hours = 48
    
    async def get_forecast(self, lat: float, lon: float) -> Dict:
        """
        Generate 48-hour AQI forecast for a specific location
        
        Args:
            lat: Latitude
            lon: Longitude
        
        Returns:
            Dict with hourly forecasts, trends, and alerts
        """
        forecasts = []
        current_time = datetime.now()
        
        for hour_offset in range(self.forecast_hours):
            forecast_time = current_time + timedelta(hours=hour_offset)
            
            # Prepare features for this time
            hour = forecast_time.hour
            day_of_week = forecast_time.weekday()
            
            # Simulate time-based patterns
            traffic_index = self._estimate_traffic(hour, day_of_week)
            temp = self._estimate_temperature(hour)
            
            features = np.array([[
                lat,
                lon,
                hour,
                day_of_week,
                traffic_index,
                temp
            ]])
            
            predicted_aqi = float(self.model.predict(features)[0])
            
            forecasts.append({
                "timestamp": forecast_time.isoformat(),
                "hour": forecast_time.strftime("%H:00"),
                "date": forecast_time.strftime("%Y-%m-%d"),
                "aqi": round(predicted_aqi, 1),
                "category": self._get_category(predicted_aqi),
                "traffic_level": self._traffic_level(traffic_index),
                "temperature": round(temp, 1)
            })
        
        # Calculate trends and statistics
        aqi_values = [f["aqi"] for f in forecasts]
        
        result = {
            "location": {"lat": lat, "lon": lon},
            "generated_at": current_time.isoformat(),
            "forecasts": forecasts,
            "statistics": {
                "min_aqi": round(min(aqi_values), 1),
                "max_aqi": round(max(aqi_values), 1),
                "avg_aqi": round(sum(aqi_values) / len(aqi_values), 1),
                "worst_hour": forecasts[aqi_values.index(max(aqi_values))]["timestamp"],
                "best_hour": forecasts[aqi_values.index(min(aqi_values))]["timestamp"]
            },
            "daily_summary": self._get_daily_summary(forecasts),
            "alerts": self._generate_alerts(forecasts)
        }
        
        return result
    
    async def get_regional_forecast(self) -> Dict:
        """
        Generate regional forecast for Delhi-NCR major areas
        """
        key_locations = [
            {"name": "Connaught Place", "lat": 28.6289, "lon": 77.2065},
            {"name": "Dwarka", "lat": 28.5921, "lon": 77.0460},
            {"name": "Noida", "lat": 28.5355, "lon": 77.3910},
            {"name": "Gurgaon", "lat": 28.4595, "lon": 77.0266},
            {"name": "Rohini", "lat": 28.7496, "lon": 77.0669}
        ]
        
        regional_forecasts = []
        
        for location in key_locations:
            forecast = await self.get_forecast(location["lat"], location["lon"])
            
            regional_forecasts.append({
                "name": location["name"],
                "lat": location["lat"],
                "lon": location["lon"],
                "current_aqi": forecast["forecasts"][0]["aqi"],
                "next_24h_avg": round(sum([f["aqi"] for f in forecast["forecasts"][:24]]) / 24, 1),
                "peak_aqi": forecast["statistics"]["max_aqi"],
                "peak_time": forecast["statistics"]["worst_hour"]
            })
        
        return {
            "region": "Delhi-NCR",
            "generated_at": datetime.now().isoformat(),
            "locations": regional_forecasts
        }
    
    def _estimate_traffic(self, hour: int, day_of_week: int) -> float:
        """Estimate traffic based on time patterns"""
        # Weekend has lower traffic
        if day_of_week >= 5:  # Saturday, Sunday
            base_traffic = 0.6
        else:
            base_traffic = 1.0
        
        # Morning rush: 7-10 AM
        if 7 <= hour < 10:
            return base_traffic * 1.5
        # Evening rush: 5-9 PM
        elif 17 <= hour < 21:
            return base_traffic * 1.6
        # Night: low traffic
        elif hour >= 22 or hour < 6:
            return base_traffic * 0.3
        # Daytime
        else:
            return base_traffic * 0.8
    
    def _estimate_temperature(self, hour: int) -> float:
        """Estimate temperature based on hour (simplified)"""
        # Simplified temperature curve
        base_temp = 20.0
        variation = 10.0
        # Peak around 2 PM (14:00)
        return base_temp + variation * np.sin((hour - 6) * np.pi / 12)
    
    def _get_category(self, aqi: float) -> str:
        """Get AQI category"""
        if aqi <= 50:
            return "Good"
        elif aqi <= 100:
            return "Moderate"
        elif aqi <= 150:
            return "Unhealthy for Sensitive Groups"
        elif aqi <= 200:
            return "Unhealthy"
        elif aqi <= 300:
            return "Very Unhealthy"
        else:
            return "Hazardous"
    
    def _traffic_level(self, traffic_index: float) -> str:
        """Convert traffic index to level"""
        if traffic_index < 0.5:
            return "Low"
        elif traffic_index < 1.0:
            return "Moderate"
        elif traffic_index < 1.4:
            return "High"
        else:
            return "Very High"
    
    def _get_daily_summary(self, forecasts: List[Dict]) -> List[Dict]:
        """Summarize forecasts by day"""
        daily = {}
        
        for forecast in forecasts:
            date = forecast["date"]
            if date not in daily:
                daily[date] = []
            daily[date].append(forecast["aqi"])
        
        summaries = []
        for date, aqi_values in daily.items():
            summaries.append({
                "date": date,
                "min_aqi": round(min(aqi_values), 1),
                "max_aqi": round(max(aqi_values), 1),
                "avg_aqi": round(sum(aqi_values) / len(aqi_values), 1),
                "category": self._get_category(sum(aqi_values) / len(aqi_values))
            })
        
        return summaries
    
    def _generate_alerts(self, forecasts: List[Dict]) -> List[Dict]:
        """Generate alerts based on forecast patterns"""
        alerts = []
        
        # Check for high pollution periods
        for i, forecast in enumerate(forecasts):
            if forecast["aqi"] > 200:
                alerts.append({
                    "severity": "high" if forecast["aqi"] > 250 else "medium",
                    "time": forecast["timestamp"],
                    "message": f"High pollution expected at {forecast['hour']} (AQI: {forecast['aqi']})",
                    "recommendation": "Avoid outdoor activities during this time"
                })
        
        # Check for rapid changes
        for i in range(len(forecasts) - 1):
            aqi_change = forecasts[i + 1]["aqi"] - forecasts[i]["aqi"]
            if abs(aqi_change) > 50:
                alerts.append({
                    "severity": "medium",
                    "time": forecasts[i + 1]["timestamp"],
                    "message": f"Rapid AQI change expected: {'+' if aqi_change > 0 else ''}{round(aqi_change, 1)}",
                    "recommendation": "Monitor conditions closely"
                })
        
        return alerts[:10]  # Limit to 10 most important alerts
