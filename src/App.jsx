import React, { useEffect, useState } from 'react';
import useStore from './engine/gameState';
import { useTelemetrySocket } from './engine/useTelemetrySocket'; 
import omegaConfig from './config/omegaGrid.json'; 
import RiskAlert from './components/RiskAlert';
import MasterVisualizer from './components/MasterVisualizer';
import Dashboard from './components/Dashboard';
import SystemLog from './components/SystemLog';
import GridChart from './components/GridChart';
import ControlPanel from './components/ControlPanel';
import TransformerList from './components/TransformerList';
import GridAutopilot from './components/GridAutopilot';
import GeoNodeMap from './components/GeoNodeMap';

const getSocketUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost') {
    return 'ws://localhost:8080';
  }
  return 'wss://energy-grid-backend.onrender.com';
};

const globalContainerStyle = {
  background: '#000', 
  minHeight: '100vh', 
  padding: '30px', 
  color: '#fff', 
  fontFamily: '"Courier New", Courier, monospace',
  display: 'flex',
  flexDirection: 'column'
};

const mainContentStyle = {
  maxWidth: '1400px',
  width: '100%',
  margin: 'auto',
  flex: 1
};

const headerStyle = (color) => ({
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  borderBottom: `2px solid ${color}50`, 
  paddingBottom: '20px', 
  marginBottom: '35px',
  transition: 'border-color 0.3s ease'
});

const titleStyle = {
  color: '#00f3ff', 
  letterSpacing: '4px', 
  margin: '0 0 5px 0', 
  fontSize: '28px', 
  textShadow: '0 0 10px #00f3ff'
};

const statusContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  color: '#aaa',
  letterSpacing: '2px'
};

const navContainerStyle = {
  display: 'flex',
  gap: '20px'
};

const telemetryGridStyle = {
  display: 'grid', 
  gridTemplateColumns: '1fr 0.6fr', 
  gap: '30px',
  alignItems: 'start'
};

const flexColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '30px'
};

const visualizerContainerStyle = {
  width: '100%'
};

const horizontalControlStyle = {
  marginTop: '30px',
  maxWidth: '800px',
  margin: '30px auto 0'
};

export default function App() {
  const loadTopology = useStore((state) => state.loadTopology);
  
  const socketUrl = getSocketUrl();
  const uplinkStatus = useTelemetrySocket(socketUrl);
  
  const [activeTab, setActiveTab] = useState('TELEMETRY');

  useEffect(() => {
    const initializeTopology = () => {
      if (typeof loadTopology === 'function') {
        loadTopology(omegaConfig);
        console.log("Grid Blueprint Loaded. Handing control to SCADA Uplink...");
      }
    };
    initializeTopology();
  }, [loadTopology]);

  const getStatusColor = () => {
    if (uplinkStatus === 'CONNECTED') {
      return '#00f3ff';
    }
    if (uplinkStatus === 'RECONNECTING') {
      return '#ffb700';
    }
    return '#ff1a1a';
  };

  const statusColor = getStatusColor();

  const getNavBtnStyle = (tabName) => {
    const isActive = activeTab === tabName;
    return {
      padding: '12px 30px',
      background: isActive ? 'rgba(0, 243, 255, 0.15)' : 'rgba(0, 243, 255, 0.02)',
      color: isActive ? '#ffffff' : '#00f3ff', 
      border: `1px solid ${isActive ? '#00f3ff' : 'rgba(0, 243, 255, 0.4)'}`,
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      letterSpacing: '2px',
      transition: 'all 0.2s ease',
      boxShadow: isActive ? '0 0 10px rgba(0, 243, 255, 0.2)' : '0 0 6px rgba(0, 243, 255, 0.1)',
      textShadow: isActive ? '0 0 8px #ffffff' : '0 0 4px rgba(0, 243, 255, 0.4)'
    };
  };

  const getIndicatorStyle = () => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%', 
    background: statusColor, 
    boxShadow: `0 0 8px ${statusColor}`,
    animation: uplinkStatus === 'CONNECTED' ? 'blink 1.5s infinite' : 'none'
  });

  const getIndicatorTextStyle = () => ({
    color: statusColor,
    fontWeight: 'bold'
  });

  return (
    <div className="app-container" style={globalContainerStyle}>
      <RiskAlert />
      <GridAutopilot />

      <div style={mainContentStyle}>
        <header style={headerStyle(statusColor)}>
          <div>
            <h1 style={titleStyle}>
              GLOBAL GRID COMMAND
            </h1>
            <div style={statusContainerStyle}>
              <div style={getIndicatorStyle()} />
              <span style={getIndicatorTextStyle()}>
                UPLINK: {uplinkStatus}
              </span>
              <span> // SECTOR: OMEGA</span>
            </div>
          </div>
          
          <div style={navContainerStyle}>
            <button style={getNavBtnStyle('TELEMETRY')} onClick={() => setActiveTab('TELEMETRY')}>
              DATA TELEMETRY
            </button>
            <button style={getNavBtnStyle('GRID')} onClick={() => setActiveTab('GRID')}>
              3D HOLOGRAPHICS
            </button>
            <button style={getNavBtnStyle('GEO')} onClick={() => setActiveTab('GEO')}>
              GEO TOPOLOGY
            </button>
          </div>
        </header>
        
        <main className="view-transition" style={{ width: '100%' }}>
          {activeTab === 'TELEMETRY' && (
            <div style={telemetryGridStyle}>
              <div style={flexColumnStyle}>
                <Dashboard />
                <TransformerList />
                <SystemLog />
              </div>
              <div style={flexColumnStyle}>
                <GridChart />
                <ControlPanel />
              </div>
            </div>
          )}
          {activeTab === 'GRID' && (
            <div style={visualizerContainerStyle}>
              <MasterVisualizer />
              <div style={horizontalControlStyle}>
                <ControlPanel layout="horizontal" />
              </div>
            </div>
          )}
          {activeTab === 'GEO' && (
            <div style={visualizerContainerStyle}>
              <GeoNodeMap />
            </div>
          )}
        </main>
      </div>

      <style>{`
      * { box-sizing: border-box; }
      
      .view-transition {
        animation: fadeSlideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        width: 100%;
      }
      
      @keyframes fadeSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }

      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: #0a0a0a; }
      ::-webkit-scrollbar-thumb { background: #00f3ff; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #fff; }
      
      .app-container {
        background: #020205 !important;
      }

      .dashboard-container, .system-log-container, .transformer-list-container, .control-panel, .node-card {
        border: 1px solid #00f3ff !important;
        background: rgba(0, 10, 15, 0.8) !important;
        box-shadow: 0 0 10px rgba(0, 243, 255, 0.3), inset 0 0 15px rgba(0, 243, 255, 0.1) !important;
        backdrop-filter: blur(10px);
      }

      .neon-title, h1, h3 {
        text-shadow: 0 0 10px #00f3ff, 0 0 20px #00f3ff !important;
        color: #ffffff !important; 
      }
      `}</style>
    </div>
  );
}