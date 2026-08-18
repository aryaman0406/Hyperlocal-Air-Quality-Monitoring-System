import aiohttp
import os
from typing import Dict, Optional

class WeatherService:
    """
    Service to fetch weather data including temperature
    Uses Open-Meteo's no-key weather endpoint.
    """
    
    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"
    
    async def get_weather_data(self, lat: float, lon: float) -> Optional[Dict]:
        """
        Fetch weather data for given coordinates
        Returns temperature, humidity, pressure, etc.
        """
        try:
            params = {
                "lat": lat,
                "lon": lon,
                "current": "temperature_2m,apparent_temperature,relative_humidity_2m,surface_pressure,weather_code,wind_speed_10m"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        current = data.get("current", {})
                        return {
                            "temperature": current.get("temperature_2m"),
                            "feels_like": current.get("apparent_temperature"),
                            "humidity": current.get("relative_humidity_2m"),
                            "pressure": current.get("surface_pressure"),
                            "weather": self._weather_description(current.get("weather_code")),
                            "wind_speed": current.get("wind_speed_10m"),
                            "clouds": None,
                            "source": "Open-Meteo",
                        }
                    print(f"Weather API error: {response.status}")
                    return self._get_mock_weather(lat, lon)
        except Exception as e:
            print(f"Error fetching weather data: {e}")
            return self._get_mock_weather(lat, lon)

    @staticmethod
    def _weather_description(code: Optional[int]) -> str:
        descriptions = {0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "rime fog", 51: "light drizzle", 61: "light rain", 63: "rain", 65: "heavy rain", 71: "light snow", 80: "rain showers", 95: "thunderstorm"}
        return descriptions.get(code, "unknown")
    
    def _get_mock_weather(self, lat: float, lon: float) -> Dict:
        """
        Generate mock weather data for development/testing
        Temperature varies based on latitude (warmer near equator)
        """
        import random
        
        # Base temperature inversely proportional to latitude
        base_temp = 30 - (abs(lat) * 0.5)
        temp = base_temp + random.uniform(-5, 5)
        
        return {
            "temperature": round(temp, 1),
            "feels_like": round(temp + random.uniform(-2, 2), 1),
            "humidity": random.randint(40, 80),
            "pressure": random.randint(1000, 1020),
            "weather": random.choice(["clear sky", "few clouds", "scattered clouds", "broken clouds", "overcast clouds"]),
            "wind_speed": round(random.uniform(1, 10), 1),
            "clouds": random.randint(0, 100),
            "mock": True
        }
    
    async def get_temperature(self, lat: float, lon: float) -> Optional[float]:
        """
        Get just the temperature for a location
        """
        weather_data = await self.get_weather_data(lat, lon)
        return weather_data.get("temperature") if weather_data else None
