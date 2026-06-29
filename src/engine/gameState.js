import { create } from 'zustand';

const buildGridFromConfig = (config) => {
  return config.nodes.map(node => ({
    id: node.id,
    sector: node.sector,
    role: node.type === 'generator' ? 'Gen Node' : node.type === 'substation' ? 'Substation' : 'Consumer',
    cap: node.capacity || 250,
    connections: node.connections || [],
    voltage: node.voltage || 'Unknown',
    load: 0,
    temp: 35,
    status: 'ONLINE',
    cooling: 100,
    eff: 1,
    risk: 0 
  }));
};

const calculateRisk = (node, prevNode) => {
  const tempRisk = Math.max(0, (node.temp - 80) * 2);
  const loadRisk = Math.pow(node.load / node.cap, 3) * 20;
  let risk = tempRisk + loadRisk;
  if (prevNode) {
    const delta = node.temp - prevNode.temp;
    if (delta > 2) risk += 20; 
  }
  return Math.min(100, Math.max(0, risk));
};

const calculatePhysicsTick = (transformers, weather, baseDemand) => {
  const activeNodesCount = transformers.filter(t => t.status !== 'FAILED').length;
  let totalEfficiency = 0;
  let generatedPower = 0;
  const heatMultiplier = weather === 'HEATWAVE' ? 1.5 : 1.0;
  const coolingPenalty = weather === 'STORM' ? 0.8 : 1.0;
  const loadPerActiveNode = activeNodesCount > 0 ? (baseDemand / activeNodesCount) : 0;
  const updatedNodes = transformers.map(node => {
    if (node.status === 'FAILED') return { ...node, load: 0, eff: 0, temp: 0, risk: 0 }; 
    const simulatedLoad = loadPerActiveNode * (Math.random() * 0.2 + 0.9);
    const loadRatio = simulatedLoad / node.cap;
    let newTemp = node.temp;
    let newStatus = node.status;
    let newCooling = node.cooling;
    if (loadRatio > 0.8) {
      newTemp += (Math.pow(loadRatio, 2) * 3.0 * heatMultiplier) / (newCooling / 100);
    } else {
      newTemp -= (2.0 * coolingPenalty); 
    }
    newTemp = Math.max(30, newTemp);
    if (newTemp > 115 || loadRatio > 1.5) {
      newStatus = 'FAILED';
      newTemp = 0;
    } else if (newTemp > 90 || loadRatio > 1.0) {
      newStatus = 'DEGRADED';
      newCooling = Math.max(10, newCooling - 1);
    }
    const eff = newStatus === 'FAILED' ? 0 : Math.max(0.1, 1 - (newTemp / 250));
    totalEfficiency += eff;
    if (node.role === 'Gen Node') generatedPower += node.cap * eff;
    return { ...node, load: simulatedLoad, temp: newTemp, status: newStatus, cooling: newCooling, eff };
  });
  const gridEfficiency = activeNodesCount === 0 ? 0 : totalEfficiency / activeNodesCount;
  const isBlackout = activeNodesCount / transformers.length < 0.3; 
  return { updatedNodes, gridEfficiency, isBlackout, generatedPower };
};

const useStore = create((set, get) => ({
  time: 0,
  batteryLevel: 50,
  gridScore: 0,
  demand: 500,
  gridEfficiency: 1.0,
  isBlackout: false,
  isLiveMode: false,
  history: [],
  logs: [{ time: new Date().toLocaleTimeString(), msg: "SYSTEM SECURE. AWAITING UPLINK.", type: "INFO" }],
  weather: 'CLEAR',
  transformers: [],
  gridGroups: { set1: [], set2: [], set3: [], set4: [], set5: [] },
  settings: { isPaused: false, speed: 1 },
  interval: null,
  socket: null, 
  lastHeartbeat: Date.now(),
  maxHistoryPoints: 60,
  selectedNodeId: null,

  uplinkLatency: 0,
  packetCount: 0,
  incidentLog: [],
  peakDemandRecorded: 500,
  autoRecoveryEnabled: true,

  setSocket: (wsInstance) => set({ socket: wsInstance }),

  loadTopology: (jsonConfig) => {
    const liveGrid = buildGridFromConfig(jsonConfig);
    set({ 
      transformers: liveGrid, 
      demand: jsonConfig.baseDemand || 500,
      peakDemandRecorded: jsonConfig.baseDemand || 500
    });
    get().addLog(`TOPOLOGY LOADED: ${jsonConfig.gridName || 'GRID'}`, 'SUCCESS');
  },

  updateFromTelemetry: (liveData) => set((state) => {
    if (!liveData || typeof liveData !== 'object' || !Array.isArray(liveData.nodes)) {
      return state;
    }
    const updatedNodes = liveData.nodes.map(node => {
      const prevNode = state.transformers.find(t => t.id === node.id);
      const riskScore = calculateRisk(node, prevNode);
      return {
        ...node,
        risk: riskScore,
        status: riskScore > 90 ? 'CRITICAL_WARNING' : node.status
      };
    });
    const onlineNodes = updatedNodes.filter(n => n.status !== 'FAILED').length;
    const eff = onlineNodes / (updatedNodes.length || 1);
    const newGroups = {
      set1: updatedNodes.slice(0, 3),
      set2: updatedNodes.slice(3, 6),
      set3: updatedNodes.slice(6, 9),
      set4: updatedNodes.slice(9, 12),
      set5: updatedNodes.slice(12, 15)
    };
    const newHistoryPoint = {
      time: state.time,
      battery: typeof liveData.battery === 'number' ? parseFloat(liveData.battery.toFixed(1)) : 0,
      efficiency: Math.floor(eff * 100)
    };
    const currentDemand = liveData.demand || state.demand;
    const nextPeak = currentDemand > state.peakDemandRecorded ? currentDemand : state.peakDemandRecorded;
    return {
      isLiveMode: true,
      transformers: updatedNodes,
      gridGroups: newGroups,
      batteryLevel: liveData.battery ?? state.batteryLevel,
      gridScore: liveData.gridScore ?? state.gridScore,
      weather: liveData.weather || state.weather,
      demand: currentDemand,
      gridEfficiency: eff,
      isBlackout: eff < 0.2,
      time: state.time + 1,
      history: [...state.history, newHistoryPoint].slice(-state.maxHistoryPoints),
      lastHeartbeat: Date.now(),
      packetCount: state.packetCount + 1,
      uplinkLatency: liveData.latency ?? state.uplinkLatency,
      peakDemandRecorded: nextPeak
    };
  }),

  tickSimulation: () => {
    if (get().isLiveMode) return; 
    const state = get();
    if (state.settings.isPaused || state.isBlackout || state.transformers.length === 0) return;
    const { updatedNodes, gridEfficiency, isBlackout, generatedPower } = calculatePhysicsTick(
      state.transformers, state.weather, state.demand
    );
    const powerDeficit = state.demand - generatedPower;
    let newBattery = Math.max(0, Math.min(100, state.batteryLevel - (powerDeficit * 0.05)));
    const totalBlackout = isBlackout || (newBattery === 0 && powerDeficit > 0);
    set({
      transformers: updatedNodes,
      gridEfficiency,
      batteryLevel: newBattery,
      isBlackout: totalBlackout,
      time: state.time + 1
    });
  },

  startSimulation: () => {
    if (get().interval) return;
    set({ isLiveMode: false });
    const newInterval = setInterval(() => get().tickSimulation(), 1000 / get().settings.speed);
    set({ interval: newInterval }); 
  },

  stopSimulation: () => {
    clearInterval(get().interval);
    set({ interval: null });
  },

  sendCommand: (nodeId, commandType) => {
    const ws = get().socket; 
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ nodeId, type: commandType }));
      get().addLog(`CMD SENT: [${commandType}] to [${nodeId}]`, 'INFO');
    } else {
      get().addLog(`TRANSMISSION FAILED: Offline`, 'ERROR');
    }
  },

  addLog: (msg, type = "INFO") => set((state) => ({ 
    logs: [{ time: new Date().toLocaleTimeString(), msg, type }, ...state.logs].slice(0, 50) 
  })),

  repairGrid: () => set((state) => ({
    isBlackout: false,
    transformers: state.transformers.map(t => ({ 
      ...t, status: 'ONLINE', temp: 35, load: 0, eff: 1, risk: 0 
    }))
  })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  
  clearIncidentLogs: () => set({ incidentLog: [] }),
  
  setWeather: (newWeather) => set({ weather: newWeather }),
  
  toggleAutoRecovery: () => set((state) => ({ autoRecoveryEnabled: !state.autoRecoveryEnabled })),
  
  modifyDemandDirectly: (amt) => set((state) => {
    const targetDemand = Math.max(0, state.demand + amt);
    const updatedPeak = targetDemand > state.peakDemandRecorded ? targetDemand : state.peakDemandRecorded;
    return {
      demand: targetDemand,
      peakDemandRecorded: updatedPeak
    };
  }),

  forceNodeState: (nodeId, forcedStatus) => set((state) => ({
    transformers: state.transformers.map(t => 
      t.id === nodeId ? { ...t, status: forcedStatus } : t
    )
  })),

  manuallyTriggerCooldown: (nodeId) => set((state) => ({
    transformers: state.transformers.map(t => 
      t.id === nodeId ? { ...t, temp: Math.max(30, t.temp - 15), cooling: Math.min(100, t.cooling + 10) } : t
    )
  })),

  adjustSimulationSpeed: (newSpeed) => set((state) => {
    if (state.interval) {
      clearInterval(state.interval);
      const updatedInterval = setInterval(() => get().tickSimulation(), 1000 / newSpeed);
      return { settings: { ...state.settings, speed: newSpeed }, interval: updatedInterval };
    }
    return { settings: { ...state.settings, speed: newSpeed } };
  })
}));

export const useCriticalAlerts = () => {
  const store = useStore();
  return {
    isBlackout: store.isBlackout,
    criticalNodes: store.transformers.filter(n => n.risk > 90)
  };
};

export default useStore;