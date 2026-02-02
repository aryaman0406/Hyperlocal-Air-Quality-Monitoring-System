from services.prediction_service import PredictionService
import numpy as np

class HotspotService:
    def __init__(self):
        self.prediction_service = PredictionService()

    async def get_hotspots(self, lat: float = None, lon: float = None):
        """
        Identify high pollution clusters (hotspots).
        """
        grid_data_res = await self.prediction_service.get_full_grid(lat=lat, lon=lon)
        grid = grid_data_res['grid']
        
        # Filter for high AQI (> 250)
        high_aqi_cells = [cell for cell in grid if cell['aqi'] > 200]
        
        # Simple clustering: if cells are very close, they form a hotspot
        # For this prototype, we'll return the top 5 distinct high-AQI clusters
        # In a real app, use DBSCAN or similar
        
        hotspots = []
        if high_aqi_cells:
            # Sort by AQI descending
            sorted_cells = sorted(high_aqi_cells, key=lambda x: x['aqi'], reverse=True)
            
            # Simple greedy clustering
            added = []
            for cell in sorted_cells:
                if len(hotspots) >= 5:
                    break
                    
                is_near = False
                for existing in added:
                    dist = (cell['lat'] - existing['lat'])**2 + (cell['lon'] - existing['lon'])**2
                    if dist < 0.01: # ~1km
                        is_near = True
                        break
                
                if not is_near:
                    hotspots.append({
                        "id": f"hotspot_{len(hotspots)+1}",
                        "lat": cell['lat'],
                        "lon": cell['lon'],
                        "aqi": cell['aqi'],
                        "type": "Hotspot",
                        "radius": 500 # meters
                    })
                    added.append(cell)

        # Custom corridors could be generated based on road networks if available
        corridors = []

        return {
            "hotspots": hotspots,
            "corridors": corridors
        }
