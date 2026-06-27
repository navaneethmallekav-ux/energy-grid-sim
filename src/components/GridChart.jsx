import { LineChart, Line, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import useStore from '../engine/gameState';

export default function GridChart() {
  const history = useStore((state) => state.history);

  return (
    <div style={{ 
      width: '100%', 
      height: '250px', 
      background: '#111116', 
      padding: '20px', 
      borderRadius: '8px', 
      border: '1px solid #1a1a26',
      boxSizing: 'border-box'
    }}>
      <h4 style={{ margin: '0 0 15px 0', color: '#666', fontFamily: 'monospace', letterSpacing: '1px' }}>
        HISTORICAL METRICS: BATTERY %
      </h4>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
          <YAxis domain={[0, 100]} stroke="#444" tick={{ fontFamily: 'monospace', fontSize: 10 }} />
          <Tooltip contentStyle={{ background: '#0a0a0f', border: '1px solid #334', color: '#fff', fontFamily: 'monospace' }} />
          <Line 
            type="monotone" 
            dataKey="battery" 
            stroke="#00ffcc" 
            strokeWidth={2} 
            dot={false} 
            isAnimationActive={false} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}