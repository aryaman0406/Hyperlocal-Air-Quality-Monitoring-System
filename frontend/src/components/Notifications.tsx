import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  location?: string;
  aqi?: number;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    // Simulate some initial notifications
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'critical',
        title: 'Severe Air Quality Alert',
        message: 'AQI has reached 310 in your area. Avoid outdoor activities.',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        read: false,
        location: 'Anand Vihar',
        aqi: 310
      },
      {
        id: '2',
        type: 'warning',
        title: 'Air Quality Worsening',
        message: 'AQI increased by 25% in the last hour.',
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        read: false,
        location: 'ITO'
      },
      {
        id: '3',
        type: 'info',
        title: 'Daily Summary Available',
        message: 'Your air quality report for today is ready.',
        timestamp: new Date(Date.now() - 1000 * 60 * 120),
        read: true
      }
    ];
    setNotifications(mockNotifications);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical':
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
        return <Info size={20} />;
      case 'success':
        return <CheckCircle size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      case 'success':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Bell size={24} color="#6366f1" />
          <h2 style={styles.title}>Notifications</h2>
          {unreadCount > 0 && (
            <span style={styles.badge}>{unreadCount}</span>
          )}
        </div>
        <button
          style={styles.toggleButton}
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
        >
          {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
        </button>
      </div>

      <div style={styles.filters}>
        <button
          style={{...styles.filterButton, ...(filter === 'all' ? styles.filterButtonActive : {})}}
          onClick={() => setFilter('all')}
        >
          All ({notifications.length})
        </button>
        <button
          style={{...styles.filterButton, ...(filter === 'unread' ? styles.filterButtonActive : {})}}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
      </div>

      <div style={styles.actions}>
        <button style={styles.actionButton} onClick={markAllAsRead}>
          Mark all as read
        </button>
        <button style={styles.actionButton} onClick={clearAll}>
          Clear all
        </button>
      </div>

      <div style={styles.notificationsList}>
        {filteredNotifications.length === 0 ? (
          <div style={styles.emptyState}>
            <Bell size={48} color="#6b7280" />
            <p style={styles.emptyText}>No notifications</p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              style={{
                ...styles.notificationCard,
                borderLeft: `4px solid ${getTypeColor(notification.type)}`,
                backgroundColor: notification.read ? '#1e293b' : '#27374d'
              }}
              onClick={() => markAsRead(notification.id)}
            >
              <div style={styles.notificationHeader}>
                <div style={{ color: getTypeColor(notification.type) }}>
                  {getIcon(notification.type)}
                </div>
                <button
                  style={styles.deleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <h3 style={styles.notificationTitle}>{notification.title}</h3>
              <p style={styles.notificationMessage}>{notification.message}</p>

              {notification.location && (
                <div style={styles.notificationMeta}>
                  <span style={styles.metaItem}>📍 {notification.location}</span>
                  {notification.aqi && (
                    <span style={styles.metaItem}>AQI: {notification.aqi}</span>
                  )}
                </div>
              )}

              <div style={styles.notificationFooter}>
                <span style={styles.timestamp}>{formatTimestamp(notification.timestamp)}</span>
                {!notification.read && <span style={styles.unreadDot}></span>}
              </div>
            </div>
          ))
        )}
      </div>

      {notificationsEnabled && (
        <div style={styles.settingsSection}>
          <h3 style={styles.settingsTitle}>Notification Preferences</h3>
          <div style={styles.settingItem}>
            <label style={styles.settingLabel}>
              <input type="checkbox" defaultChecked style={styles.checkbox} />
              Critical alerts (AQI {'>'} 300)
            </label>
          </div>
          <div style={styles.settingItem}>
            <label style={styles.settingLabel}>
              <input type="checkbox" defaultChecked style={styles.checkbox} />
              Significant changes (±20% in 1 hour)
            </label>
          </div>
          <div style={styles.settingItem}>
            <label style={styles.settingLabel}>
              <input type="checkbox" defaultChecked style={styles.checkbox} />
              Daily summaries
            </label>
          </div>
          <div style={styles.settingItem}>
            <label style={styles.settingLabel}>
              <input type="checkbox" style={styles.checkbox} />
              Forecast alerts
            </label>
          </div>
        </div>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    margin: 0
  },
  badge: {
    backgroundColor: '#ef4444',
    color: '#fff',
    borderRadius: '999px',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  toggleButton: {
    background: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '8px',
    padding: '0.5rem',
    color: '#6366f1',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  filters: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },
  filterButton: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },
  filterButtonActive: {
    background: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
    color: '#6366f1'
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },
  actionButton: {
    background: 'transparent',
    border: 'none',
    color: '#6366f1',
    cursor: 'pointer',
    fontSize: '0.875rem',
    textDecoration: 'underline'
  },
  notificationsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    marginBottom: '2rem'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    color: '#6b7280'
  },
  emptyText: {
    marginTop: '1rem',
    fontSize: '1rem'
  },
  notificationCard: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '1rem',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    ':hover': {
      transform: 'translateX(4px)'
    }
  },
  notificationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  deleteButton: {
    background: 'transparent',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center'
  },
  notificationTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    margin: 0
  },
  notificationMessage: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    marginBottom: '0.75rem',
    margin: 0
  },
  notificationMeta: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '0.5rem',
    fontSize: '0.75rem',
    color: '#6b7280'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  notificationFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.5rem'
  },
  timestamp: {
    fontSize: '0.75rem',
    color: '#6b7280'
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#6366f1'
  },
  settingsSection: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginTop: '2rem'
  },
  settingsTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '1rem',
    margin: 0
  },
  settingItem: {
    marginBottom: '0.75rem'
  },
  settingLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#d1d5db',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  }
};

export default Notifications;
