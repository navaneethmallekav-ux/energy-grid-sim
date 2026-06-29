const WebSocket = require('ws');
const http = require('http');
const os = require('os');
const crypto = require('crypto');

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ONLINE',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: os.cpus()[0].model
    }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocket.Server({ server });

console.log("==========================================");
console.log("⚡ SCADA HARDWARE SIMULATOR ONLINE ⚡");
console.log("📡 PORT: DYNAMIC // BIDIRECTIONAL MODE ACTIVE");
console.log("==========================================");

let globalBattery = 100.0;
let globalDemand = 800.0;
let systemUptime = 0;
let activeAnomalies = [];
let autoPilotState = false;
let weatherState = 'CLEAR';
let weatherDuration = 0;

let persistentNodes = Array.from({ length: 15 }, (_, i) => {
  const isGen = i < 5;
  return {
    id: `TX-${isGen ? 'G' : 'T'}${i + 1}`,
    cap: isGen ? 500 : 250,
    load: isGen ? 300 : 150,
    temp: 65,
    cooling: 95,
    eff: 0.98,
    voltage: isGen ? "345kV" : "115kV",
    role: isGen ? "Generator" : "Step-Down Substation",
    sector: isGen ? "Sector 1: Generation Core" : "Sector 2: Heavy Transmission",
    status: 'ONLINE',
    firmware: 'v2.0.4',
    lastMaintenance: Date.now()
  };
});

const drift = (value, min, max, maxChange) => {
  const change = (Math.random() - 0.5) * 2 * maxChange;
  return Math.min(max, Math.max(min, value + change));
};

const generateTelemetryId = () => {
  return crypto.randomBytes(8).toString('hex');
};

const updateWeatherCycle = () => {
  if (weatherDuration > 0) {
    weatherDuration -= 1;
    return weatherState;
  }
  const rand = Math.random();
  if (rand > 0.9) {
    weatherState = 'STORM';
    weatherDuration = Math.floor(Math.random() * 30) + 15;
  } else if (rand > 0.8) {
    weatherState = 'HEATWAVE';
    weatherDuration = Math.floor(Math.random() * 40) + 20;
  } else {
    weatherState = 'CLEAR';
    weatherDuration = Math.floor(Math.random() * 60) + 30;
  }
  return weatherState;
};

const applyAutoPilot = () => {
  if (!autoPilotState) return;
  persistentNodes.forEach(node => {
    if (node.status === 'DEGRADED') {
      node.cooling = Math.min(100, node.cooling + 5);
      node.load = Math.max(0, node.load - 10);
    }
  });
};

const rebalanceGrid = () => {
  const onlineNodes = persistentNodes.filter(n => n.status === 'ONLINE');
  const failedNodes = persistentNodes.filter(n => n.status === 'FAILED');
  if (failedNodes.length > 0 && onlineNodes.length > 0) {
    const excessLoad = failedNodes.reduce((acc, node) => acc + (node.cap * 0.5), 0);
    const distributedLoad = excessLoad / onlineNodes.length;
    onlineNodes.forEach(node => {
      node.load += distributedLoad * 0.1;
    });
  }
};

wss.on('connection', (ws, req) => {
  console.log("🟢 UI UPLINK ESTABLISHED. Command Channel Ready.");
  const clientIp = req.socket.remoteAddress;
  console.log(`📡 Connection Origin: ${clientIp}`);
  
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    try {
      const command = JSON.parse(message);
      console.log(`📥 COMMAND RECEIVED: ${command.type} on ${command.nodeId || 'GLOBAL'}`);
      
      if (command.type === 'ENABLE_AUTOPILOT') {
        autoPilotState = true;
        return;
      }
      if (command.type === 'DISABLE_AUTOPILOT') {
        autoPilotState = false;
        return;
      }
      if (command.type === 'GLOBAL_RESET') {
        persistentNodes.forEach(n => {
          n.status = 'ONLINE';
          n.temp = 40;
          n.cooling = 100;
          n.load = n.cap * 0.5;
        });
        globalBattery = 100.0;
        return;
      }

      const target = persistentNodes.find(n => n.id === command.nodeId);
      if (!target) return;

      switch (command.type) {
        case 'REBOOT':
          target.status = 'ONLINE';
          target.temp = 40;
          target.cooling = 100;
          break;
        case 'FORCE_COOL':
          target.cooling = Math.min(100, target.cooling + 20);
          break;
        case 'SHUTDOWN':
          target.status = 'FAILED';
          target.load = 0;
          break;
        case 'ISOLATE':
          target.status = 'MAINTENANCE';
          target.load = 0;
          target.temp = 30;
          break;
        case 'OVERRIDE_LOAD':
          target.load = command.value || target.cap;
          break;
      }
    } catch (e) {
      console.error("Malformed command received:", e);
    }
  });

  const telemetryLoop = setInterval(() => {
    systemUptime++;
    globalDemand = drift(globalDemand, 600, 1200, 15);
    globalBattery = drift(globalBattery, 0, 100, 0.5);
    
    const currentWeather = updateWeatherCycle();
    applyAutoPilot();
    rebalanceGrid();
    
    let totalGenerated = 0;
    let totalConsumed = 0;

    persistentNodes = persistentNodes.map(node => {
      if (node.status === 'FAILED' || node.status === 'MAINTENANCE') return node;

      node.load = drift(node.load, node.cap * 0.2, node.cap * 1.1, 8);
      const loadRatio = node.load / node.cap;
      
      let envFactor = 0;
      if (currentWeather === 'HEATWAVE') envFactor = 1.5;
      if (currentWeather === 'STORM') envFactor = -0.5;

      node.temp = drift(node.temp + (loadRatio > 0.8 ? 2.5 : -1.0) + envFactor, 40, 120, 1.5);
      node.cooling = drift(node.cooling, 40, 100, 2);
      
      if (node.temp > 105 || loadRatio > 1.05) {
        node.status = 'FAILED';
        node.load = 0;
        activeAnomalies.push({ time: Date.now(), node: node.id, reason: 'THERMAL_OVERLOAD' });
        if (activeAnomalies.length > 50) activeAnomalies.shift();
      } else if (node.temp > 85 || loadRatio > 0.9) {
        node.status = 'DEGRADED';
      } else {
        node.status = 'ONLINE';
      }

      if (node.role === 'Generator') {
        totalGenerated += node.load;
      } else {
        totalConsumed += node.load;
      }

      return node;
    });

    const gridScore = Math.floor((globalBattery * 0.5) + (persistentNodes.filter(n => n.status === 'ONLINE').length * 10));
    
    console.log(`DEBUG: Sending gridScore: ${gridScore} | Weather: ${currentWeather}`);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        telemetryId: generateTelemetryId(),
        timestamp: Date.now(),
        nodes: persistentNodes,
        battery: globalBattery,
        weather: currentWeather,
        demand: globalDemand,
        gridScore: gridScore,
        metrics: {
          uptime: systemUptime,
          autoPilot: autoPilotState,
          totalGen: totalGenerated,
          totalCons: totalConsumed,
          anomalies: activeAnomalies.length
        }
      }));
    }
  }, 1000);

  ws.on('close', () => {
    console.log("🔴 UI UPLINK DISCONNECTED.");
    clearInterval(telemetryLoop);
  });
  
  ws.on('error', (err) => console.error("Socket error:", err));
});

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`--- HTTP GATEWAY ANCHORED ON PORT ${PORT} ---`);
});