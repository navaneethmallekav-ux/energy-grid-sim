import React from 'react';
import { LineChart, Line, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import useStore from '../engine/gameState';

export default function GridChart() {
  const history = useStore((state) => state.history || []);

  return (
    <div style={{ 
      width: '100%', 
      height: '300px', 
      background: 'rgba(0, 0, 0, 0.7)', 
      padding: '20px', 
      borderRadius: '8px', 
      border: '1px solid #333',
      borderTop: '4px solid #00f3ff',
      boxSizing: 'border-box', // CRITICAL: Forces padding to be included in width
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h4 style={{ 
        margin: '0 0 15px 0', 
        color: '#00f3ff', 
        fontSize: '14px', 
        textTransform: 'uppercase', 
        letterSpacing: '2px' 
      }}>
        Battery Telemetry History
      </h4>
      
      {/* 
         Wrapper with a fixed block display. 
         ResponsiveContainer will now respect this parent exactly.
      */}
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <YAxis domain={[0, 100]} stroke="#666" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#000', border: '1px solid #00f3ff' }} />
            <Line type="monotone" dataKey="battery" stroke="#00f3ff" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}