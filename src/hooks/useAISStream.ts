'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface Vessel {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  sog: number;
  cog: number;
  heading: number;
  navStatus: number;
  rot: number;
  type: string;
  dimension: { a: number; b: number; c: number; d: number };
  draught: number;
  destination: string;
  eta: string;
  callSign: string;
  imo: string;
  lastUpdate: number;
  positionAge: number;
}

interface UseAISStreamOptions {
  enabled?: boolean;
}

interface UseAISStreamReturn {
  vessels: Map<number, Vessel>;
  vesselCount: number;
  isConnected: boolean;
  error: Error | null;
  status: 'connecting' | 'connected' | 'error' | 'disabled';
}

const AIS_WS_URL = 'wss://stream.aisstream.io/v0/stream';
const MALTA_BOUNDING_BOX = [[[35.55, 14.1], [36.1, 14.6]]];
const WORLD_BOUNDING_BOX = [[[-90, -180], [90, 180]]];
const STALE_MS = 600000;

function vesselFromPositionReport(msg: any): Vessel | null {
  const meta = msg.metaData;
  const pos = msg.message?.position;
  if (!meta?.mmsi || !pos) return null;
  const mmsi = Number(meta.mmsi);
  return {
    mmsi,
    name: meta.shipName || `MMSI-${mmsi}`,
    lat: pos.lat,
    lng: pos.lon,
    sog: msg.message.sog ?? 0,
    cog: msg.message.cog ?? 0,
    heading: msg.message.heading ?? 0,
    navStatus: msg.message.navStatus ?? 0,
    rot: msg.message.rot ?? 0,
    type: meta.shipType != null ? String(meta.shipType) : 'unknown',
    dimension: {
      a: msg.message.dimension?.a ?? 0,
      b: msg.message.dimension?.b ?? 0,
      c: msg.message.dimension?.c ?? 0,
      d: msg.message.dimension?.d ?? 0,
    },
    draught: msg.message.draught ?? 0,
    destination: msg.message.destination || '',
    eta: msg.message.eta || '',
    callSign: meta.callSign || '',
    imo: meta.imo ? String(meta.imo) : '',
    lastUpdate: Date.now(),
    positionAge: 0,
  };
}

export function useAISStream(options: UseAISStreamOptions = {}): UseAISStreamReturn {
  const { enabled = true } = options;

  const vesselsRef = useRef<Map<number, Vessel>>(new Map());
  const [vesselCount, setVesselCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const apiKeyRef = useRef<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef(false);

  const connectWs = useCallback(async () => {
    if (!apiKeyRef.current) {
      try {
        const configRes = await fetch('/api/config');
        if (configRes.ok) {
          const config = await configRes.json();
          apiKeyRef.current = config.values?.AIS_API_KEY || null;
        }
      } catch {
        // fallback to poll
      }
    }

    if (!apiKeyRef.current) return;

    cleanupRef.current = false;
    try {
      const ws = new WebSocket(`${AIS_WS_URL}?apiKey=${apiKeyRef.current}`);

      ws.onopen = () => {
        if (cleanupRef.current) { ws.close(); return; }
        ws.send(JSON.stringify({
          boundingBoxes: WORLD_BOUNDING_BOX,
          filterMessageTypes: ['PositionReport', 'ShipStaticData'],
        }));
        setIsConnected(true);
        setError(null);
        wsRef.current = ws;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.messageType === 'PositionReport') {
            const vessel = vesselFromPositionReport(msg);
            if (vessel) {
              vesselsRef.current.set(vessel.mmsi, vessel);
              setVesselCount(vesselsRef.current.size);
            }
          } else if (msg.messageType === 'ShipStaticData') {
            const mmsi = Number(msg.metaData?.mmsi);
            const existing = vesselsRef.current.get(mmsi);
            if (existing && msg.message?.shipName) {
              existing.name = msg.message.shipName;
              existing.callSign = msg.message.callSign || existing.callSign;
              existing.imo = msg.message.imo ? String(msg.message.imo) : existing.imo;
              existing.dimension = {
                a: msg.message.dimension?.a ?? existing.dimension.a,
                b: msg.message.dimension?.b ?? existing.dimension.b,
                c: msg.message.dimension?.c ?? existing.dimension.c,
                d: msg.message.dimension?.d ?? existing.dimension.d,
              };
              existing.draught = msg.message.draught ?? existing.draught;
              existing.destination = msg.message.destination || existing.destination;
              existing.eta = msg.message.eta || existing.eta;
            }
          }
        } catch {
          // skip malformed messages
        }
      };

      ws.onerror = () => {
        if (cleanupRef.current) return;
        setError(new Error('AIS WebSocket connection failed'));
        setIsConnected(false);
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (cleanupRef.current) return;
        setIsConnected(false);
        setTimeout(connectWs, 5000);
      };
    } catch {
      setIsConnected(false);
    }
  }, []);

  const pollVessels = useCallback(async () => {
    try {
      const res = await fetch('/api/ais/vessels', { cache: 'no-store' });
      if (!res.ok) throw new Error(`AIS proxy returned ${res.status}`);
      const data = await res.json();

      if (data.connected && Array.isArray(data.vessels)) {
        setIsConnected(true);
        setError(null);
        for (const v of data.vessels) {
          if (v.mmsi) vesselsRef.current.set(v.mmsi, v as Vessel);
        }
        setVesselCount(vesselsRef.current.size);
      }
    } catch (e) {
      const staleCount = Array.from(vesselsRef.current.values())
        .filter(v => Date.now() - v.lastUpdate < STALE_MS).length;
      if (staleCount === 0) {
        setError(e instanceof Error ? e : new Error('Failed to fetch AIS data'));
        setIsConnected(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanupRef.current = true;
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      vesselsRef.current.clear();
      setVesselCount(0);
      setIsConnected(false);
      setError(null);
      return;
    }

    connectWs();
    pollRef.current = setInterval(pollVessels, 30000);

    const staleInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [mmsi, v] of vesselsRef.current) {
        if (now - v.lastUpdate > STALE_MS) {
          vesselsRef.current.delete(mmsi);
          changed = true;
        }
      }
      if (changed) setVesselCount(vesselsRef.current.size);
    }, 60000);

    return () => {
      cleanupRef.current = true;
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      clearInterval(staleInterval);
      apiKeyRef.current = null;
    };
  }, [enabled, connectWs, pollVessels]);

  const status = !enabled
    ? 'disabled'
    : isConnected
    ? 'connected'
    : error
    ? 'error'
    : 'connecting';

  return {
    vessels: vesselsRef.current,
    vesselCount,
    isConnected,
    error,
    status,
  };
}

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

export function useClusteredVessels(
  vessels: Vessel[],
  zoom: number,
  clusterDistanceKm = 5
): Vessel[] {
  if (zoom >= 10 || vessels.length === 0) return vessels;

  const clusters: Map<string, Vessel[]> = new Map();
  const gridSize = clusterDistanceKm / 111;

  for (const vessel of vessels) {
    const gridX = Math.floor(vessel.lng / gridSize);
    const gridY = Math.floor(vessel.lat / gridSize);
    const key = `${gridX},${gridY}`;
    if (!clusters.has(key)) {
      const clusterVessel: Vessel = {
        ...vessel,
        mmsi: 0,
        name: `Cluster (1)`,
        type: 'cluster',
      };
      clusters.set(key, [clusterVessel]);
    } else {
      const cluster = clusters.get(key)!;
      cluster.push(vessel);
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

  const result: Vessel[] = [];
  for (const cluster of clusters.values()) {
    if (cluster.length === 1) {
      result.push(cluster[0]);
    } else {
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
