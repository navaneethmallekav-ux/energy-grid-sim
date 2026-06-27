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
      const nextTime = (state.time + (timeStep * 0.5)) % 24; // Time moving slightly faster

      // Weather & Generation
      const sunIntensity = Math.max(0, Math.sin((nextTime / 24) * Math.PI * 2 - Math.PI / 2));
      const windSpeed = Math.max(0, 0.5 + Math.sin(nextTime) * 0.5 + (Math.random() * 0.2));
      
      const solarGen = state.settings.solarCapacity * sunIntensity;
      const windGen = state.settings.windCapacity * windSpeed;
      const currentSupply = solarGen + windGen;

      // FAILURE MECHANISM: Interceptor & Stress
      const stress = Math.max(0, (state.demand - currentSupply) / 300);
      let newEfficiency = state.gridEfficiency;
      
      if (stress > 0.2 && Math.random() < 0.005) {
        newEfficiency = Math.max(0.1, state.gridEfficiency - 0.1);
        state.addLog(`CRITICAL STRESS: Component broke! Efficiency dropped to ${(newEfficiency * 100).toFixed(0)}%`);
      }

      // Physics Math
      const netPower = (currentSupply * newEfficiency) - state.demand;
      const batteryDelta = (netPower / 60) * timeStep;
      let nextBattery = Math.min(100, Math.max(0, state.batteryLevel + batteryDelta));

      state.updateState({
        time: nextTime,
        batteryLevel: nextBattery,
        isBlackout: nextBattery <= 0,
        gridEfficiency: newEfficiency
      });
    }

    requestRef = requestAnimationFrame(animate);
  };
  requestRef = requestAnimationFrame(animate);
};

export const stopSimulation = () => cancelAnimationFrame(requestRef);