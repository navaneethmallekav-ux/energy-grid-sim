import useStore from '../engine/gameState';

export default function ControlPanel() {
  const { togglePause, upgradeInfrastructure, repairGrid, saveGame, settings, gridEfficiency } = useStore();

  const isDamaged = gridEfficiency < 1.0;

  // Base button styles
  const baseBtnStyle = {
    padding: '12px 16px',
    background: '#161622',
    color: '#fff',
    border: '1px solid #2d2d44',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: '1px',
    transition: 'all 0.2s ease',
    fontSize: '13px'
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 1fr', 
      gap: '12px', 
      background: '#111116', 
      padding: '20px', 
      borderRadius: '8px',
      border: '1px solid #1a1a26'
    }}>
      <button 
        style={{
          ...baseBtnStyle, 
          borderColor: settings.isPaused ? '#ffaa00' : '#2d2d44',
          color: settings.isPaused ? '#ffaa00' : '#fff'
        }} 
        onClick={togglePause}
      >
        {settings.isPaused ? '▶ RESUME ENGINE' : '⏸ PAUSE ENGINE'}
      </button>

      <button 
        style={{
          ...baseBtnStyle, 
          background: isDamaged ? '#3a1a1a' : '#161622',
          borderColor: isDamaged ? '#ff4d4d' : '#2d2d44',
          color: isDamaged ? '#ff4d4d' : '#888'
        }} 
        onClick={repairGrid}
        disabled={!isDamaged}
      >
        🔧 {isDamaged ? 'SYS_REPAIR (REQUIRED)' : 'SYS_HEALTH_NOMINAL'}
      </button>

      <button 
        style={baseBtnStyle} 
        onClick={() => upgradeInfrastructure('solarCapacity')}
        onMouseEnter={(e) => e.target.style.borderColor = '#00ffcc'}
        onMouseLeave={(e) => e.target.style.borderColor = '#2d2d44'}
      >
        ☀️ UPGRADE SOLAR ARRAY
      </button>

      <button 
        style={baseBtnStyle} 
        onClick={() => upgradeInfrastructure('windCapacity')}
        onMouseEnter={(e) => e.target.style.borderColor = '#0077ff'}
        onMouseLeave={(e) => e.target.style.borderColor = '#2d2d44'}
      >
        💨 UPGRADE WIND TURBINES
      </button>

      <button 
        style={{
          ...baseBtnStyle, 
          gridColumn: 'span 2', 
          marginTop: '8px', 
          background: '#00ccff', 
          color: '#000',
          borderColor: '#00ccff'
        }} 
        onClick={saveGame}
      >
        💾 COMMIT MEMORY TO STORAGE (SAVE)
      </button>
    </div>
  );
}