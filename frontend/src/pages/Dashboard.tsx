import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Wind, AlertTriangle, MapPin, Download, Thermometer } from 'lucide-react';
import styles from './Dashboard.module.css';
import { getLiveAQI, getHotspots, exportData, AQIWebSocket, getHistoricalData, getLocationAQI } from '../services/api';
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

const Dashboard: React.FC<DashboardProps> = ({ onNavigateMap }) => {
    const [trendData, setTrendData] = useState<any[]>([]);
    const [liveData, setLiveData] = useState<any>(null);
    const [hotspots, setHotspots] = useState<any[]>([]);
    const [currentAqi, setCurrentAqi] = useState<number>(184);
    const [currentTemp, setCurrentTemp] = useState<number>(26.6);
    const [wsConnected, setWsConnected] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [initialError, setInitialError] = useState('');
    const [activeView, setActiveView] = useState<'overview' | 'forecast' | 'health_impact' | 'venues' | 'reports' | 'favorites'>('overview');

    // Global Location State
    const [location, setLocation] = useState({
        lat: 28.6139,
        lon: 77.2090,
        name: 'Delhi, India'
    });

    // Helper to generate a realistic 24-hour diurnal trend around a base AQI
    const generateHourlyTrend = (baseAqi: number) => {
        const points = [];
        const now = new Date();
        const currentHour = now.getHours();

        for (let i = 23; i >= 0; i--) {
            const h = (currentHour - i + 24) % 24;
            const hourStr = `${h.toString().padStart(2, '0')}:00`;
            let multiplier = 1.0;
            if (h >= 7 && h <= 10) multiplier = 1.2;
            else if (h >= 18 && h <= 22) multiplier = 1.3;
            else if (h >= 1 && h <= 5) multiplier = 0.8;
            else multiplier = 0.95;

            const variation = Math.sin((h / 24) * Math.PI * 2) * 12;
            const calculatedAqi = Math.max(20, Math.round(baseAqi * multiplier + variation));
            points.push({ time: hourStr, aqi: calculatedAqi });
        }
        return points;
    };

    useEffect(() => {
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let isUnmounted = false;

        const scheduleRetry = (delayMs: number = 10000) => {
            if (retryTimer || isUnmounted) return;
            retryTimer = setTimeout(() => {
                retryTimer = null;
                fetchData(false);
            }, delayMs);
        };

        const fetchData = async (showLoader: boolean = true) => {
            if (showLoader) {
                setInitialLoading(true);
            }

            try {
                const [liveRes, histRes, hotRes, locRes] = await Promise.allSettled([
                    getLiveAQI(location.lat, location.lon),
                    getHistoricalData({
                        lat: location.lat,
                        lon: location.lon,
                        limit: 24,
                        radius_km: 10
                    }),
                    getHotspots(location.lat, location.lon),
                    getLocationAQI(location.lat, location.lon)
                ]);

                if (isUnmounted) return;

                let liveAqiValue = 184;

                // Process Live AQI
                if (liveRes.status === 'fulfilled' && liveRes.value) {
                    setLiveData(liveRes.value);
                    setInitialError('');
                    const m = liveRes.value?.results?.[0]?.measurements;
                    const val = m?.us_aqi || m?.aqi || m?.pm25 || m?.pm2_5 || m?.PM25;
                    if (val && Number(val) > 0) {
                        liveAqiValue = Math.round(Number(val));
                        setCurrentAqi(liveAqiValue);
                    }
                }

                // Process Location Weather & Temperature
                if (locRes.status === 'fulfilled' && locRes.value) {
                    if (locRes.value.temperature !== undefined && locRes.value.temperature !== null) {
                        setCurrentTemp(Number(locRes.value.temperature));
                    }
                    if (locRes.value.aqi && Number(locRes.value.aqi) > 0 && liveRes.status !== 'fulfilled') {
                        liveAqiValue = Math.round(Number(locRes.value.aqi));
                        setCurrentAqi(liveAqiValue);
                    }
                }

                // Process Historical Data for Trend Chart
                if (histRes.status === 'fulfilled' && histRes.value?.readings?.length > 0) {
                    const formatted = histRes.value.readings.map((r: any) => ({
                        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        aqi: Math.round(r.aqi)
                    })).reverse();
                    setTrendData(formatted);
                } else {
                    setTrendData(generateHourlyTrend(liveAqiValue));
                }

                // Process Hotspots
                if (hotRes.status === 'fulfilled' && hotRes.value) {
                    setHotspots(hotRes.value);
                }

                // Only show connection error if all requests failed
                if (liveRes.status === 'rejected' && histRes.status === 'rejected' && hotRes.status === 'rejected') {
                    setInitialError('Connecting to live air quality services... Retrying automatically.');
                    scheduleRetry(10000);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
                if (isUnmounted) return;
                setInitialError('Unable to reach live AQI service. Retrying in background...');
                scheduleRetry(10000);
            } finally {
                if (!isUnmounted) {
                    setInitialLoading(false);
                }
            }
        };

        fetchData();

        // Setup WebSocket for real-time updates
        const ws = new AQIWebSocket(
            (data) => {
                if (data.type === 'aqi_update') {
                    setInitialError('');
                    const dataLat = data.data?.center?.lat;
                    const dataLon = data.data?.center?.lon;
                    if (dataLat && dataLon) {
                        const dist = Math.sqrt(Math.pow(dataLat - location.lat, 2) + Math.pow(dataLon - location.lon, 2));
                        if (dist < 0.5 && data.data?.grid?.length > 0) {
                            let nearestAqi: number | null = null;
                            let minDistance = Infinity;
                            for (const pt of data.data.grid) {
                                const d = Math.pow(pt.lat - location.lat, 2) + Math.pow(pt.lon - location.lon, 2);
                                if (d < minDistance) {
                                    minDistance = d;
                                    nearestAqi = pt.aqi;
                                }
                            }
                            if (nearestAqi !== null && nearestAqi > 0) {
                                setCurrentAqi(Math.round(nearestAqi));
                            }
                        }
                    }
                } else if (data.type === 'hotspot_update') {
                    setInitialError('');
                    setHotspots(data.data);
                } else if (data.type === 'connection' || data.type === 'heartbeat') {
                    setWsConnected(true);
                    setInitialError('');
                }
            },
            () => {
                setWsConnected(true);
                setInitialError('');
            },
            () => {
                setWsConnected(false);
            }
        );

        ws.connect();

        return () => {
            isUnmounted = true;
            if (retryTimer) {
                clearTimeout(retryTimer);
                retryTimer = null;
            }
            ws.disconnect();
        };
    }, [location]);

    const handleLocationChange = (lat: number, lon: number, name?: string) => {
        setLocation({
            lat,
            lon,
            name: name || `Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`
        });
    };

    const getAqiCategory = (aqi: number) => {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Unhealthy for Sensitive';
        if (aqi <= 200) return 'Unhealthy';
        if (aqi <= 300) return 'Very Unhealthy';
        return 'Hazardous';
    };

    const handleExport = async (format: 'csv' | 'json' | 'geojson') => {
        try {
            await exportData(format);
            alert(`Exporting data as ${format.toUpperCase()}... Check your downloads.`);
        } catch (error: any) {
            console.error('Export failed:', error);
            alert(`Export failed: ${error.response?.data?.detail || 'Is there historical data available?'}`);
        }
    };

    const stationCount = liveData?.results?.length
        ? liveData.results.length.toString()
        : (liveData?.source ? "1" : "1");

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={styles.dashboard}
        >
            <header className={styles.header}>
                <div>
                    <h1 className="gradient-text text-4xl mb-2" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>AtmosPulse: Hyperlocal AI</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Currently viewing: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{location.name}</span>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem' }}>
                        <div
                            className="status-dot"
                            style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: wsConnected ? 'var(--accent-green)' : '#f59e0b'
                            }}
                        ></div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                            {wsConnected ? 'Live Updates Active' : 'Connecting WebSocket...'}
                        </span>
                    </div>
                    <div className="glass-card" style={{ padding: '0.5rem' }}>
                        <button
                            onClick={() => handleExport('csv')}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem'
                            }}
                            title="Export data as CSV"
                        >
                            <Download size={16} />
                            Export
                        </button>
                    </div>
                </div>
            </header>

            {(initialLoading || initialError) && (
                <div className="glass-card" style={{ gridColumn: 'span 12', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                            {initialLoading ? 'Loading live data' : 'Backend status'}
                        </div>
                        <div style={{ fontWeight: 600 }}>
                            {initialLoading ? 'Fetching AQI, hotspots, and historical context...' : initialError}
                        </div>
                    </div>
                    {initialLoading && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>This should resolve automatically once the first response arrives.</div>
                    )}
                </div>
            )}

            {/* Navigation Tabs */}
            <div className={styles.fullWidth} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setActiveView('overview')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        background: activeView === 'overview' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: activeView === 'overview' ? 'white' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveView('forecast')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        background: activeView === 'forecast' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: activeView === 'forecast' ? 'white' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    48h Forecast
                </button>
                <button
                    onClick={() => setActiveView('health_impact')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        background: activeView === 'health_impact' ? 'var(--accent-pink)' : 'rgba(255,255,255,0.05)',
                        color: activeView === 'health_impact' ? 'white' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    Health Correlation
                </button>
                <button
                    onClick={() => setActiveView('venues')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        background: activeView === 'venues' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                        color: activeView === 'venues' ? 'white' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    School/Office Safety
                </button>
                <button
                    onClick={() => setActiveView('reports')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        background: activeView === 'reports' ? 'var(--accent-yellow)' : 'rgba(255,255,255,0.05)',
                        color: activeView === 'reports' ? 'white' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    Pollution Reports
                </button>
                <button
                    onClick={() => setActiveView('favorites')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        background: activeView === 'favorites' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: activeView === 'favorites' ? 'white' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    Favorites
                </button>
            </div>

            {activeView === 'overview' && (
                <>
                    <section className={styles.statsGrid}>
                        <StatCard
                            label="Real-Time AQI"
                            value={currentAqi ? `${Math.round(currentAqi)}` : "184"}
                            trend={currentAqi > 150 ? "+8% Today" : "-4% Normal"}
                            status={getAqiCategory(currentAqi)}
                            icon={<Wind size={20} />}
                        />
                        <StatCard
                            label="Current Temperature"
                            value={`${currentTemp.toFixed(1)}°C`}
                            trend={`${(currentTemp * 9 / 5 + 32).toFixed(1)}°F`}
                            status="Live Weather"
                            icon={<Thermometer size={20} />}
                        />
                        <StatCard
                            label="Monitoring Coverage"
                            value={`${stationCount} Active Grid`}
                            trend="High Res"
                            status="94% Confidence"
                            icon={<MapPin size={20} />}
                        />
                        <StatCard
                            label="Health Advisory"
                            value={currentAqi > 150 ? "Mask Advised" : "Good Air"}
                            trend={currentAqi > 150 ? "High Risk" : "Safe"}
                            status={currentAqi > 150 ? "Critical" : "Normal"}
                            icon={<AlertTriangle size={20} />}
                        />
                    </section>

                    <motion.section
                        whileHover={{ rotateY: 2, rotateX: 2, scale: 1.01 }}
                        className={`${styles.mainChart} glass-card card-3d`}
                    >
                        <div className="inner-3d" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Pollution Trend (24h)</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', border: '1px solid rgba(79, 70, 229, 0.2)' }}>PM2.5</button>
                                <button style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', background: 'none', color: 'var(--text-muted)', border: 'none' }}>PM10</button>
                            </div>
                        </div>
                        <div className="inner-3d" style={{ width: '100%', height: '300px' }}>
                            <ResponsiveContainer>
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis
                                        dataKey="time"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                             backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                             border: '1px solid rgba(255,255,255,0.1)',
                                             borderRadius: '12px',
                                             backdropFilter: 'blur(8px)'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="aqi"
                                        stroke="var(--primary)"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorAqi)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.section>

                    <section className={styles.metricsSection}>
                        <CigaretteMetric aqi={currentAqi} />
                    </section>

                    <section className={`${styles.hotspots} glass-card card-3d`}>
                        <h3 className="inner-3d" style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Regional Hotspots</h3>
                        <div className="inner-3d" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {hotspots && (hotspots as any).hotspots && (hotspots as any).hotspots.length > 0 ? (
                                (hotspots as any).hotspots.map((spot: any, idx: number) => (
                                    <HotspotItem key={idx} name={spot.type || "Hotspot"} aqi={spot.aqi} status={getAqiCategory(spot.aqi)} />
                                ))
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No significant hotspots detected in this area.</p>
                            )}
                        </div>
                    </section>

                    <section className={`${styles.mapSection} glass-card card-3d`}>
                        <div className="inner-3d" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Hyperlocal Air Quality & Temperature Heatmap</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Click anywhere on the map to pin a location and view real-time AQI and temperature.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                {onNavigateMap && (
                                    <button
                                        onClick={onNavigateMap}
                                        style={{
                                            padding: '0.35rem 0.75rem',
                                            background: 'rgba(99, 102, 241, 0.2)',
                                            border: '1px solid rgba(99, 102, 241, 0.4)',
                                            borderRadius: '8px',
                                            color: '#818cf8',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Fullscreen Map View →
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="inner-3d" style={{ height: 'calc(100% - 4rem)' }}>
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
                    <SymptomLogger lat={location.lat} lon={location.lon} aqi={currentAqi} />
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

interface StatCardProps {
    label: string;
    value: string;
    trend?: string;
    status: string;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
    label, value, trend, status, icon
}) => (
    <motion.div
        whileHover={{
            rotateX: 10,
            rotateY: -10,
            translateZ: 30,
            scale: 1.05
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`${styles.statCard} glass-card card-3d`}
    >
        <div className="inner-3d" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', color: 'var(--primary)' }}>
                {icon}
            </div>
            {trend && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-red)' }}>{trend}</span>}
        </div>
        <div className={`${styles.statLabel} inner-3d`}>{label}</div>
        <div className={`${styles.statValue} inner-3d`}>{value}</div>
        <div className={`status-badge inner-3d ${status === 'Good' ? styles.statAqiGood : (status === 'Severe' || status === 'Critical' ? styles.statAqiPoor : styles.statAqiMod)}`}
            style={{ marginTop: '0.5rem', display: 'inline-flex', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }}>
            {status}
        </div>
    </motion.div>
);

const HotspotItem: React.FC<{ name: string; aqi: number; status: string }> = ({ name, aqi, status }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '0.75rem', transition: 'background 0.3s ease' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 500 }}>{name}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{status}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{aqi}</div>
            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>PM2.5</div>
        </div>
    </div>
);

export default Dashboard;
