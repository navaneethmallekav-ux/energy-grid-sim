import useStore from '../engine/gameState';

export default function ControlPanel() {
  const { togglePause, upgradeInfrastructure, repairGrid, saveGame, settings, gridEfficiency } = useStore();

  const btnStyle = { padding: '10px 15px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#1e1e1e', padding: '20px', borderRadius: '8px' }}>
      <button style={btnStyle} onClick={togglePause}>
        {settings.isPaused ? '▶ Resume' : '⏸ Pause'}
      </button>
      <button style={{...btnStyle, background: gridEfficiency < 1 ? '#cc5500' : '#333'}} onClick={repairGrid}>
        🔧 Repair Grid
      </button>
      <button style={btnStyle} onClick={() => upgradeInfrastructure('solarCapacity')}>
        ☀️ Upgrade Solar
      </button>
      <button style={btnStyle} onClick={() => upgradeInfrastructure('windCapacity')}>
        💨 Upgrade Wind
      </button>
      <button style={{...btnStyle, gridColumn: 'span 2', marginTop: '10px', background: '#444'}} onClick={saveGame}>
        💾 Save System State
      </button>
    </div>
  );
}