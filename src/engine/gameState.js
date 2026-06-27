import { create } from 'zustand';

const initialTransformers = [
  // GENERATION (Step-Up)
  { id: 'TX-G1', zone: 'Solar A', type: 'STEP-UP', load: 0, cap: 120, temp: 35, eff: 1.0, status: 'ONLINE' },
  { id: 'TX-G2', zone: 'Solar B', type: 'STEP-UP', load: 0, cap: 120, temp: 35, eff: 1.0, status: 'ONLINE' },
  { id: 'TX-G3', zone: 'Wind Farm', type: 'STEP-UP', load: 0, cap: 200, temp: 35, eff: 1.0, status: 'ONLINE' },
  
  // TRANSMISSION (Substations)
  { id: 'SUB-N', zone: 'North Hub', type: 'TRANSMISSION', load: 0, cap: 250, temp: 40, eff: 1.0, status: 'ONLINE' },
  { id: 'SUB-S', zone: 'South Hub', type: 'TRANSMISSION', load: 0, cap: 250, temp: 40, eff: 1.0, status: 'ONLINE' },
  { id: 'SUB-E', zone: 'East Hub', type: 'TRANSMISSION', load: 0, cap: 250, temp: 40, eff: 1.0, status: 'ONLINE' },
  { id: 'SUB-W', zone: 'West Hub', type: 'TRANSMISSION', load: 0, cap: 250, temp: 40, eff: 1.0, status: 'ONLINE' },

  // DISTRIBUTION (City Sectors)
  { id: 'DT-R1', zone: 'Res-North', type: 'DISTRIBUTION', load: 0, cap: 80, temp: 30, eff: 1.0, status: 'ONLINE' },
  { id: 'DT-R2', zone: 'Res-South', type: 'DISTRIBUTION', load: 0, cap: 80, temp: 30, eff: 1.0, status: 'ONLINE' },
  { id: 'DT-C1', zone: 'Comm-Center', type: 'DISTRIBUTION', load: 0, cap: 100, temp: 30, eff: 1.0, status: 'ONLINE' },
  { id: 'DT-I1', zone: 'Heavy Ind.', type: 'DISTRIBUTION', load: 0, cap: 150, temp: 30, eff: 1.0, status: 'ONLINE' },
  { id: 'DT-M1', zone: 'Medical', type: 'DISTRIBUTION', load: 0, cap: 50, temp: 30, eff: 1.0, status: 'ONLINE' },
  { id: 'DT-T1', zone: 'Transit', type: 'DISTRIBUTION', load: 0, cap: 70, temp: 30, eff: 1.0, status: 'ONLINE' },
  { id: 'DT-S1', zone: 'Server Farm', type: 'DISTRIBUTION', load: 0, cap: 120, temp: 30, eff: 1.0, status: 'ONLINE' },
  { id: 'DT-A1', zone: 'Agri-Dome', type: 'DISTRIBUTION', load: 0, cap: 60, temp: 30, eff: 1.0, status: 'ONLINE' }
];

const useStore = create((set, get) => ({
  time: 0,
  batteryLevel: 50,
  demand: 450,
  gridEfficiency: 1.0, // Now an average of all transformers
  isBlackout: false,
  score: 0,
  history: [],
  logs: ["Telemetry Engine v4.0 Initialized..."],
  weather: 'CLEAR', 
  transformers: JSON.parse(JSON.stringify(initialTransformers)),
  
  settings: {
    speed: 1,
    isPaused: false,
    solarCapacity: 220,
    windCapacity: 180,
  },

  addLog: (msg) => set((state) => ({ logs: [`[${state.time.toFixed(1)}h] ${msg}`, ...state.logs].slice(0, 20) })),

  updateState: (newData) => set((state) => {
    const newHistory = [...state.history, { time: state.time, battery: state.batteryLevel }].slice(-60);
    return { ...state, ...newData, history: newHistory };
  }),

  triggerWeatherEvent: (weatherType) => set((state) => {
    state.addLog(`⚠️ ENV OVERRIDE: ${weatherType} detected!`);
    return { weather: weatherType };
  }),

  upgradeInfrastructure: (type) => set((state) => {
    state.addLog(`Upgraded ${type} Capacity.`);
    return { settings: { ...state.settings, [type]: state.settings[type] * 1.2 } };
  }),

  repairGrid: () => set((state) => {
    state.addLog("Drone swarm dispatched. All transformers repaired.");
    const fixedTransformers = state.transformers.map(t => ({ ...t, eff: 1.0, temp: 35, status: 'ONLINE' }));
    return { transformers: fixedTransformers, gridEfficiency: 1.0 };
  }),

  togglePause: () => set((state) => ({ settings: { ...state.settings, isPaused: !state.settings.isPaused } })),
  saveGame: () => localStorage.setItem('grid-save', JSON.stringify(get())),
  loadGame: () => { const saved = localStorage.getItem('grid-save'); if (saved) set(JSON.parse(saved)); }
}));

export default useStore;