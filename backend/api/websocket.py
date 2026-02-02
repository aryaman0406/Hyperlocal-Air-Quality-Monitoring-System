from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import asyncio
import json
from datetime import datetime

class ConnectionManager:
    """Manages WebSocket connections for real-time AQI updates"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        self.active_connections.remove(websocket)
        print(f"Client disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific client"""
        await websocket.send_json(message)
    
    async def broadcast(self, message: dict):
        """Send a message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending to client: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.active_connections.remove(connection)
    
    async def broadcast_aqi_update(self, aqi_data: dict):
        """Broadcast AQI update to all clients"""
        message = {
            "type": "aqi_update",
            "timestamp": datetime.now().isoformat(),
            "data": aqi_data
        }
        await self.broadcast(message)
    
    async def broadcast_alert(self, alert: dict):
        """Broadcast an alert to all clients"""
        message = {
            "type": "alert",
            "timestamp": datetime.now().isoformat(),
            "data": alert
        }
        await self.broadcast(message)
    
    async def send_hotspot_update(self, hotspots: dict):
        """Broadcast hotspot update"""
        message = {
            "type": "hotspot_update",
            "timestamp": datetime.now().isoformat(),
            "data": hotspots
        }
        await self.broadcast(message)

# Global connection manager instance
manager = ConnectionManager()
