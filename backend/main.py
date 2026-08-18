import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import os
from datetime import datetime

from api.endpoints import router as api_router
from api.websocket import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    print("[OK] Hyperlocal Air Quality API starting up")
    print("[OK] WebSocket support enabled")
    print("[OK] API ready — data from Open-Meteo / CAMS")
    yield
    print("[OK] Application shutdown complete")


app = FastAPI(
    title="Hyperlocal Air Quality API",
    description=(
        "Real-time air quality and weather monitoring API. "
        "Data sourced from Open-Meteo (weather) and the Copernicus Atmosphere Monitoring Service "
        "(CAMS) via Open-Meteo (air quality). No API key required."
    ),
    version="2.1.0",
    lifespan=lifespan,
)

# CORS — allow all origins (configurable via ALLOWED_ORIGINS env var)
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
origins = [o.strip() for o in allowed_origins.split(",")] if allowed_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")


@app.get("/api/health")
async def health_check():
    """Lightweight health endpoint used by deployment platforms."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/")
async def root():
    return {
        "message": "Hyperlocal Air Quality API",
        "version": "2.1.0",
        "data_sources": [
            "Open-Meteo Weather Forecast API (weather)",
            "Open-Meteo Air Quality API / CAMS (AQI, PM2.5, PM10, O3, NO2, SO2, CO)",
        ],
        "endpoints": {
            "health": "/api/health",
            "location_data": "/api/location-data?lat=&lon=",
            "live_aqi": "/api/aqi/live?lat=&lon=",
            "weather": "/api/weather?lat=&lon=",
            "forecast": "/api/forecast?lat=&lon=",
            "profile": "/api/profile",
            "docs": "/docs",
        },
    }


@app.head("/")
async def root_health_probe():
    """Allow platform health probes that use HEAD requests."""
    return None


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await manager.connect(websocket)
    try:
        await manager.send_personal_message({
            "type": "connection",
            "status": "connected",
            "message": "Connected to AQI real-time updates",
            "timestamp": datetime.now().isoformat(),
        }, websocket)

        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                await manager.send_personal_message({
                    "type": "echo",
                    "message": f"Received: {data}",
                    "timestamp": datetime.now().isoformat(),
                }, websocket)
            except asyncio.TimeoutError:
                await manager.send_personal_message({
                    "type": "heartbeat",
                    "timestamp": datetime.now().isoformat(),
                }, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
