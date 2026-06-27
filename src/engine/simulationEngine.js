import useStore from './gameState';

let requestRef;
let lastTimestamp = 0;

export const startSimulation = () => {
  const animate = (timestamp) => {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const state = useStore.getState();

    if (!state.settings.isPaused) {
      const timeStep = deltaTime * state.settings.speed;
      const nextTime = (state.time + (timeStep * 0.5)) % 24;

      // 1. Environment Simulation
      let ambientTemp = 25;
      let solarMult = 1, windMult = 1, demandMult = 1;

      if (state.weather === 'STORM') { solarMult = 0.1; windMult = 2.5; ambientTemp = 15; } 
      else if (state.weather === 'HEATWAVE') { solarMult = 1.2; windMult = 0.3; demandMult = 1.3; ambientTemp = 45; }

      const sunIntensity = Math.max(0, Math.sin((nextTime / 24) * Math.PI * 2 - Math.PI / 2)) * solarMult;
      const windSpeed = Math.max(0, 0.5 + Math.sin(nextTime) * 0.5 + (Math.random() * 0.2)) * windMult;
      
      const solarGen = state.settings.solarCapacity * sunIntensity;
      const windGen = state.settings.windCapacity * windSpeed;
      const currentDemand = 450 * demandMult;

      // 2. Transformer Telemetry Engine
      let totalEfficiency = 0;
      const updatedTransformers = state.transformers.map(tx => {
        let load = 0;
        
        // Distribute load based on type
        if (tx.type === 'STEP-UP') {
          load = tx.id.includes('Solar') ? solarGen / 2 : windGen;
        } else if (tx.type === 'TRANSMISSION') {
          load = (solarGen + windGen) / 4; 
        } else if (tx.type === 'DISTRIBUTION') {
          load = currentDemand / 8; // simplified distribution
        }

        // Add variance
        load += (Math.random() * 10 - 5);
        if (load < 0) load = 0;

        // Thermal Dynamics Math
        const loadRatio = load / tx.cap;
        let newTemp = ambientTemp + (Math.pow(loadRatio, 1.5) * 60);
        
        // Decay & Failure Logic
        let newEff = tx.eff;
        let newStatus = 'ONLINE';

        if (newTemp > 95 && Math.random() < 0.01) {
          newEff -= 0.05; // Thermal degradation
        }
        if (newEff < 0.8) newStatus = 'DEGRADED';
        if (newTemp > 120 || newEff < 0.4) {
          newEff = 0;
          newStatus = 'FAILED';
          if (tx.status !== 'FAILED') state.addLog(`CRITICAL: ${tx.id} Melted Down!`);
        }

        totalEfficiency += newEff;

        return { ...tx, load, temp: newTemp, eff: Math.max(0, newEff), status: newStatus };
      });

      const avgEfficiency = totalEfficiency / 15;
      const netPower = ((solarGen + windGen) * avgEfficiency) - currentDemand;
      const batteryDelta = (netPower / 60) * timeStep;
      let nextBattery = Math.min(100, Math.max(0, state.batteryLevel + batteryDelta));

      if (Math.random() < 0.0002) {
        const weathers = ['CLEAR', 'STORM', 'HEATWAVE'];
        state.triggerWeatherEvent(weathers[Math.floor(Math.random() * weathers.length)]);
      }

      state.updateState({
        time: nextTime,
        batteryLevel: nextBattery,
        isBlackout: nextBattery <= 0,
        gridEfficiency: avgEfficiency,
        demand: currentDemand,
        transformers: updatedTransformers
      });
    }
    requestRef = requestAnimationFrame(animate);
  };
  requestRef = requestAnimationFrame(animate);
};

export const stopSimulation = () => cancelAnimationFrame(requestRef);