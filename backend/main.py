import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from datetime import datetime

from api.endpoints import router as api_router
from api.websocket import manager
from services.prediction_service import PredictionService
from services.hotspot_service import HotspotService

# Services for background updates
prediction_service = PredictionService()
hotspot_service = HotspotService()

# Background task reference
background_task = None

async def broadcast_updates():
    """
    Background task to broadcast periodic AQI updates to all connected clients
    Runs every 5 minutes
    """
    try:
        await asyncio.sleep(10)  # Wait for app to fully start
        
        while True:
            try:
                if manager.active_connections:
                    # Get latest grid data
                    grid_data = await prediction_service.get_full_grid()
                    await manager.broadcast_aqi_update(grid_data)
                    
                    # Get hotspots
                    hotspots = await hotspot_service.get_hotspots()
                    await manager.send_hotspot_update(hotspots)
                    
                    print(f"[Broadcast] update sent to {len(manager.active_connections)} clients")
                
            except Exception as e:
                print(f"Error in broadcast task: {e}")
            
            # Wait 5 minutes before next update
            await asyncio.sleep(300)
    except asyncio.CancelledError:
        print("[OK] Broadcast task cancelled")
        raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    global background_task
    # Startup
    background_task = asyncio.create_task(broadcast_updates())
    print("[OK] Background update task started")
    print("[OK] WebSocket support enabled")
    print("[OK] API v2.0 ready with enhanced features")
    yield
    # Shutdown
    if background_task:
        background_task.cancel()
        try:
            await background_task
        except asyncio.CancelledError:
            pass
    print("[OK] Application shutdown complete")

app = FastAPI(
    title="Hyperlocal Air Quality API",
    description="API for estimating and visualizing street-level air quality in Delhi-NCR with real-time updates",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": "Welcome to Hyperlocal Air Quality API",
        "version": "2.0.0",
        "features": [
            "Real-time AQI monitoring",
            "48-hour forecasts",
            "Health recommendations",
            "Historical data tracking",
            "Favorite locations",
            "Data export (CSV/JSON/GeoJSON)",
            "WebSocket real-time updates",
            "Analytics and comparisons"
        ],
        "websocket": "/ws",
        "docs": "/docs"
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time AQI updates.
    Clients receive periodic updates about AQI, hotspots, and alerts.
    """
    await manager.connect(websocket)
    try:
        # Send initial connection success message
        await manager.send_personal_message({
            "type": "connection",
            "status": "connected",
            "message": "Successfully connected to AQI real-time updates",
            "timestamp": datetime.now().isoformat()
        }, websocket)
        
        # Keep connection alive and handle client messages
        while True:
            try:
                # Wait for messages from client (with timeout)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                
                # Echo back or handle client requests
                await manager.send_personal_message({
                    "type": "echo",
                    "message": f"Received: {data}",
                    "timestamp": datetime.now().isoformat()
                }, websocket)
                
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                await manager.send_personal_message({
                    "type": "heartbeat",
                    "timestamp": datetime.now().isoformat()
                }, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
