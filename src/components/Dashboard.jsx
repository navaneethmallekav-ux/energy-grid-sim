import useStore from '../engine/gameState';

const formatTime = (time) => {
  const hours = Math.floor(time);
  const minutes = Math.floor((time % 1) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export default function Dashboard() {
  const { time, batteryLevel, isBlackout, activeEvent } = useStore();

  return (
    <div style={{ padding: '20px', background: '#1e1e1e', color: 'white', borderRadius: '10px' }}>
      <h2 style={{ color: isBlackout ? '#ff4d4d' : '#4dff88' }}>
        {isBlackout ? '⚠️ BLACKOUT' : '✅ Power Stable'}
      </h2>
      <p>Time: {formatTime(time)}</p>
      <p>Battery: {batteryLevel.toFixed(1)}%</p>
      {activeEvent && <p style={{ color: 'orange' }}>Event: {activeEvent.name}</p>}
    </div>
  );
}