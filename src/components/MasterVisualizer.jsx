import React, { useMemo, useEffect, useState, useRef } from 'react';
import useStore from '../engine/gameState'; 
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Grid, Environment } from '@react-three/drei';

// ==========================================
// 1. NEON TELEMETRY UI COMPONENTS
// ==========================================

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
    return <div style={{ height: '20px', width: '100%', borderBottom: '2px solid #ff1a1a', marginTop: '15px', boxShadow: '0 5px 10px rgba(255,26,26,0.3)' }} />;
  }

  return (
    <svg width="100%" height="20" viewBox="0 0 100 20" preserveAspectRatio="none" style={{ marginTop: '15px', filter: `drop-shadow(0px 0px 4px ${color})` }}>
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
    <div className="integrity-gauge" style={{ boxShadow: `0 0 15px ${color}40, inset 0 0 10px #000` }}>
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={radius} stroke="#111" strokeWidth="4" fill="none" />
        <circle 
          cx="30" cy="30" r={radius} 
          stroke={color} strokeWidth="4" fill="none" 
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease', transform: 'rotate(-90deg)', transformOrigin: '50% 50%', filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div className="gauge-text" style={{ color, textShadow: `0 0 5px ${color}` }}>
        {(efficiency * 100).toFixed(0)}%
      </div>
    </div>
  );
};

// ==========================================
// 2. 3D CYBERPUNK HOLOGRAPHIC ENGINE
// ==========================================

function HologramNode({ tx, position }) {
  const meshRef = useRef();
  const coreRef = useRef();
  const ringRef = useRef();
  const isBlackout = useStore((state) => state.isBlackout);
  const isDead = tx.status === 'FAILED' || isBlackout;

  // Piercing Neon Blue for active transformers
  let color = '#00f3ff'; 
  let glow = '#0088ff'; 
  if (tx.status === 'DEGRADED') { color = '#ffb700'; glow = '#cc5500'; }
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
      if (ringRef.current) ringRef.current.rotation.z = -t * 1.5;
    }
  });

  return (
    <group position={position}>
      <group ref={meshRef}>
        {/* Inner Solid Glowing Core */}
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isDead ? 0.2 : 3} />
        </mesh>

        {/* Outer Wireframe Shell */}
        <mesh>
          <octahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isDead ? 0.5 : 1.5} wireframe={true} transparent opacity={0.8} />
        </mesh>

        {/* Spinning Orbital Ring */}
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0.2, 0]}>
          <torusGeometry args={[1.2, 0.02, 16, 64]} />
          <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={isDead ? 0 : 2} />
        </mesh>
      </group>
      
      {/* Dynamic Ground Shadow/Glow */}
      {!isDead && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.5, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} />
        </mesh>
      )}

      {/* Floating Node Label */}
      <Text position={[0, 2.2, 0]} fontSize={0.3} color={color} anchorX="center" letterSpacing={0.1}>
        {tx.id}
      </Text>
    </group>
  );
}

function Sector3DView({ nodes }) {
  const isBlackout = useStore((state) => state.isBlackout);
  // Default to stark white grid unless blackout occurs
  const gridColor = isBlackout ? '#ff1a1a' : '#ffffff'; 

  return (
    <div className="sector-3d-container">
      <Canvas camera={{ position: [0, 4, 10], fov: 45 }}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#ffffff" />
        <Environment preset="night" />
        
        {/* Stark White Grid on Dynamic Black */}
        <Grid 
          infiniteGrid 
          fadeDistance={25} 
          sectionColor={gridColor} 
          cellColor="#222222" // Dark gray for depth against the black background
          sectionThickness={1.5} 
          cellThickness={0.5} 
        />
        
        {/* Dynamic Centering */}
        {nodes.map((tx, i) => {
          const spacing = 3;
          const offset = (i - (nodes.length - 1) / 2) * spacing;
          return <HologramNode key={tx.id} tx={tx} position={[offset, 0, 0]} />;
        })}
        
        {/* Fully Interactive Controls */}
        <OrbitControls 
          enableZoom={true} 
          enablePan={true}
          minDistance={3}
          maxDistance={25}
          autoRotate={!isBlackout} 
          autoRotateSpeed={0.8} 
          maxPolarAngle={Math.PI / 2 - 0.05} 
          makeDefault 
        />
      </Canvas>
    </div>
  );
}

// ==========================================
// 3. MASTER VISUALIZER ASSEMBLY
// ==========================================

export default function MasterVisualizer() {
  const { transformers, isBlackout, weather, batteryLevel, gridEfficiency } = useStore();

  const getStatusColor = (status, isBlackout, isOverloaded) => {
    if (isBlackout || status === 'FAILED') return '#ff1a1a'; 
    if (isOverloaded) return '#ff1a1a'; 
    if (status === 'DEGRADED') return '#ffb700'; 
    return '#00f3ff'; 
  };

  const renderSector = (sectorName) => {
    const nodes = transformers?.filter(t => t.sector === sectorName) || [];
    if (nodes.length === 0) return null;
    
    return (
      <div className="tier-section" key={sectorName}>
        
        <div className="sector-header">
          <h3 className="neon-blue-heading">{sectorName}</h3>
          <div className="neon-blue-bar"></div>
          <span className="sector-node-count">{nodes.length} NODES ONLINE</span>
        </div>
        
        <Sector3DView nodes={nodes} />

        <div className="transformer-grid">
          {nodes.map(tx => {
            const loadRatio = tx.load / tx.cap;
            const isOverloaded = loadRatio > 0.9;
            const isDead = tx.status === 'FAILED' || isBlackout;
            const color = getStatusColor(tx.status, isBlackout, isOverloaded);

            return (
              <div 
                key={tx.id} 
                className={`transformer-card ${isOverloaded && !isBlackout ? 'pulse-danger' : ''} ${isDead ? 'glitch-card' : ''}`}
                style={{ 
                  '--theme-color': color,
                  borderColor: isDead ? '#ff1a1a' : color,
                  background: isDead ? 'rgba(255, 26, 26, 0.08)' : 'rgba(10, 10, 15, 0.7)',
                  boxShadow: isDead ? 'inset 0 0 30px rgba(255,26,26,0.15)' : `inset 0 0 25px ${color}20, 0 8px 32px rgba(0,0,0,0.8)`
                }}
              >
                <div className="card-header" style={{ borderBottomColor: `${color}50` }}>
                  <div>
                    <span className="tx-id" style={{ color: color, textShadow: `0 0 10px ${color}` }}>{tx.id}</span>
                    <div className="tx-role">{tx.role}</div>
                  </div>
                  <div className="status-badge" style={{ 
                    background: isDead ? 'transparent' : `${color}20`, 
                    color: isDead ? '#ff1a1a' : color, 
                    border: `1px solid ${color}`, 
                    boxShadow: isDead ? 'none' : `0 0 15px ${color}40` 
                  }}>
                    {isBlackout ? 'OFFLINE' : tx.status}
                  </div>
                </div>
                
                <div className="telemetry-grid">
                  <div className="data-col">
                    <span className="label">LOAD</span> 
                    <span className="value" style={{ color: isOverloaded ? '#ff1a1a' : '#fff', textShadow: isOverloaded ? '0 0 8px #ff1a1a' : 'none' }}>
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
                    <span className="label">EFF</span> 
                    <span className="value">{(tx.eff * 100).toFixed(0)} <span className="unit">%</span></span>
                  </div>
                </div>

                <LiveSparkline color={color} isDead={isDead} />

                <div className="load-bar-container" style={{ borderColor: `${color}50`, background: '#000' }}>
                  <div className="load-bar-fill" style={{ width: `${Math.min(100, loadRatio * 100)}%`, background: color, boxShadow: `0 0 15px ${color}` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const sectors = [
    'Sector 1: Generation Core',
    'Sector 2: Heavy Transmission',
    'Sector 3: Industrial District',
    'Sector 4: Commercial Hub',
    'Sector 5: Residential Grid'
  ];

  return (
    <div className="master-visualizer cyberpunk-theme">
      
      {/* Dynamic Black Background */}
      <div className="dynamic-black-bg"></div>
      <div className="crt-scanlines"></div>

      {weather === 'STORM' && <div className="weather-overlay storm-overlay" />}
      {weather === 'HEATWAVE' && <div className="weather-overlay heatwave-overlay" />}

      <div className="hud-content">
        <header className="hud-header">
          <div className="hud-title">
            <div className="blinking-dot" style={{ background: isBlackout ? '#ff1a1a' : '#00f3ff', boxShadow: `0 0 20px ${isBlackout ? '#ff1a1a' : '#00f3ff'}` }} />
            <div>
              <h2 style={{ color: isBlackout ? '#ff1a1a' : '#00f3ff', textShadow: `0 0 20px ${isBlackout ? '#ff1a1a' : '#00f3ff'}` }}>
                {isBlackout ? 'CRITICAL: TOTAL GRID COLLAPSE' : 'GLOBAL TELEMETRY MATRIX'}
              </h2>
              <div className="hud-subtitle">SYS_VER 7.0 // ENCRYPTION ACTIVE // {transformers?.length || 0} NODES LINKED</div>
            </div>
          </div>
          
          <div className="hud-stats">
            <IntegrityGauge efficiency={gridEfficiency || 1} />
            <div className="stat-group">
              <span className="stat-pill" style={{ borderColor: weather !== 'CLEAR' ? '#ffb700' : '#00f3ff', boxShadow: `inset 0 0 10px ${weather !== 'CLEAR' ? '#ffb700' : '#00f3ff'}30` }}>
                ENV <strong style={{ color: weather !== 'CLEAR' ? '#ffb700' : '#00f3ff', textShadow: `0 0 5px ${weather !== 'CLEAR' ? '#ffb700' : '#00f3ff'}` }}>{weather}</strong>
              </span>
              <span className="stat-pill" style={{ borderColor: batteryLevel < 20 ? '#ff1a1a' : '#00f3ff', boxShadow: `inset 0 0 10px ${batteryLevel < 20 ? '#ff1a1a' : '#00f3ff'}30` }}>
                BATT <strong style={{ color: batteryLevel < 20 ? '#ff1a1a' : '#fff', textShadow: batteryLevel < 20 ? '0 0 5px #ff1a1a' : 'none' }}>{batteryLevel?.toFixed(1) || 0}%</strong>
              </span>
            </div>
          </div>
        </header>

        <div className="network-topology">
          {sectors.map(renderSector)}
        </div>
      </div>

      <style>{`
  .cyberpunk-theme {
    position: relative; background: #000000; border: 1px solid #1a1a1a; border-radius: 16px;
    padding: 35px; font-family: 'Courier New', Courier, monospace; color: #fff;
    overflow: hidden; box-shadow: inset 0 0 80px rgba(0, 0, 0, 1), 0 10px 40px rgba(0,0,0,0.9); min-height: 900px;
  }

  .dynamic-black-bg { 
    position: absolute; inset: 0; z-index: 0; 
    background: radial-gradient(circle at center, #0a0a0a 0%, #000000 100%); 
    animation: pulseVoid 8s infinite alternate;
  }
  @keyframes pulseVoid { 0% { opacity: 0.8; } 100% { opacity: 1; } }

  .crt-scanlines { position: absolute; inset: 0; z-index: 999; pointer-events: none; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%); background-size: 100% 4px; opacity: 0.25; }

  .weather-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
  .storm-overlay { background: repeating-linear-gradient(160deg, rgba(255,255,255,0.03) 0px, transparent 2px, transparent 10px); animation: rain 0.2s linear infinite; }
  .heatwave-overlay { background: radial-gradient(circle, rgba(255,100,0,0.1) 0%, transparent 70%); animation: heatpulse 4s infinite alternate; }
  @keyframes rain { 0% { background-position: 0% 0%; } 100% { background-position: 20px 100px; } }
  @keyframes heatpulse { 0% { opacity: 0.3; transform: scale(1); } 100% { opacity: 0.8; transform: scale(1.1); } }

  .hud-content { position: relative; z-index: 10; }
  .hud-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; border-bottom: 2px solid rgba(0, 243, 255, 0.4); padding-bottom: 25px; box-shadow: 0 10px 20px -10px rgba(0,243,255,0.1); }
  .hud-title { display: flex; align-items: center; gap: 20px; }
  .hud-title h2 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; }
  .hud-subtitle { font-size: 12px; color: #00f3ff; letter-spacing: 3px; margin-top: 8px; text-shadow: 0 0 5px #00f3ff; }
  
  .blinking-dot { width: 16px; height: 16px; border-radius: 50%; animation: blink 1.2s infinite; }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }

  .hud-stats { display: flex; align-items: center; gap: 25px; }
  .stat-group { display: flex; flex-direction: column; gap: 12px; }
  .stat-pill { background: rgba(0, 0, 0, 0.8); border: 1px solid #00f3ff; padding: 8px 16px; border-radius: 6px; font-size: 13px; letter-spacing: 2px; backdrop-filter: blur(5px); color: #fff; }

  .integrity-gauge { position: relative; width: 60px; height: 60px; display: flex; justify-content: center; align-items: center; background: rgba(0, 0, 0, 0.8); border-radius: 50%; }
  .gauge-text { position: absolute; font-size: 13px; font-weight: 900; }

  .tier-section { margin-bottom: 80px; }
  
  .sector-header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
  .neon-blue-heading { font-size: 20px; font-weight: 800; color: #00f3ff; margin: 0; text-transform: uppercase; letter-spacing: 5px; text-shadow: 0 0 12px #00f3ff, 0 0 25px #00f3ff; }
  .neon-blue-bar { flex-grow: 1; height: 3px; background: #00f3ff; box-shadow: 0 0 20px #00f3ff; position: relative; }
  .neon-blue-bar::after { content: ''; position: absolute; right: 0; top: -4px; width: 10px; height: 10px; background: #00f3ff; border-radius: 50%; box-shadow: 0 0 15px #00f3ff, 0 0 30px #00f3ff; }
  .sector-node-count { font-size: 11px; color: #00f3ff; letter-spacing: 3px; font-weight: bold; text-shadow: 0 0 5px #00f3ff; }

  .sector-3d-container { height: 260px; width: 100%; background: #000000; border: 1px solid #00f3ff; border-radius: 12px; margin-bottom: 35px; overflow: hidden; position: relative; }
  .sector-3d-container::after { content: ''; position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 60px rgba(0,243,255,0.2); }

  .transformer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }

  .transformer-card { border: 1px solid; border-top: 5px solid var(--theme-color); border-radius: 10px; padding: 25px; backdrop-filter: blur(12px); transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
  .transformer-card:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 15px 30px rgba(0,0,0,0.9), inset 0 0 30px var(--theme-color) !important; }

  .pulse-danger { animation: criticalPulse 1.2s infinite; }
  @keyframes criticalPulse { 0% { box-shadow: 0 0 0 0 rgba(255, 26, 26, 0.5); } 70% { box-shadow: 0 0 0 20px rgba(255, 26, 26, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 26, 26, 0); } }

  .glitch-card { animation: glitchAnim 2.5s infinite; }
  @keyframes glitchAnim { 0%, 95%, 100% { transform: translate(0); } 96% { transform: translate(-3px, 3px); } 98% { transform: translate(3px, -3px); } }

  .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 15px; }
  .tx-id { font-weight: 900; font-size: 22px; letter-spacing: 3px; }
  .tx-role { font-size: 12px; color: #00f3ff; margin-top: 6px; letter-spacing: 2px; text-transform: uppercase; text-shadow: 0 0 5px #00f3ff; }
  .status-badge { font-size: 12px; font-weight: 900; padding: 5px 14px; border-radius: 4px; letter-spacing: 3px; }

  .telemetry-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .data-col { display: flex; flex-direction: column; }
  .data-col .label { font-size: 11px; color: #a0f0ff; letter-spacing: 2px; margin-bottom: 5px; font-weight: bold; }
  .data-col .value { font-size: 18px; font-weight: 900; color: #ffffff; text-shadow: 0 0 5px rgba(255,255,255,0.5); }
  .data-col .unit { font-size: 11px; color: #00f3ff; font-weight: normal; margin-left: 4px; }

  .load-bar-container { width: 100%; height: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); overflow: hidden; margin-top: 20px; }
  .load-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
`}</style>
    </div>
  );
}