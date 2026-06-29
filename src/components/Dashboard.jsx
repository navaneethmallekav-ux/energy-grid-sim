import React, { useState, useEffect } from 'react';
import useStore from '../engine/gameState';

const formatTime = (t) => {
  const h = Math.floor(t).toString().padStart(2, '0');
  const m = Math.floor((t % 1) * 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export default function Dashboard() {
  const time = useStore((state) => state.time);
  const batteryLevel = useStore((state) => state.batteryLevel);
  const demand = useStore((state) => state.demand);
  const gridEfficiency = useStore((state) => state.gridEfficiency);
  const gridScore = useStore((state) => state.gridScore);
  const settings = useStore((state) => state.settings);
  
  const weather = useStore((state) => state.weather);
  const isLiveMode = useStore((state) => state.isLiveMode);
  const transformers = useStore((state) => state.transformers);
  const isBlackout = useStore((state) => state.isBlackout);

  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setUptime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const getFormattedUptime = () => {
    const hours = Math.floor(uptime / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((uptime % 3600) / 60).toString().padStart(2, '0');
    const seconds = (uptime % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const healthColor = (gridEfficiency ?? 1) < 0.5 ? '#ff1a1a' : '#00f3ff';
  
  const activeNodeCount = transformers.filter((t) => t.status !== 'FAILED').length;
  const totalNodeCount = transformers.length || 0;
  
  const modeText = isLiveMode ? 'SCADA UPLINK' : 'LOCAL SIMULATOR';
  const modeColor = isLiveMode ? '#00ff00' : '#ffb700';

  return (
    <div className="dashboard-container">
      
      <div className="stat-item">
        <div className="neon-white-label">Sys Time</div>
        <h2 className="stat-value text-white">{formatTime(time ?? 0)}</h2>
      </div>

      <div className="stat-item">
        <div className="neon-white-label">Grid Score</div>
        <h2 className="stat-value text-cyan glow-cyan">{Math.floor(gridScore ?? 0)}</h2>
      </div>

      <div className="stat-item">
        <div className="neon-white-label">Battery / Load</div>
        <div className="stat-value-sm text-white">
          {(batteryLevel ?? 0).toFixed(1)}% <span className="separator">/</span> {(demand ?? 0).toFixed(0)} <span className="unit">MW</span>
        </div>
      </div>

      <div className="stat-item">
        <div className="neon-white-label">Grid Health</div>
        <div 
          className="stat-value-sm" 
          style={{ color: healthColor, textShadow: `0 0 10px ${healthColor}` }}
        >
          {((gridEfficiency ?? 1) * 100).toFixed(0)}%
        </div>
      </div>

      <div className="stat-item">
        <div className="neon-white-label">Active Nodes</div>
        <div className="stat-value-sm text-white">
          {activeNodeCount} <span className="separator">/</span> {totalNodeCount}
        </div>
      </div>

      <div className="stat-item">
        <div className="neon-white-label">Env Weather</div>
        <h2 className="stat-value text-cyan">{weather || 'UNKNOWN'}</h2>
      </div>

      <div className="stat-item">
        <div className="neon-white-label">Engine Mode</div>
        <div className="stat-value-sm" style={{ color: modeColor, textShadow: `0 0 8px ${modeColor}` }}>
          {modeText}
        </div>
      </div>

      <div className="stat-item">
        <div className="neon-white-label">Session Uptime</div>
        <h2 className="stat-value text-white">{getFormattedUptime()}</h2>
      </div>

      {isBlackout && (
        <div className="blackout-warning">
          CRITICAL: GRID BLACKOUT DETECTED
        </div>
      )}

      <div className="capacity-footer">
        <strong className="cap-highlight">CAPACITIES:</strong> 
        SOLAR ({settings?.solarCapacity?.toFixed(0) ?? 0}) <span className="separator">|</span> 
        WIND ({settings?.windCapacity?.toFixed(0) ?? 0})
      </div>

      <style>{`
        .dashboard-container {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 15px !important;
          background: #0a0a0f !important;
          padding: 20px !important;
          border-radius: 8px !important;
          border: 1px solid #1a1a2e !important;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.5) !important;
          border: 1px solid #00f3ff !important;
          box-shadow: 0 0 15px rgba(0, 243, 255, 0.2), inset 0 0 15px rgba(0, 243, 255, 0.1) !important;
        }

        .stat-item {
          padding: 15px !important;
          background: rgba(0, 0, 0, 0.4) !important;
          border: 1px solid #1a1a2e !important;
          border-radius: 6px !important;
          transition: all 0.3s ease !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
        }

        .stat-item:hover {
          border-color: rgba(0, 243, 255, 0.3) !important;
          box-shadow: inset 0 0 15px rgba(0, 243, 255, 0.05) !important;
        }

        .neon-white-label {
          color: #ffffff !important;
          font-size: 11px !important;
          letter-spacing: 2px !important;
          text-transform: uppercase !important;
          text-shadow: 0 0 6px #ffffff, 0 0 12px rgba(255, 255, 255, 0.8) !important;
          font-weight: 900 !important;
          margin-bottom: 5px !important;
          font-family: 'Courier New', Courier, monospace !important;
        }

        .stat-value {
          margin: 5px 0 0 0 !important;
          font-size: 24px !important;
          font-family: 'Courier New', Courier, monospace !important;
        }

        .stat-value-sm {
          margin-top: 5px !important;
          font-size: 16px !important;
          font-weight: 900 !important;
          font-family: 'Courier New', Courier, monospace !important;
        }

        .text-white { color: #ffffff !important; }
        .text-cyan { color: #00f3ff !important; }
        .glow-cyan { text-shadow: 0 0 10px #00f3ff !important; }

        .separator {
          color: #444 !important;
          margin: 0 4px !important;
          text-shadow: none !important;
        }

        .unit {
          font-size: 12px !important;
          color: #00f3ff !important;
          text-shadow: 0 0 5px #00f3ff !important;
        }

        .capacity-footer {
          grid-column: span 2 !important;
          padding: 12px 15px !important;
          background: rgba(0, 243, 255, 0.05) !important;
          border-radius: 4px !important;
          border: 1px solid #1a1a2e !important;
          font-size: 12px !important;
          color: #ffffff !important;
          text-shadow: 0 0 5px #ffffff, 0 0 10px rgba(255, 255, 255, 0.5) !important;
          font-weight: bold !important;
          font-family: 'Courier New', Courier, monospace !important;
          text-align: center !important;
        }

        .cap-highlight {
          color: #00f3ff !important;
          margin-right: 8px !important;
          text-shadow: 0 0 8px #00f3ff !important;
          letter-spacing: 1px !important;
        }

        .blackout-warning {
          grid-column: span 2 !important;
          padding: 15px !important;
          background: rgba(255, 26, 26, 0.1) !important;
          border: 1px solid #ff1a1a !important;
          color: #ff1a1a !important;
          text-align: center !important;
          font-weight: 900 !important;
          letter-spacing: 3px !important;
          animation: blackoutBlink 1s infinite !important;
        }

        @keyframes blackoutBlink {
          0%, 100% { opacity: 1; box-shadow: inset 0 0 20px rgba(255, 26, 26, 0.4); }
          50% { opacity: 0.6; box-shadow: inset 0 0 5px rgba(255, 26, 26, 0.1); }
        }
      `}</style>
    </div>
  );
}