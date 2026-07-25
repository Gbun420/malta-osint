'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Vessel } from '@/hooks/useAISStream';

interface MaltaMapProps {
  data: any;
  activeLayers: Record<string, boolean>;
  onEntityClick?: (entity: any) => void;
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

// Malta bounding box for viewport culling
const MALTA_BBOX = { north: 36.1, south: 35.5, east: 14.6, west: 14.1 };

function isInMaltaViewport(lng: number, lat: number, bounds: maplibregl.LngLatBounds): boolean {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  return lng >= sw.lng - 0.1 && lng <= ne.lng + 0.1 && lat >= sw.lat - 0.1 && lat <= ne.lat + 0.1;
}

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
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const vesselsLayerRef = useRef<Map<number, any>>(new Map());

  // Create vessel icon on canvas (rotated by heading)
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

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    
    const styleUrl = mapStyle === 'satellite' 
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [14.3754, 35.9375],
      zoom: 9,
      minZoom: 7,
      maxZoom: 18,
      attributionControl: false,
      maxPitch: 85,
    });

    map.on('load', () => {
      mapRef.current = map;
      
      // Create icons
      createVesselIcon(map, 'vessel-cargo', '#4FC3F7', 28);
      createVesselIcon(map, 'vessel-tanker', '#FF9500', 28);
      createVesselIcon(map, 'vessel-passenger', '#FF69B4', 28);
      createVesselIcon(map, 'vessel-fishing', '#00E676', 28);
      createVesselIcon(map, 'vessel-military', '#FF3D3D', 28);
      createVesselIcon(map, 'vessel-other', '#888888', 24);
      createVesselIcon(map, 'vessel-cluster', '#D4AF37', 32);
      
      createDot(map, 'dot-flight', '#00E5FF', 10);
      createDot(map, 'dot-seismic', '#FF9500', 10);
      createDot(map, 'dot-fire', '#FF6B00', 10);
      createDot(map, 'dot-zone', '#FF3D3D', 12);
      createDot(map, 'dot-port', '#39FF14', 10);
      createDot(map, 'dot-beach', '#00BCD4', 8);

      // Add sources
      const sources = [
        'flights', 'seismic', 'fires', 'vessels', 'vessel-clusters',
        'restriction-zones', 'bathymetry', 'ports', 'beaches', 'diving-sites',
        'submarine-cables', 'eez-boundary', 'malta-land'
      ];
      sources.forEach(s => map.addSource(s, { type: 'geojson', data: EMPTY_FC }));

      // Add layers (order matters - first added = bottom)
      
      // Malta land mask
      map.addLayer({
        id: 'malta-land',
        type: 'fill',
        source: 'malta-land',
        paint: {
          'fill-color': '#1a1a2e',
          'fill-opacity': 0.8,
        },
      });

      // EEZ boundary
      map.addLayer({
        id: 'eez-boundary',
        type: 'line',
        source: 'eez-boundary',
        paint: {
          'line-color': '#D4AF37',
          'line-width': 2,
          'line-dasharray': [8, 4],
          'line-opacity': 0.6,
        },
      });

      // Bathymetry contours
      map.addLayer({
        id: 'bathymetry',
        type: 'line',
        source: 'bathymetry',
        paint: {
          'line-color': '#00BCD4',
          'line-width': 1,
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.1, 10, 0.4, 14, 0.6],
        },
        filter: ['==', '$type', 'LineString'],
      });

      // Restriction zones
      map.addLayer({
        id: 'restriction-zones-fill',
        type: 'fill',
        source: 'restriction-zones',
        paint: {
          'fill-color': ['match', ['get', 'zone_type'],
            'prohibited', '#FF1744',
            'restricted', '#FF9500',
            'caution', '#FFD500',
            'anchorage', '#00E676',
            '#FF3D3D'
          ],
          'fill-opacity': 0.3,
        },
      });
      map.addLayer({
        id: 'restriction-zones-line',
        type: 'line',
        source: 'restriction-zones',
        paint: {
          'line-color': ['match', ['get', 'zone_type'],
            'prohibited', '#FF1744',
            'restricted', '#FF9500',
            'caution', '#FFD500',
            'anchorage', '#00E676',
            '#FF3D3D'
          ],
          'line-width': 2,
          'line-opacity': 0.8,
        },
      });

      // Ports
      map.addLayer({
        id: 'ports',
        type: 'symbol',
        source: 'ports',
        layout: {
          'icon-image': 'dot-port',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 1],
          'icon-allow-overlap': true,
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-font': ['Open Sans Bold'],
          'text-offset': [0, 1.2],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#39FF14',
          'text-halo-color': '#000',
          'text-halo-width': 1.5,
        },
      });

      // Beaches
      map.addLayer({
        id: 'beaches',
        type: 'symbol',
        source: 'beaches',
        layout: {
          'icon-image': 'dot-beach',
          'icon-size': 0.6,
          'icon-allow-overlap': true,
          'text-field': ['get', 'name'],
          'text-size': 9,
          'text-font': ['Open Sans'],
          'text-offset': [0, 1],
        },
        paint: {
          'text-color': '#00BCD4',
          'text-halo-color': '#000',
          'text-halo-width': 1,
        },
      });

      // Diving sites
      map.addLayer({
        id: 'diving-sites',
        type: 'symbol',
        source: 'diving-sites',
        layout: {
          'icon-image': 'dot-beach',
          'icon-size': 0.6,
          'icon-allow-overlap': true,
        },
        paint: {
          'icon-color': '#FF69B4',
        },
      });

      // Submarine cables
      map.addLayer({
        id: 'submarine-cables',
        type: 'line',
        source: 'submarine-cables',
        paint: {
          'line-color': '#888888',
          'line-width': 1.5,
          'line-dasharray': [4, 4],
          'line-opacity': 0.5,
        },
      });

      // Seismic events
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

      // Fires
      map.addLayer({
        id: 'fires',
        type: 'circle',
        source: 'fires',
        paint: {
          'circle-radius': 8,
          'circle-color': '#FF6B00',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FF3D3D',
          'circle-opacity': 0.9,
        },
      });

      // Vessels (symbol layer with rotation)
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
            'cluster', 'vessel-cluster',
            'vessel-other'
          ],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 10, 0.6, 12, 0.8, 14, 1],
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

      // Flights
      map.addLayer({
        id: 'flights',
        type: 'symbol',
        source: 'flights',
        layout: {
          'icon-image': 'dot-flight',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.4, 10, 0.6, 14, 0.8],
          'icon-rotate': ['get', 'track'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'text-field': ['get', 'flight'],
          'text-size': 9,
          'text-font': ['Open Sans Bold'],
          'text-offset': [0, 1.2],
        },
        paint: {
          'icon-color': '#00E5FF',
          'text-color': '#00E5FF',
          'text-halo-color': '#000',
          'text-halo-width': 1.5,
        },
      });

      setMapReady(true);
    });

    // Mouse coordinates
    map.on('mousemove', (e) => {
      onMouseCoords?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    // Right click for region dossier
    map.on('contextmenu', (e) => {
      e.preventDefault();
      onRightClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

// Click for entity selection
     map.on('click', (e) => {
       const features = map.queryRenderedFeatures(e.point, {
         layers: ['vessels', 'flights', 'seismic', 'fires', 'restriction-zones-fill', 'restriction-zones-line', 'ports', 'beaches', 'diving-sites']
       });
       if (features.length > 0) {
         onEntityClick?.(features[0].properties);
       }
     });

    // View state changes
    map.on('moveend', () => {
      onViewStateChange?.({ zoom: map.getZoom(), latitude: map.getCenter().lat });
    });

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapStyle, createVesselIcon, createDot, onEntityClick, onMouseCoords, onRightClick, onViewStateChange]);

  // Update vessel data from WebSocket
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
      map.getSource('vessels')?.setData(fc);
    } catch (e) {
      console.warn('[MaltaMap] Vessel update error:', e);
    }
  }, [vessels, mapReady, vesselCount]);

  // Update static data layers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Seismic
    if (data?.environment?.seismic && activeLayers.earthquakes) {
      const fc = { type: 'FeatureCollection' as const, features: data.environment.seismic.map((eq: any) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [eq.lng, eq.lat] },
        properties: { magnitude: eq.magnitude, place: eq.place, time: eq.time, depth: eq.depth },
      })) };
      map.getSource('seismic')?.setData(fc);
    }

    // Fires
    if (data?.environment?.fires && activeLayers.fires) {
      const fc = { type: 'FeatureCollection' as const, features: data.environment.fires.map((f: any) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
        properties: { brightness: f.brightness, confidence: f.confidence },
      })) };
      map.getSource('fires')?.setData(fc);
    }

    // Flights
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
      map.getSource('flights')?.setData(fc);
    }
  }, [data, activeLayers, mapReady]);

  // Fly to location
  useEffect(() => {
    if (flyToLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyToLocation.lng, flyToLocation.lat],
        zoom: 12,
        essential: true,
      });
    }
  }, [flyToLocation]);

  // Toggle layer visibility
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    
    const layerMap: Record<string, string[]> = {
      vessels: ['vessels'],
      'restriction-zones': ['restriction-zones-fill', 'restriction-zones-line'],
      bathymetry: ['bathymetry'],
      ports: ['ports'],
      beaches: ['beaches'],
      'diving-sites': ['diving-sites'],
      'submarine-cables': ['submarine-cables'],
      eez: ['eez-boundary'],
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
      {/* AIS Connection Status Indicator */}
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
      
      {/* Malta bbox indicator at low zoom */}
      {mapReady && (
        <div className="absolute top-4 left-4 z-10 glass-panel px-2 py-1 pointer-events-none">
          <span className="text-[9px] font-mono text-white/60">MALTA OSINT</span>
        </div>
      )}
    </div>
  );
}

export default memo(MaltaMap);