import useStore from '../engine/gameState';

export default function ControlPanel() {
  const { togglePause, upgradeInfrastructure, saveGame, settings } = useStore();

  return (
    <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
      <button onClick={togglePause}>
        {settings.isPaused ? 'Resume' : 'Pause'}
      </button>
      <button onClick={() => upgradeInfrastructure('solarCapacity')}>
        Upgrade Solar
      </button>
      <button onClick={saveGame}>
        Save Game
      </button>
    </div>
  );
}