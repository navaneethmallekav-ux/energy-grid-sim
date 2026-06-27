import useStore from '../engine/gameState';

const formatTime = (t) => {
  const h = Math.floor(t).toString().padStart(2, '0');
  const m = Math.floor((t % 1) * 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export default function Dashboard() {
  const { time, batteryLevel, demand, gridEfficiency, score, settings } = useStore();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#1e1e1e', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
      <div>
        <p style={{ margin: 0, color: '#aaa' }}>Time</p>
        <h2>{formatTime(time)}</h2>
      </div>
      <div>
        <p style={{ margin: 0, color: '#aaa' }}>Score</p>
        <h2 style={{ color: '#00ccff' }}>{Math.floor(score)}</h2>
      </div>
      <div>
        <p style={{ margin: 0, color: '#aaa' }}>Battery / Demand</p>
        <p><strong>{batteryLevel.toFixed(1)}%</strong> / {demand}MW</p>
      </div>
      <div>
        <p style={{ margin: 0, color: '#aaa' }}>Grid Health</p>
        <p style={{ color: gridEfficiency < 0.5 ? 'red' : 'white' }}>
          <strong>{(gridEfficiency * 100).toFixed(0)}%</strong>
        </p>
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <p style={{ margin: 0, color: '#aaa' }}>Capacities: Solar ({settings.solarCapacity.toFixed(0)}) | Wind ({settings.windCapacity.toFixed(0)})</p>
      </div>
    </div>
  );
}