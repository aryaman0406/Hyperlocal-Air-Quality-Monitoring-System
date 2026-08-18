import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, MapPin, Globe, Save, CheckCircle, AlertCircle, Navigation } from 'lucide-react';
import { getProfile, saveProfile, type UserProfile } from '../services/api';

const Settings: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile>({
        name: '',
        city: '',
        country: '',
        lat: undefined,
        lon: undefined,
    });
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Load existing profile on mount
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const res = await getProfile();
                if (res.profile) {
                    setProfile(prev => ({ ...prev, ...res.profile }));
                }
            } catch {
                // No profile yet — start fresh
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleChange = (key: keyof UserProfile, value: string | number | undefined) => {
        setProfile(prev => ({ ...prev, [key]: value }));
        setSaveStatus('idle');
    };

    const handleSave = async () => {
        if (!profile.name?.trim() && !profile.city?.trim()) {
            setErrorMsg('Please enter at least your name or city.');
            setSaveStatus('error');
            return;
        }

        setSaveStatus('saving');
        setErrorMsg('');

        try {
            const profileToSave: UserProfile = {
                name: profile.name?.trim() || undefined,
                city: profile.city?.trim() || undefined,
                country: profile.country?.trim() || undefined,
                lat: profile.lat,
                lon: profile.lon,
            };
            const res = await saveProfile(profileToSave);
            // Update with server-geocoded coords if returned
            if (res.profile) {
                setProfile(prev => ({ ...prev, ...res.profile }));
            }
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err: any) {
            setErrorMsg(err?.response?.data?.detail || 'Failed to save profile. Please try again.');
            setSaveStatus('error');
        }
    };

    const handleGPS = () => {
        if (!navigator.geolocation) {
            setErrorMsg('Geolocation is not supported by your browser.');
            setSaveStatus('error');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setProfile(prev => ({
                    ...prev,
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                }));
                setSaveStatus('idle');
            },
            () => {
                setErrorMsg('GPS access denied. You can type your city manually instead.');
                setSaveStatus('error');
            }
        );
    };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <SettingsIcon size={22} color="#6366f1" />
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Settings</h2>
            </div>

            {isLoading ? (
                <div style={{ padding: '2rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading profile…</div>
            ) : (
                <>
                    {/* User Profile Section */}
                    <section style={sectionStyle}>
                        <div style={sectionHeaderStyle}>
                            <User size={18} color="#6366f1" />
                            <h3 style={sectionTitleStyle}>User Profile</h3>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', marginTop: 0 }}>
                            Your profile is stored on the server. Your city is used as the default location
                            when you open the app.
                        </p>

                        <div style={fieldGroupStyle}>
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Display Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Aryaman"
                                    value={profile.name ?? ''}
                                    onChange={e => handleChange('name', e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <div style={fieldGroupStyle}>
                            <div style={fieldStyle}>
                                <label style={labelStyle}>City</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mumbai"
                                    value={profile.city ?? ''}
                                    onChange={e => handleChange('city', e.target.value)}
                                    style={inputStyle}
                                />
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    The city will be geocoded to coordinates automatically.
                                </span>
                            </div>
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Country</label>
                                <input
                                    type="text"
                                    placeholder="e.g. India"
                                    value={profile.country ?? ''}
                                    onChange={e => handleChange('country', e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Coordinates */}
                        <div style={sectionHeaderStyle}>
                            <MapPin size={16} color="#38bdf8" />
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Home Coordinates (optional)</h4>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem', marginTop: '0.25rem' }}>
                            Set your precise home coordinates for more accurate local data.
                        </p>

                        <div style={fieldGroupStyle}>
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Latitude</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    placeholder="e.g. 19.0760"
                                    value={profile.lat ?? ''}
                                    onChange={e => handleChange('lat', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    style={inputStyle}
                                />
                            </div>
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Longitude</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    placeholder="e.g. 72.8777"
                                    value={profile.lon ?? ''}
                                    onChange={e => handleChange('lon', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleGPS}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 1rem', borderRadius: '8px',
                                background: 'rgba(56,189,248,0.12)',
                                border: '1px solid rgba(56,189,248,0.3)',
                                color: '#38bdf8', cursor: 'pointer', fontSize: '0.85rem',
                                marginBottom: '1.5rem', fontWeight: 500,
                            }}
                        >
                            <Navigation size={14} />
                            Use My Current GPS Location
                        </button>

                        {profile.lat !== undefined && profile.lon !== undefined && profile.lat !== null && profile.lon !== null && (
                            <div style={{
                                fontSize: '0.75rem', color: '#64748b',
                                background: 'rgba(100,116,139,0.08)',
                                padding: '0.5rem 0.75rem', borderRadius: '6px',
                                marginBottom: '1rem',
                            }}>
                                📍 Coordinates set: {Number(profile.lat).toFixed(4)}, {Number(profile.lon).toFixed(4)}
                            </div>
                        )}
                    </section>

                    {/* Data Source Info */}
                    <section style={sectionStyle}>
                        <div style={sectionHeaderStyle}>
                            <Globe size={18} color="#a78bfa" />
                            <h3 style={sectionTitleStyle}>Data Sources</h3>
                        </div>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {[
                                { name: 'Open-Meteo Weather API', desc: 'Current weather: temperature, humidity, wind, condition', status: 'Active', color: '#22c55e' },
                                { name: 'Open-Meteo Air Quality API', desc: 'US AQI, PM2.5, PM10, O₃, NO₂, SO₂, CO from CAMS', status: 'Active', color: '#22c55e' },
                                { name: 'Copernicus CAMS', desc: 'Atmospheric model data powering the AQI readings', status: 'Active', color: '#22c55e' },
                                { name: 'OpenStreetMap / Nominatim', desc: 'Geocoding and reverse geocoding (address lookup)', status: 'Active', color: '#22c55e' },
                            ].map((src, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '0.75rem 1rem', borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{src.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{src.desc}</div>
                                    </div>
                                    <span style={{
                                        fontSize: '0.7rem', fontWeight: 600, color: src.color,
                                        background: `${src.color}18`, borderRadius: '4px', padding: '0.15rem 0.5rem',
                                    }}>
                                        {src.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.75rem' }}>
                            ℹ️ All data is from atmospheric models (CAMS) and weather forecast models. This is not real ground sensor data.
                            Accuracy varies by region and reflects model output, not local measurements.
                        </p>
                    </section>

                    {/* Status + Save */}
                    {saveStatus === 'error' && errorMsg && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1rem', borderRadius: '8px',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            color: '#fca5a5', marginBottom: '1rem', fontSize: '0.875rem',
                        }}>
                            <AlertCircle size={16} />
                            {errorMsg}
                        </div>
                    )}

                    {saveStatus === 'saved' && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1rem', borderRadius: '8px',
                            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                            color: '#86efac', marginBottom: '1rem', fontSize: '0.875rem',
                        }}>
                            <CheckCircle size={16} />
                            Profile saved successfully!
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={handleSave}
                            disabled={saveStatus === 'saving'}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.75rem 1.5rem', borderRadius: '10px',
                                background: saveStatus === 'saved' ? 'rgba(34,197,94,0.2)' : 'var(--primary)',
                                border: 'none', color: 'white', cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                                fontSize: '0.9rem', fontWeight: 600, opacity: saveStatus === 'saving' ? 0.7 : 1,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <Save size={16} />
                            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : 'Save Profile'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
    maxWidth: '760px',
    margin: '0 auto',
    padding: '2rem',
};

const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    marginBottom: '2rem', paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
};

const sectionStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px', padding: '1.5rem',
    marginBottom: '1.5rem',
};

const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    marginBottom: '1rem',
};

const sectionTitleStyle: React.CSSProperties = {
    margin: 0, fontSize: '1rem', fontWeight: 600,
};

const fieldGroupStyle: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem', marginBottom: '1.25rem',
};

const fieldStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '0.35rem',
};

const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
    padding: '0.6rem 0.9rem',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#fff',
    fontSize: '0.9rem', outline: 'none',
    transition: 'border-color 0.2s ease',
};

export default Settings;
