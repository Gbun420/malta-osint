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

export function useAISStream(options: UseAISStreamOptions = {}): UseAISStreamReturn {
  const { enabled = true } = options;

  const vesselsRef = useRef<Map<number, Vessel>>(new Map());
  const [vesselCount, setVesselCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchVessels = useCallback(async () => {
    try {
      const res = await fetch('/api/ais/vessels', { cache: 'no-store' });
      if (!res.ok) throw new Error(`AIS proxy returned ${res.status}`);
      const data = await res.json();

      if (data.connected) {
        setIsConnected(true);
        if (data.error) setError(new Error(data.error));
        else setError(null);
      } else {
        setIsConnected(false);
        setError(new Error(data.error || 'AIS relay disconnected'));
      }

      if (Array.isArray(data.vessels)) {
        const newMap = new Map<number, Vessel>();
        for (const v of data.vessels) {
          if (v.mmsi) newMap.set(v.mmsi, v as Vessel);
        }
        vesselsRef.current = newMap;
        setVesselCount(newMap.size);
      }
    } catch (e) {
      setIsConnected(false);
      setError(e instanceof Error ? e : new Error('Failed to fetch AIS data'));
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      vesselsRef.current.clear();
      setVesselCount(0);
      setIsConnected(false);
      return;
    }

    fetchVessels();
    intervalRef.current = setInterval(fetchVessels, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, fetchVessels]);

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
