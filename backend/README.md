# Backend - Hyperlocal Air Quality API

FastAPI-based backend service providing real-time air quality data, forecasts, and analytics.

## 🚀 Quick Start

### Prerequisites
- Python 3.9 or higher
- pip or conda

### Installation

1. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

4. **Run the server:**
```bash
python main.py
```

The API will be available at:
- Server: http://localhost:8000
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📁 Project Structure

```
backend/
├── main.py                 # Application entry point
├── requirements.txt        # Python dependencies
├── api/                    # API layer
│   ├── __init__.py
│   ├── endpoints.py       # REST API endpoints
│   └── websocket.py       # WebSocket handlers
├── ml/                     # Machine learning
│   ├── __init__.py
│   └── model.py           # ML models for predictions
├── models/                 # Database models
│   ├── __init__.py
│   └── database.py        # Database schemas
└── services/               # Business logic
    ├── __init__.py
    ├── comparison_service.py    # Location comparisons
    ├── export_service.py        # Data export (CSV/JSON/GeoJSON)
    ├── forecast_service.py      # AQI forecasts
    ├── health_service.py        # Health recommendations
    ├── hotspot_service.py       # Pollution hotspot detection
    ├── location_service.py      # Location management
    ├── openaq_service.py        # OpenAQ API integration
    ├── prediction_service.py    # ML predictions
    └── weather_service.py       # Weather data integration
```

## 🔌 API Endpoints

### Core Endpoints

#### Get Current AQI
```http
GET /api/aqi?lat={latitude}&lon={longitude}
```

Response:
```json
{
  "location": "New Delhi",
  "aqi": 156,
  "pollutants": {
    "pm25": 85.4,
    "pm10": 120.3
  },
  "category": "Unhealthy",
  "timestamp": "2025-12-30T10:00:00Z"
}
```

#### Get Forecast
```http
GET /api/forecast?lat={latitude}&lon={longitude}&hours={hours}
```

#### Health Advice
```http
GET /api/health-advice?aqi={aqi_value}
```

#### Hotspots
```http
GET /api/hotspots?radius={radius_km}
```

#### Export Data
```http
GET /api/export?format={csv|json|geojson}&lat={lat}&lon={lon}
```

### WebSocket

Connect to real-time updates:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time AQI update:', data);
};
```

## 🧪 Testing

Run tests:
```bash
pytest tests/ -v
```

Run with coverage:
```bash
pytest tests/ --cov=. --cov-report=html
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with:

```env
# API Keys
OPENAQ_API_KEY=your_openaq_api_key
WEATHER_API_KEY=your_weather_api_key

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Database (if applicable)
DATABASE_URL=sqlite:///./air_quality.db

# ML Model Settings
MODEL_PATH=./ml/models/
PREDICTION_CONFIDENCE_THRESHOLD=0.75

# Cache Settings
CACHE_TTL=300  # seconds
```

## 🛠️ Development

### Code Style

Format code with:
```bash
black .
```

Lint code:
```bash
flake8 .
```

Type checking:
```bash
mypy .
```

### Adding New Endpoints

1. Add endpoint function in `api/endpoints.py`
2. Implement business logic in appropriate service
3. Add tests
4. Update API documentation

Example:
```python
@router.get("/api/new-endpoint")
async def new_endpoint(param: str):
    """
    Endpoint description.
    """
    # Implementation
    return {"result": "data"}
```

## 📊 Machine Learning Models

The system uses XGBoost models for:
- AQI prediction based on historical data
- Pollution hotspot detection
- 48-hour forecasting

Models are trained on:
- Historical AQI data
- Weather patterns
- Traffic data
- Industrial activity
- Seasonal trends

## 🔐 Security

- API rate limiting implemented
- Input validation on all endpoints
- CORS configured for allowed origins
- Environment variables for sensitive data
- No credentials in code

## 🚢 Deployment

### Docker Deployment

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t aqi-backend .
docker run -p 8000:8000 aqi-backend
```

### Production Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Or with Gunicorn:
```bash
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 📚 Dependencies

Key packages:
- **FastAPI** - Web framework
- **Uvicorn** - ASGI server
- **XGBoost** - ML predictions
- **Pandas/NumPy** - Data processing
- **Scikit-learn** - ML utilities
- **Requests/aiohttp** - HTTP clients
- **Geopy/Shapely** - Geospatial operations

## 🐛 Debugging

Enable debug mode:
```python
# In main.py
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="debug")
```

Check logs:
```bash
tail -f logs/app.log
```

## 📞 Support

For issues or questions:
- Check [API documentation](http://localhost:8000/docs)
- Open an issue on GitHub
- Contact maintainers

## 📝 License

MIT License - see [LICENSE](../LICENSE) file
