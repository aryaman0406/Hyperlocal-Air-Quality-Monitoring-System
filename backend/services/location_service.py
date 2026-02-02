from typing import Dict, List, Optional
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import pycountry

class LocationService:
    """
    Global location service for any city/region worldwide
    """
    
    def __init__(self):
        self.geolocator = Nominatim(user_agent="air_quality_app")
        
        # Major cities worldwide with their coordinates
        self.major_cities = {
            # Asia
            "delhi": {"lat": 28.6139, "lon": 77.2090, "country": "India"},
            "beijing": {"lat": 39.9042, "lon": 116.4074, "country": "China"},
            "tokyo": {"lat": 35.6762, "lon": 139.6503, "country": "Japan"},
            "mumbai": {"lat": 19.0760, "lon": 72.8777, "country": "India"},
            "shanghai": {"lat": 31.2304, "lon": 121.4737, "country": "China"},
            "bangkok": {"lat": 13.7563, "lon": 100.5018, "country": "Thailand"},
            "singapore": {"lat": 1.3521, "lon": 103.8198, "country": "Singapore"},
            "seoul": {"lat": 37.5665, "lon": 126.9780, "country": "South Korea"},
            
            # Europe
            "london": {"lat": 51.5074, "lon": -0.1278, "country": "UK"},
            "paris": {"lat": 48.8566, "lon": 2.3522, "country": "France"},
            "berlin": {"lat": 52.5200, "lon": 13.4050, "country": "Germany"},
            "rome": {"lat": 41.9028, "lon": 12.4964, "country": "Italy"},
            "madrid": {"lat": 40.4168, "lon": -3.7038, "country": "Spain"},
            "amsterdam": {"lat": 52.3676, "lon": 4.9041, "country": "Netherlands"},
            
            # Americas
            "new_york": {"lat": 40.7128, "lon": -74.0060, "country": "USA"},
            "los_angeles": {"lat": 34.0522, "lon": -118.2437, "country": "USA"},
            "chicago": {"lat": 41.8781, "lon": -87.6298, "country": "USA"},
            "san_francisco": {"lat": 37.7749, "lon": -122.4194, "country": "USA"},
            "toronto": {"lat": 43.6532, "lon": -79.3832, "country": "Canada"},
            "mexico_city": {"lat": 19.4326, "lon": -99.1332, "country": "Mexico"},
            "sao_paulo": {"lat": -23.5505, "lon": -46.6333, "country": "Brazil"},
            
            # Middle East
            "dubai": {"lat": 25.2048, "lon": 55.2708, "country": "UAE"},
            "riyadh": {"lat": 24.7136, "lon": 46.6753, "country": "Saudi Arabia"},
            
            # Africa
            "cairo": {"lat": 30.0444, "lon": 31.2357, "country": "Egypt"},
            "lagos": {"lat": 6.5244, "lon": 3.3792, "country": "Nigeria"},
            "johannesburg": {"lat": -26.2041, "lon": 28.0473, "country": "South Africa"},
            
            # Oceania
            "sydney": {"lat": -33.8688, "lon": 151.2093, "country": "Australia"},
            "melbourne": {"lat": -37.8136, "lon": 144.9631, "country": "Australia"},
        }
    
    def get_city_info(self, city_name: str) -> Optional[Dict]:
        """Get coordinates and info for a major city"""
        city_key = city_name.lower().replace(" ", "_")
        return self.major_cities.get(city_key)
    
    def geocode_address(self, address: str) -> Optional[Dict]:
        """
        Convert address to coordinates using geocoding
        Works for any location globally
        """
        try:
            location = self.geolocator.geocode(address)
            if location:
                return {
                    "lat": location.latitude,
                    "lon": location.longitude,
                    "address": location.address,
                    "raw": location.raw
                }
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            print(f"Geocoding error: {e}")
        return None
    
    def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict]:
        """
        Get address from coordinates
        """
        try:
            location = self.geolocator.reverse(f"{lat}, {lon}")
            if location:
                return {
                    "address": location.address,
                    "raw": location.raw
                }
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            print(f"Reverse geocoding error: {e}")
        return None
    
    def get_all_cities(self) -> List[Dict]:
        """Get list of all supported major cities"""
        return [
            {
                "name": name.replace("_", " ").title(),
                "key": name,
                **info
            }
            for name, info in self.major_cities.items()
        ]
    
    def get_cities_by_country(self, country: str) -> List[Dict]:
        """Get cities in a specific country"""
        return [
            {
                "name": name.replace("_", " ").title(),
                "key": name,
                **info
            }
            for name, info in self.major_cities.items()
            if info["country"].lower() == country.lower()
        ]
    
    def get_countries(self) -> List[str]:
        """Get list of all countries with supported cities"""
        countries = set(info["country"] for info in self.major_cities.values())
        return sorted(list(countries))
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two points using Haversine formula
        Returns distance in kilometers
        """
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371  # Earth's radius in km
        
        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lon = radians(lon2 - lon1)
        
        a = sin(delta_lat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def find_nearest_city(self, lat: float, lon: float) -> Optional[Dict]:
        """Find the nearest major city to given coordinates"""
        min_distance = float('inf')
        nearest_city = None
        
        for name, info in self.major_cities.items():
            distance = self.calculate_distance(lat, lon, info["lat"], info["lon"])
            if distance < min_distance:
                min_distance = distance
                nearest_city = {
                    "name": name.replace("_", " ").title(),
                    "key": name,
                    "distance_km": round(distance, 2),
                    **info
                }
        
        return nearest_city
