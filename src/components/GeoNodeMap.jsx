import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useStore from '../engine/gameState';
import { fetchCoordinates, generateRegionalGrid } from '../engine/geoUtils'; 

const MAP_STYLES = {
  TACTICAL_DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  MIDNIGHT: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
  BLUEPRINT: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png',
  SATELLITE: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  TOPOGRAPHIC: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
};

function MapResizer() {
  const map = useMap();

  useEffect(() => {
    let ticks = 0;
    const interval = setInterval(() => {
      map.invalidateSize();
      ticks++;
      if (ticks >= 15) clearInterval(interval);
    }, 100);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
}

function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== undefined && center[1] !== undefined) {
      map.flyTo([center[0], center[1]], 10, { animate: true, duration: 1.5 });
    }
  }, [center?.[0], center?.[1], map]); 
  return null;
}

export default function GeoNodeMap() {

  const transformers = useStore(state => state.transformers);
  // NEW: Pull the auto-routed links from our state engine
  const links = useStore(state => state.links); 
  
  const sendCommand = useStore(state => state.sendCommand);
  const isBlackout = useStore(state => state.isBlackout);
  const gridEfficiency = useStore(state => state.gridEfficiency);
  const storeMapCenter = useStore(state => state.mapCenter);
  
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeMapStyle, setActiveMapStyle] = useState('TACTICAL_DARK');
  const [geoData, setGeoData] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (transformers.length > 0) {
      const coords = {};
      transformers.forEach((t) => {
        if (t.lat !== undefined && t.lng !== undefined) {
          coords[t.id] = [t.lat, t.lng];
        }
      });
      setGeoData(coords);
    } else {
      setGeoData({}); 
    }
  }, [transformers]);

  const handleGlobalSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const coords = await fetchCoordinates(searchQuery);
    
    if (coords) {
      const cityName = coords.city || 
                       coords.town || 
                       coords.village || 
                       (coords.displayName ? coords.displayName.split(',')[0] : searchQuery);
      
      useStore.getState().setMapCenter([coords.lat, coords.lng]);
      const { newNodes, newLinks } = await generateRegionalGrid(coords.lat, coords.lng, cityName, 24);
      useStore.getState().addDynamicNodes(newNodes, newLinks, cityName); 
      useStore.getState().addLog(`DISCOVERED GRID: ${cityName.toUpperCase()}`, 'SUCCESS');
      
      setSearchQuery('');
    } else {
      useStore.getState().addLog(`SEARCH FAILED: ${searchQuery.toUpperCase()}`, 'ERROR');
    }
    setIsSearching(false);
  };

  const getNodeColor = (status) => {
    if (status === 'FAILED') return '#ff1a1a';
    if (status === 'DEGRADED') return '#ffb700';
    if (status === 'MAINTENANCE') return '#888888';
    return '#00f3ff';
  };

  const createCustomIcon = (status, isSelected) => {
    const color = getNodeColor(status);
    const size = isSelected ? 44 : 28;
    const zIndex = isSelected ? 1000 : 1;
    const glow = isSelected ? `box-shadow: 0 0 25px ${color}, inset 0 0 15px ${color};` : `box-shadow: 0 0 10px ${color};`;
    
    const html = `
      <style>
        @keyframes pulse-ring-${status} {
          0% { transform: scale(0.8); opacity: 0.8; box-shadow: 0 0 0 0 ${color}80; }
          100% { transform: scale(1.5); opacity: 0; box-shadow: 0 0 0 20px ${color}00; }
        }
      </style>
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: rgba(5, 5, 10, 0.85);
        border: 2px solid ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        ${glow}
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        z-index: ${zIndex};
        position: relative;
      ">
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          animation: pulse-ring-${status} 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        "></div>
        <div style="
          width: ${size / 2.5}px;
          height: ${size / 2.5}px;
          background-color: ${color};
          border-radius: 50%;
          box-shadow: 0 0 8px ${color};
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

  // REWRITTEN: Now properly maps the 'links' array from our state engine
  const renderPolylines = useMemo(() => {
    if (!links || links.length === 0) return null;

    return links.map((link, index) => {
      const sourceNode = transformers.find(t => t.id === link.source);
      const targetNode = transformers.find(t => t.id === link.target);

      if (!sourceNode || !targetNode) return null;

      const sourceCoord = geoData[link.source];
      const targetCoord = geoData[link.target];

      // STRICT TYPE CHECK: Prevents leaflet crash
      if (!sourceCoord || typeof sourceCoord[0] !== 'number' || typeof sourceCoord[1] !== 'number') return null;
      if (!targetCoord || typeof targetCoord[0] !== 'number' || typeof targetCoord[1] !== 'number') return null;

      const isActive = sourceNode.status === 'ONLINE' && targetNode.status === 'ONLINE';
      const color = isActive ? '#00f3ff' : '#ff1a1a';
      const opacity = isActive ? 0.6 : 0.25;
      const dashArray = isActive ? null : '5, 15';
      const weight = isActive ? 3 : 2;

      return (
        <Polyline
          key={`cable-${index}`}
          positions={[sourceCoord, targetCoord]}
          color={color}
          weight={weight}
          opacity={opacity}
          dashArray={dashArray}
          className={`transmission-line ${isActive ? 'active-line' : 'fault-line'}`}
        />
      );
    });
  }, [links, transformers, geoData]);

  const activeNodeData = transformers.find(t => t.id === selectedNode);

  return (
    <div className="geo-wrapper">
      
      {/* HUD OVERLAY LEFT */}
      <div className="geo-hud-overlay">
        
        {/* GLOBAL COMMAND SEARCH */}
        <div className="hud-panel search-panel">
          <div className="hud-title">GLOBAL UPLINK</div>
          <form onSubmit={handleGlobalSearch} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="ENTER CITY OR COORDINATE..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching}
              className="hud-search-input"
            />
            <button type="submit" className="hud-search-btn" disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? '...' : 'SCAN'}
            </button>
          </form>
        </div>

        <div className="hud-panel map-controls">
          <div className="hud-title">MAP LAYER</div>
          
          <button 
            type="button" 
            className={activeMapStyle === 'TACTICAL_DARK' ? 'active' : ''} 
            onClick={() => setActiveMapStyle('TACTICAL_DARK')}
          >
            TACTICAL DARK
          </button>

          <button 
            type="button" 
            className={activeMapStyle === 'MIDNIGHT' ? 'active' : ''} 
            onClick={() => setActiveMapStyle('MIDNIGHT')}
          >
            MIDNIGHT OPS
          </button>

          <button 
            type="button" 
            className={activeMapStyle === 'BLUEPRINT' ? 'active' : ''} 
            onClick={() => setActiveMapStyle('BLUEPRINT')}
          >
            TECH BLUEPRINT
          </button>

          <button 
            type="button" 
            className={activeMapStyle === 'SATELLITE' ? 'active' : ''} 
            onClick={() => setActiveMapStyle('SATELLITE')}
          >
            ORBITAL SATELLITE
          </button>

          <button 
            type="button" 
            className={activeMapStyle === 'TOPOGRAPHIC' ? 'active' : ''} 
            onClick={() => setActiveMapStyle('TOPOGRAPHIC')}
          >
            TERRAIN SCAN
          </button>
        </div>
        
        <div className="hud-panel grid-stats">
          <div className="hud-title">REGIONAL TELEMETRY</div>
          <div className="stat-row">
            <span>NETWORK HEALTH</span>
            <span style={{ color: isBlackout ? '#ff1a1a' : '#00f3ff', textShadow: `0 0 8px ${isBlackout ? '#ff1a1a' : '#00f3ff'}` }}>
              {(gridEfficiency * 100).toFixed(1)}%
            </span>
          </div>
          <div className="stat-row">
            <span>ACTIVE UPLINKS</span>
            <span style={{ color: '#fff' }}>{transformers.filter(t => t.status === 'ONLINE').length} / {transformers.length || 0}</span>
          </div>
          <div className="stat-row">
            <span>CRITICAL FAULTS</span>
            <span style={{ color: transformers.filter(t => t.status === 'FAILED').length > 0 ? '#ff1a1a' : '#00f3ff' }}>
              {transformers.filter(t => t.status === 'FAILED').length}
            </span>
          </div>
        </div>
      </div>

      <div className="map-container-frame">
        <MapContainer 
          center={storeMapCenter || [0,0]} 
          zoom={10} 
          zoomControl={false}
          preferCanvas={true}
          style={{ height: '100%', width: '100%', background: '#050508' }}
        >
          <MapResizer />
          <MapFlyTo center={storeMapCenter} />
          
          <TileLayer
            url={MAP_STYLES[activeMapStyle] || MAP_STYLES.TACTICAL_DARK}
            attribution='&copy; OpenStreetMap contributors, CartoDB, Esri'
          />
          
          {renderPolylines}

          {useMemo(() => {
            return transformers.map(node => {
              const position = (node.lat !== undefined && node.lng !== undefined) 
                ? [node.lat, node.lng] 
                : geoData[node.id];
              
              if (!position || typeof position[0] !== 'number' || typeof position[1] !== 'number') return null;
              
              return (
                <Marker
                  key={node.id}
                  position={position}
                  icon={createCustomIcon(node.status, selectedNode === node.id)}
                  eventHandlers={{ click: () => setSelectedNode(node.id) }}
                >
                  <Tooltip className="custom-tooltip">
                    <div style={{ color: getNodeColor(node.status), fontWeight: '900' }}>{node.id}</div>
                    <div style={{ fontSize: '10px' }}>{node.role}</div>
                  </Tooltip>
                </Marker>
              );
            });
          }, [transformers, geoData, selectedNode])}
        </MapContainer>
      </div>

      {/* INSPECTION SIDEBAR */}
      <div className={`map-sidebar ${selectedNode ? 'open' : ''}`}>
        {activeNodeData ? (
          <div className="sidebar-content">
            <h3 style={{ color: getNodeColor(activeNodeData.status) }}>{activeNodeData.id}</h3>
            <div className="detail-row"><span>COORDINATES</span> <span className="mono-value">{geoData[activeNodeData.id]?.[0].toFixed(4) || 0}, {geoData[activeNodeData.id]?.[1].toFixed(4) || 0}</span></div>
            <div className="detail-row"><span>ROLE</span> <span className="mono-value">{activeNodeData.role}</span></div>
            <div className="detail-row"><span>SECTOR</span> <span className="mono-value">{activeNodeData.sector}</span></div>
            <div className="detail-row">
              <span>STATUS</span> 
              <span className="mono-value status-glow" style={{ color: getNodeColor(activeNodeData.status), '--glow': getNodeColor(activeNodeData.status) }}>
                {activeNodeData.status}
              </span>
            </div>
            <div className="detail-row"><span>TEMP</span> <span className="mono-value" style={{ color: activeNodeData.temp > 90 ? '#ffb700' : '#fff' }}>{activeNodeData.temp.toFixed(1)}°C</span></div>
            <div className="detail-row"><span>LOAD</span> <span className="mono-value">{activeNodeData.load.toFixed(0)} / {activeNodeData.cap} MW</span></div>
            
            <div className="action-grid">
              <button type="button" onClick={() => sendCommand(activeNodeData.id, 'REBOOT')} className="cmd-btn safe">REBOOT SEQUENCE</button>
              <button type="button" onClick={() => sendCommand(activeNodeData.id, 'FORCE_COOL')} className="cmd-btn safe">FLUSH COOLANT</button>
              <button type="button" onClick={() => sendCommand(activeNodeData.id, 'ISOLATE')} className="cmd-btn warn">ISOLATE NODE</button>
              <button type="button" onClick={() => sendCommand(activeNodeData.id, 'SHUTDOWN')} className="cmd-btn danger">EMERGENCY SHUTDOWN</button>
            </div>
            
            <button type="button" className="close-btn" onClick={() => setSelectedNode(null)}>DISMISS INSPECTION</button>
          </div>
        ) : (
          <div className="sidebar-empty">
            <div className="radar-spinner"></div>
            AWAITING NODE SELECTION
          </div>
        )}
      </div>

      <style>{`
      
        .geo-wrapper { 
          position: relative; width: 100%; height: 800px; display: flex; overflow: hidden; 
          border: 1px solid #00f3ff; border-radius: 8px; box-shadow: 0 0 30px rgba(0, 243, 255, 0.15); 
          background: #050508; font-family: 'Courier New', Courier, monospace;
        }
        
        .map-container-frame { 
          flex: 1; position: relative; z-index: 1; width: 100%; height: 100%; 
        }
        
        /* HUD PANELS */
        .geo-hud-overlay { 
          position: absolute; top: 25px; left: 25px; z-index: 1000; 
          display: flex; flex-direction: column; gap: 20px; pointer-events: none; 
        }
        .hud-panel { 
          background: rgba(5, 5, 10, 0.85); border: 1px solid #1a1a2e; padding: 20px; 
          border-radius: 8px; backdrop-filter: blur(10px); pointer-events: auto; width: 320px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,243,255,0.05);
        }
        .hud-title { 
          color: #00f3ff; font-size: 12px; font-weight: 900; letter-spacing: 3px; 
          margin-bottom: 15px; border-bottom: 1px solid rgba(0, 243, 255, 0.3); padding-bottom: 8px; 
          text-shadow: 0 0 8px rgba(0,243,255,0.5);
        }

        /* SEARCH INPUT */
        .hud-search-input {
          flex: 1; background: rgba(0,0,0,0.6); border: 1px solid #2a2a3e; padding: 10px;
          color: #fff; font-family: inherit; font-size: 11px; border-radius: 4px; outline: none;
          letter-spacing: 1px; transition: all 0.3s ease;
        }
        .hud-search-input:focus { border-color: #00f3ff; box-shadow: 0 0 10px rgba(0,243,255,0.2); }
        .hud-search-btn {
          background: rgba(0, 243, 255, 0.1); border: 1px solid #00f3ff; color: #00f3ff;
          padding: 0 15px; font-weight: bold; cursor: pointer; border-radius: 4px;
          transition: all 0.3s ease; font-family: inherit;
        }
        .hud-search-btn:hover:not(:disabled) { background: #00f3ff; color: #000; box-shadow: 0 0 15px #00f3ff; }
        .hud-search-btn:disabled { opacity: 0.5; cursor: not-allowed; border-color: #555; color: #555; }
        
        /* CONTROLS */
        .map-controls button { 
          display: block; width: 100%; padding: 10px; margin-bottom: 10px; 
          background: rgba(0, 0, 0, 0.6); border: 1px solid #2a2a3e; color: #888; 
          font-family: inherit; font-size: 11px; font-weight: 600; cursor: pointer; 
          transition: all 0.3s ease; text-align: left; letter-spacing: 2px; border-radius: 4px;
        }
        .map-controls button:last-child { margin-bottom: 0; }
        .map-controls button:hover { border-color: #00f3ff; color: #fff; box-shadow: inset 0 0 10px rgba(0,243,255,0.1); }
        .map-controls button.active { 
          background: rgba(0, 243, 255, 0.1); border-color: #00f3ff; color: #00f3ff; 
          font-weight: 900; box-shadow: inset 0 0 15px rgba(0, 243, 255, 0.25); text-shadow: 0 0 5px #00f3ff;
        }
        
        /* STATS */
        .grid-stats .stat-row { 
          display: flex; justify-content: space-between; margin-bottom: 12px; 
          font-size: 11px; color: #aaa; letter-spacing: 1px; font-weight: bold;
        }
        .grid-stats .stat-row:last-child { margin-bottom: 0; }
        
        /* TOOLTIPS & LEAFLET TWEAKS */
        .custom-tooltip { 
          background: rgba(5, 5, 10, 0.95) !important; border: 1px solid #00f3ff !important; 
          color: #fff !important; font-family: inherit !important; padding: 10px 15px !important; 
          box-shadow: 0 8px 25px rgba(0,0,0,0.8), 0 0 15px rgba(0,243,255,0.2) !important; 
          border-radius: 6px !important; backdrop-filter: blur(5px) !important;
        }
        .custom-tooltip::before { display: none !important; }
        .leaflet-container { background: #050508 !important; }
        .leaflet-control-zoom a { 
          background: rgba(5, 5, 10, 0.9) !important; color: #00f3ff !important; 
          border: 1px solid #1a1a2e !important; box-shadow: 0 5px 15px rgba(0,0,0,0.8) !important;
        }
        .leaflet-control-zoom a:hover { background: rgba(0, 243, 255, 0.15) !important; border-color: #00f3ff !important; }
        
        /* SIDEBAR (Absolute Overlay) */
        .map-sidebar { 
          position: absolute; right: 0; top: 0; bottom: 0; width: 400px; 
          background: rgba(5, 5, 10, 0.85); border-left: 1px solid #00f3ff; 
          transform: translateX(100%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1); 
          padding: 30px; display: flex; flex-direction: column; z-index: 1000; 
          box-shadow: -15px 0 40px rgba(0,0,0,0.9), inset 5px 0 20px rgba(0,243,255,0.05); 
          backdrop-filter: blur(15px);
        }
        .map-sidebar.open { transform: translateX(0); }
        
        .sidebar-empty { 
          color: #00f3ff; font-size: 13px; text-align: center; margin-top: auto; margin-bottom: auto; 
          letter-spacing: 4px; font-weight: 900; opacity: 0.6; display: flex; flex-direction: column; align-items: center; gap: 20px;
        }
        .radar-spinner {
          width: 40px; height: 40px; border: 2px solid transparent; border-top-color: #00f3ff; 
          border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .sidebar-content h3 { 
          margin: 0 0 30px 0; font-size: 32px; text-shadow: 0 0 20px currentColor; 
          border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 20px; letter-spacing: 3px;
        }
        .detail-row { 
          display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; 
          font-size: 11px; font-weight: bold; border-bottom: 1px dashed rgba(255,255,255,0.1); 
          padding-bottom: 10px; color: #888; letter-spacing: 1.5px;
        }
        .mono-value { font-size: 14px; color: #fff; text-shadow: 0 0 8px rgba(255,255,255,0.3); }
        .status-glow { text-shadow: 0 0 10px var(--glow), 0 0 20px var(--glow); font-weight: 900; }
        
        /* COMMAND BUTTONS */
        .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 40px; }
        .cmd-btn { 
          padding: 15px 10px; font-weight: 900; border-radius: 6px; cursor: pointer; 
          border: 1px solid; background: rgba(0,0,0,0.6); font-size: 10px; 
          letter-spacing: 1px; transition: all 0.3s ease; font-family: inherit;
        }
        .cmd-btn.safe { color: #00f3ff; border-color: rgba(0, 243, 255, 0.4); }
        .cmd-btn.safe:hover { background: rgba(0, 243, 255, 0.15); border-color: #00f3ff; box-shadow: 0 0 20px rgba(0, 243, 255, 0.3); }
        .cmd-btn.warn { color: #ffb700; border-color: rgba(255, 183, 0, 0.4); }
        .cmd-btn.warn:hover { background: rgba(255, 183, 0, 0.15); border-color: #ffb700; box-shadow: 0 0 20px rgba(255, 183, 0, 0.3); }
        .cmd-btn.danger { color: #ff1a1a; border-color: rgba(255, 26, 26, 0.4); }
        .cmd-btn.danger:hover { background: rgba(255, 26, 26, 0.15); border-color: #ff1a1a; box-shadow: 0 0 20px rgba(255, 26, 26, 0.3); }
        
        .close-btn { 
          margin-top: auto; padding: 18px; background: rgba(0,0,0,0.8); color: #00f3ff; 
          border: 1px solid #1a1a2e; cursor: pointer; font-weight: 900; font-family: inherit; 
          transition: all 0.3s ease; letter-spacing: 3px; border-radius: 6px;
        }
        .close-btn:hover { background: rgba(0, 243, 255, 0.1); border-color: #00f3ff; box-shadow: inset 0 0 15px rgba(0,243,255,0.2); }
        
        /* TRANSMISSION LINE EFFECTS */
        .transmission-line { transition: stroke 0.3s ease, opacity 0.3s ease; }
        .active-line { filter: drop-shadow(0 0 5px #00f3ff); }
        .fault-line { filter: drop-shadow(0 0 8px #ff1a1a); animation: fault-flicker 2s infinite; }
        @keyframes fault-flicker {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.05; }
        }
      `}</style>
    </div>
  );
}