import React, { useEffect, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Wind, AlertTriangle, MapPin, Download, Thermometer, Search, Navigation, Droplets, Activity } from 'lucide-react';
import styles from './Dashboard.module.css';
import { getLocationData, getHotspots, exportData, geocodeLocation, type LocationData } from '../services/api';
import MapView from '../components/MapView';
import Favorites from '../components/Favorites';
import Forecast from '../components/Forecast';
import CigaretteMetric from '../components/CigaretteMetric';
import SymptomLogger from '../components/SymptomLogger';
import InstitutionSafety from '../components/InstitutionSafety';
import PollutionReport from '../components/PollutionReport';

interface DashboardProps {
    onNavigateMap?: () => void;
}

const getAqiCategory = (aqi: number | null): string => {
    if (aqi === null || aqi === undefined) return 'No Data';
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
};

const getAqiColor = (aqi: number | null): string => {
    if (aqi === null) return '#64748b';
    if (aqi <= 50) return '#22c55e';
    if (aqi <= 100) return '#eab308';
    if (aqi <= 150) return '#f97316';
    if (aqi <= 200) return '#ef4444';
    if (aqi <= 300) return '#a855f7';
    return '#7f1d1d';
};

/** Generate a 24-hour diurnal AQI trend pattern from a base AQI reading. */
const generateHourlyTrend = (baseAqi: number): Array<{ time: string; aqi: number }> => {
    const now = new Date();
    const currentHour = now.getHours();
    return Array.from({ length: 24 }, (_, i) => {
        const h = (currentHour - (23 - i) + 24) % 24;
        let multiplier = 0.95;
        if (h >= 7 && h <= 10) multiplier = 1.15;
        else if (h >= 18 && h <= 22) multiplier = 1.25;
        else if (h >= 1 && h <= 5) multiplier = 0.85;
        const noise = Math.sin((h / 24) * Math.PI * 2) * 6;
        return {
            time: `${h.toString().padStart(2, '0')}:00`,
            aqi: Math.max(10, Math.round(baseAqi * multiplier + noise)),
        };
    });
};

const Dashboard: React.FC<DashboardProps> = ({ onNavigateMap }) => {
    const [locationData, setLocationData] = useState<LocationData | null>(null);
    const [trendData, setTrendData] = useState<Array<{ time: string; aqi: number }>>([]);
    const [hotspots, setHotspots] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [headerSearch, setHeaderSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [dataError, setDataError] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<
        'overview' | 'forecast' | 'health_impact' | 'venues' | 'reports' | 'favorites'
    >('overview');

    const [location, setLocation] = useState<{ lat: number; lon: number; name: string }>({
        lat: 28.6139,
        lon: 77.2090,
        name: 'Locating…',
    });

    // Auto-locate via browser GPS on first mount
    useEffect(() => {
        if (typeof window !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocation({
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                        name: `Your Location (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`,
                    });
                },
                () => {
                    // Geolocation denied; keep default
                    setLocation(l => ({ ...l, name: 'New Delhi, India (default)' }));
                },
                { timeout: 8000 }
            );
        }
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setDataError(null);
        try {
            const [locRes, hotRes] = await Promise.allSettled([
                getLocationData(location.lat, location.lon),
                getHotspots(location.lat, location.lon),
            ]);

            if (locRes.status === 'fulfilled' && locRes.value) {
                const data = locRes.value;
                setLocationData(data);

                // Update location name from reverse geocode
                if (data.location?.address && data.location.address !== `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`) {
                    setLocation(l => ({ ...l, name: data.location.address }));
                }

                // Generate trend from real AQI
                const aqi = data.aqi;
                if (aqi !== null && aqi !== undefined && aqi > 0) {
                    setTrendData(generateHourlyTrend(aqi));
                }

                if (!data.aq_available && !data.wx_available) {
                    setDataError('Live data temporarily unavailable for this location. Please try again in a moment.');
                }
            } else {
                setDataError('Could not fetch data for this location. Check your connection and try again.');
            }

            if (hotRes.status === 'fulfilled') {
                setHotspots(hotRes.value);
            }
        } catch (err) {
            console.error('[Dashboard] Fetch error:', err);
            setDataError('Connection error. Please check your network and try again.');
        } finally {
            setIsLoading(false);
        }
    }, [location.lat, location.lon]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5 * 60 * 1000); // Refresh every 5 min
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleLocationChange = (lat: number, lon: number, name?: string) => {
        setLocation({ lat, lon, name: name || `${lat.toFixed(4)}, ${lon.toFixed(4)}` });
    };

    const handleHeaderSearch = async () => {
        if (!headerSearch.trim()) return;
        setIsSearching(true);
        try {
            const res = await geocodeLocation(headerSearch);
            if (res?.lat && res?.lon) {
                handleLocationChange(res.lat, res.lon, res.address || headerSearch);
                setHeaderSearch('');
            } else {
                alert(`Could not find "${headerSearch}". Try a different city or address.`);
            }
        } catch {
            alert('Search failed. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleCurrentGPS = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => handleLocationChange(
                pos.coords.latitude,
                pos.coords.longitude,
                `Your Location (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`
            ),
            () => alert('Geolocation permission denied. Please enable it in your browser.')
        );
    };

    const handleExport = async (format: 'csv' | 'json' | 'geojson') => {
        try {
            await exportData(format);
        } catch (error: any) {
            alert(`Export failed: ${error.response?.data?.detail || 'No historical data available yet.'}`);
        }
    };

    const aqi = locationData?.aqi ?? null;
    const weather = locationData?.weather ?? null;
    const pollutants = locationData?.pollutants ?? null;
    const aqiColor = getAqiColor(aqi);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={styles.dashboard}
        >
            {/* ── Header ────────────────────────────────────────────────────── */}
            <header className={styles.header}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, marginBottom: '0.35rem' }}>
                        AtmosPulse
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <MapPin size={14} color="var(--text-muted)" />
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{location.name}</span>
                        </p>
                        {locationData?.source_note && (
                            <span style={{
                                fontSize: '0.7rem', color: '#64748b',
                                background: 'rgba(100,116,139,0.12)', borderRadius: '4px',
                                padding: '0.1rem 0.4rem'
                            }}>
                                {locationData.source_note}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px', padding: '0.4rem 0.75rem', gap: '0.5rem'
                    }}>
                        <Search size={16} color="#94a3b8" />
                        <input
                            type="text"
                            placeholder="Search any city or place…"
                            value={headerSearch}
                            onChange={e => setHeaderSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleHeaderSearch()}
                            style={{
                                border: 'none', background: 'transparent', color: '#fff',
                                fontSize: '0.85rem', outline: 'none', width: '180px'
                            }}
                        />
                        <button
                            onClick={handleHeaderSearch}
                            disabled={isSearching}
                            style={{
                                background: 'var(--primary)', border: 'none', borderRadius: '6px',
                                color: 'white', padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer'
                            }}
                        >
                            {isSearching ? '…' : 'Go'}
                        </button>
                        <button
                            onClick={handleCurrentGPS}
                            title="Use my GPS location"
                            style={{
                                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px',
                                color: '#cbd5e1', padding: '0.25rem 0.4rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center'
                            }}
                        >
                            <Navigation size={14} />
                        </button>
                    </div>

                    {/* Data source badge */}
                    <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 1rem' }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: locationData?.aq_available ? '#22c55e' : '#f59e0b',
                            boxShadow: locationData?.aq_available ? '0 0 6px #22c55e' : '0 0 6px #f59e0b',
                        }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                            {locationData?.aq_available ? 'Live Data' : isLoading ? 'Loading…' : 'Data Unavailable'}
                        </span>
                    </div>

                    <div className="glass-card" style={{ padding: '0.5rem' }}>
                        <button
                            onClick={() => handleExport('csv')}
                            style={{
                                padding: '0.4rem 0.8rem', background: 'none', border: 'none',
                                color: 'var(--text-muted)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem'
                            }}
                            title="Export data as CSV"
                        >
                            <Download size={15} />Export
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Error Banner ──────────────────────────────────────────────── */}
            {dataError && (
                <div style={{
                    padding: '0.75rem 1rem', marginBottom: '1rem',
                    background: 'rgba(245,158,11,0.12)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: '10px', color: '#fbbf24', fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                    <AlertTriangle size={16} />
                    {dataError}
                </div>
            )}

            {/* ── Navigation Tabs ───────────────────────────────────────────── */}
            <div className={styles.fullWidth} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {(['overview', 'forecast', 'health_impact', 'venues', 'reports', 'favorites'] as const).map(view => {
                    const labels: Record<string, string> = {
                        overview: 'Overview',
                        forecast: '48h Forecast',
                        health_impact: 'Health Correlation',
                        venues: 'School / Office Safety',
                        reports: 'Pollution Reports',
                        favorites: 'Favorites',
                    };
                    const colors: Record<string, string> = {
                        overview: 'var(--primary)',
                        forecast: 'var(--primary)',
                        health_impact: 'var(--accent-pink)',
                        venues: 'var(--accent-blue)',
                        reports: 'var(--accent-yellow)',
                        favorites: 'var(--primary)',
                    };
                    return (
                        <button
                            key={view}
                            onClick={() => setActiveView(view)}
                            style={{
                                padding: '0.65rem 1.25rem', borderRadius: '0.5rem',
                                background: activeView === view ? colors[view] : 'rgba(255,255,255,0.05)',
                                color: activeView === view ? 'white' : 'var(--text-muted)',
                                border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {labels[view]}
                        </button>
                    );
                })}
            </div>

            {activeView === 'overview' && (
                <>
                    {/* ── Stat Cards ──────────────────────────────────────────── */}
                    <section className={styles.statsGrid}>
                        {/* AQI */}
                        <StatCard
                            label="Real-Time US AQI"
                            value={aqi !== null ? `${Math.round(aqi)}` : '—'}
                            subValue="US AQI · EPA standard"
                            status={getAqiCategory(aqi)}
                            statusColor={aqiColor}
                            icon={<Wind size={20} />}
                            isLoading={isLoading}
                        />
                        {/* Temperature */}
                        <StatCard
                            label="Temperature"
                            value={weather?.temperature !== null && weather?.temperature !== undefined ? `${weather.temperature.toFixed(1)}°C` : '—'}
                            subValue={weather?.condition ?? (isLoading ? 'Loading…' : 'No data')}
                            status={weather?.temperature !== null && weather?.temperature !== undefined
                                ? `Feels ${weather.feels_like?.toFixed(1) ?? '—'}°C`
                                : '—'}
                            statusColor="#38bdf8"
                            icon={<Thermometer size={20} />}
                            isLoading={isLoading}
                        />
                        {/* PM2.5 */}
                        <StatCard
                            label="PM2.5"
                            value={pollutants?.pm2_5 !== null && pollutants?.pm2_5 !== undefined ? `${pollutants.pm2_5} μg/m³` : '—'}
                            subValue="Fine particulate matter"
                            status={pollutants?.pm10 !== null && pollutants?.pm10 !== undefined ? `PM10: ${pollutants.pm10} μg/m³` : 'PM10: —'}
                            statusColor="#a78bfa"
                            icon={<Activity size={20} />}
                            isLoading={isLoading}
                        />
                        {/* Humidity / Wind */}
                        <StatCard
                            label="Humidity"
                            value={weather?.humidity !== null && weather?.humidity !== undefined ? `${weather.humidity}%` : '—'}
                            subValue={weather?.wind_speed !== null && weather?.wind_speed !== undefined
                                ? `Wind: ${weather.wind_speed} km/h ${weather.wind_direction ?? ''}`.trim()
                                : 'Wind: —'}
                            status={aqi !== null
                                ? (aqi <= 50 ? 'Health Advisory: Good' : aqi <= 100 ? 'Acceptable Air' : 'Monitor Closely')
                                : '—'}
                            statusColor="#34d399"
                            icon={<Droplets size={20} />}
                            isLoading={isLoading}
                        />
                    </section>

                    {/* ── Extra Pollutants Row ─────────────────────────────── */}
                    {pollutants && (
                        <section style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            {[
                                { key: 'ozone', label: 'O₃ Ozone', unit: 'μg/m³' },
                                { key: 'nitrogen_dioxide', label: 'NO₂ Dioxide', unit: 'μg/m³' },
                                { key: 'sulphur_dioxide', label: 'SO₂ Dioxide', unit: 'μg/m³' },
                                { key: 'carbon_monoxide', label: 'CO', unit: 'μg/m³' },
                            ].map(({ key, label, unit }) => {
                                const val = (pollutants as any)[key];
                                return (
                                    <div key={key} className="glass-card" style={{ flex: 1, minWidth: '130px', padding: '0.75rem 1rem' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                                            {val !== null && val !== undefined ? `${val}` : '—'}
                                            {val !== null && val !== undefined && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '3px' }}>{unit}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </section>
                    )}

                    {/* ── 24-Hour AQI Trend ────────────────────────────────── */}
                    <motion.section
                        whileHover={{ rotateY: 1, rotateX: 1, scale: 1.005 }}
                        className={`${styles.mainChart} glass-card card-3d`}
                    >
                        <div className="inner-3d" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>24-Hour AQI Trend</h3>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                                    Diurnal pattern based on current US AQI reading · Source: Open-Meteo
                                </p>
                            </div>
                        </div>
                        <div className="inner-3d" style={{ width: '100%', height: '280px' }}>
                            {trendData.length > 0 ? (
                                <ResponsiveContainer>
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={aqiColor} stopOpacity={0.35} />
                                                <stop offset="95%" stopColor={aqiColor} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(15,23,42,0.92)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '10px',
                                                backdropFilter: 'blur(10px)',
                                            }}
                                        />
                                        <Area type="monotone" dataKey="aqi" stroke={aqiColor} strokeWidth={2.5} fillOpacity={1} fill="url(#colorAqi)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    {isLoading ? 'Loading trend data…' : 'AQI data unavailable — trend will appear once data loads.'}
                                </div>
                            )}
                        </div>
                    </motion.section>

                    {/* ── Cigarette Metric ─────────────────────────────────── */}
                    {aqi !== null && (
                        <section className={styles.metricsSection}>
                            <CigaretteMetric aqi={aqi} />
                        </section>
                    )}

                    {/* ── Hotspots ─────────────────────────────────────────── */}
                    <section className={`${styles.hotspots} glass-card card-3d`}>
                        <h3 className="inner-3d" style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Regional Hotspots</h3>
                        <div className="inner-3d" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {hotspots?.hotspots?.length > 0 ? (
                                hotspots.hotspots.map((spot: any, idx: number) => (
                                    <HotspotItem key={idx} name={spot.type || 'Hotspot'} aqi={spot.aqi} status={getAqiCategory(spot.aqi)} />
                                ))
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                                    {isLoading ? 'Loading hotspot data…' : 'No significant pollution hotspots detected near this location.'}
                                </p>
                            )}
                        </div>
                    </section>

                    {/* ── Map ──────────────────────────────────────────────── */}
                    <section className={`${styles.mapSection} glass-card card-3d`}>
                        <div className="inner-3d" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Hyperlocal Air Quality Map</h3>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                                    Click anywhere on the map to view real-time AQI and weather for that coordinate.
                                    Data: Open-Meteo / Copernicus CAMS
                                </p>
                            </div>
                            {onNavigateMap && (
                                <button
                                    onClick={onNavigateMap}
                                    style={{
                                        padding: '0.35rem 0.75rem',
                                        background: 'rgba(99,102,241,0.15)',
                                        border: '1px solid rgba(99,102,241,0.35)',
                                        borderRadius: '8px', color: '#818cf8',
                                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Fullscreen Map →
                                </button>
                            )}
                        </div>
                        <div className="inner-3d" style={{ height: 'calc(100% - 5rem)' }}>
                            <MapView
                                centerLat={location.lat}
                                centerLon={location.lon}
                                onLocationChange={handleLocationChange}
                            />
                        </div>
                    </section>
                </>
            )}

            {activeView === 'forecast' && (
                <div className={styles.fullWidth}>
                    <Forecast lat={location.lat} lon={location.lon} />
                </div>
            )}

            {activeView === 'health_impact' && (
                <div className={styles.fullWidth}>
                    <SymptomLogger lat={location.lat} lon={location.lon} aqi={aqi ?? 0} />
                </div>
            )}

            {activeView === 'venues' && (
                <div className={styles.fullWidth}>
                    <InstitutionSafety />
                </div>
            )}

            {activeView === 'reports' && (
                <div className={styles.fullWidth}>
                    <PollutionReport lat={location.lat} lon={location.lon} />
                </div>
            )}

            {activeView === 'favorites' && (
                <div className={styles.fullWidth}>
                    <Favorites />
                </div>
            )}
        </motion.div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: string;
    subValue?: string;
    status: string;
    statusColor?: string;
    icon: React.ReactNode;
    isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, status, statusColor = 'var(--primary)', icon, isLoading }) => (
    <motion.div
        whileHover={{ rotateX: 8, rotateY: -8, translateZ: 20, scale: 1.04 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`${styles.statCard} glass-card card-3d`}
    >
        <div className="inner-3d" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.06)', color: statusColor }}>
                {icon}
            </div>
        </div>
        <div className={`${styles.statLabel} inner-3d`}>{label}</div>
        <div className={`${styles.statValue} inner-3d`} style={{ opacity: isLoading ? 0.5 : 1 }}>
            {isLoading && value === '—' ? <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Loading…</span> : value}
        </div>
        {subValue && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }} className="inner-3d">{subValue}</div>}
        <div style={{
            marginTop: '0.65rem', display: 'inline-flex', padding: '0.2rem 0.65rem',
            borderRadius: '99px', fontSize: '0.7rem', fontWeight: 600,
            background: `${statusColor}22`, color: statusColor,
        }} className="inner-3d">
            {status}
        </div>
    </motion.div>
);

const HotspotItem: React.FC<{ name: string; aqi: number; status: string }> = ({ name, aqi, status }) => (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.65rem 0.75rem', borderRadius: '0.75rem',
        background: 'rgba(255,255,255,0.03)',
        transition: 'background 0.2s ease',
    }}>
        <div>
            <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{status}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{aqi}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>US AQI</div>
        </div>
    </div>
);

export default Dashboard;
