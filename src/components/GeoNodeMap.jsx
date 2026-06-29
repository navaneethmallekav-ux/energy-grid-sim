import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useStore from '../engine/gameState';
import omegaConfig from '../config/omegaGrid.json';

const MAP_STYLES = {
  DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  SATELLITE: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  STREET: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
};

export default function GeoNodeMap() {
  const transformers = useStore(state => state.transformers);
  const sendCommand = useStore(state => state.sendCommand);
  const isBlackout = useStore(state => state.isBlackout);
  const gridEfficiency = useStore(state => state.gridEfficiency);
  
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeMapStyle, setActiveMapStyle] = useState('DARK');
  const [geoData, setGeoData] = useState({});
  const [mapCenter, setMapCenter] = useState([47.6062, -122.3321]);

  useEffect(() => {
    if (transformers.length > 0) {
      const coords = {};
      let latSum = 0;
      let lngSum = 0;
      let validNodes = 0;

      transformers.forEach((t) => {
        const configNode = omegaConfig.nodes.find(n => n.id === t.id);
        if (configNode && configNode.lat && configNode.lng) {
          coords[t.id] = [configNode.lat, configNode.lng];
          latSum += configNode.lat;
          lngSum += configNode.lng;
          validNodes++;
        }
      });

      if (validNodes > 0) {
        setMapCenter([latSum / validNodes, lngSum / validNodes]);
      }
      setGeoData(coords);
    }
  }, [transformers]);

  const getNodeColor = (status) => {
    if (status === 'FAILED') return '#ff1a1a';
    if (status === 'DEGRADED') return '#ffb700';
    if (status === 'MAINTENANCE') return '#888888';
    return '#00f3ff';
  };

  const createCustomIcon = (status, isSelected) => {
    const color = getNodeColor(status);
    const size = isSelected ? 36 : 24;
    const zIndex = isSelected ? 1000 : 1;
    const glow = isSelected ? `box-shadow: 0 0 20px ${color}, inset 0 0 10px ${color};` : `box-shadow: 0 0 8px ${color};`;
    
    const html = `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: rgba(0, 0, 0, 0.8);
        border: 2px solid ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        ${glow}
        transition: all 0.3s ease;
        z-index: ${zIndex};
      ">
        <div style="
          width: ${size / 2.5}px;
          height: ${size / 2.5}px;
          background-color: ${color};
          border-radius: 50%;
        "></div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-leaflet-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const renderPolylines = useMemo(() => {
    const lines = [];
    const drawnPairs = new Set();
    
    transformers.forEach(sourceNode => {
      const sourceCoord = geoData[sourceNode.id];
      if (!sourceCoord) return;
      
      const targetNodes = transformers.filter(t => t.role !== sourceNode.role);
      targetNodes.slice(0, 2).forEach(targetNode => {
        const targetCoord = geoData[targetNode.id];
        if (!targetCoord) return;
        
        const pairKey = [sourceNode.id, targetNode.id].sort().join('-');
        if (drawnPairs.has(pairKey)) return;
        drawnPairs.add(pairKey);
        
        const isActive = sourceNode.status === 'ONLINE' && targetNode.status === 'ONLINE';
        const color = isActive ? '#00f3ff' : '#ff1a1a';
        const opacity = isActive ? 0.6 : 0.3;
        const dashArray = isActive ? null : '5, 10';
        const weight = isActive ? 3 : 2;

        lines.push(
          <Polyline
            key={pairKey}
            positions={[sourceCoord, targetCoord]}
            color={color}
            weight={weight}
            opacity={opacity}
            dashArray={dashArray}
          />
        );
      });
    });
    return lines;
  }, [transformers, geoData]);

  const activeNodeData = transformers.find(t => t.id === selectedNode);

  return (
    <div className="geo-wrapper">
      <div className="geo-hud-overlay">
        <div className="hud-panel map-controls">
          <div className="hud-title">MAP LAYER</div>
          <button className={activeMapStyle === 'DARK' ? 'active' : ''} onClick={() => setActiveMapStyle('DARK')}>TACTICAL DARK</button>
          <button className={activeMapStyle === 'SATELLITE' ? 'active' : ''} onClick={() => setActiveMapStyle('SATELLITE')}>ORBITAL SATELLITE</button>
          <button className={activeMapStyle === 'STREET' ? 'active' : ''} onClick={() => setActiveMapStyle('STREET')}>CIVILIAN GRID</button>
        </div>
        
        <div className="hud-panel grid-stats">
          <div className="hud-title">REGIONAL TELEMETRY</div>
          <div className="stat-row">
            <span>NETWORK HEALTH</span>
            <span style={{ color: isBlackout ? '#ff1a1a' : '#00f3ff' }}>{(gridEfficiency * 100).toFixed(1)}%</span>
          </div>
          <div className="stat-row">
            <span>ACTIVE UPLINKS</span>
            <span>{transformers.filter(t => t.status === 'ONLINE').length} / {transformers.length}</span>
          </div>
          <div className="stat-row">
            <span>CRITICAL FAULTS</span>
            <span style={{ color: '#ff1a1a' }}>{transformers.filter(t => t.status === 'FAILED').length}</span>
          </div>
        </div>
      </div>

      <div className="map-container-frame">
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          zoomControl={false}
          style={{ height: '100%', width: '100%', background: '#020205' }}
        >
          <TileLayer
            url={MAP_STYLES[activeMapStyle]}
            attribution='&copy; OpenStreetMap contributors, CartoDB, Esri'
          />
          <ZoomControl position="bottomright" />
          
          {renderPolylines}

          {transformers.map(node => {
            const coords = geoData[node.id];
            if (!coords) return null;
            
            return (
              <Marker
                key={node.id}
                position={coords}
                icon={createCustomIcon(node.status, selectedNode === node.id)}
                eventHandlers={{
                  click: () => setSelectedNode(node.id),
                }}
              >
                <Tooltip direction="top" offset={[0, -20]} opacity={1} className="custom-tooltip">
                  <div style={{ color: getNodeColor(node.status), fontWeight: 'bold' }}>{node.id}</div>
                  <div style={{ fontSize: '10px' }}>{node.role}</div>
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className={`map-sidebar ${selectedNode ? 'open' : ''}`}>
        {activeNodeData ? (
          <div className="sidebar-content">
            <h3 style={{ color: getNodeColor(activeNodeData.status) }}>{activeNodeData.id}</h3>
            <div className="detail-row"><span>COORDINATES:</span> <span>{geoData[activeNodeData.id][0].toFixed(4)}, {geoData[activeNodeData.id][1].toFixed(4)}</span></div>
            <div className="detail-row"><span>ROLE:</span> <span>{activeNodeData.role}</span></div>
            <div className="detail-row"><span>SECTOR:</span> <span>{activeNodeData.sector}</span></div>
            <div className="detail-row"><span>STATUS:</span> <span style={{ color: getNodeColor(activeNodeData.status) }}>{activeNodeData.status}</span></div>
            <div className="detail-row"><span>TEMP:</span> <span>{activeNodeData.temp.toFixed(1)}°C</span></div>
            <div className="detail-row"><span>LOAD:</span> <span>{activeNodeData.load.toFixed(0)} / {activeNodeData.cap} MW</span></div>
            
            <div className="action-grid">
              <button onClick={() => sendCommand(activeNodeData.id, 'REBOOT')} className="cmd-btn safe">REBOOT SEQUENCE</button>
              <button onClick={() => sendCommand(activeNodeData.id, 'FORCE_COOL')} className="cmd-btn safe">FLUSH COOLANT</button>
              <button onClick={() => sendCommand(activeNodeData.id, 'ISOLATE')} className="cmd-btn warn">ISOLATE NODE</button>
              <button onClick={() => sendCommand(activeNodeData.id, 'SHUTDOWN')} className="cmd-btn danger">EMERGENCY SHUTDOWN</button>
            </div>
            
            <button className="close-btn" onClick={() => setSelectedNode(null)}>DISMISS INSPECTION</button>
          </div>
        ) : (
          <div className="sidebar-empty">AWAITING NODE SELECTION</div>
        )}
      </div>

      <style>{`
        .geo-wrapper { position: relative; width: 100%; height: 800px; display: flex; overflow: hidden; border: 1px solid #00f3ff; border-radius: 8px; box-shadow: 0 0 20px rgba(0, 243, 255, 0.1); background: #020205; }
        .map-container-frame { flex: 1; position: relative; z-index: 1; }
        
        .geo-hud-overlay { position: absolute; top: 20px; left: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 15px; pointer-events: none; }
        .hud-panel { background: rgba(2, 2, 5, 0.85); border: 1px solid #1a1a2e; padding: 15px; border-radius: 6px; backdrop-filter: blur(5px); pointer-events: auto; width: 250px; }
        .hud-title { color: #00f3ff; font-size: 10px; font-weight: 900; letter-spacing: 2px; margin-bottom: 12px; border-bottom: 1px solid rgba(0, 243, 255, 0.2); padding-bottom: 5px; }
        
        .map-controls button { display: block; width: 100%; padding: 8px; margin-bottom: 8px; background: rgba(0, 0, 0, 0.5); border: 1px solid #333; color: #aaa; font-family: monospace; font-size: 11px; cursor: pointer; transition: all 0.2s; text-align: left; letter-spacing: 1px; }
        .map-controls button:last-child { margin-bottom: 0; }
        .map-controls button:hover { border-color: #00f3ff; color: #fff; }
        .map-controls button.active { background: rgba(0, 243, 255, 0.15); border-color: #00f3ff; color: #00f3ff; font-weight: bold; box-shadow: inset 0 0 10px rgba(0, 243, 255, 0.2); }
        
        .grid-stats .stat-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px; font-family: monospace; color: #ccc; }
        .grid-stats .stat-row:last-child { margin-bottom: 0; }
        
        .custom-tooltip { background: rgba(0, 0, 0, 0.9) !important; border: 1px solid #333 !important; color: #fff !important; font-family: monospace !important; padding: 8px !important; box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important; border-radius: 4px !important; }
        .custom-tooltip::before { display: none !important; }
        
        .map-sidebar { width: 380px; background: rgba(2, 2, 5, 0.95); border-left: 1px solid #00f3ff; transform: translateX(100%); transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); padding: 25px; display: flex; flex-direction: column; z-index: 1000; box-shadow: -10px 0 30px rgba(0,0,0,0.8); }
        .map-sidebar.open { transform: translateX(0); }
        .sidebar-empty { color: #555; font-size: 12px; text-align: center; margin-top: 50%; letter-spacing: 3px; font-weight: bold; }
        .sidebar-content h3 { margin: 0 0 25px 0; font-size: 28px; text-shadow: 0 0 15px currentColor; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 18px; font-size: 13px; font-weight: bold; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 8px; color: #ddd; }
        
        .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 40px; }
        .cmd-btn { padding: 12px; font-weight: 900; border-radius: 4px; cursor: pointer; border: 1px solid; background: rgba(0,0,0,0.5); font-size: 10px; letter-spacing: 1px; transition: all 0.2s; font-family: monospace; }
        .cmd-btn.safe { color: #00f3ff; border-color: rgba(0, 243, 255, 0.5); }
        .cmd-btn.safe:hover { background: rgba(0, 243, 255, 0.15); border-color: #00f3ff; box-shadow: 0 0 15px rgba(0, 243, 255, 0.2); }
        .cmd-btn.warn { color: #ffb700; border-color: rgba(255, 183, 0, 0.5); }
        .cmd-btn.warn:hover { background: rgba(255, 183, 0, 0.15); border-color: #ffb700; box-shadow: 0 0 15px rgba(255, 183, 0, 0.2); }
        .cmd-btn.danger { color: #ff1a1a; border-color: rgba(255, 26, 26, 0.5); }
        .cmd-btn.danger:hover { background: rgba(255, 26, 26, 0.15); border-color: #ff1a1a; box-shadow: 0 0 15px rgba(255, 26, 26, 0.2); }
        
        .close-btn { margin-top: auto; padding: 15px; background: rgba(0,0,0,0.5); color: #888; border: 1px solid #333; cursor: pointer; font-weight: bold; font-family: monospace; transition: all 0.2s; letter-spacing: 2px; }
        .close-btn:hover { background: #111; color: #fff; border-color: #555; }
        
        .leaflet-container { background: #020205 !important; }
        .leaflet-control-zoom a { background: rgba(0, 0, 0, 0.8) !important; color: #00f3ff !important; border: 1px solid #333 !important; }
        .leaflet-control-zoom a:hover { background: rgba(0, 243, 255, 0.2) !important; border-color: #00f3ff !important; }
      `}</style>
    </div>
  );
}