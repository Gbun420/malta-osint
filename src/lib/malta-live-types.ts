export interface SourceMeta {
  status: 'ok' | 'empty' | 'error' | 'unconfigured';
  count: number;
  updatedAt: string | null;
  latencyMs: number | null;
  error: string | null;
  scope?: 'global' | 'multi-region' | 'regional' | 'national' | 'local' | 'custom';
  coverageLabel?: string;
}

export interface MaltaFlight {
  hex: string;
  flight: string;
  lat: number;
  lng: number;
  alt: number | null;
  alt_geom: number | null;
  gs: number | null;
  track: number;
  roc: number;
  category: string;
  reg: string;
  type: string;
  dbFlags: number;
  seen: number;
}

export interface SeismicEvent {
  id: string;
  lat: number;
  lng: number;
  depth: number;
  magnitude: number;
  place: string;
  time: number;
  url: string;
  tsunami: number;
  alert: string | null;
}

export interface FireEvent {
  lat: number;
  lng: number;
  brightness: number;
  confidence: number | string;
  time: number;
}

export interface NewsArticle {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  guid: string;
}

export interface MaltaLiveResponse {
  timestamp: string;
  bbox: { north: number; south: number; east: number; west: number };
  firBbox: { north: number; south: number; east: number; west: number };
  aviation: {
    flights: MaltaFlight[];
    total: number;
  };
  maritime: {
    conditions: Record<string, unknown> | null;
    omrg: Record<string, unknown>;
    staticZones: Record<string, unknown>;
  };
  environment: {
    seismic: SeismicEvent[];
    fires: FireEvent[];
  };
  intelligence: {
    news: NewsArticle[];
  };
  meta: {
    sources: {
      aviation: SourceMeta;
      marine: SourceMeta;
      omrg: SourceMeta;
      news: SourceMeta;
      seismic: SourceMeta;
      fires: SourceMeta;
    };
  };
}
