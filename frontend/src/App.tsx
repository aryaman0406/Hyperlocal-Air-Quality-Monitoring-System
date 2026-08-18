import { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import MapView from './components/MapView';
import Settings from './components/Settings';

function App() {
  const [activeView, setActiveView] = useState('dashboard');

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigateMap={() => setActiveView('map')} />;
      case 'map':
        return <MapView />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigateMap={() => setActiveView('map')} />;
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
      `}</style>
    </div>
  );
}

export default App;
