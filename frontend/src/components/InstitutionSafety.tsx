import React, { useEffect, useState } from 'react';
import { School, Building, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
import { getVenuesRisk } from '../services/api';

const InstitutionSafety: React.FC = () => {
    const [venues, setVenues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchVenuesRisk = async () => {
        try {
            const data = await getVenuesRisk();
            setVenues(data.venues_risk);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVenuesRisk();
        const interval = setInterval(fetchVenuesRisk, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div>Loading Risk Profiles...</div>;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {venues.map((v, i) => (
                <div key={i} className="glass-card card-3d" style={{
                    borderLeft: `4px solid ${v.risk_level === 'high' ? 'var(--accent-red)' : v.risk_level === 'medium' ? 'var(--accent-yellow)' : 'var(--accent-green)'}`
                }}>
                    <div className="inner-3d" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {v.venue.type === 'school' ? <School size={20} color="var(--accent-blue)" /> : <Building size={20} color="var(--primary)" />}
                            <h4 style={{ fontWeight: 600 }}>{v.venue.name}</h4>
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            background: v.risk_level === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: v.risk_level === 'high' ? 'var(--accent-red)' : 'var(--accent-green)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}>
                            {v.risk_level === 'high' ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                            {v.risk_level.toUpperCase()} RISK
                        </div>
                    </div>

                    <div className="inner-3d" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Current AQI</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{v.current_aqi.toFixed(0)}</span>
                    </div>

                    <div className="inner-3d" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <AlertTriangle size={14} color={v.risk_level === 'high' ? 'var(--accent-red)' : 'var(--accent-yellow)'} /> Action Plan
                        </div>
                        <p style={{ color: 'var(--text-muted)' }}>{v.recommendation}</p>
                    </div>
                </div>
            ))}

            {/* Template for adding new */}
            <div className="glass-card card-3d" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px dashed var(--card-border)', background: 'none' }}>
                <button style={{
                    background: 'var(--primary)',
                    border: 'none',
                    color: 'white',
                    width: '40px', height: '40px',
                    borderRadius: '50%',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    marginBottom: '1rem',
                    boxShadow: '0 0 15px var(--primary)'
                }} onClick={() => alert("Registration logic goes here (mock)")}>+</button>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Register Institution</span>
            </div>
        </div>
    );
};

export default InstitutionSafety;
