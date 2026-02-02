from typing import List, Dict

class HealthService:
    """
    Provides health recommendations based on AQI levels
    """
    
    def get_health_recommendations(self, aqi: float, sensitive_group: bool = False) -> Dict:
        """
        Get health recommendations based on AQI value
        
        Args:
            aqi: Air Quality Index value
            sensitive_group: Whether user belongs to sensitive group (children, elderly, respiratory issues)
        
        Returns:
            Dict with health advice, activity recommendations, and mask requirements
        """
        recommendations = {
            "aqi": aqi,
            "category": self._get_category(aqi),
            "health_impact": "",
            "outdoor_activities": "",
            "indoor_activities": "",
            "mask_required": False,
            "sensitive_groups_advice": "",
            "detailed_recommendations": []
        }
        
        if aqi <= 50:  # Good
            recommendations["health_impact"] = "Air quality is satisfactory, and air pollution poses little or no risk."
            recommendations["outdoor_activities"] = "Ideal for outdoor activities, exercise, and prolonged exposure."
            recommendations["indoor_activities"] = "No restrictions on indoor activities."
            recommendations["mask_required"] = False
            recommendations["sensitive_groups_advice"] = "No special precautions needed."
            recommendations["detailed_recommendations"] = [
                "Perfect day for outdoor exercise",
                "Open windows to let fresh air in",
                "Great time for morning/evening walks"
            ]
            
        elif aqi <= 100:  # Moderate
            recommendations["health_impact"] = "Air quality is acceptable. However, there may be a risk for some people."
            recommendations["outdoor_activities"] = "Outdoor activities are generally acceptable. Sensitive individuals should consider reducing prolonged exposure."
            recommendations["indoor_activities"] = "Normal indoor activities are fine."
            recommendations["mask_required"] = False
            if sensitive_group:
                recommendations["sensitive_groups_advice"] = "Consider reducing prolonged outdoor exertion if you experience symptoms."
                recommendations["detailed_recommendations"] = [
                    "Limit intense outdoor exercise to 1-2 hours",
                    "Take breaks during outdoor activities",
                    "Monitor for respiratory symptoms"
                ]
            else:
                recommendations["detailed_recommendations"] = [
                    "Generally safe for most outdoor activities",
                    "Stay hydrated during exercise",
                    "Watch for any unusual symptoms"
                ]
                
        elif aqi <= 150:  # Unhealthy for Sensitive Groups
            recommendations["health_impact"] = "Sensitive groups may experience health effects. The general public is less likely to be affected."
            recommendations["outdoor_activities"] = "Reduce prolonged or heavy outdoor exertion. Take more breaks."
            recommendations["indoor_activities"] = "Keep windows closed. Use air purifiers if available."
            recommendations["mask_required"] = sensitive_group
            recommendations["sensitive_groups_advice"] = "Reduce prolonged or heavy outdoor exertion. Consider wearing a mask (N95 or equivalent)."
            recommendations["detailed_recommendations"] = [
                "Limit outdoor activities to less than 1 hour",
                "Avoid traffic-heavy areas",
                "Use air purifiers indoors",
                "Keep windows and doors closed",
                "Sensitive groups should wear N95 masks outdoors"
            ]
            
        elif aqi <= 200:  # Unhealthy
            recommendations["health_impact"] = "Everyone may begin to experience health effects. Sensitive groups may experience more serious effects."
            recommendations["outdoor_activities"] = "Avoid prolonged outdoor exertion. Everyone should reduce outdoor activities."
            recommendations["indoor_activities"] = "Stay indoors as much as possible. Use air purifiers."
            recommendations["mask_required"] = True
            recommendations["sensitive_groups_advice"] = "Avoid outdoor activities entirely. Stay indoors with air purification."
            recommendations["detailed_recommendations"] = [
                "Minimize time outdoors",
                "Wear N95 masks if going outside is necessary",
                "Avoid heavy traffic areas completely",
                "Use HEPA air purifiers indoors",
                "Keep all windows and doors closed",
                "Postpone outdoor exercise",
                "Children and elderly should stay indoors"
            ]
            
        elif aqi <= 300:  # Very Unhealthy
            recommendations["health_impact"] = "Health alert: everyone may experience more serious health effects."
            recommendations["outdoor_activities"] = "Avoid all outdoor physical activities."
            recommendations["indoor_activities"] = "Remain indoors and keep activity levels low."
            recommendations["mask_required"] = True
            recommendations["sensitive_groups_advice"] = "Stay indoors and keep activity levels low. Seek medical attention if symptoms develop."
            recommendations["detailed_recommendations"] = [
                "Stay indoors at all times",
                "Seal doors and windows",
                "Run air purifiers continuously",
                "Wear N95/N99 masks if must go outside",
                "Avoid all physical exertion",
                "Monitor health symptoms closely",
                "Have emergency contacts ready",
                "Consider relocating if possible"
            ]
            
        else:  # Hazardous (> 300)
            recommendations["health_impact"] = "Health warning of emergency conditions. Everyone is likely to be affected."
            recommendations["outdoor_activities"] = "Avoid all outdoor activities. Stay indoors."
            recommendations["indoor_activities"] = "Remain indoors. Seal all openings. Use air purifiers."
            recommendations["mask_required"] = True
            recommendations["sensitive_groups_advice"] = "Emergency conditions. Stay indoors with sealed windows. Seek immediate medical attention for any symptoms."
            recommendations["detailed_recommendations"] = [
                "DO NOT go outside unless absolutely necessary",
                "Seal all doors and windows with tape if possible",
                "Run multiple air purifiers",
                "Wear N99/P100 respirators if must go outside",
                "Avoid ALL physical activity",
                "Monitor health constantly",
                "Have emergency medical contacts ready",
                "Consider immediate relocation",
                "Schools and offices should be closed"
            ]
        
        return recommendations
    
    def _get_category(self, aqi: float) -> str:
        """Get AQI category name"""
        if aqi <= 50:
            return "Good"
        elif aqi <= 100:
            return "Moderate"
        elif aqi <= 150:
            return "Unhealthy for Sensitive Groups"
        elif aqi <= 200:
            return "Unhealthy"
        elif aqi <= 300:
            return "Very Unhealthy"
        else:
            return "Hazardous"
    
    def get_category_color(self, aqi: float) -> str:
        """Get color code for AQI category"""
        if aqi <= 50:
            return "#10b981"  # Green
        elif aqi <= 100:
            return "#f59e0b"  # Yellow
        elif aqi <= 150:
            return "#f97316"  # Orange
        elif aqi <= 200:
            return "#ef4444"  # Red
        elif aqi <= 300:
            return "#dc2626"  # Dark Red
        else:
            return "#7c3aed"  # Purple
    def get_category_distribution(self, aqi_values: List[float]) -> dict:
        """Calculate distribution of AQI categories"""
        categories = {
            "Good": 0,
            "Moderate": 0,
            "Unhealthy for Sensitive Groups": 0,
            "Unhealthy": 0,
            "Very Unhealthy": 0,
            "Hazardous": 0
        }
        
        for aqi in aqi_values:
            cat = self._get_category(aqi)
            if cat in categories:
                categories[cat] += 1
            else:
                # Fallback for dynamic categories if naming differs
                pass
        
        total = len(aqi_values)
        return {
            category: {
                "count": count,
                "percentage": round((count / total) * 100, 1) if total > 0 else 0
            }
            for category, count in categories.items()
        }
