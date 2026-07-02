// src/components/MasterVisualizer.jsx

import React, { useRef, useState, useEffect, useMemo } from 'react';
import useStore from '../engine/gameState'; 
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Grid } from '@react-three/drei';

const LiveSparkline = ({ color, isDead }) => {
  const [offset, setOffset] = useState(0);
  
  useEffect(() => {
    if (isDead) return;
    let animationFrameId;
    const animate = () => {
      setOffset(prev => (prev + 1.5) % 100);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isDead]);

  if (isDead) {
    return (
      <div 
        style={{ 
          height: '20px', 
          width: '100%', 
          borderBottom: '2px solid #ff1a1a', 
          marginTop: '15px', 
          boxShadow: '0 5px 10px rgba(255,26,26,0.3)' 
        }} 
      />
    );
  }

  return (
    <svg 
      width="100%" 
      height="20" 
      viewBox="0 0 100 20" 
      preserveAspectRatio="none" 
      style={{ marginTop: '15px', filter: `drop-shadow(0px 0px 4px ${color})` }}
    >
      <path
        d={`M 0 10 Q 12.5 ${10 + Math.sin(offset * 0.2) * 8}, 25 10 T 50 10 T 75 10 T 100 10`}
        fill="transparent"
        stroke={color}
        strokeWidth="2"
        strokeDasharray="100"
        strokeDashoffset={-offset}
      />
    </svg>
  );
};

const IntegrityGauge = ({ efficiency }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (efficiency * circumference);
  const color = efficiency > 0.8 ? '#00f3ff' : efficiency > 0.4 ? '#ffb700' : '#ff1a1a';

  return (
    <div 
      className="integrity-gauge" 
      style={{ boxShadow: `0 0 15px ${color}40, inset 0 0 10px #000` }}
    >
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={radius} stroke="#111" strokeWidth="4" fill="none" />
        <circle 
          cx="30" cy="30" r={radius} 
          stroke={color} 
          strokeWidth="4" 
          fill="none" 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset}
          style={{ 
            transition: 'stroke-dashoffset 0.5s ease', 
            transform: 'rotate(-90deg)', 
            transformOrigin: '50% 50%', 
            filter: `drop-shadow(0 0 4px ${color})` 
          }}
        />
      </svg>
      <div className="gauge-text" style={{ color, textShadow: `0 0 5px ${color}` }}>
        {(efficiency * 100).toFixed(0)}%
      </div>
    </div>
  );
};

function HologramNode({ tx, position }) {
  const meshRef = useRef();
  const coreRef = useRef();
  const ringRef = useRef();
  const isBlackout = useStore((state) => state.isBlackout);
  const isDead = tx.status === 'FAILED' || isBlackout;
  const isShedding = tx.isShedding;

  let color = '#00f3ff'; 
  let glow = '#0088ff'; 
  if (tx.status === 'DEGRADED') { color = '#ffb700'; glow = '#cc5500'; }
  if (isShedding) { color = '#a300ff'; glow = '#5c00a3'; }
  if (isDead) { color = '#ff1a1a'; glow = '#550000'; }

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (isDead) {
      meshRef.current.position.x = position[0] + (Math.random() - 0.5) * 0.15;
      meshRef.current.position.z = position[2] + (Math.random() - 0.5) * 0.15;
    } else {
      meshRef.current.position.x = position[0];
      meshRef.current.position.z = position[2];
      meshRef.current.position.y = Math.sin(t * 2 + position[0]) * 0.15 + 0.5;
      
      meshRef.current.rotation.y = t * 0.4;
      if (coreRef.current) coreRef.current.rotation.x = t * 0.8;
      if (coreRef.current) coreRef.current.rotation.z = t * 0.5;
      if (ringRef.current) ringRef.current.rotation.z = -t * (isShedding ? 0.5 : 1.5);
    }
  });

  return (
    <group position={position}>
      <group ref={meshRef}>
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isDead ? 0.2 : 3} />
        </mesh>
        <mesh>
          <octahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isDead ? 0.5 : 1.5} wireframe={true} transparent opacity={0.8} />
        </mesh>
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0.2, 0]}>
          <torusGeometry args={[1.2, 0.02, 16, 64]} />
          <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={isDead ? 0 : 2} />
        </mesh>
      </group>
      {!isDead && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.5, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} />
        </mesh>
      )}
      <Text position={[0, 2.2, 0]} fontSize={0.3} color={color} anchorX="center" letterSpacing={0.1}>
        {tx.id}
      </Text>
    </group>
  );
}

function Sector3DView({ groupNodes }) {
  const isBlackout = useStore((state) => state.isBlackout);
  const gridColor = isBlackout ? '#ff1a1a' : '#ffffff'; 

  return (
    <div className="sector-3d-container">
      <Canvas camera={{ position: [0, 6, 12], fov: 45 }}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#ffffff" />
        <Grid infiniteGrid fadeDistance={25} sectionColor={gridColor} cellColor="#222222" sectionThickness={1.5} cellThickness={0.5} />
        {groupNodes.map((tx, i) => {
          const itemsPerRow = 4;
          const spacing = 3;
          const x = (i % itemsPerRow) * spacing - ((itemsPerRow * spacing) / 2) + (spacing / 2);
          const z = Math.floor(i / itemsPerRow) * spacing - 3; 
          
          return <HologramNode key={tx.id} tx={tx} position={[x, 0, z]} />;
        })}
        <OrbitControls autoRotate={!isBlackout} autoRotateSpeed={0.8} makeDefault />
      </Canvas>
    </div>
  );
}

export const HologramCore = ({ data }) => {
  const meshRef = useRef();
  const ringRef = useRef();
  
  const safeData = data || { load: 0, temp: 0, status: 'OFFLINE', cap: 100, isShedding: false };
  const intensity = useMemo(() => {
    return safeData.load / (safeData.cap || 1); 
  }, [safeData.load, safeData.cap]);

  const color = useMemo(() => {
    if (safeData.status === 'FAILED') return '#ff1a1a';
    if (safeData.isShedding) return '#a300ff';
    if (safeData.temp > 85) return '#ffb700';
    return '#00f3ff';
  }, [safeData.status, safeData.temp, safeData.isShedding]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const rotationSpeed = safeData.status === 'FAILED' ? 0.2 : (0.5 + intensity * 2);
      meshRef.current.rotation.y += delta * rotationSpeed;
    }
    if (ringRef.current) {
      const scaleBase = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      ringRef.current.scale.set(scaleBase, scaleBase, scaleBase);
      ringRef.current.rotation.z += delta * 0.5;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[1, 1, 3, 32]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={safeData.status === 'FAILED' ? 0.2 : (1 + intensity * 2)} 
          wireframe={safeData.status === 'OFFLINE'}
          transparent
          opacity={0.8}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
         <torusGeometry args={[2, 0.05, 16, 100]} />
         <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
    </group>
  );
};

export const DigitalTwin = ({ node }) => {
  if (!node) return null;

  return (
    <div className="digital-twin-container" style={{ width: '100%', height: '250px', background: '#020205', borderRadius: '8px', overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00f3ff" />
        <HologramCore data={node} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
};

export default function MasterVisualizer() {
  // NEW: Destructured audioEnabled and toggleAudio here
  const { transformers, gridGroups, isBlackout, weather, batteryLevel, gridEfficiency, shedLoad, audioEnabled, toggleAudio } = useStore();

  const getStatusColor = (status, isBlackout, isOverloaded, isShedding) => {
    if (isBlackout || status === 'FAILED') return '#ff1a1a'; 
    if (isShedding) return '#a300ff';
    if (isOverloaded) return '#ff1a1a'; 
    if (status === 'DEGRADED') return '#ffb700'; 
    return '#00f3ff'; 
  };

  const activeSectors = Object.keys(gridGroups).filter(key => gridGroups[key].length > 0);

  const renderSector = (sectorKey) => {
    const nodes = gridGroups[sectorKey] || [];
    if (nodes.length === 0) return null;

    const sectorName = nodes[0].sector || "UNKNOWN REGION";
    
    return (
      <div className="tier-section" key={sectorKey}>
        <div className="sector-header">
          <h3 className="neon-blue-heading">{sectorName}</h3>
          <div className="neon-blue-bar"></div>
          <span className="sector-node-count">{nodes.length} NODES ONLINE</span>
        </div>
        
        <Sector3DView groupNodes={nodes} />

        <div className="transformer-grid">
          {nodes.map(tx => {
            const loadRatio = tx.load / tx.cap;
            const isOverloaded = loadRatio > 0.9;
            const isDead = tx.status === 'FAILED' || isBlackout;
            const isShedding = tx.isShedding;
            const color = getStatusColor(tx.status, isBlackout, isOverloaded, isShedding);
            const timeToFailMsg = tx.timeToFailure > 0 ? `${tx.timeToFailure.toFixed(1)}s` : 'STABLE';
            const ttfColor = tx.timeToFailure > 0 && tx.timeToFailure < 30 ? '#ff1a1a' : '#fff';

            return (
              <div 
                key={tx.id} 
                className={`transformer-card ${isOverloaded && !isBlackout && !isShedding ? 'pulse-danger' : ''} ${isDead ? 'glitch-card' : ''} ${isShedding ? 'shedding-card' : ''}`}
                style={{ 
                  '--theme-color': color,
                  borderColor: isDead ? '#ff1a1a' : color,
                  background: isDead ? 'rgba(255, 26, 26, 0.08)' : (isShedding ? 'rgba(163, 0, 255, 0.08)' : 'rgba(10, 10, 15, 0.7)'),
                  boxShadow: isDead ? 'inset 0 0 30px rgba(255,26,26,0.15)' : `inset 0 0 25px ${color}20, 0 8px 32px rgba(0,0,0,0.8)`
                }}
              >
                <div className="card-header" style={{ borderBottomColor: `${color}50` }}>
                  <div>
                    <span className="tx-id" style={{ color: color, textShadow: `0 0 10px ${color}` }}>{tx.id}</span>
                    <div className="tx-role">{tx.role}</div>
                  </div>
                  <div className="status-badge" style={{ background: isDead ? 'transparent' : `${color}20`, color: isDead ? '#ff1a1a' : color, border: `1px solid ${color}`, boxShadow: isDead ? 'none' : `0 0 15px ${color}40` }}>
                    {isBlackout ? 'OFFLINE' : (isShedding ? 'SHEDDING' : tx.status)}
                  </div>
                </div>
                
                <div className="telemetry-grid">
                  <div className="data-col">
                    <span className="label">LOAD</span> 
                    <span className="value" style={{ color: isOverloaded ? '#ff1a1a' : '#fff' }}>
                      {tx.load.toFixed(1)} <span className="unit">MW</span>
                    </span>
                  </div>
                  <div className="data-col">
                    <span className="label">CAP</span> 
                    <span className="value">{tx.cap} <span className="unit">MW</span></span>
                  </div>
                  <div className="data-col">
                    <span className="label">TEMP</span> 
                    <span className="value" style={{ color: tx.temp > 90 ? '#ffb700' : '#00f3ff' }}>
                      {tx.temp.toFixed(1)} <span className="unit">°C</span>
                    </span>
                  </div>
                  <div className="data-col">
                    <span className="label">COOLING</span> 
                    <span className="value" style={{ color: (tx.cooling || 100) < 60 ? '#ffb700' : '#fff' }}>
                      {(tx.cooling || 100).toFixed(0)} <span className="unit">%</span>
                    </span>
                  </div>
                  <div className="data-col">
                    <span className="label">VOLTAGE</span> 
                    <span className="value">{tx.voltage || 'N/A'}</span>
                  </div>
                  <div className="data-col">
                    <span className="label">T.T.F.</span> 
                    <span className="value" style={{ color: ttfColor }}>{timeToFailMsg}</span>
                  </div>
                </div>

                <div className="action-row" style={{ marginTop: '15px', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    className="load-shed-btn"
                    onClick={() => shedLoad(tx.id)}
                    disabled={isShedding || isDead || isBlackout}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: isShedding ? 'rgba(163,0,255,0.2)' : 'rgba(0,0,0,0.5)',
                      border: `1px solid ${isShedding ? '#a300ff' : color}`,
                      color: isShedding ? '#a300ff' : color,
                      cursor: (isShedding || isDead) ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 'bold',
                      letterSpacing: '2px',
                      borderRadius: '4px',
                      transition: 'all 0.3s'
                    }}
                  >
                    {isShedding ? 'ISOLATED' : 'LOAD SHED'}
                  </button>
                </div>

                <LiveSparkline color={color} isDead={isDead} />
                
                <div className="load-bar-container" style={{ borderColor: `${color}50`, background: '#000' }}>
                  <div 
                    className="load-bar-fill" 
                    style={{ width: `${Math.min(100, loadRatio * 100)}%`, background: color, boxShadow: `0 0 15px ${color}` }} 
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
    <div className="master-visualizer cyberpunk-theme">
      <div className="dynamic-black-bg"></div>
      <div className="crt-scanlines"></div>
      
      {weather === 'STORM' && <div className="weather-overlay storm-overlay" />}
      {weather === 'HEATWAVE' && <div className="weather-overlay heatwave-overlay" />}
      
      <div className="hud-content">
        <header className="hud-header">
          <div className="hud-title">
            <div className="blinking-dot" style={{ background: isBlackout ? '#ff1a1a' : '#00f3ff' }} />
            <div>
              <h2 style={{ color: isBlackout ? '#ff1a1a' : '#00f3ff' }}>
                {isBlackout ? 'CRITICAL: TOTAL GRID COLLAPSE' : 'GLOBAL TELEMETRY MATRIX'}
              </h2>
              <div className="hud-subtitle">SYS_VER 7.0 // ENCRYPTION ACTIVE // {transformers?.length || 0} NODES LINKED</div>
            </div>
          </div>
          <div className="hud-stats">
            {/* NEW: Audio Toggle Button placed cleanly in the HUD */}
            <button 
              className="audio-toggle-btn"
              onClick={toggleAudio}
            >
              {audioEnabled ? "🔊 SYS AUDIO: ON" : "🔇 SYS AUDIO: OFF"}
            </button>
            <IntegrityGauge efficiency={gridEfficiency || 1} />
            <div className="stat-group">
              <span className="stat-pill">ENV <strong>{weather}</strong></span>
              <span className="stat-pill">BATT <strong>{batteryLevel?.toFixed(1) || 0}%</strong></span>
            </div>
          </div>
        </header>
        
        <div className="network-topology">
          {activeSectors.map(renderSector)}
        </div>
      </div>

      <style>{`
        .cyberpunk-theme {
          position: relative;
          background: #000000;
          padding: 35px;
          min-height: 900px;
          color: #ffffff;
          font-family: 'Courier New', monospace;
          overflow-x: hidden;
        }
        .dynamic-black-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, #0a0a0a 0%, #000000 100%);
          z-index: 0;
        }
        .crt-scanlines {
          position: absolute;
          inset: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%);
          background-size: 100% 4px;
          opacity: 0.15;
          pointer-events: none;
          z-index: 10;
        }
        .hud-content {
          position: relative;
          z-index: 2;
        }
        .hud-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px double #00f3ff;
          padding-bottom: 20px;
          margin-bottom: 50px;
        }
        .hud-title {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .hud-title h2 {
          margin: 0;
          font-size: 24px;
          letter-spacing: 3px;
        }
        .hud-subtitle {
          font-size: 11px;
          color: #888888;
          margin-top: 5px;
          letter-spacing: 2px;
        }
        .blinking-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: blink 1s infinite alternate;
        }
        .hud-stats {
          display: flex;
          align-items: center;
          gap: 25px;
        }
        /* NEW CSS for Audio Button */
        .audio-toggle-btn {
          background: rgba(0, 243, 255, 0.1);
          border: 1px solid #00f3ff;
          color: #00f3ff;
          padding: 8px 16px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          letter-spacing: 2px;
          font-weight: bold;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 10px rgba(0, 243, 255, 0.2);
        }
        .audio-toggle-btn:hover {
          background: rgba(0, 243, 255, 0.3);
          box-shadow: 0 0 15px rgba(0, 243, 255, 0.6);
        }
        .integrity-gauge {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #050505;
        }
        .gauge-text {
          position: absolute;
          font-size: 11px;
          font-weight: bold;
        }
        .stat-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .stat-pill {
          background: rgba(0, 243, 255, 0.1);
          border: 1px solid rgba(0, 243, 255, 0.3);
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 11px;
          letter-spacing: 1px;
          color: #00f3ff;
          text-align: right;
        }
        .stat-pill strong {
          color: #ffffff;
          margin-left: 5px;
        }
        .network-topology {
          display: flex;
          flex-direction: column;
        }
        .tier-section {
          margin-bottom: 80px;
        }
        .sector-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
        }
        .neon-blue-heading {
          color: #00f3ff;
          text-transform: uppercase;
          letter-spacing: 5px;
          margin: 0;
          font-size: 18px;
        }
        .neon-blue-bar {
          flex-grow: 1;
          height: 3px;
          background: #00f3ff;
          box-shadow: 0 0 10px #00f3ff;
        }
        .sector-node-count {
          color: #00f3ff;
          font-size: 11px;
          letter-spacing: 3px;
        }
        .sector-3d-container {
          height: 260px;
          width: 100%;
          background: #050508;
          border: 1px solid rgba(0, 243, 255, 0.3);
          border-radius: 12px;
          margin-bottom: 35px;
          overflow: hidden;
          box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.9);
        }
        .transformer-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }
        .transformer-card {
          border: 1px solid;
          border-top: 5px solid var(--theme-color);
          border-radius: 10px;
          padding: 25px;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          position: relative;
          overflow: hidden;
        }
        .transformer-card:hover {
          transform: translateY(-5px);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 20px;
          padding-bottom: 15px;
        }
        .tx-id {
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 1px;
        }
        .tx-role {
          font-size: 10px;
          color: #666666;
          margin-top: 3px;
          text-transform: uppercase;
        }
        .status-badge {
          font-size: 9px;
          padding: 3px 8px;
          border-radius: 3px;
          letter-spacing: 1px;
          font-weight: bold;
        }
        .telemetry-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px 20px;
        }
        .data-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .label {
          font-size: 9px;
          color: #00f3ff;
          letter-spacing: 1.5px;
          opacity: 0.7;
        }
        .value {
          font-size: 15px;
          font-weight: bold;
          color: #ffffff;
        }
        .unit {
          font-size: 10px;
          color: #666666;
          font-weight: normal;
          margin-left: 2px;
        }
        .load-bar-container {
          height: 6px;
          background: #000000;
          border-radius: 3px;
          margin-top: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          overflow: hidden;
        }
        .load-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease-out;
        }
        .weather-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          opacity: 0.08;
        }
        .storm-overlay {
          background: linear-gradient(45deg, #001133, #002244);
          animation: lightning 4s infinite alternate;
        }
        .heatwave-overlay {
          background: radial-gradient(circle, #331100 0%, transparent 70%);
          animation: shimmer 2s infinite linear;
        }
        @keyframes blink {
          0% { opacity: 0.3; }
          100% { opacity: 1; }
        }
        @keyframes lightning {
          0%, 95%, 98% { opacity: 0.05; }
          96%, 99% { opacity: 0.25; }
        }
        @keyframes shimmer {
          0% { transform: scale(1); opacity: 0.05; }
          50% { transform: scale(1.05); opacity: 0.12; }
          100% { transform: scale(1); opacity: 0.05; }
        }
        .pulse-danger {
          animation: pulseBorder 1.5s infinite alternate;
        }
        @keyframes pulseBorder {
          0% { border-color: rgba(255, 26, 26, 0.4); }
          100% { border-color: rgba(255, 26, 26, 1); box-shadow: 0 0 15px rgba(255,26,26,0.4); }
        }
        .glitch-card {
          animation: cardGlitch 0.3s steps(2) infinite;
        }
        @keyframes cardGlitch {
          0% { transform: translate(0, 0); skewX(0deg); }
          50% { transform: translate(-1px, 1px); skewX(-0.5deg); }
          100% { transform: translate(1px, -1px); skewX(0.5deg); }
        }
        .shedding-card {
          animation: cardShedding 2s infinite alternate;
        }
        @keyframes cardShedding {
          0% { box-shadow: inset 0 0 10px rgba(163,0,255,0.1); }
          100% { box-shadow: inset 0 0 30px rgba(163,0,255,0.4); }
        }
        .load-shed-btn:hover:not(:disabled) {
          background: rgba(0,243,255,0.2) !important;
          box-shadow: 0 0 15px currentColor;
        }
      `}</style>
    </div>
  );
}