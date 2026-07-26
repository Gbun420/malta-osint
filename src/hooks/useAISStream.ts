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

type AISStatus =
  | 'connecting'
  | 'live-stream'
  | 'live-no-positions'
  | 'rate-limited'
  | 'auth-failed'
  | 'relay-unavailable'
  | 'cached-snapshot'
  | 'stale-snapshot'
  | 'not-configured'
  | 'disabled';

interface UseAISStreamOptions {
  enabled?: boolean;
}

interface UseAISStreamReturn {
  vessels: Map<number, Vessel>;
  vesselCount: number;
  isConnected: boolean;
  error: Error | null;
  status: AISStatus;
}

interface AISApiResponse {
  vessels: Vessel[];
  count: number;
  connected: boolean;
  error: string | null;
  timestamp: number;
}

const STALE_MS = 600000;
const POLL_INTERVAL = 30000;
const STALE_CHECK_INTERVAL = 60000;

function deriveStatus(
  apiError: string | null,
  apiConnected: boolean,
  localVesselCount: number,
): AISStatus {
  if (apiError) {
    const e = apiError.toLowerCase();
    if (e.includes('rate limit') || e.includes('429')) return 'rate-limited';
    if (e.includes('auth') || e.includes('key')) return 'auth-failed';
    if (e.includes('unavailable') || e.includes('relay')) return 'relay-unavailable';
    if (e.includes('not configured')) return 'not-configured';
  }
  if (apiConnected) {
    return localVesselCount > 0 ? 'live-stream' : 'live-no-positions';
  }
  return 'connecting';
}

export function useAISStream(options: UseAISStreamOptions = {}): UseAISStreamReturn {
  const { enabled = true } = options;

  const vesselsRef = useRef<Map<number, Vessel>>(new Map());
  const [vesselCount, setVesselCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<AISStatus>('disabled');
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const staleCheckRef = useRef<NodeJS.Timeout | null>(null);
  const hasDataRef = useRef(false);

  const pollVessels = useCallback(async () => {
    try {
      const res = await fetch('/api/ais/vessels', { cache: 'no-store' });
      if (!res.ok) throw new Error(`AIS proxy returned ${res.status}`);
      const data: AISApiResponse = await res.json();

      if (Array.isArray(data.vessels)) {
        for (const v of data.vessels) {
          if (!v.mmsi) continue;
          const vessel: Vessel = {
            ...v,
            positionAge: data.timestamp - v.lastUpdate,
          };
          vesselsRef.current.set(v.mmsi, vessel);
        }
        const count = vesselsRef.current.size;
        setVesselCount(count);
        hasDataRef.current = count > 0;
      }

      setIsConnected(data.connected || false);

      if (data.error) {
        setError(new Error(data.error));
        if (hasDataRef.current) {
          setStatus('cached-snapshot');
        } else {
          setStatus(deriveStatus(data.error, data.connected || false, 0));
        }
        return;
      }

      setError(null);
      setStatus(deriveStatus(null, data.connected || false, vesselsRef.current.size));
    } catch (e) {
      const staleCount = Array.from(vesselsRef.current.values())
        .filter(v => Date.now() - v.lastUpdate < STALE_MS).length;

      if (staleCount > 0) {
        setStatus('cached-snapshot');
        setIsConnected(false);
      } else {
        setError(e instanceof Error ? e : new Error('Failed to fetch AIS data'));
        setIsConnected(false);
        setStatus('relay-unavailable');
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (staleCheckRef.current) { clearInterval(staleCheckRef.current); staleCheckRef.current = null; }
      vesselsRef.current.clear();
      hasDataRef.current = false;
      setVesselCount(0);
      setIsConnected(false);
      setError(null);
      setStatus('disabled');
      return;
    }

    setStatus('connecting');
    pollVessels();
    pollRef.current = setInterval(pollVessels, POLL_INTERVAL);

    staleCheckRef.current = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [mmsi, v] of vesselsRef.current) {
        if (now - v.lastUpdate > STALE_MS) {
          vesselsRef.current.delete(mmsi);
          changed = true;
        }
      }
      if (changed) {
        const count = vesselsRef.current.size;
        setVesselCount(count);
        hasDataRef.current = count > 0;
        if (count === 0) setStatus('stale-snapshot');
      }
    }, STALE_CHECK_INTERVAL);

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (staleCheckRef.current) { clearInterval(staleCheckRef.current); staleCheckRef.current = null; }
    };
  }, [enabled, pollVessels]);

  return { vessels: vesselsRef.current, vesselCount, isConnected, error, status };
}

export function useViewportVessels(
  vessels: Map<number, Vessel>,
  bounds: { north: number; south: number; east: number; west: number } | null,
  maxCount = 1000,
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
  clusterDistanceKm = 5,
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
      clusterVessel.lastUpdate = Math.max(...cluster.map(v => v.lastUpdate));
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
      clusterVessel.lastUpdate = Math.max(...cluster.map(v => v.lastUpdate));
      result.push(clusterVessel);
    }
  }

  return result;
}
