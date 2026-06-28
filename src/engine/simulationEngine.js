import useStore from './gameState';

let requestRef;
let lastTimestamp = 0;

export const startSimulation = () => {
  lastTimestamp = 0; 

  const animate = (timestamp) => {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = Math.min((timestamp - lastTimestamp) / 1000, 0.1); 
    lastTimestamp = timestamp;

    const state = useStore.getState();

    // Only run if the system is powered and not paused
    if (!state.settings.isPaused && !state.isBlackout) {
      const timeStep = deltaTime * (state.settings.speed || 1);
      const currentTime = typeof state.time === 'number' ? state.time : 0;
      const nextTime = (currentTime + (timeStep * 0.5)) % 24;

      // 1. ENVIRONMENTAL SYSTEM
      let ambientTemp = 25, solarMult = 1, windMult = 1, demandMult = 1;
      if (state.weather === 'STORM') { solarMult = 0.1; windMult = 2.5; ambientTemp = 15; } 
      else if (state.weather === 'HEATWAVE') { solarMult = 1.2; windMult = 0.3; demandMult = 1.4; ambientTemp = 45; }

      const sunIntensity = Math.max(0, Math.sin((nextTime / 24) * Math.PI * 2 - Math.PI / 2)) * solarMult;
      const windSpeed = Math.max(0, 0.5 + Math.sin(nextTime) * 0.5 + (Math.random() * 0.2)) * windMult;
      const solarGen = (state.settings?.solarCapacity ?? 250) * sunIntensity;
      const windGen = (state.settings?.windCapacity ?? 200) * windSpeed;
      const currentDemand = 500 * demandMult;

      // 2. THERMODYNAMIC & SECTOR ENGINE
      let logsToPush = []; 
      const updatedTransformers = state.transformers.map(tx => {
        // Auto-Repair Logic
        if (tx.status === 'FAILED') {
            if (tx.cooling > 90 && Math.random() < 0.01) return { ...tx, status: 'ONLINE', temp: 50 };
            return tx;
        }

        // Sector Load Distribution
        let load = 0;
        if (tx.sector.includes('Sector 1')) load = tx.id.includes('Solar') ? solarGen / 2 : windGen;
        else if (tx.sector.includes('Sector 2')) load = (solarGen + windGen) / 3; 
        else if (tx.sector.includes('Sector 3')) load = currentDemand * 0.5 / 3;
        else if (tx.sector.includes('Sector 4')) load = currentDemand * 0.3 / 3;
        else if (tx.sector.includes('Sector 5')) load = currentDemand * 0.2 / 3;

        load = Math.max(0, load + (Math.random() * 10 - 5));
        const loadRatio = load / (tx.cap || 1);
        
        // Heat Dynamics
        let newTemp = tx.temp + ((Math.pow(loadRatio, 1.6) * 70) - 2) * deltaTime;
        let newCooling = Math.max(0, tx.cooling - (newTemp > 85 ? deltaTime * 5 : -deltaTime));
        if (newCooling < 30) newTemp += deltaTime * 20;

        let newStatus = newTemp > 120 ? 'FAILED' : 'ONLINE';
        if (newStatus === 'FAILED' && tx.status !== 'FAILED') logsToPush.push(`CRITICAL: ${tx.id} MELTDOWN!`);

        return { ...tx, load: isNaN(load) ? 0 : load, temp: newTemp, status: newStatus, cooling: newCooling };
      });

      // 3. GRID METRICS & SCORING
      const onlineNodes = updatedTransformers.filter(t => t.status === 'ONLINE').length;
      const avgEfficiency = updatedTransformers.length > 0 ? (onlineNodes / updatedTransformers.length) : 0;
      const netPower = ((solarGen + windGen) * avgEfficiency) - currentDemand;
      let nextBattery = Math.min(100, Math.max(0, state.batteryLevel + (netPower / 60) * timeStep));
      const newScore = (state.score || 0) + (onlineNodes * deltaTime);

      // [FIX 1]: Random weather event only fires if the Live API (or Manual Mode) hasn't taken over
      if (Math.random() < 0.0002 && !state.isManualWeather) {
        const weathers = ['CLEAR', 'STORM', 'HEATWAVE'];
        state.triggerWeatherEvent(weathers[Math.floor(Math.random() * weathers.length)]);
      }

      // 4. BATCH UPDATE
      state.updateState({
        time: nextTime,
        batteryLevel: nextBattery,
        isBlackout: nextBattery <= 0 || avgEfficiency < 0.2,
        gridEfficiency: avgEfficiency,
        demand: currentDemand,
        score: newScore,
        transformers: updatedTransformers,
        logs: [...logsToPush.map(log => `[${nextTime.toFixed(1)}h] ${log}`), ...state.logs].slice(0, 20)
      });

      // [FIX 2]: Ensure the Machine Learning model processes the new physics data every frame
      useStore.getState().runAIPredictions();
    }
    
    requestRef = requestAnimationFrame(animate);
  };
  
  requestRef = requestAnimationFrame(animate);
};

export const stopSimulation = () => {
  cancelAnimationFrame(requestRef);
  lastTimestamp = 0;
};
