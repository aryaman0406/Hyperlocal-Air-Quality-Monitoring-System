import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Navigation, ZoomIn, ZoomOut, Thermometer, Wind, ShieldAlert, Sparkles, MapPin } from 'lucide-react';
import { getAQIGrid, geocodeLocation, getLocationData } from '../services/api';

interface MapViewProps {
  centerLat?: number;
  centerLon?: number;
  zoom?: number;
  onLocationChange?: (lat: number, lon: number, address?: string) => void;
}

interface PinnedLocation {
  lat: number;
  lon: number;
  aqi: number | null;
  temperature: number | null;
  feels_like: number | null;
  humidity: number | null;
  condition: string | null;
  pm25: number | null;
  pm10: number | null;
  address: string;
  aq_available: boolean;
  wx_available: boolean;
}



const MapControls: React.FC<{ onZoomIn: () => void; onZoomOut: () => void }> = ({ onZoomIn, onZoomOut }) => {
  return (
    <div style={styles.controls}>
      <button style={styles.controlButton} onClick={onZoomIn} title="Zoom In" aria-label="Zoom In">
        <ZoomIn size={20} />
      </button>
      <button style={styles.controlButton} onClick={onZoomOut} title="Zoom Out" aria-label="Zoom Out">
        <ZoomOut size={20} />
      </button>
    </div>
  );
};

const MapViewController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const MapClickHandler: React.FC<{ onMapClick: (lat: number, lon: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

const MapView: React.FC<MapViewProps> = ({
  centerLat = 28.6139,
  centerLon = 77.2090,
  zoom: initialZoom = 11,
  onLocationChange
}) => {
  const [gridData, setGridData] = useState<any[]>([]);
  const [center, setCenter] = useState<[number, number]>([centerLat, centerLon]);
  const [zoom, setZoom] = useState(initialZoom);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapStyle, setMapStyle] = useState('dark');
  const [loading, setLoading] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<PinnedLocation | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<string>('');

  const getAqiColor = (aqi: number) => {
    if (aqi <= 50) return '#10b981';
    if (aqi <= 100) return '#f59e0b';
    if (aqi <= 150) return '#fb923c';
    if (aqi <= 200) return '#ef4444';
    if (aqi <= 300) return '#dc2626';
    return '#7c3aed';
  };

  const getAqiCategory = (aqi: number) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  const selectCoordinates = useCallback(async (lat: number, lon: number, customAddress?: string) => {
    setLoading(true);
    setCenter([lat, lon]);

    try {
      const data = await getLocationData(lat, lon);
      const addr = customAddress || data.location?.address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      const wx = data.weather;
      const poll = data.pollutants;

      setPinnedLocation({
        lat,
        lon,
        aqi: data.aqi ?? null,
        temperature: wx?.temperature ?? null,
        feels_like: wx?.feels_like ?? null,
        humidity: wx?.humidity ?? null,
        condition: wx?.condition ?? null,
        pm25: poll?.pm2_5 ?? null,
        pm10: poll?.pm10 ?? null,
        address: addr,
        aq_available: data.aq_available,
        wx_available: data.wx_available,
      });

      if (onLocationChange) {
        onLocationChange(lat, lon, addr);
      }
      setSearchFeedback('');
    } catch (error) {
      console.error('[Map] selectCoordinates error:', error);
      const addr = customAddress || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      setPinnedLocation({
        lat, lon, aqi: null, temperature: null, feels_like: null,
        humidity: null, condition: null, pm25: null, pm10: null,
        address: addr, aq_available: false, wx_available: false,
      });
      if (onLocationChange) {
        onLocationChange(lat, lon, addr);
      }
    } finally {
      setLoading(false);
    }
  }, [onLocationChange]);

  const fetchGridData = useCallback(async () => {
    try {
      const data = await getAQIGrid(center[0], center[1], 10);
      if (data?.available && data.grid?.length > 0) {
        setGridData(data.grid);
      } else {
        // Grid data unavailable — show empty grid rather than fake data
        setGridData([]);
      }
    } catch {
      setGridData([]);
    }
  }, [center]);

  useEffect(() => {
    fetchGridData();
  }, [fetchGridData]);

  // When center coordinates change from parent, update map and fetch data
  useEffect(() => {
    if (centerLat && centerLon) {
      setCenter([centerLat, centerLon]);
      selectCoordinates(centerLat, centerLon);
    }
  }, [centerLat, centerLon]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setLoading(true);
    setSearchFeedback('');

    try {
      const geocodeResult = await geocodeLocation(searchQuery);

      if (geocodeResult && geocodeResult.lat && geocodeResult.lon) {
        const { lat, lon, address } = geocodeResult;
        setZoom(12);
        await selectCoordinates(lat, lon, address);
        setSearchQuery('');
      } else {
        setSearchFeedback(`Could not find "${searchQuery}". Please check the spelling or try another city.`);
        setTimeout(() => setSearchFeedback(''), 4000);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchFeedback('Search service is temporarily busy. Please retry.');
      setTimeout(() => setSearchFeedback(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setZoom(13);
          await selectCoordinates(lat, lon, 'Your Current Location');
        },
        () => {
          setSearchFeedback('Location access was denied. You can search any city in the search bar.');
          setTimeout(() => setSearchFeedback(''), 4000);
          setLoading(false);
        }
      );
    } else {
      setSearchFeedback('Geolocation is not supported by your browser.');
      setTimeout(() => setSearchFeedback(''), 4000);
    }
  };

  const tileUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  const avgAqi = gridData.length > 0
    ? Math.round(gridData.reduce((sum, p) => sum + p.aqi, 0) / gridData.length)
    : (pinnedLocation?.aqi ?? null);

  const maxAqi = gridData.length > 0
    ? Math.round(Math.max(...gridData.map(p => p.aqi)))
    : null;

  return (
    <div style={styles.container}>
      {/* Top Search Bar */}
      <div style={styles.topControlPanel}>
        <div style={styles.searchBar}>
          <div style={styles.searchInputWrapper}>
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search any city, town, or address worldwide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button
                onClick={handleSearch}
                style={styles.searchSubmitButton}
                title="Search location"
              >
                Search
              </button>
            )}
          </div>
          <button style={styles.locationButton} onClick={handleCurrentLocation} title="Use My Current GPS Location">
            <Navigation size={18} />
          </button>
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
            style={styles.styleSelector}
            aria-label="Map style selector"
          >
            <option value="dark">Dark Theme</option>
            <option value="light">Light Theme</option>
            <option value="satellite">Satellite</option>
          </select>
        </div>
      </div>

      {/* Search Feedback Banner */}
      {searchFeedback && (
        <div style={styles.feedbackBanner}>
          <Sparkles size={16} />
          <span>{searchFeedback}</span>
        </div>
      )}

      {/* Selected Location Card (AQI + Temperature) */}
      {pinnedLocation && (
        <div style={styles.locationInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <MapPin size={18} color="#6366f1" />
            <h4 style={styles.locationTitle}>Live Location Data</h4>
          </div>
          <div style={styles.locationDetail}>
            <strong>{pinnedLocation.address}</strong>
          </div>

          <div style={styles.locationStats}>
            {/* AQI Metric */}
            <div style={styles.locationStat}>
              <div style={styles.metricIconWrap}>
                <Wind size={20} color={pinnedLocation.aqi !== null ? getAqiColor(pinnedLocation.aqi) : '#64748b'} />
              </div>
              <div>
                <div style={styles.locStatLabel}>US AQI (EPA)</div>
                <div style={{ ...styles.locStatValue, color: pinnedLocation.aqi !== null ? getAqiColor(pinnedLocation.aqi) : '#64748b' }}>
                  {pinnedLocation.aqi !== null ? Math.round(pinnedLocation.aqi) : '—'}
                </div>
                <div style={{ ...styles.statCategory, color: pinnedLocation.aqi !== null ? getAqiColor(pinnedLocation.aqi) : '#64748b' }}>
                  {pinnedLocation.aqi !== null ? getAqiCategory(pinnedLocation.aqi) : (pinnedLocation.aq_available ? 'Unknown' : 'Data unavailable')}
                </div>
              </div>
            </div>

            {/* Temperature Metric */}
            <div style={styles.locationStat}>
              <div style={styles.metricIconWrap}>
                <Thermometer size={20} color="#38bdf8" />
              </div>
              <div>
                <div style={styles.locStatLabel}>Temperature</div>
                <div style={styles.locStatValue}>
                  {pinnedLocation.temperature !== null ? `${pinnedLocation.temperature}°C` : '—'}
                </div>
                <div style={styles.statCategory}>
                  {pinnedLocation.temperature !== null
                    ? `${(pinnedLocation.temperature * 9 / 5 + 32).toFixed(1)}°F`
                    : ''}
                  {pinnedLocation.condition ? ` • ${pinnedLocation.condition}` : ''}
                </div>
              </div>
            </div>
          </div>

          {pinnedLocation.pm25 !== null && (
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.4rem' }}>
              PM2.5: {pinnedLocation.pm25} μg/m³ &nbsp;·&nbsp; PM10: {pinnedLocation.pm10 ?? '—'} μg/m³
            </div>
          )}

          <div style={styles.healthBanner}>
            <ShieldAlert size={14} color={pinnedLocation.aqi !== null && pinnedLocation.aqi > 100 ? '#ef4444' : '#10b981'} />
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
              {!pinnedLocation.aq_available
                ? 'Air quality data temporarily unavailable for this location.'
                : pinnedLocation.aqi !== null && pinnedLocation.aqi > 150
                ? 'Sensitive individuals should limit prolonged outdoor exertion.'
                : pinnedLocation.aqi !== null && pinnedLocation.aqi > 100
                ? 'Moderate pollution. Sensitive groups should reduce outdoor exercise.'
                : 'Air quality is satisfactory and safe for outdoor activities.'}
            </span>
          </div>
        </div>
      )}

      {/* Map Container */}
      <MapContainer
        center={center}
        zoom={zoom}
        style={styles.map}
        zoomControl={false}
      >
        <TileLayer
          url={tileUrls[mapStyle as keyof typeof tileUrls]}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapViewController center={center} zoom={zoom} />
        <MapClickHandler onMapClick={(lat, lon) => selectCoordinates(lat, lon)} />

        {/* Pinned Location Marker */}
        {pinnedLocation && (
          <CircleMarker
            center={[pinnedLocation.lat, pinnedLocation.lon]}
            radius={16}
            pathOptions={{
              fillColor: pinnedLocation.aqi !== null ? getAqiColor(pinnedLocation.aqi) : '#64748b',
              fillOpacity: 0.95,
              color: '#ffffff',
              weight: 3,
              opacity: 1
            }}
          >
            <Popup>
              <div style={{ color: '#0f172a', minWidth: '230px', padding: '0.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                  📍 {pinnedLocation.address}
                </div>
                <div style={{
                  color: pinnedLocation.aqi !== null ? getAqiColor(pinnedLocation.aqi) : '#64748b',
                  fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.2rem'
                }}>
                  {pinnedLocation.aqi !== null ? `US AQI: ${Math.round(pinnedLocation.aqi)}` : 'US AQI: N/A'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.3rem' }}>
                  {pinnedLocation.aqi !== null ? getAqiCategory(pinnedLocation.aqi) : 'Data unavailable'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.2rem' }}>
                  🌡️ {pinnedLocation.temperature !== null ? `${pinnedLocation.temperature}°C` : '—'}
                  {pinnedLocation.condition ? ` · ${pinnedLocation.condition}` : ''}
                </div>
                {pinnedLocation.pm25 !== null && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    PM2.5: {pinnedLocation.pm25} μg/m³ · PM10: {pinnedLocation.pm10 ?? '—'} μg/m³
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                  {pinnedLocation.lat.toFixed(4)}, {pinnedLocation.lon.toFixed(4)} · Source: Open-Meteo/CAMS
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Spatial Grid Sensor Points */}
        {gridData.map((point, idx) => (
          <CircleMarker
            key={idx}
            center={[point.lat, point.lon]}
            radius={zoom > 12 ? 10 : 8}
            pathOptions={{
              fillColor: getAqiColor(point.aqi),
              fillOpacity: 0.75,
              color: '#ffffff',
              weight: 1.5,
              opacity: 0.9
            }}
          >
            <Popup>
              <div style={{ color: '#0f172a', minWidth: '170px', padding: '0.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: getAqiColor(point.aqi) }}>
                  US AQI: {Math.round(point.aqi)}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  {getAqiCategory(point.aqi)}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {point.lat.toFixed(4)}, {point.lon.toFixed(4)}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Source: Open-Meteo / CAMS
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Map Zoom Controls */}
      <MapControls
        onZoomIn={() => setZoom(prev => Math.min(prev + 1, 18))}
        onZoomOut={() => setZoom(prev => Math.max(prev - 1, 3))}
      />

      {/* AQI Scale Legend */}
      <div style={styles.legend}>
        <h4 style={styles.legendTitle}>AQI Color Legend</h4>
        {[
          { color: '#10b981', label: 'Good', range: '0-50' },
          { color: '#f59e0b', label: 'Moderate', range: '51-100' },
          { color: '#fb923c', label: 'USG', range: '101-150' },
          { color: '#ef4444', label: 'Unhealthy', range: '151-200' },
          { color: '#dc2626', label: 'Very Unhealthy', range: '201-300' },
          { color: '#7c3aed', label: 'Hazardous', range: '300+' }
        ].map((item, idx) => (
          <div key={idx} style={styles.legendItem}>
            <div style={{ ...styles.colorBox, background: item.color }}></div>
            <div style={styles.legendText}>
              <span style={styles.legendLabel}>{item.label}</span>
              <span style={styles.legendRange}>{item.range}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Live View Stats Panel */}
      <div style={styles.statsPanel}>
        <h4 style={styles.statsTitle}>Map View · US AQI</h4>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Grid Points</span>
          <span style={styles.statValue}>{gridData.length > 0 ? gridData.length : '—'}</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Avg AQI</span>
          <span style={{ ...styles.statValue, color: avgAqi !== null ? getAqiColor(avgAqi) : '#64748b' }}>
            {avgAqi !== null ? avgAqi : '—'}
          </span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Peak AQI</span>
          <span style={{ ...styles.statValue, color: maxAqi !== null ? getAqiColor(maxAqi) : '#64748b' }}>
            {maxAqi !== null ? maxAqi : '—'}
          </span>
        </div>
      </div>

      {loading && (
        <div style={styles.loader}>
          <div style={styles.loaderSpinner}></div>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Fetching live global AQI & temperature...</span>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    minHeight: '600px',
    background: '#0f172a',
    borderRadius: '1.25rem',
    overflow: 'hidden'
  },
  topControlPanel: {
    position: 'absolute' as const,
    top: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    alignItems: 'center',
    maxWidth: '90%'
  },
  searchBar: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  searchInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(16px)',
    borderRadius: '14px',
    padding: '0.65rem 1rem',
    gap: '0.65rem',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
    minWidth: '420px'
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    color: '#ffffff',
    outline: 'none',
    fontSize: '0.9rem',
    flex: 1
  },
  searchSubmitButton: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: '8px',
    padding: '0.35rem 0.75rem',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  feedbackBanner: {
    position: 'absolute' as const,
    top: '5.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(12px)',
    borderRadius: '10px',
    padding: '0.6rem 1.25rem',
    color: '#e2e8f0',
    fontSize: '0.85rem',
    zIndex: 1000,
    border: '1px solid rgba(99, 102, 241, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
  },
  locationInfo: {
    position: 'absolute' as const,
    top: '5rem',
    left: '1.5rem',
    background: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '1.25rem',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    zIndex: 1000,
    minWidth: '290px',
    maxWidth: '340px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
  },
  locationTitle: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#ffffff'
  },
  locationDetail: {
    fontSize: '0.85rem',
    color: '#cbd5e1',
    marginBottom: '1rem',
    lineHeight: '1.4'
  },
  locationStats: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'space-between',
    marginBottom: '0.75rem'
  },
  locationStat: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    flex: 1
  },
  metricIconWrap: {
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '0.4rem',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  locStatLabel: {
    fontSize: '0.68rem',
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    fontWeight: 600,
    letterSpacing: '0.04em'
  },
  locStatValue: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: '1.2'
  },
  statCategory: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    marginTop: '0.15rem'
  },
  healthBanner: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: '10px',
    padding: '0.5rem 0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  locationButton: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: '14px',
    padding: '0.7rem',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)',
    transition: 'all 0.2s'
  },
  styleSelector: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '14px',
    padding: '0.65rem 0.9rem',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '0.85rem',
    outline: 'none',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)'
  },
  map: {
    width: '100%',
    height: '100%'
  },
  controls: {
    position: 'absolute' as const,
    bottom: '2rem',
    right: '2rem',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem'
  },
  controlButton: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    padding: '0.65rem',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
    transition: 'all 0.2s'
  },
  legend: {
    position: 'absolute' as const,
    bottom: '2rem',
    left: '2rem',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(16px)',
    borderRadius: '16px',
    padding: '1rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
    minWidth: '175px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.4)'
  },
  legendTitle: {
    margin: '0 0 0.65rem 0',
    fontSize: '0.825rem',
    fontWeight: 600,
    color: '#ffffff'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.4rem'
  },
  colorBox: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    flexShrink: 0
  },
  legendText: {
    display: 'flex',
    flexDirection: 'column' as const,
    fontSize: '0.725rem'
  },
  legendLabel: {
    color: '#ffffff',
    fontWeight: 500
  },
  legendRange: {
    color: '#94a3b8',
    fontSize: '0.675rem'
  },
  statsPanel: {
    position: 'absolute' as const,
    top: '5rem',
    right: '2rem',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(16px)',
    borderRadius: '16px',
    padding: '1rem 1.25rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
    minWidth: '160px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.4)'
  },
  statsTitle: {
    margin: '0 0 0.65rem 0',
    fontSize: '0.825rem',
    fontWeight: 600,
    color: '#ffffff'
  },
  stat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.4rem'
  },
  statLabel: {
    fontSize: '0.725rem',
    color: '#94a3b8'
  },
  statValue: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#ffffff'
  },
  loader: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '1.5rem 2rem',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.75rem',
    color: '#ffffff',
    zIndex: 2000,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
  },
  loaderSpinner: {
    width: '36px',
    height: '36px',
    border: '3px solid rgba(99, 102, 241, 0.2)',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};

export default MapView;
