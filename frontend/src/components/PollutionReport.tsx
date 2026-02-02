import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Send, AlertCircle, Clock } from 'lucide-react';
import { submitReport, getReports } from '../services/api';

const PollutionReport: React.FC<{ lat?: number, lon?: number }> = ({ lat = 28.6139, lon = 77.2090 }) => {
    const [reports, setReports] = useState<any[]>([]);
    const [type, setType] = useState('garbage_burning');
    const [desc, setDesc] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchReports = async () => {
        try {
            const data = await getReports();
            setReports(data.reports || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await submitReport({
                lat, lon, type, description: desc
            });
            setDesc('');
            fetchReports();
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="glass-card card-3d">
                <div className="inner-3d" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
                        <Camera color="var(--accent-blue)" /> Report Pollution
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Help track hyperlocal illegal burning or dust</p>
                </div>

                <form onSubmit={handleSubmit} className="inner-3d">
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Source Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }}
                        >
                            <option value="garbage_burning">Garbage Burning</option>
                            <option value="construction">Construction Dust</option>
                            <option value="industrial">Industrial Smoke</option>
                            <option value="traffic">Extreme Traffic Congestion</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Description</label>
                        <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Provide details about the location or source..."
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', minHeight: '100px', resize: 'none' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || !desc}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            background: 'var(--primary)',
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
                        <Send size={18} />
                        {submitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                </form>
            </div>

            <div className="glass-card card-3d">
                <div className="inner-3d" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
                        <MapPin color="var(--accent-red)" /> Community Reports
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Recent reports from your area</p>
                </div>

                <div className="inner-3d" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {reports.length > 0 ? (
                        reports.map((r, i) => (
                            <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid var(--card-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-yellow)' }}>{r.type.replace('_', ' ').toUpperCase()}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Clock size={12} /> {new Date(r.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', opacity: 0.9 }}>{r.description}</p>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <AlertCircle size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <p>No reports in this area yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PollutionReport;
