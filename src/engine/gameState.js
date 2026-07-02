// src/engine/gameState.js

import { create } from 'zustand';

const buildGridGroups = (nodes) => {
  const groups = {
    set1: nodes.filter(n => n.sector === 'Sector 1: Generation Core'),
    set2: nodes.filter(n => n.sector === 'Sector 2: Heavy Transmission'),
    set3: nodes.filter(n => n.sector === 'Sector 3: Industrial District'),
    set4: nodes.filter(n => n.sector === 'Sector 4: Commercial Hub'),
    set5: nodes.filter(n => n.sector === 'Sector 5: Residential Grid')
  };
  
  nodes.forEach(n => {
    if (n.isDynamic || (n.sector && !n.sector.startsWith('Sector'))) {
      const secName = n.sector || 'UNKNOWN REGION';
      if (!groups[secName]) groups[secName] = [];
      groups[secName].push(n);
    }
  });
  
  return groups;
};

const buildGridFromConfig = (config) => {
  return config.nodes.map(node => ({
    id: node.id,
    isDynamic: false,
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
    risk: 0,
    timeToFailure: -1,
    isShedding: false
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
    if (node.status === 'FAILED') {
      return { ...node, load: 0, eff: 0, temp: 0, risk: 0, timeToFailure: -1 }; 
    }
    
    let simulatedLoad = loadPerActiveNode * (Math.random() * 0.2 + 0.9);
    if (node.isShedding) {
      simulatedLoad = 0;
    }

    const loadRatio = simulatedLoad / node.cap;
    let newTemp = node.temp;
    let newStatus = node.status;
    let newCooling = node.cooling;
    let newTimeToFailure = -1;
    
    if (loadRatio > 0.8 && !node.isShedding) {
      newTemp += (Math.pow(loadRatio, 2) * 3.0 * heatMultiplier) / (newCooling / 100);
    } else if (node.isShedding) {
      newTemp -= (5.0 * coolingPenalty); 
    } else {
      newTemp -= (2.0 * coolingPenalty); 
    }
    
    newTemp = Math.max(30, newTemp);
    
    if (newTemp > 115 || loadRatio > 1.5) {
      newStatus = 'FAILED';
      newTemp = 0;
      newTimeToFailure = -1;
      node.isShedding = false;
    } else if (newTemp > 90 || loadRatio > 1.0) {
      newStatus = 'DEGRADED';
      newCooling = Math.max(10, newCooling - 1);
      const rateOfRise = (Math.pow(loadRatio, 2) * 3.0 * heatMultiplier) / (newCooling / 100);
      if (rateOfRise > 0) {
        newTimeToFailure = (115 - newTemp) / rateOfRise;
      }
    } else {
      if (newTemp < 60 && node.isShedding) {
        node.isShedding = false;
        newStatus = 'ONLINE';
      }
    }
    
    const eff = newStatus === 'FAILED' ? 0 : Math.max(0.1, 1 - (newTemp / 250));
    totalEfficiency += eff;
    
    if (node.role === 'Gen Node') generatedPower += node.cap * eff;
    
    return { ...node, load: simulatedLoad, temp: newTemp, status: newStatus, cooling: newCooling, eff, timeToFailure: newTimeToFailure };
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
  hasCustomTopology: false, 
  audioEnabled: false, 
  history: [],
  logs: [{ time: new Date().toLocaleTimeString(), msg: "SYSTEM SECURE. AWAITING UPLINK.", type: "INFO" }],
  weather: 'CLEAR',
  transformers: [], 
  links: [],
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
  mapCenter: [47.6062, -122.3321], 
  mapZoom: 10,
  mapBounds: null,

  setSocket: (wsInstance) => set({ socket: wsInstance }),
  
  toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),

  loadTopology: (jsonConfig) => {
    if (get().hasCustomTopology) return;
    
    const liveGrid = buildGridFromConfig(jsonConfig);
    set({ 
      transformers: liveGrid, 
      gridGroups: buildGridGroups(liveGrid),
      demand: jsonConfig.baseDemand || 500,
      peakDemandRecorded: jsonConfig.baseDemand || 500,
      hasCustomTopology: false 
    });
    get().addLog(`TOPOLOGY LOADED: ${jsonConfig.gridName || 'GRID'}`, 'SUCCESS');
  },

  updateFromTelemetry: (liveData) => set((state) => {
    if (!liveData || typeof liveData !== 'object' || !Array.isArray(liveData.nodes)) {
      return state;
    }

    let baseNodes = state.transformers;
    let customTopologyActive = state.hasCustomTopology;

    if (baseNodes.length === 0 && liveData.nodes.length > 0) {
      customTopologyActive = true;
      baseNodes = liveData.nodes.map(node => ({
        id: node.id,
        isDynamic: false,
        sector: node.sector || 'UNKNOWN REGION',
        role: node.role || (node.id.includes('G') ? 'Gen Node' : 'Substation'),
        cap: node.cap || 250,
        connections: node.connections || [],
        voltage: node.voltage || '115kV',
        load: node.load || 0,
        temp: node.temp || 35,
        status: node.status || 'ONLINE',
        cooling: node.cooling || 100,
        eff: node.eff || 1,
        risk: 0,
        timeToFailure: -1,
        isShedding: node.isShedding || false
      }));
    }

    if (!customTopologyActive) {
      return {
        batteryLevel: liveData.battery ?? state.batteryLevel,
        time: state.time + 1,
        lastHeartbeat: Date.now()
      };
    }

    const updatedNodes = baseNodes.map(node => {
      const incomingNode = liveData.nodes.find(n => n.id === node.id);
      const prevNode = state.transformers.find(t => t.id === node.id);
      
      let simTemp = incomingNode ? incomingNode.temp : node.temp;
      let currentLoad = incomingNode ? incomingNode.load : node.load;
      let currentStatus = incomingNode ? incomingNode.status : node.status;
      let currentCooling = incomingNode ? incomingNode.cooling : node.cooling;

      if (!incomingNode && !state.settings?.isPaused) {
         simTemp = Math.max(30, Math.min(120, simTemp + (Math.random() * 2 - 1)));
      }
      
      const sampleNodeForRisk = { ...node, temp: simTemp, load: currentLoad };
      const riskScore = calculateRisk(sampleNodeForRisk, prevNode);
      
      let currentTtf = node.timeToFailure;
      if (simTemp > 90 && currentLoad > 0) {
        currentTtf = Math.max(0, (115 - simTemp) / 1.5);
      } else {
        currentTtf = -1;
      }

      return {
        ...node,
        load: currentLoad,
        temp: simTemp,
        status: currentStatus === 'ONLINE' && riskScore > 90 ? 'CRITICAL_WARNING' : currentStatus,
        cooling: currentCooling,
        risk: riskScore,
        timeToFailure: currentTtf
      };
    });

    const onlineNodes = updatedNodes.filter(n => n.status !== 'FAILED').length;
    const eff = onlineNodes / (updatedNodes.length || 1);
    
    const newHistoryPoint = {
      time: state.time,
      battery: typeof liveData.battery === 'number' ? parseFloat(liveData.battery.toFixed(1)) : 0,
      efficiency: Math.floor(eff * 100)
    };
    
    const currentDemand = liveData.demand || state.demand;
    const nextPeak = currentDemand > state.peakDemandRecorded ? currentDemand : state.peakDemandRecorded;
    
    return {
      isLiveMode: true,
      hasCustomTopology: customTopologyActive,
      transformers: updatedNodes,
      gridGroups: buildGridGroups(updatedNodes),
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
      gridGroups: buildGridGroups(updatedNodes), 
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

  shedLoad: (nodeId) => set((state) => {
    const updated = state.transformers.map(t => {
      if (t.id === nodeId) {
        return { ...t, isShedding: true, load: 0, status: 'MAINTENANCE' };
      }
      return t;
    });
    get().addLog(`LOAD SHED INITIATED: [${nodeId}]`, 'WARN');
    if (get().socket && get().socket.readyState === WebSocket.OPEN) {
      get().socket.send(JSON.stringify({ nodeId, type: 'LOAD_SHED' }));
    }
    return {
      transformers: updated,
      gridGroups: buildGridGroups(updated)
    };
  }),

  addLog: (msg, type = "INFO") => set((state) => ({ 
    logs: [{ time: new Date().toLocaleTimeString(), msg, type }, ...state.logs].slice(0, 50) 
  })),

  repairGrid: () => set((state) => {
    const repairedNodes = state.transformers.map(t => ({ 
      ...t, status: 'ONLINE', temp: 35, load: 0, eff: 1, risk: 0, timeToFailure: -1, isShedding: false 
    }));
    return {
      isBlackout: false,
      transformers: repairedNodes,
      gridGroups: buildGridGroups(repairedNodes),
      hasCustomTopology: false 
    };
  }),

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
  }),

  setMapCenter: (coords) => set({ mapCenter: coords }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  setMapBounds: (bounds) => set({ mapBounds: bounds }),

  addDynamicNodes: (newNodes, newLinks, cityName = "UNKNOWN CITY") => set((state) => {
    const permanentNodes = state.transformers.filter(n => n.isDynamic === false);
    
    const safeName = (cityName && cityName.trim() !== "") ? cityName : "UNKNOWN CITY";
    
    const taggedNewNodes = newNodes.map(n => ({
      ...n,
      isDynamic: true,
      sector: safeName.toUpperCase(), 
      load: n.load || 0,
      temp: n.temp || 35,
      status: n.status || 'ONLINE',
      timeToFailure: -1,
      isShedding: false
    }));

    const finalNodes = [...permanentNodes, ...taggedNewNodes];
    
    // --- GRID AUTO-ROUTER ---
    let finalLinks = newLinks || [];
    
    // If the map API failed to find physical wires, simulate a mesh grid
    if (finalLinks.length === 0 && taggedNewNodes.length > 1) {
      taggedNewNodes.forEach(node => {
        // Find the closest neighboring substations
        const neighbors = taggedNewNodes
          .filter(n => n.id !== node.id)
          .map(n => {
            const lat1 = node.lat || (node.position && node.position[0]) || 0;
            const lng1 = node.lng || (node.position && node.position[1]) || 0;
            const lat2 = n.lat || (n.position && n.position[0]) || 0;
            const lng2 = n.lng || (n.position && n.position[1]) || 0;
            return {
              targetId: n.id,
              targetLat: lat2,
              targetLng: lng2,
              dist: Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2))
            };
          })
          .sort((a, b) => a.dist - b.dist);

        // Wire this node to its 2 closest neighbors to create a web
        neighbors.slice(0, 2).forEach(neighbor => {
          // Prevent drawing duplicate lines back and forth
          const lineExists = finalLinks.some(l => 
            (l.source === node.id && l.target === neighbor.targetId) || 
            (l.target === node.id && l.source === neighbor.targetId)
          );
          
          if (!lineExists) {
            finalLinks.push({
              source: node.id,
              target: neighbor.targetId,
              sourcePos: [node.lat || (node.position && node.position[0]), node.lng || (node.position && node.position[1])],
              targetPos: [neighbor.targetLat, neighbor.targetLng]
            });
          }
        });
      });
    }
    
    const ws = get().socket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const currentLat = state.mapCenter ? state.mapCenter[0] : 47.6062;
      const currentLng = state.mapCenter ? state.mapCenter[1] : -122.3321;

      ws.send(JSON.stringify({
        type: 'REGISTER_NEW_GRID',
        lat: currentLat,
        lng: currentLng,
        nodes: taggedNewNodes.map(n => ({
          id: n.id,
          cap: n.cap || n.capacity || 250,
          type: (n.role && n.role.includes('Gen')) ? 'generator' : 'substation'
        }))
      }));
      
      get().addLog(`SATELLITE UPLINK: Targeting API at coords [${currentLat.toFixed(2)}, ${currentLng.toFixed(2)}]...`, 'INFO');
    }

    return {
      transformers: finalNodes,
      links: finalLinks, // Now packed with auto-routed cables
      gridGroups: buildGridGroups(finalNodes),
      hasCustomTopology: true
    };
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