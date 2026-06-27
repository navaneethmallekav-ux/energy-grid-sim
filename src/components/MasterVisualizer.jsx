import React, { useMemo, useEffect, useState, useRef } from 'react';
import useStore from '../engine/gameState'; 
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Grid, Environment, Float } from '@react-three/drei';

// =========================================================================
// 1. ADVANCED UI COMPONENTS (Sparklines & Gauges)
// =========================================================================

const LiveSparkline = ({ color, isDead }) => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (isDead) return;
    let frame = requestAnimationFrame(function animate() {
      setOffset(prev => (prev + 1) % 100);
      frame = requestAnimationFrame(animate);
    });
    return () => cancelAnimationFrame(frame);
  }, [isDead]);
  return (
    <svg width="100%" height="25" viewBox="0 0 100 25" preserveAspectRatio="none" style={{ marginTop: '10px' }}>
      <path d={`M 0 12.5 Q 25 ${isDead ? 12.5 : 12.5 + Math.sin(offset * 0.2) * 10}, 50 12.5 T 100 12.5`} fill="transparent" stroke={color} strokeWidth="2" strokeDasharray="4 2" style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
    </svg>
  );
};

const IntegrityGauge = ({ efficiency }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const color = efficiency > 0.8 ? '#00f3ff' : efficiency > 0.4 ? '#ffb700' : '#ff3333';
  return (
    <div className="integrity-gauge">
      <svg width="70" height="70" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r={radius} stroke="#111" strokeWidth="6" fill="none" />
        <circle cx="35" cy="35" r={radius} stroke={color} strokeWidth="6" fill="none" 
          strokeDasharray={circumference} strokeDashoffset={circumference - (efficiency * circumference)}
          style={{ transition: '0.8s', transform: 'rotate(-90deg)', transformOrigin: '50% 50%', filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
      <div className="gauge-text" style={{ color }}>{(efficiency * 100).toFixed(0)}%</div>
    </div>
  );
};

// =========================================================================
// 2. 3D INTERACTIVE HOLOGRAPHIC ENGINE
// =========================================================================

function HologramNode({ tx, repairNode }) {
  const mesh = useRef();
  const [hover, setHover] = useState(false);
  const color = tx.status === 'FAILED' ? '#ff3333' : (tx.status === 'DEGRADED' ? '#ffb700' : '#00f3ff');
  
  useFrame(({ clock }) => {
    mesh.current.rotation.y += hover ? 0.15 : 0.02;
    mesh.current.position.y = Math.sin(clock.elapsedTime * 2 + tx.id.length) * 0.15;
  });

  return (
    <group>
      <Float speed={2} floatIntensity={0.5}>
        <mesh ref={mesh} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)} onClick={() => repairNode(tx.id)}>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshStandardMaterial color={hover ? '#ffffff' : color} emissive={color} emissiveIntensity={hover ? 2 : 0.8} wireframe={tx.status === 'FAILED'} />
        </mesh>
      </Float>
      <Text position={[0, 1.4, 0]} fontSize={0.3} color="#ffffff" outlineWidth={0.05} outlineColor="#000">{tx.id}</Text>
    </group>
  );
}

function Sector3DView({ nodes, repairNode }) {
  return (
    <div className="sector-3d-container">
      <Canvas camera={{ position: [0, 4, 7], fov: 40 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} />
        <Environment preset="night" />
        <Grid infiniteGrid sectionColor="#00f3ff" cellColor="#0a0a1a" sectionThickness={1.5} />
        {nodes.map((tx, i) => <HologramNode key={tx.id} tx={tx} repairNode={repairNode} position={[(i - 1) * 2.5, 0, 0]} />)}
        <OrbitControls enableZoom={true} autoRotate autoRotateSpeed={1.0} maxPolarAngle={Math.PI / 2 - 0.1} />
      </Canvas>
    </div>
  );
}

// =========================================================================
// 3. MASTER VISUALIZER ASSEMBLY
// =========================================================================

export default function MasterVisualizer() {
  const { transformers, isBlackout, weather, batteryLevel, gridEfficiency, repairSingleNode, manualOverride, stressTestGrid, exportGridReport } = useStore();
  const sectors = ['Sector 1: Generation Core', 'Sector 2: Heavy Transmission', 'Sector 3: Industrial District', 'Sector 4: Commercial Hub', 'Sector 5: Residential Grid'];

  return (
    <div className="master-visualizer">
      <div className="space-bg"></div>
      <div className="crt-scanlines"></div>

      <div className="hud-content">
        <header className="hud-header">
          <div className="hud-title">
            <div className="blinking-dot" style={{ background: isBlackout ? '#ff3333' : '#00f3ff' }} />
            <div>
              <h2 style={{ color: isBlackout ? '#ff3333' : '#00f3ff' }}>{isBlackout ? 'CRITICAL: GRID COLLAPSE' : 'GLOBAL TELEMETRY MATRIX'}</h2>
              <div className="hud-subtitle">SYS_VER 5.2 // MANUAL OVERRIDE & 3D SIMULATION ACTIVE</div>
            </div>
          </div>
          <div className="mission-control">
             <button onClick={stressTestGrid} className="ctrl-btn stress">STRESS TEST</button>
             <button onClick={exportGridReport} className="ctrl-btn export">EXPORT JSON</button>
          </div>
          <div className="hud-stats">
            <IntegrityGauge efficiency={gridEfficiency || 1} />
            <div className="stat-group">
              <span className="stat-pill">ENV: {weather}</span>
              <span className="stat-pill">BATT: {batteryLevel?.toFixed(1)}%</span>
            </div>
          </div>
        </header>

        {sectors.map(sName => {
          const nodes = transformers.filter(t => t.sector === sName);
          return (
            <div className="tier-section" key={sName}>
              <div className="sector-header">
                <h3 className="neon-blue-heading">{sName}</h3>
                <div className="neon-blue-bar"></div>
              </div>
              
              <Sector3DView nodes={nodes} repairNode={repairSingleNode} />

              <div className="transformer-grid">
                {nodes.map(tx => {
                  const color = tx.status === 'FAILED' ? '#ff3333' : (tx.status === 'DEGRADED' ? '#ffb700' : '#00f3ff');
                  const isDead = tx.status === 'FAILED' || isBlackout;
                  return (
                    <div key={tx.id} className={`transformer-card ${tx.status === 'FAILED' ? 'pulse-alert' : ''} ${isDead ? 'glitch-card' : ''}`} style={{ '--theme-color': color }}>
                      <div className="card-header">
                        <span className="tx-id" style={{ color }}>{tx.id}</span>
                        <span className="badge" style={{ color }}>{tx.status}</span>
                      </div>
                      <div className="telemetry-grid">
                        <div className="data-col"><span className="label">LOAD (MW)</span>
                          <input type="number" defaultValue={tx.load.toFixed(1)} onBlur={(e) => manualOverride(tx.id, 'load', e.target.value)} />
                        </div>
                        <div className="data-col"><span className="label">EFF (%)</span>
                          <input type="number" defaultValue={(tx.eff * 100).toFixed(0)} onBlur={(e) => manualOverride(tx.id, 'eff', e.target.value / 100)} />
                        </div>
                      </div>
                      <LiveSparkline color={color} isDead={isDead} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      <style>{`
        .master-visualizer { position: relative; background: #020205; padding: 40px; color: #fff; font-family: 'Courier New', monospace; min-height: 1500px; overflow: hidden; }
        .space-bg { position: absolute; inset: 0; background: radial-gradient(at top, #0a0a1a, #000); }
        .crt-scanlines { position: absolute; inset: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%); background-size: 100% 4px; pointer-events: none; }
        .hud-content { position: relative; z-index: 2; max-width: 1400px; margin: auto; }
        .hud-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #00f3ff; padding-bottom: 30px; margin-bottom: 50px; }
        .hud-title h2 { margin: 0; font-size: 28px; letter-spacing: 5px; text-transform: uppercase; color: #00f3ff; text-shadow: 0 0 20px #00f3ff; }
        .hud-subtitle { font-size: 12px; color: #666; letter-spacing: 4px; margin-top: 10px; }
        .blinking-dot { width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 15px; animation: blink 1s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
        .stat-pill { border: 1px solid #00f3ff; padding: 8px 20px; border-radius: 4px; color: #00f3ff; letter-spacing: 2px; font-size: 14px; }
        .sector-header { display: flex; align-items: center; gap: 25px; margin-bottom: 25px; }
        .neon-blue-heading { font-size: 20px; color: #00f3ff; margin: 0; text-transform: uppercase; letter-spacing: 5px; }
        .neon-blue-bar { flex-grow: 1; height: 2px; background: linear-gradient(90deg, #00f3ff, transparent); box-shadow: 0 0 10px #00f3ff; }
        .sector-3d-container { height: 250px; border: 1px solid #00f3ff; border-radius: 12px; background: rgba(0,0,0,0.5); margin-bottom: 30px; }
        .transformer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 25px; margin-bottom: 60px; }
        .transformer-card { border: 1px solid var(--theme-color); border-top: 5px solid var(--theme-color); padding: 25px; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); }
        .card-header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 15px; }
        .tx-id { font-weight: bold; font-size: 22px; }
        .badge { font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .telemetry-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .data-col { display: flex; flex-direction: column; }
        .label { font-size: 10px; color: #666; margin-bottom: 5px; }
        .value { font-size: 16px; font-weight: bold; color: #fff; }
        input { background: #000; border: 1px solid #333; color: #00f3ff; width: 100%; padding: 5px; margin-top: 5px; }
        .ctrl-btn { background: transparent; border: 1px solid #00f3ff; color: #00f3ff; padding: 8px 15px; cursor: pointer; }
        .pulse-alert { animation: pulse 1s infinite alternate; }
        @keyframes pulse { from { opacity: 1; } to { opacity: 0.5; } }
      `}</style>
    </div>
  );
}