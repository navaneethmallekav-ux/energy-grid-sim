import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Core Data
  time: 0,
  batteryLevel: 50,
  demand: 300,
  gridEfficiency: 1.0,
  isBlackout: false,
  score: 0,
  history: [],
  logs: ["System Initialized..."],
  
  // Infrastructure Settings
  settings: {
    speed: 1,
    isPaused: false,
    solarCapacity: 200,
    windCapacity: 150,
  },

  // Actions
  addLog: (msg) => set((state) => ({ 
    logs: [`[${state.time.toFixed(1)}h] ${msg}`, ...state.logs].slice(0, 15) 
  })),

  updateState: (newData) => set((state) => {
    // Only save history every so often to prevent lag
    const newHistory = [...state.history, { time: state.time, battery: state.batteryLevel }].slice(-60);
    const scoreGain = state.isBlackout ? 0 : 0.1;
    
    return { 
      ...state, 
      ...newData, 
      history: newHistory,
      score: state.score + scoreGain
    };
  }),

  upgradeInfrastructure: (type) => set((state) => {
    state.addLog(`Upgraded ${type} by 20%`);
    return { settings: { ...state.settings, [type]: state.settings[type] * 1.2 } };
  }),

  repairGrid: () => set((state) => {
    state.addLog("Maintenance crew repaired grid. Efficiency restored to 100%.");
    return { gridEfficiency: 1.0 };
  }),

  togglePause: () => set((state) => ({ 
    settings: { ...state.settings, isPaused: !state.settings.isPaused } 
  })),

  saveGame: () => {
    localStorage.setItem('grid-save', JSON.stringify(get()));
    get().addLog("Game saved manually.");
  },

  loadGame: () => {
    const saved = localStorage.getItem('grid-save');
    if (saved) set(JSON.parse(saved));
  }
}));

export default useStore;