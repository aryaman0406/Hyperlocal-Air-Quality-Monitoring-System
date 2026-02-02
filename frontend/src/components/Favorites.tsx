import React, { useState } from 'react';
import { Heart, Star, Trash2, Plus } from 'lucide-react';
import { getFavorites, addFavorite, deleteFavorite, type FavoriteLocation } from '../services/api';

const Favorites: React.FC = () => {
    const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', lat: '', lon: '' });
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        try {
            const data = await getFavorites();
            setFavorites(data.favorites || []);
        } catch (error) {
            console.error('Failed to load favorites:', error);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addFavorite(formData.name, parseFloat(formData.lat), parseFloat(formData.lon));
            setFormData({ name: '', lat: '', lon: '' });
            setShowAddForm(false);
            await loadFavorites();
        } catch (error) {
            console.error('Failed to add favorite:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteFavorite(id);
            await loadFavorites();
        } catch (error) {
            console.error('Failed to delete favorite:', error);
        }
    };

    const getAqiColor = (aqi?: number) => {
        if (!aqi) return '#6b7280';
        if (aqi <= 50) return '#10b981';
        if (aqi <= 100) return '#f59e0b';
        if (aqi <= 200) return '#ef4444';
        if (aqi <= 300) return '#ec4899';
        return '#7c3aed';
    };

    return (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Heart size={20} style={{ color: 'var(--accent-pink)' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Favorite Locations</h3>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Plus size={16} />
                    Add Location
                </button>
            </div>

            {showAddForm && (
                <form onSubmit={handleAdd} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        <input
                            type="text"
                            placeholder="Location Name (e.g., Home, Office)"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            style={{
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white'
                            }}
                        />
                        <input
                            type="number"
                            step="any"
                            placeholder="Latitude"
                            value={formData.lat}
                            onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                            required
                            style={{
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white'
                            }}
                        />
                        <input
                            type="number"
                            step="any"
                            placeholder="Longitude"
                            value={formData.lon}
                            onChange={(e) => setFormData({ ...formData, lon: e.target.value })}
                            required
                            style={{
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                background: 'var(--accent-green)',
                                color: 'white',
                                border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Adding...' : 'Add Favorite'}
                        </button>
                    </div>
                </form>
            )}

            <div style={{ display: 'grid', gap: '0.75rem' }}>
                {favorites.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                        No favorite locations yet. Add one to get started!
                    </p>
                ) : (
                    favorites.map((fav) => (
                        <div
                            key={fav.id}
                            style={{
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <Star size={14} style={{ color: '#f59e0b' }} />
                                    <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{fav.name}</h4>
                                </div>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    {fav.lat.toFixed(4)}, {fav.lon.toFixed(4)}
                                </p>
                            </div>
                            {fav.current_aqi !== undefined && (
                                <div
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.375rem',
                                        background: getAqiColor(fav.current_aqi),
                                        fontWeight: 600,
                                        marginRight: '0.5rem'
                                    }}
                                >
                                    AQI: {Math.round(fav.current_aqi)}
                                </div>
                            )}
                            <button
                                onClick={() => handleDelete(fav.id)}
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: '0.375rem',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#ef4444'
                                }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Favorites;
