# 🌍 Hyperlocal Air Quality Monitoring System

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.9+-green.svg)
![React](https://img.shields.io/badge/react-19.2.0-61dafb.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

A comprehensive real-time air quality monitoring system providing hyperlocal AQI data, forecasts, and health recommendations for Delhi-NCR region with street-level accuracy.

## ✨ Features

- **🔴 Real-time AQI Monitoring** - Live air quality data with WebSocket updates
- **📊 48-Hour Forecasts** - Advanced ML-based air quality predictions
- **🗺️ Interactive Map View** - Visualize air quality across different locations
- **💚 Health Recommendations** - Personalized health advice based on AQI levels
- **⭐ Favorite Locations** - Save and track your frequently visited places
- **📈 Historical Data Tracking** - Analyze trends over time
- **📤 Data Export** - Export data in CSV, JSON, and GeoJSON formats
- **🔥 Hotspot Detection** - Identify pollution hotspots in real-time
- **📍 Location Services** - Geolocation-based AQI monitoring
- **☁️ Weather Integration** - Correlate weather data with air quality

## 🏗️ Architecture

```
hyperlocal-air-quality/
├── backend/              # FastAPI backend server
│   ├── api/             # API endpoints and WebSocket handlers
│   ├── ml/              # Machine learning models
│   ├── models/          # Database models
│   └── services/        # Business logic services
├── frontend/            # React TypeScript frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   └── services/    # API service layer
│   └── public/          # Static assets
└── docs/                # Documentation (if any)
```

## 🚀 Quick Start

### Prerequisites

- Python 3.9 or higher
- Node.js 16 or higher
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the server:**
   ```bash
   python main.py
   ```

   The API will be available at `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`
   - Alternative Docs: `http://localhost:8000/redoc`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment (if needed):**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

## 📋 API Endpoints

### Core Endpoints

- `GET /` - API information and available features
- `GET /api/aqi` - Get current AQI data for a location
- `GET /api/forecast` - Get 48-hour AQI forecast
- `GET /api/health-advice` - Get health recommendations
- `GET /api/hotspots` - Get pollution hotspots
- `GET /api/comparison` - Compare AQI between locations
- `GET /api/export` - Export data in various formats
- `WS /ws` - WebSocket connection for real-time updates

For complete API documentation, visit `/docs` after starting the backend server.

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **Python 3.9+** - Core programming language
- **XGBoost** - ML model for AQI predictions
- **Scikit-learn** - Machine learning utilities
- **Pandas/NumPy** - Data processing
- **Uvicorn** - ASGI server
- **WebSockets** - Real-time communication
- **Geopy/Shapely** - Geospatial operations

### Frontend
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Leaflet/React-Leaflet** - Interactive maps
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **Framer Motion** - Animations
- **Lucide React** - Icon library

## 📊 Data Sources

- OpenAQ API for air quality data
- Weather API for meteorological data
- Custom ML models for predictions and forecasts

## 🔧 Development

### Running Tests

**Backend:**
```bash
cd backend
pytest
```

**Frontend:**
```bash
cd frontend
npm test
```

### Code Formatting

**Backend:**
```bash
black .
flake8 .
```

**Frontend:**
```bash
npm run lint
```

### Building for Production

**Backend:**
```bash
# Backend is ready to deploy as-is
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm run build
```

## 🌐 Deployment

### Backend Deployment Options
- Docker container
- Heroku
- AWS EC2/ECS
- Google Cloud Run
- Azure App Service

### Frontend Deployment Options
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Azure Static Web Apps

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Your Name - *Initial work*

## 🙏 Acknowledgments

- OpenAQ for providing open air quality data
- The open-source community for amazing tools and libraries
- Contributors and testers

## 📞 Contact

- Project Link: [https://github.com/yourusername/hyperlocal-air-quality](https://github.com/yourusername/hyperlocal-air-quality)
- Issue Tracker: [https://github.com/yourusername/hyperlocal-air-quality/issues](https://github.com/yourusername/hyperlocal-air-quality/issues)

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Push notifications for AQI alerts
- [ ] Multi-city support beyond Delhi-NCR
- [ ] Air quality prediction improvements
- [ ] User authentication and profiles
- [ ] Social features for sharing data
- [ ] Integration with more data sources
- [ ] Historical data analytics dashboard

## 📸 Screenshots

*Add screenshots of your application here*

---

⭐ If you find this project useful, please consider giving it a star on GitHub!
