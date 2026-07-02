import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div className="glass-card" style={styles.card}>
            <p style={styles.kicker}>Application error</p>
            <h1 style={styles.title}>The dashboard could not render</h1>
            <p style={styles.message}>
              A client-side error stopped the UI from mounting. Refresh the page after
              confirming the backend API and WebSocket URLs are configured correctly.
            </p>
            {this.state.errorMessage && (
              <pre style={styles.error}>{this.state.errorMessage}</pre>
            )}
            <button type="button" onClick={this.handleReload} style={styles.button}>
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '2rem',
  },
  card: {
    maxWidth: '640px',
    width: '100%',
    textAlign: 'left',
  },
  kicker: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--accent-yellow)',
    marginBottom: '0.75rem',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '0.75rem',
  },
  message: {
    color: 'var(--text-muted)',
    lineHeight: 1.7,
    marginBottom: '1.25rem',
  },
  error: {
    padding: '1rem',
    borderRadius: '0.75rem',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fecaca',
    whiteSpace: 'pre-wrap',
    overflowX: 'auto',
    marginBottom: '1.25rem',
  },
  button: {
    padding: '0.75rem 1.25rem',
    borderRadius: '0.75rem',
    border: 'none',
    background: 'var(--primary)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default ErrorBoundary;
