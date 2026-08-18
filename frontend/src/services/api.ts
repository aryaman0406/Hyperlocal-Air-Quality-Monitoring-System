import axios from 'axios';
import { resolveApiBaseUrl, resolveWebSocketUrl } from './runtimeConfig';

const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Pollutants {
    pm2_5: number | null;
    pm10: number | null;
    ozone: number | null;
    nitrogen_dioxide: number | null;
    sulphur_dioxide: number | null;
    carbon_monoxide: number | null;
}

export interface WeatherData {
    available: boolean;
    temperature: number | null;
    feels_like: number | null;
    humidity: number | null;
    wind_speed: number | null;
    wind_direction: string | null;
    wind_direction_degrees: number | null;
    pressure: number | null;
    precipitation: number | null;
    weather_code: number | null;
    condition: string | null;
    updated_at: string;
}

export interface LocationData {
    location: { lat: number; lon: number; address: string };
    aqi: number | null;
    aqi_scale: string;
    aqi_category: string | null;
    pollutants: Pollutants | null;
    weather: WeatherData | null;
    aq_available: boolean;
    wx_available: boolean;
    source: string | null;
    source_note: string | null;
    timestamp: string;
}

export interface ForecastHour {
    timestamp: string;
    hour: string;
    date: string;
    day_label: string;
    aqi: number | null;
    aqi_scale: string;
    category: string;
    health_advisory: string;
    pm2_5: number | null;
    pm10: number | null;
}

export interface ForecastData {
    available: boolean;
    source: string;
    source_note: string;
    aqi_scale: string;
    forecasts: ForecastHour[];
    statistics: {
        min_aqi: number;
        max_aqi: number;
        avg_aqi: number;
        worst_hour: string;
        best_hour: string;
    };
    daily_summary: Array<{
        date: string;
        min_aqi: number;
        max_aqi: number;
        avg_aqi: number;
        category: string;
    }>;
}

export interface UserProfile {
    name?: string;
    city?: string;
    country?: string;
    lat?: number;
    lon?: number;
}

export interface FavoriteLocation {
    id: string;
    name: string;
    lat: number;
    lon: number;
    current_aqi?: number | null;
}

export interface HealthRecommendation {
    aqi: number;
    category: string;
    health_impact: string;
    outdoor_activities: string;
    indoor_activities: string;
    mask_required: boolean;
    detailed_recommendations: string[];
    sensitive_groups_advice?: string;
}

// ── Core Endpoints ────────────────────────────────────────────────────────────

/**
 * Aggregate call: weather + AQI + reverse geocode in one request.
 * Preferred over separate getLiveAQI + getWeather calls.
 */
export const getLocationData = async (lat: number, lon: number): Promise<LocationData> => {
    const response = await api.get('/location-data', { params: { lat, lon } });
    return response.data;
};

export const getLiveAQI = async (lat: number, lon: number) => {
    const response = await api.get('/aqi/live', { params: { lat, lon } });
    return response.data;
};

export const getWeather = async (lat: number, lon: number) => {
    const response = await api.get('/weather', { params: { lat, lon } });
    return response.data;
};

export const getAQIGrid = async (lat?: number, lon?: number, radiusKm: number = 5) => {
    const response = await api.get('/aqi/grid', { params: { lat, lon, radius_km: radiusKm } });
    return response.data;
};

export const getHotspots = async (lat?: number, lon?: number) => {
    const response = await api.get('/aqi/hotspots', { params: { lat, lon } });
    return response.data;
};

export const getAlerts = async (lat: number, lon: number) => {
    const response = await api.get('/alerts', { params: { lat, lon } });
    return response.data;
};

export const getLocationAQI = async (lat: number, lon: number) => {
    const response = await api.get('/aqi/location', { params: { lat, lon } });
    return response.data;
};

// ── Health ────────────────────────────────────────────────────────────────────

export const getHealthRecommendations = async (
    aqi: number,
    sensitiveGroup: boolean = false
): Promise<HealthRecommendation> => {
    const response = await api.get('/health/recommendations', {
        params: { aqi, sensitive_group: sensitiveGroup }
    });
    return response.data;
};

// ── Forecast ──────────────────────────────────────────────────────────────────

export const getForecast = async (lat: number, lon: number): Promise<ForecastData> => {
    const response = await api.get('/forecast', { params: { lat, lon } });
    return response.data;
};

// ── Geocoding ─────────────────────────────────────────────────────────────────

export const geocodeLocation = async (address: string) => {
    const response = await api.get('/locations/geocode', { params: { address } });
    return response.data;
};

export const reverseGeocode = async (lat: number, lon: number) => {
    const response = await api.get('/locations/reverse', { params: { lat, lon } });
    return response.data;
};

// ── User Profile ──────────────────────────────────────────────────────────────

export const getProfile = async (): Promise<{ profile: UserProfile | null }> => {
    const response = await api.get('/profile');
    return response.data;
};

export const saveProfile = async (profile: UserProfile): Promise<{ message: string; profile: UserProfile }> => {
    const response = await api.post('/profile', profile);
    return response.data;
};

// ── Historical ────────────────────────────────────────────────────────────────

export const getHistoricalData = async (params: {
    start_time?: string;
    end_time?: string;
    lat?: number;
    lon?: number;
    radius_km?: number;
    limit?: number;
}) => {
    const response = await api.get('/historical', { params });
    return response.data;
};

// ── Favorites ─────────────────────────────────────────────────────────────────

export const addFavorite = async (name: string, lat: number, lon: number) => {
    const response = await api.post('/favorites', { name, lat, lon });
    return response.data;
};

export const getFavorites = async () => {
    const response = await api.get('/favorites');
    return response.data;
};

export const deleteFavorite = async (id: string) => {
    const response = await api.delete(`/favorites/${id}`);
    return response.data;
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getAnalyticsSummary = async (days: number = 7) => {
    const response = await api.get('/analytics/summary', { params: { days } });
    return response.data;
};

// ── Export ────────────────────────────────────────────────────────────────────

export const exportData = async (
    format: 'csv' | 'json' | 'geojson',
    params?: { start_time?: string; end_time?: string }
) => {
    const response = await api.get(`/export/${format}`, { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `aqi_data_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

// ── Cigarette Metric ──────────────────────────────────────────────────────────

export const getCigaretteEquivalence = async (aqi: number) => {
    const response = await api.get('/impact/cigarettes', { params: { aqi } });
    return response.data;
};

// ── Symptoms ──────────────────────────────────────────────────────────────────

export const logSymptoms = async (data: {
    lat: number; lon: number; aqi: number; symptoms: string[]; severity: number;
}) => {
    const response = await api.post('/health/symptoms', data);
    return response.data;
};

export const getSymptomCorrelation = async () => {
    const response = await api.get('/health/correlation');
    return response.data;
};

// ── Venues ────────────────────────────────────────────────────────────────────

export const getVenuesRisk = async () => {
    const response = await api.get('/venues/risk');
    return response.data;
};

export const addVenue = async (data: {
    name: string; type: string; lat: number; lon: number; safety_threshold: number;
}) => {
    const response = await api.post('/venues', data);
    return response.data;
};

export const submitReport = async (data: {
    lat: number; lon: number; type: string; description: string; image_url?: string;
}) => {
    const response = await api.post('/reports', data);
    return response.data;
};

export const getReports = async () => {
    const response = await api.get('/reports');
    return response.data;
};

// ── WebSocket ─────────────────────────────────────────────────────────────────

export class AQIWebSocket {
    private ws: WebSocket | null = null;
    private baseReconnectInterval = 5000;
    private maxReconnectInterval = 30000;
    private currentReconnectInterval = 5000;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isExplicitDisconnect = false;

    private onMessage: (data: unknown) => void;
    private onConnect?: () => void;
    private onDisconnect?: () => void;

    constructor(
        onMessage: (data: unknown) => void,
        onConnect?: () => void,
        onDisconnect?: () => void
    ) {
        this.onMessage = onMessage;
        this.onConnect = onConnect;
        this.onDisconnect = onDisconnect;
    }

    connect() {
        this.isExplicitDisconnect = false;
        try {
            const wsUrl = resolveWebSocketUrl();
            if (!wsUrl || (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://'))) {
                console.warn('[WS] Invalid WebSocket URL:', wsUrl);
                this.scheduleReconnect();
                return;
            }
            if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
                return;
            }
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('[WS] Connected to', wsUrl);
                this.currentReconnectInterval = this.baseReconnectInterval;
                if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
                if (this.onConnect) this.onConnect();
            };
            this.ws.onmessage = (event) => {
                try { this.onMessage(JSON.parse(event.data)); } catch { /* ignore parse errors */ }
            };
            this.ws.onclose = () => {
                if (this.onDisconnect) this.onDisconnect();
                if (!this.isExplicitDisconnect) this.scheduleReconnect();
            };
            this.ws.onerror = () => {
                // Error logged by onclose handler reconnect
            };
        } catch {
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect() {
        if (this.isExplicitDisconnect || this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.currentReconnectInterval = Math.min(this.currentReconnectInterval * 1.5, this.maxReconnectInterval);
            this.connect();
        }, this.currentReconnectInterval);
    }

    disconnect() {
        this.isExplicitDisconnect = true;
        if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
        if (this.ws) { try { this.ws.close(); } catch { /* ignore */ } this.ws = null; }
    }

    send(data: unknown) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
}

export default api;
