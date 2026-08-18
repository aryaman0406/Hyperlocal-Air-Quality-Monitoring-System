"""
Hotspot service: identifies high-pollution grid cells from real AQI data.
"""
from services.prediction_service import PredictionService


class HotspotService:
    def __init__(self):
        self.prediction_service = PredictionService()

    async def get_hotspots(self, lat: float = None, lon: float = None):
        """
        Identify high pollution grid cells (hotspots) for any location globally.
        Uses the real AQI grid from Open-Meteo/CAMS data.
        """
        grid_data_res = await self.prediction_service.get_full_grid(lat=lat, lon=lon)
        grid = grid_data_res.get("grid", [])

        if not grid:
            return {"hotspots": [], "corridors": [], "source": grid_data_res.get("source_note")}

        # Find cells with AQI above 150 (Unhealthy for Sensitive Groups threshold)
        high_aqi_cells = [cell for cell in grid if cell.get("aqi") and cell["aqi"] > 150]

        hotspots = []
        if high_aqi_cells:
            sorted_cells = sorted(high_aqi_cells, key=lambda x: x["aqi"], reverse=True)

            # Simple greedy clustering: avoid duplicate hotspots too close together
            added = []
            for cell in sorted_cells:
                if len(hotspots) >= 5:
                    break
                is_near = any(
                    (cell["lat"] - ex["lat"]) ** 2 + (cell["lon"] - ex["lon"]) ** 2 < 0.01
                    for ex in added
                )
                if not is_near:
                    hotspots.append({
                        "id": f"hotspot_{len(hotspots) + 1}",
                        "lat": cell["lat"],
                        "lon": cell["lon"],
                        "aqi": cell["aqi"],
                        "aqi_scale": "US AQI",
                        "category": cell.get("category", "Unhealthy"),
                        "type": "High Pollution Zone",
                        "radius_m": 500,
                    })
                    added.append(cell)

        return {
            "hotspots": hotspots,
            "corridors": [],
            "data_available": grid_data_res.get("available", False),
        }
