import { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import MapView from './components/MapView';
import Notifications from './components/Notifications';
import Settings from './components/Settings';

function App() {
  const [activeView, setActiveView] = useState('dashboard');

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'map':
        return <MapView />;
      case 'notifications':
        return <Notifications />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Navbar activeView={activeView} onViewChange={setActiveView} />
      <main>
        {renderView()}
      </main>

      <style>{`
        .app-container {
          display: flex;
          min-height: 100vh;
        }
        main {
          flex: 1;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
