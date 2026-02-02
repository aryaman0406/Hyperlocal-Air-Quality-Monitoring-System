from datetime import datetime
from typing import List, Dict
import csv
import json
from io import StringIO
from models.database import HistoricalDatabase, AQIReading

class ExportService:
    """
    Service for exporting AQI data in various formats
    """
    
    def __init__(self):
        self.db = HistoricalDatabase()
    
    def export_to_csv(
        self, 
        readings: List[AQIReading],
        include_pollutants: bool = True
    ) -> str:
        """
        Export readings to CSV format
        
        Args:
            readings: List of AQI readings
            include_pollutants: Include individual pollutant values
        
        Returns:
            CSV string
        """
        output = StringIO()
        
        if include_pollutants:
            fieldnames = [
                'timestamp', 'latitude', 'longitude', 'aqi',
                'pm25', 'pm10', 'no2', 'o3', 'temperature', 'humidity'
            ]
        else:
            fieldnames = ['timestamp', 'latitude', 'longitude', 'aqi']
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for reading in readings:
            row = {
                'timestamp': reading.timestamp.isoformat(),
                'latitude': reading.lat,
                'longitude': reading.lon,
                'aqi': reading.aqi
            }
            
            if include_pollutants:
                row.update({
                    'pm25': reading.pm25,
                    'pm10': reading.pm10,
                    'no2': reading.no2,
                    'o3': reading.o3,
                    'temperature': reading.temperature,
                    'humidity': reading.humidity
                })
            
            writer.writerow(row)
        
        return output.getvalue()
    
    def export_to_json(self, readings: List[AQIReading]) -> str:
        """
        Export readings to JSON format
        
        Args:
            readings: List of AQI readings
        
        Returns:
            JSON string
        """
        data = {
            "export_timestamp": datetime.now().isoformat(),
            "total_readings": len(readings),
            "readings": [
                {
                    "timestamp": r.timestamp.isoformat(),
                    "location": {
                        "lat": r.lat,
                        "lon": r.lon
                    },
                    "aqi": r.aqi,
                    "pollutants": {
                        "pm25": r.pm25,
                        "pm10": r.pm10,
                        "no2": r.no2,
                        "o3": r.o3
                    },
                    "weather": {
                        "temperature": r.temperature,
                        "humidity": r.humidity
                    }
                }
                for r in readings
            ]
        }
        
        return json.dumps(data, indent=2)
    
    def export_to_geojson(self, readings: List[AQIReading]) -> str:
        """
        Export readings to GeoJSON format for mapping
        
        Args:
            readings: List of AQI readings
        
        Returns:
            GeoJSON string
        """
        features = []
        
        for reading in readings:
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [reading.lon, reading.lat]
                },
                "properties": {
                    "timestamp": reading.timestamp.isoformat(),
                    "aqi": reading.aqi,
                    "pm25": reading.pm25,
                    "pm10": reading.pm10,
                    "no2": reading.no2,
                    "o3": reading.o3,
                    "temperature": reading.temperature,
                    "humidity": reading.humidity,
                    "category": self._get_category(reading.aqi)
                }
            }
            features.append(feature)
        
        geojson = {
            "type": "FeatureCollection",
            "metadata": {
                "generated": datetime.now().isoformat(),
                "count": len(features)
            },
            "features": features
        }
        
        return json.dumps(geojson, indent=2)
    
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
