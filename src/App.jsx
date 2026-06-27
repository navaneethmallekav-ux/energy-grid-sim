import { useEffect } from 'react';
import useStore from './engine/gameState';
import { startSimulation, stopSimulation } from './engine/simulationEngine';

// Import all your new UI Components
import MasterVisualizer from './components/MasterVisualizer';
import Dashboard from './components/Dashboard';
import SystemLog from './components/SystemLog';
import GridChart from './components/GridChart';
import ControlPanel from './components/ControlPanel';

export default function App() {
  // Pull the loadGame function from your store
  const loadGame = useStore((state) => state.loadGame);

  useEffect(() => {
    // 1. Load any saved state from localStorage on startup
    loadGame();
    
    // 2. Start the physics and failure loop
    startSimulation();
    
    // 3. Cleanup on shutdown
    return () => stopSimulation();
  }, [loadGame]);

  return (
    <div style={{ 
      background: '#0f0f11', 
      minHeight: '100vh', 
      padding: '40px', 
      color: '#ffffff', 
      fontFamily: 'sans-serif' 
    }}>
      
      <div style={{ maxWidth: '1000px', margin: 'auto' }}>
        
        {/* Header */}
        <h1 style={{ 
          borderBottom: '2px solid #333', 
          paddingBottom: '10px', 
          marginBottom: '30px',
          color: '#00ccff',
          letterSpacing: '2px'
        }}>
          GLOBAL GRID COMMAND SYSTEM
        </h1>
        
        {/* Main Grid Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '30px' 
        }}>
          
          {/* Left Column: Real-time Status & Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <MasterVisualizer />
            <Dashboard />
            <SystemLog />
          </div>

          {/* Right Column: Analytics & Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GridChart />
            <ControlPanel />
          </div>
          
        </div>

      </div>
    </div>
  );
}