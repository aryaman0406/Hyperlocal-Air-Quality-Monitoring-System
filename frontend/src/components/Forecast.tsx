import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, AlertCircle } from 'lucide-react';
import { getForecast } from '../services/api';

interface ForecastProps {
    lat: number;
    lon: number;
}

const Forecast: React.FC<ForecastProps> = ({ lat, lon }) => {
    const [forecastData, setForecastData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'24h' | '48h'>('24h');

    useEffect(() => {
        loadForecast();
    }, [lat, lon]);

    const loadForecast = async () => {
        try {
            setLoading(true);
            const data = await getForecast(lat, lon);
            setForecastData(data);
        } catch (error) {
            console.error('Failed to load forecast:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Loading forecast...</p>
            </div>
        );
    }

    if (!forecastData) {
        return (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>No forecast data available</p>
            </div>
        );
    }

    const displayData = timeRange === '24h' 
        ? forecastData.forecasts.slice(0, 24) 
        : forecastData.forecasts;



    return (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>AQI Forecast</h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setTimeRange('24h')}
                        style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.375rem',
                            background: timeRange === '24h' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: timeRange === '24h' ? 'white' : 'var(--text-muted)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        24 Hours
                    </button>
                    <button
                        onClick={() => setTimeRange('48h')}
                        style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.375rem',
                            background: timeRange === '48h' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: timeRange === '48h' ? 'white' : 'var(--text-muted)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        48 Hours
                    </button>
                </div>
            </div>

            {/* Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Average AQI</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{forecastData.statistics.avg_aqi}</p>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Peak AQI</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ef4444' }}>{forecastData.statistics.max_aqi}</p>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Best AQI</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 600, color: '#10b981' }}>{forecastData.statistics.min_aqi}</p>
                </div>
            </div>

            {/* Chart */}
            <div style={{ width: '100%', height: '300px', marginBottom: '1.5rem' }}>
                <ResponsiveContainer>
                    <LineChart data={displayData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="hour"
                            stroke="var(--text-muted)"
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis
                            stroke="var(--text-muted)"
                            tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(17, 24, 39, 0.95)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.5rem',
                                color: 'white'
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="aqi"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            dot={{ fill: 'var(--primary)', r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Alerts */}
            {forecastData.alerts && forecastData.alerts.length > 0 && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <AlertCircle size={18} style={{ color: '#ef4444' }} />
                        <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Alerts</h4>
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {forecastData.alerts.slice(0, 3).map((alert: any, idx: number) => (
                            <div
                                key={idx}
                                style={{
                                    padding: '0.75rem',
                                    background: alert.severity === 'high' 
                                        ? 'rgba(239, 68, 68, 0.1)' 
                                        : 'rgba(251, 146, 60, 0.1)',
                                    borderRadius: '0.375rem',
                                    borderLeft: `3px solid ${alert.severity === 'high' ? '#ef4444' : '#fb923c'}`
                                }}
                            >
                                <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{alert.message}</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {alert.recommendation}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Forecast;
