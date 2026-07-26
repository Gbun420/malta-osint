'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Vessel } from '@/hooks/useAISStream';

interface EnvironmentData {
  seismic?: any[];
  fires?: any[];
}

interface AviationData {
  flights?: any[];
}

interface MaltaMapData {
  environment?: EnvironmentData;
  aviation?: AviationData;
}

interface MaltaMapProps {
  data: MaltaMapData;
  activeLayers: Record<string, boolean>;
  onEntityClick?: (entity: Record<string, any> | null) => void;
  onMouseCoords?: (coords: { lat: number; lng: number }) => void;
  onRightClick?: (coords: { lat: number; lng: number }) => void;
  onViewStateChange?: (vs: { zoom: number; latitude: number }) => void;
  flyToLocation?: { lat: number; lng: number; ts: number } | null;
  projection?: 'mercator' | 'globe';
  mapStyle?: string;
  vessels?: Map<number, Vessel>;
  vesselCount?: number;
  isAISConnected?: boolean;
}

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

function MaltaMap({
  data,
  activeLayers,
  onEntityClick,
  onMouseCoords,
  onRightClick,
  onViewStateChange,
  flyToLocation,
  projection = 'mercator',
  mapStyle = 'dark',
  vessels,
  vesselCount,
  isAISConnected,
}: MaltaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const createVesselIcon = useCallback((map: maplibregl.Map, id: string, color: string, size: number) => {
    if (map.hasImage(id)) return;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2, cy = size / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.4);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.1);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.2);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.3);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.15);
    ctx.lineTo(cx, cy + size * 0.35);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.15);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.3);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.1);
    ctx.closePath();
    ctx.fill();
    map.addImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
  }, []);

  const createDot = useCallback((map: maplibregl.Map, id: string, color: string, size: number) => {
    if (map.hasImage(id)) return;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
    ctx.fill();
    map.addImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;
    let destroyed = false;

    (async () => {
      const isSatellite = mapStyle === 'satellite';
      let styleSpec: any = isSatellite
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

      if (!isSatellite && !destroyed) {
        try {
          const res = await fetch(styleSpec);
          const json = await res.json();
          delete json.glyphs;
          for (const layer of (json.layers || [])) {
            delete layer.layout?.['text-field'];
          }
          styleSpec = json;
        } catch {}
      }

      if (destroyed || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: styleSpec,
        center: [projection === 'globe' ? 0 : 20, 35],
        zoom: projection === 'globe' ? 1.5 : 2,
        minZoom: 2,
        maxZoom: 18,
        attributionControl: false,
        maxPitch: 85,
      });

      map.on('load', () => {
        if (destroyed) return;
        mapRef.current = map;

        createVesselIcon(map, 'vessel-cargo', '#4FC3F7', 28);
        createVesselIcon(map, 'vessel-tanker', '#FFB300', 28);
        createVesselIcon(map, 'vessel-passenger', '#FF69B4', 28);
        createVesselIcon(map, 'vessel-fishing', '#00E676', 28);
        createVesselIcon(map, 'vessel-military', '#FF3D3D', 28);
        createVesselIcon(map, 'vessel-other', '#888888', 24);

        createDot(map, 'dot-flight', '#BA68C8', 10);
        createDot(map, 'dot-seismic', '#FF9500', 10);
        createDot(map, 'dot-fire', '#FF3D3D', 10);

        const sources = ['flights', 'seismic', 'fires', 'vessels'];
        sources.forEach(s => map.addSource(s, { type: 'geojson', data: EMPTY_FC }));

        map.addLayer({
          id: 'seismic',
          type: 'circle',
          source: 'seismic',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'magnitude'], 2.5, 6, 5, 12, 7, 20],
            'circle-color': ['interpolate', ['linear'], ['get', 'magnitude'], 2.5, '#FFD500', 4, '#FF9500', 5.5, '#FF3D3D', 7, '#B71C1C'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#000',
            'circle-opacity': 0.8,
          },
        });

        map.addLayer({
          id: 'fires',
          type: 'circle',
          source: 'fires',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'brightness'], 250, 6, 350, 12, 500, 20],
            'circle-color': '#FF3D3D',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#FF6B00',
            'circle-opacity': ['interpolate', ['linear'], ['get', 'confidenceScore'], 0, 0.4, 100, 0.9],
          },
        });

        map.addLayer({
          id: 'vessels',
          type: 'symbol',
          source: 'vessels',
          layout: {
            'icon-image': [
              'match', ['get', 'ship_type'],
              'cargo', 'vessel-cargo',
              'tanker', 'vessel-tanker',
              'passenger', 'vessel-passenger',
              'fishing', 'vessel-fishing',
              'military', 'vessel-military',
              'vessel-other'
            ],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 0.3, 6, 0.5, 10, 0.7, 14, 1],
            'icon-rotate': ['get', 'heading'],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'text-field': ['get', 'name'],
            'text-size': 9,
            'text-font': ['Open Sans'],
            'text-offset': [0, 1.5],
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': '#fff',
            'text-halo-color': '#000',
            'text-halo-width': 1.5,
          },
        });

        map.addLayer({
          id: 'flights',
          type: 'symbol',
          source: 'flights',
          layout: {
            'icon-image': 'dot-flight',
            'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 0.3, 6, 0.5, 10, 0.7, 14, 0.8],
            'icon-rotate': ['get', 'track'],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'text-field': ['get', 'flight'],
            'text-size': 9,
            'text-font': ['Open Sans Bold'],
            'text-offset': [0, 1.2],
          },
          paint: {
            'icon-color': '#BA68C8',
            'icon-opacity': ['interpolate', ['linear'], ['get', 'alt'], 0, 0.9, 10000, 0.5, 30000, 0.2],
            'text-color': '#BA68C8',
            'text-halo-color': '#000',
            'text-halo-width': 1.5,
          },
        });

        setMapReady(true);
      });

      map.on('mousemove', (e) => {
        onMouseCoords?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      map.on('contextmenu', (e) => {
        e.preventDefault();
        onRightClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['vessels', 'flights', 'seismic', 'fires']
        });
        if (features.length > 0) {
          onEntityClick?.(features[0].properties);
        }
      });

      map.on('moveend', () => {
        onViewStateChange?.({ zoom: map.getZoom(), latitude: map.getCenter().lat });
      });
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapStyle, projection, createVesselIcon, createDot, onEntityClick, onMouseCoords, onRightClick, onViewStateChange]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !vessels) return;
    const map = mapRef.current;

    try {
      const vesselFeatures = Array.from(vessels.values())
        .filter(v => v.mmsi > 0 && v.lat != null && v.lng != null)
        .map(v => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] },
          properties: {
            mmsi: v.mmsi,
            name: v.name || `MMSI-${v.mmsi}`,
            ship_type: v.type || 'other',
            heading: v.heading || 0,
            sog: v.sog || 0,
            cog: v.cog || 0,
            navStatus: v.navStatus || 0,
            destination: v.destination || '',
            draught: v.draught || 0,
            positionAge: v.positionAge || 0,
            lastUpdate: v.lastUpdate || 0,
          },
        }));

      const fc = { type: 'FeatureCollection' as const, features: vesselFeatures };
      (map.getSource('vessels') as maplibregl.GeoJSONSource)?.setData(fc);
    } catch (e) {
      console.warn('[MaltaMap] Vessel update error:', e);
    }
  }, [vessels, mapReady, vesselCount]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    if (data?.environment?.seismic && activeLayers.earthquakes) {
      const fc = { type: 'FeatureCollection' as const, features: data.environment.seismic.map((eq: any) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [eq.lng, eq.lat] },
        properties: { magnitude: eq.magnitude, place: eq.place, time: eq.time, depth: eq.depth },
      })) };
      (map.getSource('seismic') as maplibregl.GeoJSONSource)?.setData(fc);
    }

    if (data?.environment?.fires && activeLayers.fires) {
      const fc = { type: 'FeatureCollection' as const, features: data.environment.fires.filter((f: any) => {
        const lat = parseFloat(f.lat);
        const lng = parseFloat(f.lng);
        const b = parseFloat(f.brightness);
        return !isNaN(lat) && !isNaN(lng) && !isNaN(b);
      }).map((f: any) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [parseFloat(f.lng), parseFloat(f.lat)] },
        properties: { brightness: parseFloat(f.brightness), confidenceScore: f.confidenceScore ?? 50 },
      })) };
      (map.getSource('fires') as maplibregl.GeoJSONSource)?.setData(fc);
    }

    if (data?.aviation?.flights && activeLayers.flights) {
      const fc = { type: 'FeatureCollection' as const, features: data.aviation.flights.map((f: any) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
        properties: {
          flight: f.flight || f.hex,
          hex: f.hex,
          alt: f.alt,
          track: f.track,
          gs: f.gs,
          type: f.type,
          category: f.category,
        },
      })) };
      (map.getSource('flights') as maplibregl.GeoJSONSource)?.setData(fc);
    }
  }, [data, activeLayers, mapReady]);

  useEffect(() => {
    if (flyToLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyToLocation.lng, flyToLocation.lat],
        zoom: 12,
        essential: true,
      });
    }
  }, [flyToLocation]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    const layerMap: Record<string, string[]> = {
      vessels: ['vessels'],
      flights: ['flights'],
      earthquakes: ['seismic'],
      fires: ['fires'],
    };

    for (const [key, layers] of Object.entries(layerMap)) {
      const visible = activeLayers[key] ? 'visible' : 'none';
      layers.forEach(layerId => {
        if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visible);
      });
    }
  }, [activeLayers, mapReady]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0"
      style={{ 
        width: '100%', 
        height: '100%',
        cursor: 'grab',
      }}
    >
      {isAISConnected !== undefined && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 glass-panel px-3 py-2 pointer-events-none">
          <div className={`w-2 h-2 rounded-full ${isAISConnected ? 'bg-[#39FF14] shadow-[0_0_8px_#39FF14]' : 'bg-[#FF3D3D] shadow-[0_0_8px_#FF3D3D]'} animate-pulse`} />
          <span className="text-[10px] font-mono tracking-wider text-white/80">
            AIS: {isAISConnected ? 'LIVE' : 'OFFLINE'}
          </span>
          {vesselCount !== undefined && (
            <span className="text-[10px] font-mono tabular-nums text-[var(--gold-primary)]">
              {vesselCount.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {mapReady && (
        <div className="absolute top-4 left-4 z-10 glass-panel px-2.5 py-2 pointer-events-none">
          <span className="text-[9px] font-mono text-white/60">MALTA OSINT</span>
        </div>
      )}

      {mapReady && (
        <div className="absolute bottom-4 left-4 z-10 glass-panel px-3 py-2 pointer-events-none">
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-mono tracking-[0.15em] text-[var(--text-muted)]">LEGEND</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                <span className="text-[8px] font-mono text-white/70">VESSELS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#BA68C8]" />
                <span className="text-[8px] font-mono text-white/70">FLIGHTS</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#FF9500]" />
                <span className="text-[8px] font-mono text-white/70">SEISMIC</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#FF3D3D]" />
                <span className="text-[8px] font-mono text-white/70">FIRES</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MaltaMap);
