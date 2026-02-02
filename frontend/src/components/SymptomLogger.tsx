import React, { useState, useEffect } from 'react';
import { Activity, Thermometer, AlertCircle, CheckCircle2 } from 'lucide-react';
import { logSymptoms, getSymptomCorrelation } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SYMPTOMS_LIST = [
    "Coughing", "Shortness of Breath", "Irritated Eyes",
    "Headache", "Sore Throat", "Congestion", "Nausea"
];

const SymptomLogger: React.FC<{ lat: number, lon: number, aqi: number }> = ({ lat, lon, aqi }) => {
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
    const [severity, setSeverity] = useState(5);
    const [loading, setLoading] = useState(false);
    const [correlationData, setCorrelationData] = useState<any>(null);
    const [success, setSuccess] = useState(false);

    const fetchCorrelation = async () => {
        try {
            const data = await getSymptomCorrelation();
            if (data.correlation !== "Insufficient data") {
                const chartData = Object.entries(data.correlation).map(([range, info]: [string, any]) => ({
                    range,
                    severity: Math.round(info.avg_severity * 10) / 10,
                    count: info.count
                }));
                setCorrelationData(chartData);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchCorrelation();
    }, []);

    const toggleSymptom = (s: string) => {
        setSelectedSymptoms(prev =>
            prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
        );
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await logSymptoms({
                lat, lon, aqi,
                symptoms: selectedSymptoms,
                severity
            });
            setSuccess(true);
            setSelectedSymptoms([]);
            setSeverity(5);
            fetchCorrelation();
            setTimeout(() => setSuccess(false), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
            <div className="glass-card card-3d" style={{ flex: '1 1 400px' }}>
                <div className="inner-3d" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
                        <Activity color="var(--accent-pink)" /> Log Symptoms
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>How are you feeling at AQI {aqi}?</p>
                </div>

                <div className="inner-3d" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {SYMPTOMS_LIST.map(s => (
                        <button
                            key={s}
                            onClick={() => toggleSymptom(s)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '99px',
                                border: '1px solid var(--card-border)',
                                background: selectedSymptoms.includes(s) ? 'var(--accent-pink)' : 'rgba(255,255,255,0.05)',
                                color: selectedSymptoms.includes(s) ? 'white' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <div className="inner-3d" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Severity: {severity}/10
                    </label>
                    <input
                        type="range" min="1" max="10"
                        value={severity}
                        onChange={(e) => setSeverity(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-pink)' }}
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading || selectedSymptoms.length === 0}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        background: 'var(--accent-pink)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}
                >
                    {success ? <CheckCircle2 size={20} /> : <Thermometer size={20} />}
                    {success ? 'Symptom Logged!' : loading ? 'Logging...' : 'Log Current Health'}
                </button>
            </div>

            <div className="glass-card card-3d" style={{ flex: '1 1 400px' }}>
                <div className="inner-3d" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
                        <AlertCircle color="var(--accent-yellow)" /> AQI Impact Analysis
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>See how pollution levels affect you</p>
                </div>

                {correlationData ? (
                    <div className="inner-3d" style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={correlationData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="range" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} />
                                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--glass)', border: '1px solid var(--card-border)', borderRadius: '1rem', backdropFilter: 'blur(10px)' }}
                                />
                                <Bar dataKey="severity" fill="var(--accent-pink)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="inner-3d" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                        No correlation data yet. Log more symptoms at different AQI levels to see insights!
                    </div>
                )}
            </div>
        </div>
    );
};

export default SymptomLogger;
