"""User profile schema."""
from pydantic import BaseModel
from typing import Optional


class UserProfile(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
