import numpy as np
import pandas as pd
from ml.model import AirQualityModel, prepare_features
from datetime import datetime

class PredictionService:
    def __init__(self, center_lat=28.6139, center_lon=77.2090, radius_km=25):
        self.model = AirQualityModel()
        # Configurable location - can be set for any city globally
        self.center_lat = center_lat
        self.center_lon = center_lon
        # Calculate bounding box based on center and radius
        # 1 degree latitude ≈ 111 km
        lat_offset = radius_km / 111.0
        lon_offset = radius_km / (111.0 * np.cos(np.radians(center_lat)))
        
        self.min_lat = center_lat - lat_offset
        self.max_lat = center_lat + lat_offset
        self.min_lon = center_lon - lon_offset
        self.max_lon = center_lon + lon_offset
        self.resolution = 0.005 # ~500m for performance, can be reduced to 0.0025 for 250m

    async def get_full_grid(self, lat: float = None, lon: float = None, radius_km: float = None):
        """
        Generate grid and predict AQI for each cell.
        """
        target_lat = lat if lat is not None else self.center_lat
        target_lon = lon if lon is not None else self.center_lon
        target_radius = radius_km if radius_km is not None else 25 # default 25km

        # Recalculate bounding box if coordinates changed
        lat_offset = target_radius / 111.0
        lon_offset = target_radius / (111.0 * np.cos(np.radians(target_lat)))
        
        min_lat, max_lat = target_lat - lat_offset, target_lat + lat_offset
        min_lon, max_lon = target_lon - lon_offset, target_lon + lon_offset

        lats = np.arange(min_lat, max_lat, self.resolution)
        lons = np.arange(min_lon, max_lon, self.resolution)
        lat_grid, lon_grid = np.meshgrid(lats, lons)
        
        flat_lat = lat_grid.flatten()
        flat_lon = lon_grid.flatten()
        
        # Prepare features for all grid points
        timestamp = pd.Timestamp.now()
        hour = timestamp.hour
        day_of_week = timestamp.dayofweek
        
        # Mocking additional features for each point
        traffic_indices = self._get_mock_traffic(flat_lat, flat_lon, target_lat, target_lon)
        temps = np.full(len(flat_lat), 25.0)
        
        features = np.column_stack([
            flat_lat, 
            flat_lon, 
            np.full(len(flat_lat), hour),
            np.full(len(flat_lat), day_of_week),
            traffic_indices,
            temps
        ])
        
        predictions = self.model.predict(features)
        
        # Structure as simple point list
        grid_data = []
        for i in range(len(flat_lat)):
            grid_data.append({
                "lat": float(flat_lat[i]),
                "lon": float(flat_lon[i]),
                "aqi": float(predictions[i])
            })
            
        return {
            "timestamp": datetime.now().isoformat(),
            "grid": grid_data,
            "center": {"lat": target_lat, "lon": target_lon},
            "count": len(grid_data)
        }

    async def get_alerts(self, lat: float, lon: float):
        """
        Predict AQI for a specific location and provide alerts.
        """
        features = prepare_features(lat, lon)
        prediction = self.model.predict(features)[0]
        
        alert_msg = "Air quality is good. Enjoy outdoor activities!"
        severity = "low"
        
        if prediction > 200:
            alert_msg = "High pollution expected here today. Avoid outdoor activity!"
            severity = "high"
        elif prediction > 100:
            alert_msg = "Moderate pollution. Sensitive groups should limit outdoor time."
            severity = "medium"
            
        return {
            "lat": lat,
            "lon": lon,
            "aqi": float(prediction),
            "alert": alert_msg,
            "severity": severity,
            "recommendations": self._get_recommendations(prediction)
        }

    def _get_mock_traffic(self, lats, lons, center_lat, center_lon):
        # High traffic near city center
        dist_sq = (lats - center_lat)**2 + (lons - center_lon)**2
        return np.clip(1.0 / (dist_sq * 100 + 1), 0.1, 1.0)

    def _get_recommendations(self, aqi):
        if aqi > 200:
            return ["Wear N95 mask", "Use air purifiers", "Avoid physical exertion outdoors"]
        if aqi > 100:
            return ["Reduce outdoor time", "Close windows during peak traffic"]
        return ["Good time for exercise", "No precautions needed"]
