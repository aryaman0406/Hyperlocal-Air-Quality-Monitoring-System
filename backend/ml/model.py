import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib
import os

class AirQualityModel:
    def __init__(self, model_path="backend/ml/models/aq_model.joblib"):
        self.model_path = model_path
        self.model = None
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)

    def train(self, X, y):
        """
        Train a Random Forest model.
        X: features (lat, lon, hour, day_of_week, traffic_index, weather_temp, etc.)
        y: PM2.5 value
        """
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.model.fit(X, y)
        joblib.dump(self.model, self.model_path)
        return self.model

    def load(self):
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
            return True
        return False

    def predict(self, features):
        if self.model is None:
            if not self.load():
                # If no model exists, return a mock prediction/fallback
                # In a real app, we'd throw an error or trigger training
                return self._mock_predict(features)
        return self.model.predict(features)

    def _mock_predict(self, features):
        # Fallback logic for demonstration if model isn't trained
        # Returns values based on a simple spatial pattern
        lats = features[:, 0]
        lons = features[:, 1]
        # Create a "hotspot" at the center of Delhi (28.6, 77.2)
        dist = np.sqrt((lats - 28.6)**2 + (lons - 77.2)**2)
        base_aqi = 150 + 100 * np.exp(-dist * 10)
        # Add some noise
        noise = np.random.normal(0, 10, size=len(features))
        return base_aqi + noise

# Sample feature engineering helper
def prepare_features(lat, lon, timestamp=None):
    if timestamp is None:
        timestamp = pd.Timestamp.now()
    
    # In a real app, these would come from APIs
    traffic_index = np.random.uniform(0, 1) # Mocked
    weather_temp = 25 # Mocked
    hour = timestamp.hour
    day_of_week = timestamp.dayofweek
    
    return np.array([[lat, lon, hour, day_of_week, traffic_index, weather_temp]])
