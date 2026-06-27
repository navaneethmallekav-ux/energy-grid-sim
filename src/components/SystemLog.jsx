import useStore from '../engine/gameState';

export default function SystemLog() {
  const logs = useStore((state) => state.logs);
  
  return (
    <div style={{ height: '200px', background: '#050505', color: '#00ff00', padding: '15px', fontFamily: 'monospace', fontSize: '13px', overflowY: 'auto', border: '1px solid #333', borderRadius: '8px' }}>
      <div style={{ borderBottom: '1px solid #333', paddingBottom: '5px', marginBottom: '10px', color: '#888' }}>TERMINAL OUTPUT</div>
      {logs.map((log, i) => (
        <div key={i} style={{ marginBottom: '4px' }}>{`> ${log}`}</div>
      ))}
    </div>
  );
}