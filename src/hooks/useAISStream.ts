'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MALTA_BBOX } from '@/lib/malta/bbox';

export interface AISMessage {
  MessageType: 'PositionReport' | 'ShipStaticData' | 'ShipStaticDataReport' | 'LongRangeAisBroadcastMessage';
  MetaData: {
    MMSI: number;
    ShipName?: string;
    CallSign?: string;
    IMO?: string;
    Type?: number;
    DimensionA?: number;
    DimensionB?: number;
    DimensionC?: number;
    DimensionD?: number;
    Destination?: string;
    ETA?: string;
    Draught?: number;
  };
  Message: {
    PositionReport?: {
      Latitude: number;
      Longitude: number;
      Sog: number;      // Speed over ground (knots * 10)
      Cog: number;      // Course over ground (degrees * 10)
      TrueHeading: number;
      NavStatus: number;
      Rot: number;      // Rate of turn
      Timestamp: number;
    };
    ShipStaticData?: {
      Name: string;
      CallSign: string;
      Destination: string;
      Type: number;
      DimensionA: number;
      DimensionB: number;
      DimensionC: number;
      DimensionD: number;
      Draught: number;
      ETA: string;
    };
    ShipStaticDataReport?: {
      Name: string;
      CallSign: string;
      Destination: string;
      Type: number;
    };
    LongRangeAisBroadcastMessage?: {
      Latitude: number;
      Longitude: number;
      Sog: number;
      Cog: number;
    };
  };
}

export interface Vessel {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  sog: number;          // Speed over ground (knots)
  cog: number;          // Course over ground (degrees)
  heading: number;      // True heading (degrees)
  navStatus: number;
  rot: number;          // Rate of turn
  type: string;         // cargo, tanker, passenger, fishing, military, etc.
  dimension: { a: number; b: number; c: number; d: number }; // meters
  draught: number;      // meters * 10
  destination: string;
  eta: string;
  callSign: string;
  imo: string;
  lastUpdate: number;
  positionAge: number;  // seconds
}

const SHIP_TYPE_NAMES: Record<number, string> = {
  // Cargo
  70: 'Cargo', 71: 'Cargo', 72: 'Cargo', 73: 'Cargo', 74: 'Cargo',
  75: 'Cargo', 76: 'Cargo', 77: 'Cargo', 78: 'Cargo', 79: 'Cargo',
  // Tanker
  80: 'Tanker', 81: 'Tanker', 82: 'Tanker', 83: 'Tanker', 84: 'Tanker',
  85: 'Tanker', 86: 'Tanker', 87: 'Tanker', 88: 'Tanker', 89: 'Tanker',
  // Passenger
  60: 'Passenger', 61: 'Passenger', 62: 'Passenger', 63: 'Passenger',
  64: 'Passenger', 65: 'Passenger', 66: 'Passenger', 67: 'Passenger',
  68: 'Passenger', 69: 'Passenger',
  // Fishing
  30: 'Fishing', 31: 'Fishing', 32: 'Fishing', 33: 'Fishing',
  34: 'Fishing', 35: 'Fishing', 36: 'Fishing', 37: 'Fishing',
  38: 'Fishing', 39: 'Fishing',
  // High speed
  50: 'High Speed', 51: 'High Speed', 52: 'Tug', 53: 'Tug', 54: 'Tug',
  55: 'SAR', 56: 'SAR', 57: 'SAR', 58: 'SAR', 59: 'SAR',
  // Other
  90: 'Other', 91: 'Other', 92: 'Other', 93: 'Other', 94: 'Other',
  95: 'Other', 96: 'Other', 97: 'Other', 98: 'Other', 99: 'Other',
};

const NAV_STATUS_NAMES: Record<number, string> = {
  0: 'Under way using engine',
  1: 'At anchor',
  2: 'Not under command',
  3: 'Restricted manoeuvrability',
  4: 'Constrained by draught',
  5: 'Moored',
  6: 'Aground',
  7: 'Engaged in fishing',
  8: 'Under way sailing',
  9: 'Reserved for HSC',
  10: 'Reserved for WIG',
  15: 'Not defined (default)',
};

function getShipTypeName(typeCode: number): string {
  return SHIP_TYPE_NAMES[typeCode] || 'Unknown';
}

function getNavStatusName(status: number): string {
  return NAV_STATUS_NAMES[status] || 'Unknown';
}

function parseAISMessage(msg: AISMessage): Partial<Vessel> | null {
  const mmsi = msg.MetaData.MMSI;
  if (!mmsi) return null;

  const vessel: Partial<Vessel> = { mmsi };

  // Static data (name, type, dimensions, destination)
  if (msg.MessageType === 'ShipStaticData' && msg.Message.ShipStaticData) {
    const s = msg.Message.ShipStaticData;
    vessel.name = s.Name?.trim() || '';
    vessel.type = getShipTypeName(s.Type);
    vessel.dimension = {
      a: s.DimensionA || 0,
      b: s.DimensionB || 0,
      c: s.DimensionC || 0,
      d: s.DimensionD || 0,
    };
    vessel.draught = s.Draught || 0;
    vessel.destination = s.Destination?.trim() || '';
    vessel.eta = s.ETA || '';
  } else if (msg.MessageType === 'ShipStaticDataReport' && msg.Message.ShipStaticDataReport) {
    const s = msg.Message.ShipStaticDataReport;
    vessel.name = s.Name?.trim() || '';
    vessel.type = getShipTypeName(s.Type);
    vessel.callSign = s.CallSign?.trim() || '';
    vessel.destination = s.Destination?.trim() || '';
  }

  // Position report (lat, lng, speed, course, heading)
  if (msg.MessageType === 'PositionReport' && msg.Message.PositionReport) {
    const p = msg.Message.PositionReport;
    vessel.lat = p.Latitude;
    vessel.lng = p.Longitude;
    vessel.sog = (p.Sog || 0) / 10; // Convert from knots*10 to knots
    vessel.cog = (p.Cog || 0) / 10; // Convert from degrees*10 to degrees
    vessel.heading = p.TrueHeading >= 0 && p.TrueHeading < 360 ? p.TrueHeading : p.Cog / 10;
    vessel.navStatus = p.NavStatus || 0;
    vessel.rot = p.Rot || 0;
    vessel.lastUpdate = Date.now();
  } else if (msg.MessageType === 'LongRangeAisBroadcastMessage' && msg.Message.LongRangeAisBroadcastMessage) {
    const p = msg.Message.LongRangeAisBroadcastMessage;
    vessel.lat = p.Latitude;
    vessel.lng = p.Longitude;
    vessel.sog = (p.Sog || 0) / 10;
    vessel.cog = (p.Cog || 0) / 10;
    vessel.lastUpdate = Date.now();
  }

  return Object.keys(vessel).length > 1 ? vessel : null;
}

interface UseAISStreamOptions {
  bbox?: { north: number; south: number; east: number; west: number };
  apiKey?: string;
  onVesselUpdate?: (vessel: Vessel) => void;
  onError?: (error: Error) => void;
  maxVessels?: number;
  enabled?: boolean;
}

interface UseAISStreamReturn {
  vessels: Map<number, Vessel>;
  vesselCount: number;
  isConnected: boolean;
  error: Error | null;
  status: 'connecting' | 'connected' | 'error' | 'disabled';
  connect: () => void;
  disconnect: () => void;
}

export function useAISStream(options: UseAISStreamOptions = {}): UseAISStreamReturn {
  console.log('[useAISSTREAM HOOK] Called with options:', options);
  const {
    bbox = MALTA_BBOX,
    apiKey = '',
    onVesselUpdate,
    onError,
    maxVessels = 5000,
    enabled = true,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const vesselsRef = useRef<Map<number, Vessel>>(new Map());
  const [vesselCount, setVesselCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageCountRef = useRef(0);
  const connectCallbackRef = useRef(() => {});

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Define connect function and keep it in a ref for use in timeouts
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[AIS] Connected to aisstream.io');
        setIsConnected(true);
        setError(null);

        const subscriptionMessage = {
          APIKey: apiKey,
          BoundingBoxes: [[
            [bbox.south, bbox.west],
            [bbox.north, bbox.east]
          ]],
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        };
        ws.send(JSON.stringify(subscriptionMessage));
      };

      ws.onmessage = (event) => {
        try {
          messageCountRef.current++;
          const msg = JSON.parse(event.data) as AISMessage;
          const parsed = parseAISMessage(msg);
          
          if (parsed && parsed.lat != null && parsed.lng != null && parsed.mmsi) {
            const existing = vesselsRef.current.get(parsed.mmsi) || { mmsi: parsed.mmsi } as Vessel;
            const updated: Vessel = {
              ...existing,
              ...parsed,
              positionAge: parsed.lastUpdate ? Math.round((Date.now() - parsed.lastUpdate) / 1000) : 0,
            } as Vessel;

            vesselsRef.current.set(parsed.mmsi, updated);

            // Limit vessel count
            if (vesselsRef.current.size > maxVessels) {
              const firstKey = vesselsRef.current.keys().next().value;
              if (firstKey) vesselsRef.current.delete(firstKey);
            }

            setVesselCount(vesselsRef.current.size);
            onVesselUpdate?.(updated);
          }
        } catch (e) {
          console.warn('[AIS] Message parse error:', e);
        }
      };

      ws.onclose = () => {
        console.log('[AIS] Disconnected, reconnecting in 5s...');
        setIsConnected(false);
        // Use the ref to call the latest connect callback
        reconnectTimeoutRef.current = setTimeout(() => {
          connectCallbackRef.current();
        }, 5000);
      };

      ws.onerror = (err) => {
        console.error('[AIS] WebSocket error:', err);
        setError(new Error('WebSocket connection error'));
        onError?.(new Error('WebSocket connection error'));
        ws.close();
      };
    } catch (e) {
      console.error('[AIS] Connection failed:', e);
      setError(e as Error);
      onError?.(e as Error);
      // Schedule retry using the ref
      reconnectTimeoutRef.current = setTimeout(() => {
        connectCallbackRef.current();
      }, 5000);
    }
  }, [apiKey, bbox, onVesselUpdate, onError, maxVessels]);

  // Keep the ref up to date
  useEffect(() => {
    connectCallbackRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    cleanup();
    vesselsRef.current.clear();
    setVesselCount(0);
  }, [cleanup]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled]);

  // Compute status for compatibility with MaltaDashboard
  const status = !enabled
    ? 'disabled'
    : isConnected
    ? 'connected'
    : error
    ? 'error'
    : 'connecting';

  // Return vessels as array for easier consumption
  const vesselsArray = Array.from(vesselsRef.current.values());

  return {
    vessels: vesselsRef.current,
    vesselCount,
    isConnected,
    error,
    status,
    connect,
    disconnect,
  };
}

// Hook for getting vessels within viewport (for map rendering)
export function useViewportVessels(
  vessels: Map<number, Vessel>,
  bounds: { north: number; south: number; east: number; west: number } | null,
  maxCount = 1000
): Vessel[] {
  if (!bounds) return [];

  return Array.from(vessels.values())
    .filter(v => 
      v.lat >= bounds.south && v.lat <= bounds.north &&
      v.lng >= bounds.west && v.lng <= bounds.east
    )
    .slice(0, maxCount);
}

// Hook for vessel clustering at low zoom
export function useClusteredVessels(
  vessels: Vessel[],
  zoom: number,
  clusterDistanceKm = 5
): Vessel[] {
  if (zoom >= 10 || vessels.length === 0) return vessels;

  const clusters: Map<string, Vessel[]> = new Map();
  const gridSize = clusterDistanceKm / 111; // rough degrees per km

  for (const vessel of vessels) {
    const gridX = Math.floor(vessel.lng / gridSize);
    const gridY = Math.floor(vessel.lat / gridSize);
    const key = `${gridX},${gridY}`;
    if (!clusters.has(key)) {
      const clusterVessel: Vessel = {
        ...vessel,
        mssi: 0, // Special marker for cluster
        name: `Cluster (1)`,
        type: 'cluster',
      };
      clusters.set(key, [clusterVessel]);
    } else {
      const cluster = clusters.get(key)!;
      cluster.push(vessel);
      // Update the cluster representative
      const clusterVessel = cluster[0];
      const avgLat = cluster.reduce((sum, v) => sum + v.lat, 0) / cluster.length;
      const avgLng = cluster.reduce((sum, v) => sum + v.lng, 0) / cluster.length;
      
      clusterVessel.lat = avgLat;
      clusterVessel.lng = avgLng;
      clusterVessel.name = `Cluster (${cluster.length})`;
      clusterVessel.type = 'cluster';
      clusterVessel.lastUpdate = Date.now();
    }
  }

  // Flatten the clusters
  const result: Vessel[] = [];
  for (const cluster of clusters.values()) {
    if (cluster.length === 1) {
      result.push(cluster[0]);
    } else {
      // Recalculate the cluster representative (in case it was updated multiple times)
      const clusterVessel = cluster[0];
      const avgLat = cluster.reduce((sum, v) => sum + v.lat, 0) / cluster.length;
      const avgLng = cluster.reduce((sum, v) => sum + v.lng, 0) / cluster.length;
      
      clusterVessel.lat = avgLat;
      clusterVessel.lng = avgLng;
      clusterVessel.name = `Cluster (${cluster.length})`;
      clusterVessel.type = 'cluster';
      clusterVessel.lastUpdate = Date.now();
      
      result.push(clusterVessel);
    }
  }
  
  return result;
}