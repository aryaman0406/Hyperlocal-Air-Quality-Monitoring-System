import aiohttp
import os
from typing import Dict, Optional

class WeatherService:
    """
    Service to fetch weather data including temperature
    Uses OpenWeatherMap API (free tier available)
    """
    
    def __init__(self):
        # You can get a free API key from https://openweathermap.org/api
        # For now, using a demo key or set via environment variable
        self.api_key = os.getenv("OPENWEATHER_API_KEY", "demo_key")
        self.base_url = "https://api.openweathermap.org/data/2.5/weather"
    
    async def get_weather_data(self, lat: float, lon: float) -> Optional[Dict]:
        """
        Fetch weather data for given coordinates
        Returns temperature, humidity, pressure, etc.
        """
        try:
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric"  # Celsius
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "temperature": data["main"]["temp"],
                            "feels_like": data["main"]["feels_like"],
                            "humidity": data["main"]["humidity"],
                            "pressure": data["main"]["pressure"],
                            "weather": data["weather"][0]["description"],
                            "wind_speed": data["wind"]["speed"],
                            "clouds": data.get("clouds", {}).get("all", 0)
                        }
                    elif response.status == 401:
                        # API key issue - return mock data for development
                        return self._get_mock_weather(lat, lon)
                    else:
                        print(f"Weather API error: {response.status}")
                        return self._get_mock_weather(lat, lon)
        except Exception as e:
            print(f"Error fetching weather data: {e}")
            return self._get_mock_weather(lat, lon)
    
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
