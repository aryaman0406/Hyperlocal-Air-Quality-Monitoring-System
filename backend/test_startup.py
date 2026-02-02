#!/usr/bin/env python3
"""Test script to verify the backend starts correctly"""

import asyncio
import sys

async def test_imports():
    """Test all imports work"""
    print("Testing imports...")
    try:
        from fastapi import FastAPI
        from api.endpoints import router
        from api.websocket import manager
        from services.prediction_service import PredictionService
        from services.hotspot_service import HotspotService
        print("✓ All imports successful")
        return True
    except Exception as e:
        print(f"✗ Import error: {e}")
        return False

async def test_services():
    """Test service initialization"""
    print("\nTesting services...")
    try:
        from services.prediction_service import PredictionService
        from services.hotspot_service import HotspotService
        
        prediction_service = PredictionService()
        hotspot_service = HotspotService()
        print("✓ Services initialized successfully")
        return True
    except Exception as e:
        print(f"✗ Service initialization error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("=" * 50)
    print("Backend Health Check")
    print("=" * 50)
    
    result1 = await test_imports()
    result2 = await test_services()
    
    print("\n" + "=" * 50)
    if result1 and result2:
        print("✓ All tests passed! Backend is ready.")
        return 0
    else:
        print("✗ Some tests failed. Check errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
