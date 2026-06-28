import { create } from 'zustand';

// Initial Transformer Configuration with AI Risk baseline
const initialTransformers = [
  ...Array.from({length: 3}, (_, i) => ({ id: `TX-G${i+1}`, sector: 'Sector 1: Generation Core', role: 'Gen Node', cap: 150, load: 0, temp: 35, status: 'ONLINE', voltage: '345kV', cooling: 100, eff: 1, ai_risk: 0 })),
  ...Array.from({length: 3}, (_, i) => ({ id: `SUB-${i}`, sector: 'Sector 2: Heavy Transmission', role: 'Substation', cap: 250, load: 0, temp: 40, status: 'ONLINE', voltage: '500kV', cooling: 100, eff: 1, ai_risk: 0 })),
  ...Array.from({length: 3}, (_, i) => ({ id: `DT-I${i+1}`, sector: 'Sector 3: Industrial District', role: 'Industrial', cap: 150, load: 0, temp: 45, status: 'ONLINE', voltage: '13.8kV', cooling: 100, eff: 1, ai_risk: 0 })),
  ...Array.from({length: 3}, (_, i) => ({ id: `DT-C${i+1}`, sector: 'Sector 4: Commercial Hub', role: 'Commercial', cap: 100, load: 0, temp: 35, status: 'ONLINE', voltage: '4.16kV', cooling: 100, eff: 1, ai_risk: 0 })),
  ...Array.from({length: 3}, (_, i) => ({ id: `DT-R${i+1}`, sector: 'Sector 5: Residential Grid', role: 'Residential', cap: 80, load: 0, temp: 30, status: 'ONLINE', voltage: '240V', cooling: 100, eff: 1, ai_risk: 0 }))
];

const useStore = create((set, get) => ({
  // --- CORE STATE ---
  time: 0, 
  batteryLevel: 50, 
  demand: 500, 
  gridEfficiency: 1.0, 
  isBlackout: false,
  score: 0,
  history: [], 
  logs: ["Telemetry System Online...", "ML Engine Active..."], 
  weather: 'CLEAR',
  isManualWeather: false, 
  transformers: initialTransformers,
  settings: { isPaused: false, solarCapacity: 250, windCapacity: 200, speed: 1 },

  // --- LIFECYCLE ---
  loadGame: () => {
    // Add any localStorage loading logic here if needed
    get().addLog("Previous state loaded successfully.");
  },

  // --- BULLETPROOF UNIFIED STATE UPDATE ---
  updateState: (newData) => set((state) => {
    if (!newData) return state;

    const currentBattery = typeof newData.batteryLevel === 'number' && !isNaN(newData.batteryLevel) 
      ? newData.batteryLevel 
      : state.batteryLevel;
    
    const cleanBatteryValue = parseFloat(currentBattery.toFixed(1));
    const newHistory = [...state.history, { battery: cleanBatteryValue }].slice(-30);

    return { 
      ...state, 
      ...newData,
      batteryLevel: currentBattery, 
      history: newHistory 
    };
  }),

  // --- ML INFERENCE ENGINE ---
  runAIPredictions: () => set((state) => {
    const weatherPenalty = state.weather === 'HEATWAVE' ? 1.5 : (state.weather === 'STORM' ? 1.2 : 1.0);
    
    const analyzedTransformers = state.transformers.map(t => {
      const loadRatio = t.load / t.cap;
      const normalizedTemp = (t.temp - 30) / 70; 
      const efficiencyDrop = 1 - t.eff;

      const w1 = 4.5, w2 = 5.0, w3 = 2.5, bias = -4.0; 
      const z = (w1 * loadRatio) + (w2 * normalizedTemp) + (w3 * efficiencyDrop) + bias;
      const weatherAdjustedZ = z * weatherPenalty;
      const failureProbability = 1 / (1 + Math.exp(-weatherAdjustedZ));

      return { 
        ...t, 
        ai_risk: Math.max(0, Math.min(100, (failureProbability * 100))),
        status: failureProbability > 0.95 ? 'FAILED' : (failureProbability > 0.75 ? 'DEGRADED' : 'ONLINE')
      };
    });

    return { transformers: analyzedTransformers };
  }),

  // --- UI ACTIONS ---
  setWeather: (type, isManual = true) => {
    set({ weather: type, isManualWeather: isManual });
    get().runAIPredictions();
  },

  triggerWeatherEvent: (weather) => {
    set({ weather, isManualWeather: true });
    get().runAIPredictions();
  },

  addLog: (msg) => set((state) => ({ 
    logs: [`[${new Date().toLocaleTimeString()}] ${msg}`, ...state.logs].slice(0, 50) 
  })),

  manualOverride: (id, key, value) => {
    set((state) => ({
      transformers: state.transformers.map(t => 
        t.id === id ? { ...t, [key]: parseFloat(value) } : t
      )
    }));
    get().runAIPredictions(); 
  },

  repairSingleNode: (id) => {
    set((state) => ({
      transformers: state.transformers.map(t => 
        t.id === id ? { ...t, status: 'ONLINE', temp: 35, load: 0, eff: 1, ai_risk: 0 } : t
      )
    }));
    get().runAIPredictions();
  },

  stressTestGrid: () => {
    const stressed = get().transformers.map(t => ({ ...t, load: t.cap * 1.5 }));
    set({ transformers: stressed });
    get().addLog("CRITICAL ALERT: Stress Test Initiated.");
    get().runAIPredictions();
  },

  exportGridReport: () => {
    const state = get();
    const report = JSON.stringify(state.transformers, null, 2);
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grid-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  togglePause: () => set((state) => ({ 
    settings: { ...state.settings, isPaused: !state.settings.isPaused } 
  })),

  repairGrid: () => {
    set((state) => ({
      isBlackout: false,
      transformers: state.transformers.map(t => ({ 
        ...t, status: 'ONLINE', temp: 35, load: 0, eff: 1, ai_risk: 0 
      }))
    }));
    get().runAIPredictions();
  }
}));

export default useStore;