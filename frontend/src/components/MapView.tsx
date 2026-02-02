import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Navigation, ZoomIn, ZoomOut } from 'lucide-react';
import { getAQIGrid, geocodeLocation, getLocationAQI } from '../services/api';

interface MapViewProps {
  centerLat?: number;
  centerLon?: number;
  zoom?: number;
  onLocationChange?: (lat: number, lon: number, address?: string) => void;
}

interface LocationData {
  lat: number;
  lon: number;
  aqi: number;
  temperature?: number;
  address?: string;
}

const MapControls: React.FC<{ onZoomIn: () => void; onZoomOut: () => void }> = ({ onZoomIn, onZoomOut }) => {
  return (
    <div style={styles.controls}>
      <button style={styles.controlButton} onClick={onZoomIn}>
        <ZoomIn size={20} />
      </button>
      <button style={styles.controlButton} onClick={onZoomOut}>
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
  const [loading, setLoading] = useState(true);
  const [searchedLocation, setSearchedLocation] = useState<LocationData | null>(null);
  const [searchError, setSearchError] = useState<string>('');

  useEffect(() => {
    fetchGridData();
  }, [center]);

  useEffect(() => {
    if (centerLat && centerLon) {
      setCenter([centerLat, centerLon]);
    }
  }, [centerLat, centerLon]);

  const fetchGridData = async () => {
    setLoading(true);
    try {
      const data = await getAQIGrid(center[0], center[1]);
      setGridData(data.grid || []);
    } catch (error) {
      console.error("Failed to fetch grid data", error);
      // Mock data
      const mockGrid = [];
      for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
          mockGrid.push({
            lat: center[0] - 0.15 + i * 0.02,
            lon: center[1] - 0.15 + j * 0.02,
            aqi: 50 + Math.random() * 300
          });
        }
      }
      setGridData(mockGrid);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Please enter a location');
      return;
    }

    setLoading(true);
    setSearchError('');

    try {
      // Geocode the search query
      const geocodeResult = await geocodeLocation(searchQuery);

      if (geocodeResult && geocodeResult.lat && geocodeResult.lon) {
        const { lat, lon, address } = geocodeResult;

        // Fetch AQI and temperature for the location
        const locationData = await getLocationAQI(lat, lon);

        // Update map center
        setCenter([lat, lon]);
        setZoom(12);

        // Store searched location data
        setSearchedLocation({
          lat,
          lon,
          aqi: locationData.aqi,
          temperature: locationData.temperature,
          address: address || locationData.location?.address
        });

        // Notify parent
        if (onLocationChange) {
          onLocationChange(lat, lon, address || locationData.location?.address);
        }

        setSearchError('');
      } else {
        setSearchError('Location not found. Try a different search.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Unable to search location. Please try again.');
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

          setCenter([lat, lon]);
          setZoom(13);

          // Fetch data for current location
          try {
            const locationData = await getLocationAQI(lat, lon);
            setSearchedLocation({
              lat,
              lon,
              aqi: locationData.aqi,
              temperature: locationData.temperature,
              address: locationData.location?.address || 'Current Location'
            });

            // Notify parent
            if (onLocationChange) {
              onLocationChange(lat, lon, locationData.location?.address || 'Current Location');
            }
          } catch (error) {
            console.error('Error fetching current location data:', error);
          } finally {
            setLoading(false);
          }
        },
        () => {
          setSearchError('Unable to get your location');
          setLoading(false);
        }
      );
    } else {
      setSearchError('Geolocation is not supported by your browser');
    }
  };

  const tileUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  return (
    <div style={styles.container}>
      {/* Search Bar */}
      <div style={styles.searchBar}>
        <div style={styles.searchInputWrapper}>
          <Search size={20} color="#6b7280" />
          <input
            type="text"
            placeholder="Search any location worldwide (e.g., Tokyo, New York, Paris)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={styles.searchInput}
          />
        </div>
        <button style={styles.locationButton} onClick={handleCurrentLocation}>
          <Navigation size={20} />
        </button>
        <select
          value={mapStyle}
          onChange={(e) => setMapStyle(e.target.value)}
          style={styles.styleSelector}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="satellite">Satellite</option>
        </select>
      </div>

      {/* Search Error */}
      {searchError && (
        <div style={styles.searchError}>
          {searchError}
        </div>
      )}

      {/* Searched Location Info */}
      {searchedLocation && (
        <div style={styles.locationInfo}>
          <h4 style={styles.locationTitle}>📍 Selected Location</h4>
          <div style={styles.locationDetail}>
            <strong>{searchedLocation.address}</strong>
          </div>
          <div style={styles.locationStats}>
            <div style={styles.locationStat}>
              <span style={styles.statIcon}>🌫️</span>
              <div>
                <div style={styles.locStatLabel}>AQI</div>
                <div style={{ ...styles.locStatValue, color: getAqiColor(searchedLocation.aqi) }}>
                  {Math.round(searchedLocation.aqi)}
                </div>
                <div style={styles.statCategory}>{getAqiCategory(searchedLocation.aqi)}</div>
              </div>
            </div>
            {searchedLocation.temperature !== undefined && (
              <div style={styles.locationStat}>
                <span style={styles.statIcon}>🌡️</span>
                <div>
                  <div style={styles.locStatLabel}>Temperature</div>
                  <div style={styles.locStatValue}>{searchedLocation.temperature}°C</div>
                  <div style={styles.statCategory}>{(searchedLocation.temperature * 9 / 5 + 32).toFixed(1)}°F</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={center}
        zoom={zoom}
        style={styles.map}
        zoomControl={false}
      >
        <TileLayer
          url={tileUrls[mapStyle as keyof typeof tileUrls]}
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapViewController center={center} zoom={zoom} />

        {/* Searched Location Marker */}
        {searchedLocation && (
          <CircleMarker
            center={[searchedLocation.lat, searchedLocation.lon]}
            radius={15}
            pathOptions={{
              fillColor: getAqiColor(searchedLocation.aqi),
              fillOpacity: 0.9,
              color: '#fff',
              weight: 3,
              opacity: 1
            }}
          >
            <Popup>
              <div style={{ color: '#000', minWidth: '200px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                  📍 {searchedLocation.address}
                </div>
                <div style={{
                  color: getAqiColor(searchedLocation.aqi),
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  marginBottom: '0.5rem'
                }}>
                  AQI: {Math.round(searchedLocation.aqi)} - {getAqiCategory(searchedLocation.aqi)}
                </div>
                {searchedLocation.temperature !== undefined && (
                  <div style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                    🌡️ Temperature: {searchedLocation.temperature}°C ({(searchedLocation.temperature * 9 / 5 + 32).toFixed(1)}°F)
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  📍 {searchedLocation.lat.toFixed(4)}, {searchedLocation.lon.toFixed(4)}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Grid Data Markers */}
        {gridData.map((point, idx) => (
          <CircleMarker
            key={idx}
            center={[point.lat, point.lon]}
            radius={zoom > 12 ? 10 : 8}
            pathOptions={{
              fillColor: getAqiColor(point.aqi),
              fillOpacity: 0.7,
              color: '#fff',
              weight: 1,
              opacity: 0.8
            }}
          >
            <Popup>
              <div style={{ color: '#000', minWidth: '150px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  AQI: {Math.round(point.aqi)}
                </div>
                <div style={{
                  color: getAqiColor(point.aqi),
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>
                  {getAqiCategory(point.aqi)}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  📍 {point.lat.toFixed(4)}, {point.lon.toFixed(4)}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Map Controls */}
      <MapControls
        onZoomIn={() => setZoom(prev => Math.min(prev + 1, 18))}
        onZoomOut={() => setZoom(prev => Math.max(prev - 1, 3))}
      />

      {/* Legend */}
      <div style={styles.legend}>
        <h4 style={styles.legendTitle}>AQI Scale</h4>
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

      {/* Stats Panel */}
      <div style={styles.statsPanel}>
        <h4 style={styles.statsTitle}>Current View</h4>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Locations</span>
          <span style={styles.statValue}>{gridData.length}</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Avg AQI</span>
          <span style={styles.statValue}>
            {gridData.length > 0
              ? Math.round(gridData.reduce((sum, p) => sum + p.aqi, 0) / gridData.length)
              : '-'}
          </span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Max AQI</span>
          <span style={styles.statValue}>
            {gridData.length > 0
              ? Math.round(Math.max(...gridData.map(p => p.aqi)))
              : '-'}
          </span>
        </div>
      </div>

      {loading && (
        <div style={styles.loader}>
          <div style={styles.loaderSpinner}></div>
          <span>Loading map data...</span>
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
    minHeight: '400px',
    background: '#0f172a',
    borderRadius: '1rem',
    overflow: 'hidden'
  },
  searchBar: {
    position: 'absolute' as const,
    top: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  searchInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    gap: '0.75rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    minWidth: '500px'
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    color: '#fff',
    outline: 'none',
    fontSize: '0.9rem',
    flex: 1
  },
  searchError: {
    position: 'absolute' as const,
    top: '5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(239, 68, 68, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    color: '#fff',
    fontSize: '0.9rem',
    zIndex: 1000,
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  locationInfo: {
    position: 'absolute' as const,
    top: '5rem',
    left: '2rem',
    background: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
    minWidth: '280px',
    maxWidth: '350px'
  },
  locationTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#fff'
  },
  locationDetail: {
    fontSize: '0.85rem',
    color: '#e2e8f0',
    marginBottom: '1rem',
    lineHeight: '1.4'
  },
  locationStats: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'space-between'
  },
  locationStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flex: 1
  },
  statIcon: {
    fontSize: '1.5rem'
  },
  locStatLabel: {
    fontSize: '0.7rem',
    color: '#9ca3af',
    marginBottom: '0.25rem',
    textTransform: 'uppercase' as const
  },
  locStatValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#fff',
    lineHeight: '1.2'
  },
  statCategory: {
    fontSize: '0.7rem',
    color: '#9ca3af',
    marginTop: '0.25rem'
  },
  locationButton: {
    background: 'rgba(99, 102, 241, 0.9)',
    border: 'none',
    borderRadius: '12px',
    padding: '0.75rem',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s'
  },
  styleSelector: {
    background: 'rgba(30, 41, 59, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.9rem'
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
    background: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '0.75rem',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  legend: {
    position: 'absolute' as const,
    bottom: '2rem',
    left: '2rem',
    background: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '1rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
    minWidth: '180px'
  },
  legendTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#fff'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem'
  },
  colorBox: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    flexShrink: 0
  },
  legendText: {
    display: 'flex',
    flexDirection: 'column' as const,
    fontSize: '0.75rem'
  },
  legendLabel: {
    color: '#fff',
    fontWeight: '500'
  },
  legendRange: {
    color: '#9ca3af',
    fontSize: '0.7rem'
  },
  statsPanel: {
    position: 'absolute' as const,
    top: '5rem',
    right: '2rem',
    background: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '1rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
    minWidth: '150px'
  },
  statsTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#fff'
  },
  stat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#9ca3af'
  },
  statValue: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#fff'
  },
  loader: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1rem',
    color: '#fff',
    zIndex: 2000
  },
  loaderSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(99, 102, 241, 0.2)',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};

export default MapView;
