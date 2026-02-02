import React, { useState } from 'react';
import { Settings as SettingsIcon, User, Bell, MapPin, Database, Globe, Palette, Save } from 'lucide-react';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    // User preferences
    username: 'User',
    email: 'user@example.com',
    
    // Location
    defaultLocation: 'delhi',
    autoDetectLocation: true,
    
    // Notifications
    enableNotifications: true,
    criticalAlerts: true,
    dailySummary: true,
    forecastAlerts: false,
    
    // Display
    theme: 'dark',
    temperatureUnit: 'celsius',
    language: 'en',
    
    // Data
    cacheEnabled: true,
    offlineMode: false,
    dataRetention: '30',
    
    // API
    updateInterval: '5',
    dataSource: 'openaq'
  });

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  const handleReset = () => {
    if (confirm('Reset all settings to default?')) {
      localStorage.removeItem('appSettings');
      window.location.reload();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <SettingsIcon size={24} color="#6366f1" />
        <h2 style={styles.title}>Settings</h2>
      </div>

      {/* User Profile */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <User size={20} color="#6366f1" />
          <h3 style={styles.sectionTitle}>User Profile</h3>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.label}>Username</label>
          <input
            type="text"
            value={settings.username}
            onChange={(e) => handleChange('username', e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={settings.email}
            onChange={(e) => handleChange('email', e.target.value)}
            style={styles.input}
          />
        </div>
      </div>

      {/* Location Settings */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <MapPin size={20} color="#6366f1" />
          <h3 style={styles.sectionTitle}>Location</h3>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.label}>Default City</label>
          <select
            value={settings.defaultLocation}
            onChange={(e) => handleChange('defaultLocation', e.target.value)}
            style={styles.select}
          >
            <option value="delhi">Delhi</option>
            <option value="mumbai">Mumbai</option>
            <option value="bangalore">Bangalore</option>
            <option value="london">London</option>
            <option value="new_york">New York</option>
            <option value="tokyo">Tokyo</option>
            <option value="paris">Paris</option>
            <option value="singapore">Singapore</option>
          </select>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={settings.autoDetectLocation}
              onChange={(e) => handleChange('autoDetectLocation', e.target.checked)}
              style={styles.checkbox}
            />
            <span>Auto-detect location</span>
          </label>
        </div>
      </div>

      {/* Notification Settings */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <Bell size={20} color="#6366f1" />
          <h3 style={styles.sectionTitle}>Notifications</h3>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={settings.enableNotifications}
              onChange={(e) => handleChange('enableNotifications', e.target.checked)}
              style={styles.checkbox}
            />
            <span>Enable notifications</span>
          </label>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={settings.criticalAlerts}
              onChange={(e) => handleChange('criticalAlerts', e.target.checked)}
              style={styles.checkbox}
              disabled={!settings.enableNotifications}
            />
            <span>Critical alerts (AQI {'>'} 300)</span>
          </label>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={settings.dailySummary}
              onChange={(e) => handleChange('dailySummary', e.target.checked)}
              style={styles.checkbox}
              disabled={!settings.enableNotifications}
            />
            <span>Daily summary</span>
          </label>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={settings.forecastAlerts}
              onChange={(e) => handleChange('forecastAlerts', e.target.checked)}
              style={styles.checkbox}
              disabled={!settings.enableNotifications}
            />
            <span>Forecast alerts</span>
          </label>
        </div>
      </div>

      {/* Display Settings */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <Palette size={20} color="#6366f1" />
          <h3 style={styles.sectionTitle}>Display</h3>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.label}>Theme</label>
          <select
            value={settings.theme}
            onChange={(e) => handleChange('theme', e.target.value)}
            style={styles.select}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="auto">Auto</option>
          </select>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.label}>Temperature Unit</label>
          <select
            value={settings.temperatureUnit}
            onChange={(e) => handleChange('temperatureUnit', e.target.value)}
            style={styles.select}
          >
            <option value="celsius">Celsius (°C)</option>
            <option value="fahrenheit">Fahrenheit (°F)</option>
          </select>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.label}>Language</label>
          <select
            value={settings.language}
            onChange={(e) => handleChange('language', e.target.value)}
            style={styles.select}
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="es">Español (Spanish)</option>
            <option value="fr">Français (French)</option>
            <option value="de">Deutsch (German)</option>
            <option value="ja">日本語 (Japanese)</option>
            <option value="zh">中文 (Chinese)</option>
          </select>
        </div>
      </div>

      {/* Data Settings */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <Database size={20} color="#6366f1" />
          <h3 style={styles.sectionTitle}>Data & Storage</h3>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={settings.cacheEnabled}
              onChange={(e) => handleChange('cacheEnabled', e.target.checked)}
              style={styles.checkbox}
            />
            <span>Enable cache</span>
          </label>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={settings.offlineMode}
              onChange={(e) => handleChange('offlineMode', e.target.checked)}
              style={styles.checkbox}
            />
            <span>Offline mode</span>
          </label>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.label}>Data Retention (days)</label>
          <select
            value={settings.dataRetention}
            onChange={(e) => handleChange('dataRetention', e.target.value)}
            style={styles.select}
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
          </select>
        </div>
      </div>

      {/* API Settings */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <Globe size={20} color="#6366f1" />
          <h3 style={styles.sectionTitle}>API & Updates</h3>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.label}>Update Interval (minutes)</label>
          <select
            value={settings.updateInterval}
            onChange={(e) => handleChange('updateInterval', e.target.value)}
            style={styles.select}
          >
            <option value="1">1 minute</option>
            <option value="5">5 minutes</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
          </select>
        </div>
        <div style={styles.settingGroup}>
          <label style={styles.label}>Data Source</label>
          <select
            value={settings.dataSource}
            onChange={(e) => handleChange('dataSource', e.target.value)}
            style={styles.select}
          >
            <option value="openaq">OpenAQ</option>
            <option value="government">Government API</option>
            <option value="multiple">Multiple Sources</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actions}>
        <button style={styles.saveButton} onClick={handleSave}>
          <Save size={18} />
          <span>Save Settings</span>
        </button>
        <button style={styles.resetButton} onClick={handleReset}>
          Reset to Default
        </button>
      </div>

      {/* App Info */}
      <div style={styles.appInfo}>
        <p style={styles.infoText}>Air Quality Monitor v2.0</p>
        <p style={styles.infoText}>Global Edition</p>
        <p style={styles.infoText}>© 2025 - Built with ❤️</p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto',
    color: '#fff'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    margin: 0
  },
  section: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    margin: 0
  },
  settingGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    color: '#9ca3af',
    marginBottom: '0.5rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.875rem',
    boxSizing: 'border-box' as const
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.875rem',
    boxSizing: 'border-box' as const,
    cursor: 'pointer'
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.875rem',
    color: '#d1d5db',
    cursor: 'pointer'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem'
  },
  saveButton: {
    flex: 1,
    padding: '0.75rem 1.5rem',
    background: '#6366f1',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background 0.2s'
  },
  resetButton: {
    padding: '0.75rem 1.5rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  appInfo: {
    marginTop: '3rem',
    padding: '1.5rem',
    background: 'rgba(99, 102, 241, 0.05)',
    borderRadius: '8px',
    textAlign: 'center' as const
  },
  infoText: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    margin: '0.25rem 0'
  }
};

export default Settings;
