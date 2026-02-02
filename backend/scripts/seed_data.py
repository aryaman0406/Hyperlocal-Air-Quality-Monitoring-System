import os
import json
import uuid
from datetime import datetime
from models.database import Venue, SymptomLog, UserReport

DATA_DIR = "data/cache"
os.makedirs(DATA_DIR, exist_ok=True)

from models.database import Venue, SymptomLog, UserReport, AQIReading, HistoricalDatabase
import random
from datetime import timedelta

def seed():
    db = HistoricalDatabase()
    
    # 1. Seed Venues
    venues_file = os.path.join(DATA_DIR, "venues.json")
    mock_venues = [
        Venue(
            id=str(uuid.uuid4()),
            name="Delhi Public School, RK Puram",
            type="school",
            lat=28.564,
            lon=77.170,
            safety_threshold=100.0
        ),
        Venue(
            id=str(uuid.uuid4()),
            name="DLF CyberHub Offices",
            type="office",
            lat=28.495,
            lon=77.088,
            safety_threshold=150.0
        ),
        Venue(
            id=str(uuid.uuid4()),
            name="Modern School, Barakhamba",
            type="school",
            lat=28.629,
            lon=77.230,
            safety_threshold=80.0
        )
    ]
    for v in mock_venues:
        db.save_venue(v)
    
    # 2. Seed Historical Readings (past 24 hours)
    # This is critical for the Export feature
    now = datetime.now()
    locations = [
        (28.6139, 77.2090), # Delhi
        (19.0760, 72.8777), # Mumbai
        (12.9716, 77.5946), # Bangalore
    ]
    
    # Ensure readings file is fresh or at least has content
    readings_file = os.path.join(DATA_DIR, "historical_readings.jsonl")
    if os.path.exists(readings_file):
        os.remove(readings_file)

    count = 0
    for lat, lon in locations:
        for h in range(24):
            timestamp = now - timedelta(hours=h)
            aqi = random.uniform(50, 400) if lat == 28.6139 else random.uniform(20, 150)
            reading = AQIReading(
                timestamp=timestamp,
                lat=lat,
                lon=lon,
                aqi=aqi,
                pm25=aqi*0.8,
                pm10=aqi*1.2,
                no2=random.uniform(10, 50),
                o3=random.uniform(5, 30),
                temperature=random.uniform(15, 35),
                humidity=random.uniform(30, 80)
            )
            db.save_reading(reading)
            count += 1
            
    print(f"Pre-seeded {len(mock_venues)} institutions and {count} historical AQI records.")

if __name__ == "__main__":
    seed()
