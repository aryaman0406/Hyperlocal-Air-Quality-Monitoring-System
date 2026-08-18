from datetime import datetime
from typing import List, Optional
import json
import os
from .schemas import AQIReading, FavoriteLocation, SymptomLog, Venue, UserReport

# Simple file-based storage (no external DB required)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "cache")
os.makedirs(DATA_DIR, exist_ok=True)


class HistoricalDatabase:
    def __init__(self):
        self.readings_file = os.path.join(DATA_DIR, "historical_readings.jsonl")
        self.favorites_file = os.path.join(DATA_DIR, "favorites.json")
        self.symptoms_file = os.path.join(DATA_DIR, "symptoms.jsonl")
        self.venues_file = os.path.join(DATA_DIR, "venues.json")
        self.reports_file = os.path.join(DATA_DIR, "user_reports.jsonl")
        self.profile_file = os.path.join(DATA_DIR, "user_profile.json")

    # ── AQI Readings ──────────────────────────────────────────────────────────

    def save_reading(self, reading: AQIReading):
        """Append reading to historical data"""
        with open(self.readings_file, "a") as f:
            f.write(reading.model_dump_json() + "\n")

    def get_readings(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        radius_km: float = 1.0,
        limit: int = 1000
    ) -> List[AQIReading]:
        if not os.path.exists(self.readings_file):
            return []

        readings = []
        with open(self.readings_file, "r") as f:
            for line in f:
                if not line.strip():
                    continue
                data = json.loads(line)
                reading = AQIReading(**data)

                if start_time and reading.timestamp < start_time:
                    continue
                if end_time and reading.timestamp > end_time:
                    continue
                if lat is not None and lon is not None:
                    distance = ((reading.lat - lat) ** 2 + (reading.lon - lon) ** 2) ** 0.5 * 111
                    if distance > radius_km:
                        continue

                readings.append(reading)
                if len(readings) >= limit:
                    break

        return readings[-limit:]

    # ── Favorites ─────────────────────────────────────────────────────────────

    def save_favorite(self, favorite: FavoriteLocation):
        favorites = self.get_favorites()
        favorites = [f for f in favorites if f.id != favorite.id]
        favorites.append(favorite)
        with open(self.favorites_file, "w") as f:
            json.dump([f.model_dump(mode="json") for f in favorites], f, indent=2, default=str)

    def get_favorites(self) -> List[FavoriteLocation]:
        if not os.path.exists(self.favorites_file):
            return []
        with open(self.favorites_file, "r") as f:
            data = json.load(f)
            return [FavoriteLocation(**item) for item in data]

    def delete_favorite(self, favorite_id: str):
        favorites = self.get_favorites()
        favorites = [f for f in favorites if f.id != favorite_id]
        with open(self.favorites_file, "w") as f:
            json.dump([f.model_dump(mode="json") for f in favorites], f, indent=2, default=str)

    # ── User Profile ──────────────────────────────────────────────────────────

    def save_profile(self, profile: dict):
        """Persist user profile (name, city, country, lat, lon)."""
        with open(self.profile_file, "w") as f:
            json.dump(profile, f, indent=2)

    def get_profile(self) -> Optional[dict]:
        """Load saved user profile, or None if not set."""
        if not os.path.exists(self.profile_file):
            return None
        with open(self.profile_file, "r") as f:
            return json.load(f)

    # ── Symptom Logging ───────────────────────────────────────────────────────

    def save_symptom(self, log: SymptomLog):
        with open(self.symptoms_file, "a") as f:
            f.write(log.model_dump_json() + "\n")

    def get_symptoms(self) -> List[SymptomLog]:
        if not os.path.exists(self.symptoms_file):
            return []
        logs = []
        with open(self.symptoms_file, "r") as f:
            for line in f:
                if line.strip():
                    logs.append(SymptomLog(**json.loads(line)))
        return logs

    # ── Venues ────────────────────────────────────────────────────────────────

    def save_venue(self, venue: Venue):
        venues = self.get_venues()
        venues = [v for v in venues if v.id != venue.id]
        venues.append(venue)
        with open(self.venues_file, "w") as f:
            json.dump([v.model_dump(mode="json") for v in venues], f, indent=2, default=str)

    def get_venues(self) -> List[Venue]:
        if not os.path.exists(self.venues_file):
            return []
        with open(self.venues_file, "r") as f:
            data = json.load(f)
            return [Venue(**item) for item in data]

    # ── User Reports ──────────────────────────────────────────────────────────

    def save_report(self, report: UserReport):
        with open(self.reports_file, "a") as f:
            f.write(report.model_dump_json() + "\n")

    def get_reports(self) -> List[UserReport]:
        if not os.path.exists(self.reports_file):
            return []
        reports = []
        with open(self.reports_file, "r") as f:
            for line in f:
                if line.strip():
                    reports.append(UserReport(**json.loads(line)))
        return reports
