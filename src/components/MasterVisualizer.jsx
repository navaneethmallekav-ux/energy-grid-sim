import React, { useMemo } from 'react';
import useStore from '../engine/gameState'; // Adjust path if needed

export default function MasterVisualizer() {
  const { transformers, isBlackout, weather, batteryLevel } = useStore();

  // Helper to generate the dynamic space particulate background
  const generateStars = (count) => {
    let shadow = '';
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * 2000);
      const y = Math.floor(Math.random() * 2000);
      shadow += `${x}px ${y}px #FFF${i % 2 === 0 ? 'a' : '5'}`;
      if (i < count - 1) shadow += ', ';
    }
    return shadow;
  };

  const starLayer1 = useMemo(() => generateStars(300), []);
  const starLayer2 = useMemo(() => generateStars(150), []);
  const starLayer3 = useMemo(() => generateStars(50), []);

  const getStatusColor = (status, isBlackout, isOverloaded) => {
    if (isBlackout) return '#330000'; // Dead grid
    if (isOverloaded) return '#ff003c'; // Neon Red / Danger
    if (status === 'ONLINE') return '#00f3ff'; // Neon Cyan
    if (status === 'DEGRADED') return '#ffb700'; // Cyberpunk Orange
    return '#ff003c'; // Default Offline
  };

  const renderTransformerList = (typeTitle, filterType) => {
    const nodes = transformers?.filter(t => t.type === filterType) || [];
    
    return (
      <div className="tier-section">
        <h4 className="tier-title">{typeTitle}</h4>
        
        <div className="transformer-grid">
          {nodes.map(tx => {
            const loadRatio = tx.load / tx.cap;
            const isOverloaded = loadRatio > 0.9;
            const color = getStatusColor(tx.status, isBlackout, isOverloaded);
            const isWarning = tx.temp > 90 || isOverloaded;

            return (
              <div 
                key={tx.id} 
                className={`transformer-card ${isOverloaded && !isBlackout ? 'pulse-danger' : ''}`}
                style={{ 
                  '--theme-color': color,
                  opacity: isBlackout ? 0.4 : 1
                }}
              >
                {/* Header */}
                <div className="card-header">
                  <span className="tx-id">{tx.id}</span>
                  <div className="status-badge" style={{ background: color, color: isBlackout ? '#ff4d4d' : '#000' }}>
                    {isBlackout ? 'OFFLINE' : tx.status}
                  </div>
                </div>
                
                {/* Telemetry Data */}
                <div className="telemetry">
                  <div className="data-row">
                    <span className="label">LOAD</span> 
                    <span className="value" style={{ color: isOverloaded ? '#ff003c' : '#fff' }}>
                      {tx.load.toFixed(1)} <span className="unit">/ {tx.cap} MW</span>
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="label">TEMP</span> 
                    <span className="value" style={{ color: tx.temp > 90 ? '#ffb700' : '#00f3ff' }}>
                      {tx.temp.toFixed(1)} <span className="unit">°C</span>
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="label">EFF</span> 
                    <span className="value">
                      {(tx.eff * 100).toFixed(0)} <span className="unit">%</span>
                    </span>
                  </div>
                </div>

                {/* Cyberpunk Load Bar */}
                <div className="load-bar-container">
                  <div 
                    className="load-bar-fill" 
                    style={{ 
                      width: `${Math.min(100, loadRatio * 100)}%`, 
                      background: color,
                      boxShadow: `0 0 10px ${color}`
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="master-visualizer">
      {/* Dynamic Space Particulate Background */}
      <div className="space-bg">
        <div className="stars layer1" style={{ boxShadow: starLayer1 }}></div>
        <div className="stars layer2" style={{ boxShadow: starLayer2 }}></div>
        <div className="stars layer3" style={{ boxShadow: starLayer3 }}></div>
      </div>

      {/* Environmental Overlays */}
      {weather === 'STORM' && <div className="weather-overlay storm-overlay" />}
      {weather === 'HEATWAVE' && <div className="weather-overlay heatwave-overlay" />}

      {/* Main HUD Content */}
      <div className="hud-content">
        <header className="hud-header">
          <div className="hud-title">
            <div className="blinking-dot" style={{ background: isBlackout ? '#ff003c' : '#00f3ff' }} />
            <h2 style={{ color: isBlackout ? '#ff003c' : '#00f3ff' }}>
              {isBlackout ? 'CRITICAL: GRID COLLAPSE' : 'LIVE TELEMETRY: 15-NODE GRID'}
            </h2>
          </div>
          <div className="hud-stats">
            <span className="stat-pill env">
              ENV <strong style={{ color: weather !== 'CLEAR' ? '#ffb700' : '#00f3ff' }}>{weather}</strong>
            </span>
            <span className="stat-pill batt">
              BATT <strong>{batteryLevel?.toFixed(1) || 0}%</strong>
            </span>
          </div>
        </header>

        <div className="network-topology">
          {renderTransformerList('L1: GENERATION (STEP-UP)', 'STEP-UP')}
          {renderTransformerList('L2: TRANSMISSION (SUBSTATIONS)', 'TRANSMISSION')}
          {renderTransformerList('L3: DISTRIBUTION (CITY SECTORS)', 'DISTRIBUTION')}
        </div>
      </div>

      {/* Embedded Stylesheet for pure portability */}
      <style>{`
        .master-visualizer {
          position: relative;
          background: #020205;
          border: 1px solid #1a1a2e;
          border-radius: 12px;
          min-height: 800px;
          padding: 30px;
          overflow: hidden;
          font-family: 'Courier New', Courier, monospace; /* Sci-fi monospace vibe */
          color: #fff;
        }

        /* SPACE PARTICLES BACKGROUND */
        .space-bg {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 0;
          background: radial-gradient(ellipse at bottom, #0d0d1a 0%, #020205 100%);
          overflow: hidden;
        }
        .stars {
          background: transparent;
          border-radius: 50%;
        }
        .layer1 { width: 1px; height: 1px; animation: drift 100s linear infinite; }
        .layer2 { width: 2px; height: 2px; animation: drift 75s linear infinite; }
        .layer3 { width: 3px; height: 3px; animation: drift 50s linear infinite; }

        @keyframes drift {
          from { transform: translateY(0px) translateX(0px); }
          to { transform: translateY(-2000px) translateX(-500px); }
        }

        /* WEATHER OVERLAYS */
        .weather-overlay {
          position: absolute; inset: 0; pointer-events: none; z-index: 1;
        }
        .storm-overlay {
          background: repeating-linear-gradient(160deg, rgba(255,255,255,0.02) 0px, transparent 2px, transparent 10px);
          animation: rain 0.2s linear infinite;
        }
        .heatwave-overlay {
          background: radial-gradient(circle, rgba(255,100,0,0.1) 0%, transparent 70%);
          animation: heatpulse 4s infinite alternate;
        }
        @keyframes rain { 0% { background-position: 0% 0%; } 100% { background-position: 20px 100px; } }
        @keyframes heatpulse { 0% { opacity: 0.3; transform: scale(1); } 100% { opacity: 0.8; transform: scale(1.1); } }

        /* HUD LAYOUT */
        .hud-content {
          position: relative;
          z-index: 10;
        }
        
        .hud-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(0, 243, 255, 0.2);
        }

        .hud-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .hud-title h2 {
          margin: 0;
          font-size: 20px;
          letter-spacing: 2px;
          text-transform: uppercase;
          text-shadow: 0 0 10px currentColor;
        }

        .blinking-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          animation: blink 1.5s infinite;
        }

        @keyframes blink { 0%, 100% { opacity: 1; box-shadow: 0 0 8px currentColor; } 50% { opacity: 0.3; box-shadow: none; } }

        .hud-stats {
          display: flex;
          gap: 15px;
        }

        .stat-pill {
          background: rgba(20, 20, 40, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          letter-spacing: 1px;
          backdrop-filter: blur(4px);
        }

        /* TRANSFORMER SECTIONS */
        .tier-section {
          margin-bottom: 40px;
        }

        .tier-title {
          font-size: 12px;
          color: #a0a0b5;
          letter-spacing: 4px;
          margin-bottom: 15px;
          padding-left: 10px;
          border-left: 3px solid #444;
          text-transform: uppercase;
        }

        .transformer-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        /* INDIVIDUAL TRANSFORMER CARDS (GLASSMORPHISM) */
        .transformer-card {
          flex: 1 1 250px;
          background: rgba(10, 10, 20, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 2px solid var(--theme-color);
          border-radius: 8px;
          padding: 16px;
          position: relative;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.5);
        }

        .transformer-card:hover {
          transform: translateY(-2px);
          background: rgba(15, 15, 30, 0.6);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6), inset 0 0 30px rgba(0, 0, 0, 0.6);
        }

        .pulse-danger {
          animation: criticalPulse 2s infinite;
        }

        @keyframes criticalPulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 0, 60, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(255, 0, 60, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 0, 60, 0); }
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 10px;
        }

        .tx-id {
          font-weight: bold;
          font-size: 14px;
          color: var(--theme-color);
          text-shadow: 0 0 5px var(--theme-color);
          letter-spacing: 1px;
        }

        .status-badge {
          font-size: 10px;
          font-weight: 900;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 1px;
        }

        .telemetry {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 15px;
        }

        .data-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }

        .data-row .label {
          color: #6a6a85;
          letter-spacing: 1px;
        }

        .data-row .value {
          font-weight: bold;
        }

        .data-row .unit {
          color: #6a6a85;
          font-weight: normal;
          font-size: 10px;
        }

        /* CYBERPUNK LOAD BAR */
        .load-bar-container {
          width: 100%;
          height: 6px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 3px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .load-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}