import React, { useEffect, useState } from 'react';
import { Cigarette, Info } from 'lucide-react';
import { getCigaretteEquivalence } from '../services/api';

interface CigaretteData {
    aqi: number;
    pm25_est: number;
    cigarettes_equivalent: number;
    message: string;
}

const CigaretteMetric: React.FC<{ aqi: number }> = ({ aqi }) => {
    const [data, setData] = useState<CigaretteData | null>(null);

    useEffect(() => {
        const fetchMetric = async () => {
            try {
                const responseData = await getCigaretteEquivalence(aqi);
                setData(responseData);
            } catch (error) {
                console.error("Failed to fetch cigarette metric", error);
            }
        };
        fetchMetric();
    }, [aqi]);

    if (!data) return null;

    return (
        <div className="glass-card card-3d floating" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(0,0,0,0.2) 100%)' }}>
            <div className="inner-3d" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ padding: '0.75rem', borderRadius: '1rem', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)' }}>
                    <Cigarette size={24} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <Info size={14} />
                    Berkeley Earth Standard
                </div>
            </div>

            <div className="inner-3d">
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Health Impact Equivalent</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent-red)', textShadow: '0 0 20px rgba(239, 68, 68, 0.3)' }}>
                        {data.cigarettes_equivalent}
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>Cigarettes / Day</span>
                </div>
            </div>

            <p className="inner-3d" style={{ fontSize: '0.9rem', color: 'var(--text-main)', opacity: 0.8, lineHeight: 1.6 }}>
                {data.message}
            </p>

            <div className="inner-3d" style={{ marginTop: '0.5rem', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                    style={{
                        height: '100%',
                        width: `${Math.min((data.cigarettes_equivalent / 20) * 100, 100)}%`,
                        background: 'var(--accent-red)',
                        boxShadow: '0 0 10px var(--accent-red)'
                    }}
                />
            </div>
        </div>
    );
};

export default CigaretteMetric;
