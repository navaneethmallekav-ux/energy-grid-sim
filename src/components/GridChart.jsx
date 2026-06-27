import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import useStore from '../engine/gameState';

export default function GridChart() {
  const history = useStore((state) => state.history);

  return (
    <div style={{ width: '100%', height: '200px', marginTop: '20px' }}>
      <ResponsiveContainer>
        <LineChart data={history}>
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="battery" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}