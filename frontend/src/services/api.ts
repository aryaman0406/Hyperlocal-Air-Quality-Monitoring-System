import axios from 'axios';
import { resolveApiBaseUrl, resolveWebSocketUrl } from './runtimeConfig';

const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface ForecastData {
    timestamp: string;
    hour: string;
    aqi: number;
    category: string;
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

export interface FavoriteLocation {
    id: string;
    name: string;
    lat: number;
    lon: number;
    current_aqi?: number;
}

export const getLiveAQI = async (lat?: number, lon?: number) => {
    const response = await api.get('/aqi/live', {
        params: { lat, lon }
    });
    return response.data;
};

export const getAQIGrid = async (lat?: number, lon?: number, radiusKm: number = 5) => {
    const response = await api.get('/aqi/grid', {
        params: { lat, lon, radius_km: radiusKm }
    });
    return response.data;
};

export const getHotspots = async (lat?: number, lon?: number) => {
    const response = await api.get('/aqi/hotspots', {
        params: { lat, lon }
    });
    return response.data;
};

export const getAlerts = async (lat: number, lon: number) => {
    const response = await api.get('/alerts', {
        params: { lat, lon },
    });
    return response.data;
};

// New API calls
export const getHealthRecommendations = async (aqi: number, sensitiveGroup: boolean = false) => {
    const response = await api.get('/health/recommendations', {
        params: { aqi, sensitive_group: sensitiveGroup }
    });
    return response.data;
};

export const getForecast = async (lat: number, lon: number) => {
    const response = await api.get('/forecast', {
        params: { lat, lon }
    });
    return response.data;
};

export const getRegionalForecast = async () => {
    const response = await api.get('/forecast/regional');
    return response.data;
};

export const geocodeLocation = async (address: string) => {
    const response = await api.get('/locations/geocode', {
        params: { address }
    });
    return response.data;
};

export const getLocationAQI = async (lat: number, lon: number) => {
    const response = await api.get('/aqi/location', {
        params: { lat, lon }
    });
    return response.data;
};

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

export const getAnalyticsSummary = async (days: number = 7) => {
    const response = await api.get('/analytics/summary', {
        params: { days }
    });
    return response.data;
};

export const exportData = async (format: 'csv' | 'json' | 'geojson', params?: {
    start_time?: string;
    end_time?: string;
}) => {
    const response = await api.get(`/export/${format}`, {
        params,
        responseType: 'blob'
    });

    // Trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `aqi_data_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

// Advanced Problem Solving Features
export const getCigaretteEquivalence = async (aqi: number) => {
    const response = await api.get('/impact/cigarettes', { params: { aqi } });
    return response.data;
};

export const logSymptoms = async (data: {
    lat: number;
    lon: number;
    aqi: number;
    symptoms: string[];
    severity: number;
}) => {
    const response = await api.post('/health/symptoms', data);
    return response.data;
};

export const getSymptomCorrelation = async () => {
    const response = await api.get('/health/correlation');
    return response.data;
};

export const getVenuesRisk = async () => {
    const response = await api.get('/venues/risk');
    return response.data;
};

export const addVenue = async (data: {
    name: string;
    type: string;
    lat: number;
    lon: number;
    safety_threshold: number;
}) => {
    const response = await api.post('/venues', data);
    return response.data;
};

export const submitReport = async (data: {
    lat: number;
    lon: number;
    type: string;
    description: string;
    image_url?: string;
}) => {
    const response = await api.post('/reports', data);
    return response.data;
};

export const getReports = async () => {
    const response = await api.get('/reports');
    return response.data;
};

// WebSocket connection for real-time updates
export class AQIWebSocket {
    private ws: WebSocket | null = null;
    private baseReconnectInterval: number = 5000;
    private maxReconnectInterval: number = 30000;
    private currentReconnectInterval: number = 5000;
    private reconnectTimer: any = null;
    private isExplicitDisconnect: boolean = false;

    private onMessage: (data: any) => void;
    private onConnect?: () => void;
    private onDisconnect?: () => void;

    constructor(
        onMessage: (data: any) => void,
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
                console.warn('Invalid WebSocket URL resolved:', wsUrl);
                this.scheduleReconnect();
                return;
            }

            if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
                return;
            }

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected to', wsUrl);
                this.currentReconnectInterval = this.baseReconnectInterval;
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
                if (this.onConnect) this.onConnect();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.onMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                if (this.onDisconnect) this.onDisconnect();
                if (!this.isExplicitDisconnect) {
                    this.scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.warn('WebSocket connection error (will retry automatically):', error);
            };
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect() {
        if (this.isExplicitDisconnect) return;
        if (!this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                this.currentReconnectInterval = Math.min(
                    this.currentReconnectInterval * 1.5,
                    this.maxReconnectInterval
                );
                this.connect();
            }, this.currentReconnectInterval);
        }
    }

    disconnect() {
        this.isExplicitDisconnect = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            try {
                this.ws.close();
            } catch (err) {
                console.debug('WebSocket close error:', err);
            }
            this.ws = null;
        }
    }

    send(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
}

export default api;
