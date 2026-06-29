import { useEffect, useRef, useState, useCallback } from 'react';
import useStore from './gameState';

export const useTelemetrySocket = (url = 'ws://localhost:8080') => {
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [bytesReceived, setBytesReceived] = useState(0);
  const [messageRate, setMessageRate] = useState(0);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const backoffRef = useRef(1000);
  const isIntentionalClose = useRef(false);
  const isConnecting = useRef(false);
  
  const pingIntervalRef = useRef(null);
  const metricsIntervalRef = useRef(null);
  const missedPongsRef = useRef(0);
  const messageCounterRef = useRef(0);
  const connectionStartTimeRef = useRef(null);

  const calculateConnectionQuality = useCallback(() => {
    if (missedPongsRef.current === 0 && messageRate > 5) return 'EXCELLENT';
    if (missedPongsRef.current < 2 && messageRate > 0) return 'GOOD';
    if (missedPongsRef.current >= 2) return 'DEGRADED';
    return 'UNKNOWN';
  }, [messageRate]);

  const connect = useCallback(() => {
    if (isConnecting.current) return;
    
    isConnecting.current = true;
    isIntentionalClose.current = false;
    setConnectionStatus('CONNECTING');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('CONNECTED');
      isConnecting.current = false;
      backoffRef.current = 1000;
      setReconnectAttempts(0);
      missedPongsRef.current = 0;
      connectionStartTimeRef.current = Date.now();
      
      useStore.getState().setSocket(ws);

      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
          missedPongsRef.current += 1;
          
          if (missedPongsRef.current > 4) {
            ws.close();
          }
        }
      }, 5000);

      metricsIntervalRef.current = setInterval(() => {
        setMessageRate(messageCounterRef.current);
        messageCounterRef.current = 0;
      }, 1000);
    };

    ws.onmessage = (event) => {
      try {
        messageCounterRef.current += 1;
        
        const payloadSize = new Blob([event.data]).size;
        setBytesReceived(prev => prev + payloadSize);
        
        const data = JSON.parse(event.data);

        if (data.type === 'PONG') {
          missedPongsRef.current = 0;
          return;
        }

        useStore.getState().updateFromTelemetry(data);
      } catch (err) {
        console.error(err);
      }
    };

    ws.onerror = () => {
      isConnecting.current = false;
    };

    ws.onclose = (event) => {
      isConnecting.current = false;
      useStore.getState().setSocket(null);
      
      clearInterval(pingIntervalRef.current);
      clearInterval(metricsIntervalRef.current);
      connectionStartTimeRef.current = null;
      setMessageRate(0);

      if (isIntentionalClose.current) {
        setConnectionStatus('DISCONNECTED');
        return;
      }

      setConnectionStatus('RECONNECTING');
      const delay = backoffRef.current;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 1.5, 30000);
        setReconnectAttempts(prev => prev + 1);
        connect();
      }, delay);
    };
  }, [url]);

  const forceDisconnect = useCallback(() => {
    isIntentionalClose.current = true;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
  }, []);

  const forceReconnect = useCallback(() => {
    forceDisconnect();
    setTimeout(() => {
      isIntentionalClose.current = false;
      connect();
    }, 500);
  }, [connect, forceDisconnect]);

  useEffect(() => {
    const debounceTimer = setTimeout(connect, 250);

    return () => {
      isIntentionalClose.current = true;
      clearTimeout(debounceTimer);
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(pingIntervalRef.current);
      clearInterval(metricsIntervalRef.current);
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return connectionStatus;
};