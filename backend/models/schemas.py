from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class AQIReading(BaseModel):
    timestamp: datetime
    lat: float
    lon: float
    aqi: float
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    o3: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None

class FavoriteLocation(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    added_at: datetime

class SymptomLog(BaseModel):
    id: str
    timestamp: datetime
    lat: float
    lon: float
    aqi_at_time: float
    symptoms: List[str]
    severity: int

class Venue(BaseModel):
    id: str
    name: str
    type: str
    lat: float
    lon: float
    safety_threshold: float
    last_risk_assessment: Optional[str] = None

class UserReport(BaseModel):
    id: str
    timestamp: datetime
    lat: float
    lon: float
    type: str
    description: str
    image_url: Optional[str] = None
    status: str = "active"
