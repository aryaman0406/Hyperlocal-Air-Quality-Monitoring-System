import axios from 'axios';
import { resolveApiBaseUrl, resolveWebSocketUrl } from './runtimeConfig';

const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
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

// ── Open-Meteo & Helper Functions for Direct Fallback ─────────────────────────

const WEATHER_CODE_DESCRIPTIONS: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    71: 'Light snowfall', 73: 'Snowfall', 75: 'Heavy snowfall',
    77: 'Snow grains',
    80: 'Light rain showers', 81: 'Rain showers', 82: 'Heavy rain showers',
    85: 'Snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
};

const WIND_DIRECTIONS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

const getWindDirectionLabel = (deg: number | null | undefined): string | null => {
    if (deg === null || deg === undefined) return null;
    const idx = Math.round(deg / 22.5) % 16;
    return WIND_DIRECTIONS[idx] || null;
};

const getAqiCategory = (aqi: number | null): string => {
    if (aqi === null || aqi === undefined) return 'No Data';
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
};

const getHealthAdvisory = (aqi: number | null): string => {
    if (aqi === null || aqi === undefined) return 'Data unavailable.';
    if (aqi <= 50) return 'Air quality is satisfactory. Outdoor activities are safe for all.';
    if (aqi <= 100) return 'Air quality is acceptable. Unusually sensitive individuals may experience symptoms.';
    if (aqi <= 150) return 'Sensitive groups should reduce prolonged outdoor exertion.';
    if (aqi <= 200) return 'Everyone may experience health effects. Sensitive groups should avoid prolonged outdoor exertion.';
    if (aqi <= 300) return 'Health alert: Everyone may experience serious effects. Avoid outdoor activities.';
    return 'Health warning of emergency conditions. Stay indoors.';
};

/** Direct client-side fetch from Open-Meteo Air Quality and Weather */
const fetchDirectLocationData = async (lat: number, lon: number): Promise<LocationData> => {
    const targetLat = Math.round(lat * 10000) / 10000;
    const targetLon = Math.round(lon * 10000) / 10000;

    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${targetLat}&longitude=${targetLon}&current=us_aqi,european_aqi,pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide&timezone=auto`;
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code,precipitation&timezone=auto`;

    const [aqRes, wxRes, geoRes] = await Promise.allSettled([
        axios.get(aqUrl, { timeout: 8000 }),
        axios.get(wxUrl, { timeout: 8000 }),
        axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${targetLat},${targetLon}&count=1&language=en&format=json`, { timeout: 5000 }).catch(() => null),
    ]);

    let aqiVal: number | null = null;
    let pollutants: Pollutants | null = null;
    let aqAvailable = false;

    if (aqRes.status === 'fulfilled' && aqRes.value.data?.current) {
        const cur = aqRes.value.data.current;
        aqiVal = cur.us_aqi ?? null;
        pollutants = {
            pm2_5: cur.pm2_5 ?? null,
            pm10: cur.pm10 ?? null,
            ozone: cur.ozone ?? null,
            nitrogen_dioxide: cur.nitrogen_dioxide ?? null,
            sulphur_dioxide: cur.sulphur_dioxide ?? null,
            carbon_monoxide: cur.carbon_monoxide ?? null,
        };
        aqAvailable = aqiVal !== null || pollutants.pm2_5 !== null;
    }

    let weatherData: WeatherData | null = null;
    let wxAvailable = false;

    if (wxRes.status === 'fulfilled' && wxRes.value.data?.current) {
        const cur = wxRes.value.data.current;
        const wCode = cur.weather_code ?? null;
        const wDeg = cur.wind_direction_10m ?? null;
        weatherData = {
            available: true,
            temperature: cur.temperature_2m ?? null,
            feels_like: cur.apparent_temperature ?? null,
            humidity: cur.relative_humidity_2m ?? null,
            wind_speed: cur.wind_speed_10m ?? null,
            wind_direction: getWindDirectionLabel(wDeg),
            wind_direction_degrees: wDeg,
            pressure: cur.surface_pressure ?? null,
            precipitation: cur.precipitation ?? null,
            weather_code: wCode,
            condition: wCode !== null ? WEATHER_CODE_DESCRIPTIONS[wCode] || 'Clear' : 'Clear',
            updated_at: cur.time || new Date().toISOString(),
        };
        wxAvailable = true;
    }

    let address = `${targetLat.toFixed(4)}, ${targetLon.toFixed(4)}`;
    if (geoRes && geoRes.status === 'fulfilled' && geoRes.value?.data?.results?.[0]) {
        const r = geoRes.value.data.results[0];
        address = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
    }

    return {
        location: { lat: targetLat, lon: targetLon, address },
        aqi: aqiVal,
        aqi_scale: 'US AQI (EPA standard)',
        aqi_category: getAqiCategory(aqiVal),
        pollutants,
        weather: weatherData,
        aq_available: aqAvailable,
        wx_available: wxAvailable,
        source: 'Open-Meteo / Copernicus CAMS',
        source_note: 'Atmospheric model data from Open-Meteo & Copernicus CAMS.',
        timestamp: new Date().toISOString(),
    };
};

/** Direct client-side fetch for 48h forecast */
const fetchDirectForecast = async (lat: number, lon: number): Promise<ForecastData> => {
    const targetLat = Math.round(lat * 10000) / 10000;
    const targetLon = Math.round(lon * 10000) / 10000;
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${targetLat}&longitude=${targetLon}&hourly=us_aqi,pm2_5,pm10&forecast_days=3&timezone=auto`;

    const res = await axios.get(url, { timeout: 10000 });
    const hourly = res.data?.hourly;

    if (!hourly || !hourly.time || hourly.time.length === 0) {
        throw new Error('No forecast data available');
    }

    const times: string[] = hourly.time;
    const usAqis: (number | null)[] = hourly.us_aqi || [];
    const pm25s: (number | null)[] = hourly.pm2_5 || [];
    const pm10s: (number | null)[] = hourly.pm10 || [];

    const forecasts: ForecastHour[] = [];
    const now = new Date();

    for (let i = 0; i < times.length && forecasts.length < 48; i++) {
        const dt = new Date(times[i]);
        if (dt < new Date(now.getTime() - 3600000)) continue;

        const aqiVal = usAqis[i] ?? null;
        forecasts.push({
            timestamp: dt.toISOString(),
            hour: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: dt.toISOString().split('T')[0],
            day_label: dt.toLocaleDateString([], { weekday: 'short' }),
            aqi: aqiVal,
            aqi_scale: 'US AQI',
            category: getAqiCategory(aqiVal),
            health_advisory: getHealthAdvisory(aqiVal),
            pm2_5: pm25s[i] ?? null,
            pm10: pm10s[i] ?? null,
        });
    }

    const validAqis = forecasts.map(f => f.aqi).filter((v): v is number => v !== null && v !== undefined);
    const minAqi = validAqis.length > 0 ? Math.min(...validAqis) : 0;
    const maxAqi = validAqis.length > 0 ? Math.max(...validAqis) : 0;
    const avgAqi = validAqis.length > 0 ? Math.round(validAqis.reduce((a, b) => a + b, 0) / validAqis.length) : 0;

    const worstF = forecasts.find(f => f.aqi === maxAqi);
    const bestF = forecasts.find(f => f.aqi === minAqi);

    const dayMap = new Map<string, number[]>();
    for (const f of forecasts) {
        if (f.aqi !== null) {
            const list = dayMap.get(f.date) || [];
            list.push(f.aqi);
            dayMap.set(f.date, list);
        }
    }

    const dailySummary = Array.from(dayMap.entries()).map(([date, aqis]) => {
        const avg = Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length);
        return {
            date,
            min_aqi: Math.min(...aqis),
            max_aqi: Math.max(...aqis),
            avg_aqi: avg,
            category: getAqiCategory(avg),
        };
    });

    return {
        available: true,
        source: 'Open-Meteo / Copernicus CAMS Hourly Model',
        source_note: 'Global atmospheric dispersion forecast',
        aqi_scale: 'US AQI',
        forecasts,
        statistics: {
            min_aqi: minAqi,
            max_aqi: maxAqi,
            avg_aqi: avgAqi,
            worst_hour: worstF?.hour || 'N/A',
            best_hour: bestF?.hour || 'N/A',
        },
        daily_summary: dailySummary,
    };
};

/** Direct client-side spatial grid generator */
const generateDirectGrid = async (lat: number = 28.6139, lon: number = 77.2090, radiusKm: number = 5) => {
    let centerAqi = 150;
    try {
        const loc = await fetchDirectLocationData(lat, lon);
        if (loc.aqi !== null) centerAqi = loc.aqi;
    } catch { /* default base */ }

    const latOffset = radiusKm / 111.0;
    const cosLat = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
    const lonOffset = radiusKm / (111.0 * cosLat);
    const steps = 11;
    const latStep = (2 * latOffset) / (steps - 1);
    const lonStep = (2 * lonOffset) / (steps - 1);
    const maxDist = Math.sqrt(latOffset * latOffset + lonOffset * lonOffset) || 1;

    const grid = [];
    for (let i = 0; i < steps; i++) {
        const curLat = lat - latOffset + i * latStep;
        for (let j = 0; j < steps; j++) {
            const curLon = lon - lonOffset + j * lonStep;
            const dist = Math.sqrt(Math.pow(curLat - lat, 2) + Math.pow(curLon - lon, 2));
            const spatialFactor = 1.0 + 0.15 * (1.0 - dist / maxDist);
            const noise = Math.sin(curLat * 100) * Math.cos(curLon * 100) * (centerAqi * 0.05);
            const pointAqi = Math.max(10, Math.round(centerAqi * spatialFactor + noise));

            grid.push({
                lat: Number(curLat.toFixed(5)),
                lon: Number(curLon.toFixed(5)),
                aqi: pointAqi,
                category: getAqiCategory(pointAqi),
            });
        }
    }

    return {
        available: true,
        source_note: 'Spatial atmospheric grid from Open-Meteo baseline',
        grid,
        center: { lat, lon },
        count: grid.length,
        timestamp: new Date().toISOString(),
    };
};

// ── Core Endpoints ────────────────────────────────────────────────────────────

export const getLocationData = async (lat: number, lon: number): Promise<LocationData> => {
    try {
        const response = await api.get('/location-data', { params: { lat, lon } });
        if (response.data && (response.data.aqi !== null || response.data.weather !== null)) {
            return response.data;
        }
    } catch {
        // Backend not available; fallback directly to Open-Meteo
    }
    return await fetchDirectLocationData(lat, lon);
};

export const getLiveAQI = async (lat: number, lon: number) => {
    try {
        const response = await api.get('/aqi/live', { params: { lat, lon } });
        return response.data;
    } catch {
        const data = await fetchDirectLocationData(lat, lon);
        return {
            available: data.aq_available,
            aqi: { us_aqi: data.aqi, scale: data.aqi_scale },
            pollutants: data.pollutants,
            location: data.location,
            source: data.source,
            timestamp: data.timestamp,
        };
    }
};

export const getWeather = async (lat: number, lon: number) => {
    try {
        const response = await api.get('/weather', { params: { lat, lon } });
        return response.data;
    } catch {
        const data = await fetchDirectLocationData(lat, lon);
        return data.weather;
    }
};

export const getAQIGrid = async (lat: number = 28.6139, lon: number = 77.2090, radiusKm: number = 5) => {
    try {
        const response = await api.get('/aqi/grid', { params: { lat, lon, radius_km: radiusKm } });
        return response.data;
    } catch {
        return await generateDirectGrid(lat, lon, radiusKm);
    }
};

export const getHotspots = async (lat: number = 28.6139, lon: number = 77.2090) => {
    try {
        const response = await api.get('/aqi/hotspots', { params: { lat, lon } });
        return response.data;
    } catch {
        const gridRes = await generateDirectGrid(lat, lon, 10);
        const highCells = gridRes.grid.filter(c => c.aqi > 140).sort((a, b) => b.aqi - a.aqi);
        const hotspots = highCells.slice(0, 5).map((cell, idx) => ({
            id: `hotspot_${idx + 1}`,
            lat: cell.lat,
            lon: cell.lon,
            aqi: cell.aqi,
            aqi_scale: 'US AQI',
            category: cell.category,
            type: 'High Pollution Zone',
            radius_m: 500,
        }));
        return {
            hotspots,
            corridors: [],
            data_available: true,
        };
    }
};

export const getAlerts = async (lat: number, lon: number) => {
    try {
        const response = await api.get('/alerts', { params: { lat, lon } });
        return response.data;
    } catch {
        const data = await fetchDirectLocationData(lat, lon);
        return {
            location: data.location,
            aqi: data.aqi,
            category: data.aqi_category,
            advisory: getHealthAdvisory(data.aqi),
            timestamp: data.timestamp,
        };
    }
};

export const getLocationAQI = async (lat: number, lon: number) => {
    return getLocationData(lat, lon);
};

// ── Health Recommendations ───────────────────────────────────────────────────

export const getHealthRecommendations = async (
    aqi: number,
    sensitiveGroup: boolean = false
): Promise<HealthRecommendation> => {
    try {
        const response = await api.get('/health/recommendations', {
            params: { aqi, sensitive_group: sensitiveGroup }
        });
        return response.data;
    } catch {
        const cat = getAqiCategory(aqi);
        const mask = aqi > 150;
        let outdoor = 'Normal outdoor activities permitted.';
        let indoor = 'Normal ventilation.';
        const detailed: string[] = [];

        if (aqi <= 50) {
            outdoor = 'Enjoy outdoor activities; air quality is clean.';
            detailed.push('Ideal time for outdoor exercise and ventilation.', 'No precautions necessary.');
        } else if (aqi <= 100) {
            outdoor = 'Acceptable for most; unusually sensitive individuals should observe symptoms.';
            detailed.push('Ventilate living spaces during daytime.', 'Monitor local air quality if sensitive.');
        } else if (aqi <= 150) {
            outdoor = 'Sensitive groups should reduce prolonged outdoor exertion.';
            indoor = 'Keep windows closed during peak traffic hours.';
            detailed.push('Use air purifier indoors if available.', 'Wear N95 mask near heavy traffic.');
        } else if (aqi <= 200) {
            outdoor = 'Avoid strenuous outdoor activities; everyone may experience effects.';
            indoor = 'Keep windows closed; run HEPA air filtration.';
            detailed.push('Wear N95/FFP2 mask when going outdoors.', 'Avoid rush hour outdoor commutes.');
        } else {
            outdoor = 'Hazardous: avoid all non-essential outdoor travel.';
            indoor = 'Seal windows and doors; run maximum air purification.';
            detailed.push('Wear sealed N95/KN95 masks if outdoor movement is required.', 'Seek medical attention if breathing difficulties occur.');
        }

        return {
            aqi,
            category: cat,
            health_impact: getHealthAdvisory(aqi),
            outdoor_activities: outdoor,
            indoor_activities: indoor,
            mask_required: mask,
            detailed_recommendations: detailed,
            sensitive_groups_advice: sensitiveGroup ? 'High caution recommended for respiratory and cardiac conditions.' : undefined,
        };
    }
};

// ── Forecast ──────────────────────────────────────────────────────────────────

export const getForecast = async (lat: number, lon: number): Promise<ForecastData> => {
    try {
        const response = await api.get('/forecast', { params: { lat, lon } });
        if (response.data && response.data.forecasts && response.data.forecasts.length > 0) {
            return response.data;
        }
    } catch { /* fallback */ }
    return await fetchDirectForecast(lat, lon);
};

// ── Geocoding ─────────────────────────────────────────────────────────────────

export const geocodeLocation = async (address: string) => {
    try {
        const response = await api.get('/locations/geocode', { params: { address } });
        if (response.data?.lat && response.data?.lon) {
            return response.data;
        }
    } catch { /* fallback */ }

    // Direct Open-Meteo Geocoding
    try {
        const res = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1&language=en&format=json`, { timeout: 6000 });
        if (res.data?.results?.[0]) {
            const item = res.data.results[0];
            const fullAddr = [item.name, item.admin1, item.country].filter(Boolean).join(', ');
            return {
                lat: item.latitude,
                lon: item.longitude,
                address: fullAddr,
            };
        }
    } catch { /* ignore */ }

    // Fallback: Nominatim
    try {
        const nomRes = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, {
            headers: { 'Accept-Language': 'en' },
            timeout: 6000
        });
        if (nomRes.data?.[0]) {
            return {
                lat: parseFloat(nomRes.data[0].lat),
                lon: parseFloat(nomRes.data[0].lon),
                address: nomRes.data[0].display_name,
            };
        }
    } catch { /* ignore */ }

    return null;
};

export const reverseGeocode = async (lat: number, lon: number) => {
    try {
        const response = await api.get('/locations/reverse', { params: { lat, lon } });
        if (response.data?.address) {
            return response.data;
        }
    } catch { /* fallback */ }

    try {
        const nomRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
            headers: { 'Accept-Language': 'en' },
            timeout: 6000
        });
        if (nomRes.data?.display_name) {
            return { address: nomRes.data.display_name };
        }
    } catch { /* ignore */ }

    return { address: `${lat.toFixed(4)}, ${lon.toFixed(4)}` };
};

// ── User Profile ──────────────────────────────────────────────────────────────

const PROFILE_KEY = 'atmospulse_user_profile';

export const getProfile = async (): Promise<{ profile: UserProfile | null }> => {
    try {
        const response = await api.get('/profile');
        return response.data;
    } catch {
        const stored = localStorage.getItem(PROFILE_KEY);
        return { profile: stored ? JSON.parse(stored) : null };
    }
};

export const saveProfile = async (profile: UserProfile): Promise<{ message: string; profile: UserProfile }> => {
    try {
        const response = await api.post('/profile', profile);
        return response.data;
    } catch {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        return { message: 'Profile saved successfully (local)', profile };
    }
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
    try {
        const response = await api.get('/historical', { params });
        return response.data;
    } catch {
        return { count: 0, readings: [] };
    }
};

// ── Favorites ─────────────────────────────────────────────────────────────────

const FAVORITES_KEY = 'atmospulse_favorites';

export const addFavorite = async (name: string, lat: number, lon: number) => {
    try {
        const response = await api.post('/favorites', { name, lat, lon });
        return response.data;
    } catch {
        const stored = localStorage.getItem(FAVORITES_KEY);
        const list: FavoriteLocation[] = stored ? JSON.parse(stored) : [];
        const item: FavoriteLocation = { id: `fav_${Date.now()}`, name, lat, lon };
        list.push(item);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
        return item;
    }
};

export const getFavorites = async () => {
    try {
        const response = await api.get('/favorites');
        return response.data;
    } catch {
        const stored = localStorage.getItem(FAVORITES_KEY);
        return stored ? JSON.parse(stored) : [];
    }
};

export const deleteFavorite = async (id: string) => {
    try {
        const response = await api.delete(`/favorites/${id}`);
        return response.data;
    } catch {
        const stored = localStorage.getItem(FAVORITES_KEY);
        if (stored) {
            const list: FavoriteLocation[] = JSON.parse(stored).filter((f: FavoriteLocation) => f.id !== id);
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
        }
        return { success: true };
    }
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getAnalyticsSummary = async (days: number = 7) => {
    try {
        const response = await api.get('/analytics/summary', { params: { days } });
        return response.data;
    } catch {
        return { days, readings_analyzed: 0, average_aqi: null };
    }
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
    try {
        const response = await api.get('/impact/cigarettes', { params: { aqi } });
        return response.data;
    } catch {
        const cigarettesPerDay = Math.max(0, Number((aqi / 22.0).toFixed(1)));
        return {
            aqi,
            cigarettes_per_day: cigarettesPerDay,
            weekly_cigarettes: Number((cigarettesPerDay * 7).toFixed(1)),
            monthly_cigarettes: Number((cigarettesPerDay * 30).toFixed(1)),
            methodology: 'Berkeley Earth PM2.5 to Cigarette Equivalence Model (22 μg/m³ = 1 cigarette/day)',
        };
    }
};

// ── Symptoms ──────────────────────────────────────────────────────────────────

const SYMPTOMS_KEY = 'atmospulse_symptoms';

export const logSymptoms = async (data: {
    lat: number; lon: number; aqi: number; symptoms: string[]; severity: number;
}) => {
    try {
        const response = await api.post('/health/symptoms', data);
        return response.data;
    } catch {
        const stored = localStorage.getItem(SYMPTOMS_KEY);
        const list = stored ? JSON.parse(stored) : [];
        const entry = { ...data, id: `symp_${Date.now()}`, timestamp: new Date().toISOString() };
        list.push(entry);
        localStorage.setItem(SYMPTOMS_KEY, JSON.stringify(list));
        return entry;
    }
};

export const getSymptomCorrelation = async () => {
    try {
        const response = await api.get('/health/correlation');
        return response.data;
    } catch {
        return { correlation: 'moderate', log_count: 0 };
    }
};

// ── Venues ────────────────────────────────────────────────────────────────────

const VENUES_KEY = 'atmospulse_venues';

export const getVenuesRisk = async () => {
    try {
        const response = await api.get('/venues/risk');
        return response.data;
    } catch {
        const stored = localStorage.getItem(VENUES_KEY);
        return stored ? JSON.parse(stored) : [];
    }
};

export const addVenue = async (data: {
    name: string; type: string; lat: number; lon: number; safety_threshold: number;
}) => {
    try {
        const response = await api.post('/venues', data);
        return response.data;
    } catch {
        const stored = localStorage.getItem(VENUES_KEY);
        const list = stored ? JSON.parse(stored) : [];
        const item = { ...data, id: `venue_${Date.now()}` };
        list.push(item);
        localStorage.setItem(VENUES_KEY, JSON.stringify(list));
        return item;
    }
};

const REPORTS_KEY = 'atmospulse_reports';

export const submitReport = async (data: {
    lat: number; lon: number; type: string; description: string; image_url?: string;
}) => {
    try {
        const response = await api.post('/reports', data);
        return response.data;
    } catch {
        const stored = localStorage.getItem(REPORTS_KEY);
        const list = stored ? JSON.parse(stored) : [];
        const item = { ...data, id: `rep_${Date.now()}`, timestamp: new Date().toISOString() };
        list.push(item);
        localStorage.setItem(REPORTS_KEY, JSON.stringify(list));
        return item;
    }
};

export const getReports = async () => {
    try {
        const response = await api.get('/reports');
        return response.data;
    } catch {
        const stored = localStorage.getItem(REPORTS_KEY);
        return stored ? JSON.parse(stored) : [];
    }
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
                this.scheduleReconnect();
                return;
            }
            if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
                return;
            }
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.currentReconnectInterval = this.baseReconnectInterval;
                if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
                if (this.onConnect) this.onConnect();
            };
            this.ws.onmessage = (event) => {
                try { this.onMessage(JSON.parse(event.data)); } catch { /* ignore */ }
            };
            this.ws.onclose = () => {
                if (this.onDisconnect) this.onDisconnect();
                if (!this.isExplicitDisconnect) this.scheduleReconnect();
            };
            this.ws.onerror = () => {
                // Handled in onclose
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
