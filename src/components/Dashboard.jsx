import React from 'react';
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
  const score = useStore((state) => state.score);
  const settings = useStore((state) => state.settings);

  const statItemStyle = {
    padding: '15px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid #1a1a2e',
    borderRadius: '4px'
  };

  // Reusable style for the glowing white labels
  const neonWhiteLabelStyle = {
    color: '#ffffff',
    fontSize: '11px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    textShadow: '0 0 6px #ffffff, 0 0 12px rgba(255, 255, 255, 0.8)',
    fontWeight: '900'
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 1fr', 
      gap: '15px', 
      background: '#0a0a0f', 
      padding: '20px', 
      borderRadius: '8px',
      border: '1px solid #1a1a2e'
    }}>
      <div style={statItemStyle}>
        <div style={neonWhiteLabelStyle}>Sys Time</div>
        <h2 style={{ margin: '5px 0 0 0', color: '#fff', fontSize: '24px' }}>{formatTime(time ?? 0)}</h2>
      </div>

      <div style={statItemStyle}>
        <div style={neonWhiteLabelStyle}>Grid Score</div>
        <h2 style={{ margin: '5px 0 0 0', color: '#00f3ff', fontSize: '24px' }}>{Math.floor(score ?? 0)}</h2>
      </div>

      <div style={statItemStyle}>
        <div style={neonWhiteLabelStyle}>Battery / Load</div>
        <div style={{ marginTop: '5px', color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>
          {(batteryLevel ?? 0).toFixed(1)}% <span style={{ color: '#444' }}>/</span> {(demand ?? 0).toFixed(0)} MW
        </div>
      </div>

      <div style={statItemStyle}>
        <div style={neonWhiteLabelStyle}>Grid Health</div>
        <div style={{ 
          marginTop: '5px', 
          color: (gridEfficiency ?? 1) < 0.5 ? '#ff2a2a' : '#00f3ff', 
          fontSize: '16px', 
          fontWeight: '900' 
        }}>
          {((gridEfficiency ?? 1) * 100).toFixed(0)}%
        </div>
      </div>

      <div style={{ 
        gridColumn: 'span 2', 
        padding: '10px 15px', 
        background: 'rgba(0, 243, 255, 0.05)', 
        borderRadius: '4px', 
        border: '1px solid #1a1a2e', 
        fontSize: '12px', 
        color: '#ffffff', // Changed from #888 to glowing white
        textShadow: '0 0 5px #ffffff, 0 0 10px rgba(255, 255, 255, 0.5)',
        fontWeight: 'bold'
      }}>
        <strong style={{ color: '#00f3ff', marginRight: '5px', textShadow: '0 0 8px #00f3ff' }}>CAPACITIES:</strong> 
        SOLAR ({settings?.solarCapacity?.toFixed(0) ?? 0}) | 
        WIND ({settings?.windCapacity?.toFixed(0) ?? 0})
      </div>
    </div>
  );
}