import useStore from '../engine/gameState';

export default function MasterVisualizer() {
  const { batteryLevel, isBlackout, gridEfficiency } = useStore();
  
  // Create an array of "sparks" if the grid is broken or stressed
  const isStressed = gridEfficiency < 0.8;
  const particles = Array.from({ length: isBlackout ? 30 : isStressed ? 10 : 0 });

  return (
    <div style={{ position: 'relative', height: '120px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', padding: '15px', marginBottom: '20px' }}>
      <h3 style={{ margin: '0 0 10px 0', color: isBlackout ? '#ff4d4d' : '#4dff88' }}>
        {isBlackout ? 'SYSTEM FAILURE - BLACKOUT' : 'GRID ONLINE'}
      </h3>
      
      {/* Energy Flow Bar */}
      <div style={{ width: '100%', height: '20px', background: '#222', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ 
          width: `${batteryLevel}%`, 
          height: '100%', 
          background: isBlackout ? '#ff0000' : (isStressed ? '#ffaa00' : '#00ff00'),
          transition: 'width 0.2s linear' 
        }} />
      </div>

      {/* Particle Break Animations */}
      {particles.map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: '4px', height: '4px', background: isBlackout ? 'red' : 'orange',
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `explode ${Math.random() * 1 + 0.5}s infinite`
        }} />
      ))}
      <style>{`@keyframes explode { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(5); opacity: 0; } }`}</style>
    </div>
  );
}