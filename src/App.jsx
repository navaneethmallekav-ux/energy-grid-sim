import React, { useEffect, useState, useRef } from 'react';
import useStore from './engine/gameState';
import { startSimulation, stopSimulation } from './engine/simulationEngine';

// Components
import MasterVisualizer from './components/MasterVisualizer';
import Dashboard from './components/Dashboard';
import SystemLog from './components/SystemLog';
import GridChart from './components/GridChart';
import ControlPanel from './components/ControlPanel';
import TransformerList from './components/TransformerList';

export default function App() {
  const loadGame = useStore((state) => state.loadGame);
  const [activeTab, setActiveTab] = useState('TELEMETRY');
  const isSimRunning = useRef(false);

  useEffect(() => {
    if (typeof loadGame === 'function') loadGame();
    if (!isSimRunning.current) {
      startSimulation();
      isSimRunning.current = true;
    }
    return () => {
      stopSimulation();
      isSimRunning.current = false;
    };
  }, [loadGame]);

  const getNavBtnStyle = (tabName) => ({
    padding: '12px 30px',
    background: activeTab === tabName ? '#00f3ff' : '#0a0a0f',
    color: activeTab === tabName ? '#000' : '#00f3ff',
    border: `1px solid #00f3ff`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold', // Lowered from 900 to normal bold to reduce strain
    letterSpacing: '2px',
    transition: 'all 0.2s ease',
    boxShadow: activeTab === tabName ? '0 0 15px rgba(0, 243, 255, 0.4)' : 'none'
  });

  return (
    <div style={{ background: '#000', minHeight: '100vh', padding: '30px', color: '#fff', fontFamily: '"Courier New", monospace' }}>
      <div style={{ maxWidth: '1400px', margin: 'auto' }}>
        
        {/* --- HEADER --- */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(0, 243, 255, 0.3)', paddingBottom: '20px', marginBottom: '35px' }}>
          <div>
            <h1 style={{ color: '#00f3ff', letterSpacing: '4px', margin: 0, fontSize: '28px', textShadow: '0 0 10px #00f3ff' }}>GLOBAL GRID COMMAND</h1>
            <div style={{ fontSize: '12px', color: '#666', letterSpacing: '2px' }}>SECURE UPLINK ESTABLISHED // SECTOR: OMEGA</div>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button style={getNavBtnStyle('TELEMETRY')} onClick={() => setActiveTab('TELEMETRY')}>DATA TELEMETRY</button>
            <button style={getNavBtnStyle('GRID')} onClick={() => setActiveTab('GRID')}>3D HOLOGRAPHICS</button>
          </div>
        </header>
        
        {/* --- MAIN CONTENT --- */}
        <main className="view-transition">
          {activeTab === 'TELEMETRY' ? (
            <div style={{ display: 'flex', gap: '30px', alignItems: 'stretch' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <Dashboard />
                <TransformerList />
                <SystemLog />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <GridChart />
                <ControlPanel />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ width: '100%', height: '600px', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
                <MasterVisualizer />
              </div>
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <ControlPanel />
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        .view-transition { animation: fadeSlideUp 0.4s ease-out forwards; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}