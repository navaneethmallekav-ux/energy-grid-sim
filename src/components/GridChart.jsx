import { LineChart, Line, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import useStore from '../engine/gameState';

export default function GridChart() {
  const history = useStore((state) => state.history);

  return (
    <div style={{ width: '100%', height: '250px', background: '#1e1e1e', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
      <h4 style={{ margin: '0 0 15px 0', color: '#aaa' }}>Battery History</h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <YAxis domain={[0, 100]} stroke="#666" />
          <Tooltip contentStyle={{ background: '#333', border: 'none', color: '#fff' }} />
          <Line type="monotone" dataKey="battery" stroke="#00ccff" strokeWidth={3} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}