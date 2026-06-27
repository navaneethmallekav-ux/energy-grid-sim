import useStore from '../store/useStore';

export default function ControlPanel() {
  // We pull the function from the store that handles state changes
  const modifyInfrastructure = useStore((state) => state.modifyInfrastructure);

  return (
    <div style={{ padding: '20px', border: '1px solid black', marginTop: '10px' }}>
      <h3>Infrastructure Controls</h3>
      <label>Battery Capacity (MW): </label>
      <input 
        type="range" 
        min="0" 
        max="1000" 
        onChange={(e) => modifyInfrastructure('batteryCapacity', parseInt(e.target.value))} 
      />
    </div>
  );
}