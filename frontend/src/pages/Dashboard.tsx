import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Wind, AlertTriangle, TrendingUp, MapPin, Download } from 'lucide-react';
import styles from './Dashboard.module.css';
import { getLiveAQI, getHotspots, exportData, AQIWebSocket, getHistoricalData } from '../services/api';
import MapView from '../components/MapView';
import Favorites from '../components/Favorites';
import Forecast from '../components/Forecast';
import CigaretteMetric from '../components/CigaretteMetric';
import SymptomLogger from '../components/SymptomLogger';
import InstitutionSafety from '../components/InstitutionSafety';
import PollutionReport from '../components/PollutionReport';

const Dashboard: React.FC = () => {
    const [trendData, setTrendData] = useState<any[]>([]);
    const [liveData, setLiveData] = useState<any>(null);
    const [hotspots, setHotspots] = useState<any[]>([]);
    const [currentAqi, setCurrentAqi] = useState<number>(184);
    const [wsConnected, setWsConnected] = useState(false);
    const [activeView, setActiveView] = useState<'overview' | 'forecast' | 'health_impact' | 'venues' | 'reports' | 'favorites'>('overview');

    // Global Location State
    const [location, setLocation] = useState({
        lat: 28.6139,
        lon: 77.2090,
        name: 'Delhi, India'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const live = await getLiveAQI(location.lat, location.lon);
                setLiveData(live);

                // Extract historical data for trend
                const historical = await getHistoricalData({
                    lat: location.lat,
                    lon: location.lon,
                    limit: 24,
                    radius_km: 10
                });

                if (historical && historical.readings && historical.readings.length > 0) {
                    const formatted = historical.readings.map((r: any) => ({
                        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        aqi: Math.round(r.aqi)
                    })).reverse();
                    setTrendData(formatted);
                } else {
                    // Fallback to dummy trend if no history
                    setTrendData([
                        { time: '00:00', aqi: currentAqi - 20 },
                        { time: '08:00', aqi: currentAqi + 40 },
                        { time: '16:00', aqi: currentAqi + 10 },
                        { time: '23:00', aqi: currentAqi }
                    ]);
                }

                const hot = await getHotspots(location.lat, location.lon);
                setHotspots(hot);
            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };
        fetchData();

        // Setup WebSocket for real-time updates
        const ws = new AQIWebSocket(
            (data) => {
                console.log('WebSocket update:', data);
                if (data.type === 'aqi_update') {
                    // Only update if the data is relevant to our current vicinity (within ~50km)
                    const dataLat = data.data?.center?.lat;
                    const dataLon = data.data?.center?.lon;
                    if (dataLat && dataLon) {
                        const dist = Math.sqrt(Math.pow(dataLat - location.lat, 2) + Math.pow(dataLon - location.lon, 2));
                        if (dist < 0.5) { // Roughly 50km
                            setLiveData(data.data);
                        }
                    }
                } else if (data.type === 'hotspot_update') {
                    setHotspots(data.data);
                }
            },
            () => setWsConnected(true),
            () => setWsConnected(false)
        );

        ws.connect();

        return () => {
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

    // Keep currentAqi in sync with liveData
    useEffect(() => {
        if (liveData?.results?.[0]?.measurements) {
            const m = liveData.results[0].measurements;
            const pm25Value = m.pm25 || m.pm2_5 || m.PM25 || 0;
            if (pm25Value > 0) {
                setCurrentAqi(Math.round(pm25Value));
            }
        }
    }, [liveData]);

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
                                background: wsConnected ? 'var(--accent-green)' : '#ef4444'
                            }}
                        ></div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                            {wsConnected ? 'Live Updates Active' : 'Reconnecting...'}
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
                            label="Avg. PM2.5"
                            value={currentAqi ? Math.round(currentAqi).toString() : "0"}
                            trend={currentAqi > 150 ? "+8%" : "-4%"}
                            status={getAqiCategory(currentAqi)}
                            icon={<Wind size={20} />}
                        />
                        <StatCard
                            label="Monitoring Stations"
                            value={liveData?.results?.length?.toString() || "0"}
                            status="Active"
                            icon={<MapPin size={20} />}
                        />
                        <StatCard
                            label="Region Confidence"
                            value="94%"
                            trend="High"
                            status="Verified"
                            icon={<TrendingUp size={20} />}
                        />
                        <StatCard
                            label="Active Alerts"
                            value={currentAqi > 100 ? "3" : "0"}
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
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Hyperlocal Air Quality Heatmap</h3>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Grid Resolution: 250m</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated: 2 mins ago</span>
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
