// Cloudflare Worker for Malta OSINT API
// Handles live data aggregation with KV caching and Cron Triggers

export interface Env {
  LIVE_CACHE: KVNamespace;
  HISTORICAL: R2Bucket;
  DB: D1Database;
}

interface CacheEntry<T> {
  data: T;
  ts: number;
  ttl: number;
}

const CACHE_TTL = {
  flights: 30 * 1000,        // 30 seconds
  vessels: 10 * 1000,        // 10 seconds
  marine: 5 * 60 * 1000,     // 5 minutes
  weather: 10 * 60 * 1000,   // 10 minutes
  seismic: 5 * 60 * 1000,    // 5 minutes
  fires: 10 * 60 * 1000,     // 10 minutes
  news: 15 * 60 * 1000,      // 15 minutes
} as const;

const MALTA_BBOX = { north: 36.1, south: 35.5, east: 14.6, west: 14.1 };
const MALTA_FIR_BBOX = { north: 37, south: 34, east: 16, west: 12 };

function isInMaltaBbox(lat: number, lng: number): boolean {
  return lat >= MALTA_BBOX.south && lat <= MALTA_BBOX.north && lng >= MALTA_BBOX.west && lng <= MALTA_BBOX.east;
}

function isInMaltaFir(lat: number, lng: number): boolean {
  return lat >= MALTA_FIR_BBOX.south && lat <= MALTA_FIR_BBOX.north && lng >= MALTA_FIR_BBOX.west && lng <= MALTA_FIR_BBOX.east;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function getCached<K>(env: Env, key: string): Promise<K | null> {
  const entry = await env.LIVE_CACHE.get(key, 'json') as CacheEntry<K> | null;
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) return null;
  return entry.data;
}

async function setCached<K>(env: Env, key: string, data: K, ttl: number): Promise<void> {
  const entry: CacheEntry<K> = { data, ts: Date.now(), ttl };
  await env.LIVE_CACHE.put(key, JSON.stringify(entry));
}

// --- Data Fetchers ---

async function fetchFlights(): Promise<any[]> {
  const regions = [
    { lat: 35.9, lon: 14.4, dist: 300 },
    { lat: 35.9, lon: 14.4, dist: 500 },
  ];

  const results = await Promise.allSettled(
    regions.map(r => fetchWithTimeout(`https://api.adsb.lol/v2/lat/${r.lat}/lon/${r.lon}/dist/${r.dist}`))
  );

  const allAircraft: any[] = [];
  const seenHex = new Set<string>();

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.ok) {
      const data = await result.value.json();
      for (const ac of data.ac || []) {
        const hex = (ac.hex || '').toLowerCase().trim();
        if (hex && !seenHex.has(hex)) {
          seenHex.add(hex);
          if (ac.lat != null && ac.lon != null && isInMaltaFir(ac.lat, ac.lon)) {
            allAircraft.push({
              hex,
              flight: ac.flight?.trim() || '',
              lat: ac.lat,
              lng: ac.lon,
              alt: ac.alt_baro ? Math.round(ac.alt_baro * 0.3048) : null,
              alt_geom: ac.alt_geom ? Math.round(ac.alt_geom * 0.3048) : null,
              gs: ac.gs ? Math.round(ac.gs * 1.852) : null,
              track: ac.track || 0,
              roc: ac.baro_rate || 0,
              category: ac.category || 'unknown',
              reg: ac.r || '',
              type: ac.t || '',
              dbFlags: ac.dbFlags || 0,
              seen: Date.now(),
            });
          }
        }
      }
    }
  }

  return allAircraft;
}

async function fetchMarineConditions(): Promise<any> {
  try {
    const url = 'https://marine-api.open-meteo.com/v1/marine?latitude=35.9375&longitude=14.3754&hourly=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,sea_surface_temperature,ocean_current_velocity,ocean_current_direction&current=wave_height,wave_direction,wave_period,sea_surface_temperature&timezone=Europe/Malta&forecast_days=3';
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error('Marine API failed');
    return await res.json();
  } catch (e) {
    console.error('Marine conditions error:', e);
    return null;
  }
}

async function fetchOMRGData(): Promise<any> {
  try {
    const endpoints = ['/meteo-stations', '/porto-stations', '/hf-radar'];
    const results = await Promise.allSettled(
      endpoints.map(ep => fetchWithTimeout(`https://ocean.mt/api${ep}`))
    );
    const data: Record<string, any> = {};
    for (let i = 0; i < endpoints.length; i++) {
      if (results[i].status === 'fulfilled' && results[i].value.ok) {
        data[endpoints[i].replace('/', '')] = await results[i].value.json();
      }
    }
    return data;
  } catch (e) {
    console.error('OMRG fetch error:', e);
    return {};
  }
}

async function fetchNews(): Promise<any[]> {
  const feeds = [
    { name: 'Times of Malta', url: 'https://timesofmalta.com/rss.xml' },
    { name: 'MaltaToday', url: 'https://www.maltatoday.com.mt/rss' },
    { name: 'TVM News', url: 'https://tvm.com.mt/rss' },
  ];

  const items: any[] = [];
  for (const feed of feeds) {
    try {
      const res = await fetchWithTimeout(feed.url, {}, 5000);
      if (res.ok) {
        const xml = await res.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        let match;
        while ((match = itemRegex.exec(xml)) !== null && items.length < 50) {
          const itemXml = match[1];
          const getTag = (tag: string) => {
            const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
            return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
          };
          items.push({
            title: getTag('title'),
            description: getTag('description'),
            link: getTag('link'),
            pubDate: getTag('pubDate'),
            source: feed.name,
            guid: getTag('guid'),
          });
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch ${feed.name}:`, e);
    }
  }

  return items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

async function fetchSeismic(): Promise<any[]> {
  try {
    const res = await fetchWithTimeout('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
    if (!res.ok) throw new Error('USGS failed');
    const data = await res.json();
    return (data.features || [])
      .filter((f: any) => {
        const coords = f.geometry?.coordinates;
        return coords && isInMaltaBbox(coords[1], coords[0]);
      })
      .map((f: any) => ({
        id: f.id,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        depth: f.geometry.coordinates[2],
        magnitude: f.properties.mag,
        place: f.properties.place,
        time: f.properties.time,
        url: f.properties.url,
        tsunami: f.properties.tsunami,
        alert: f.properties.alert,
      }));
  } catch (e) {
    console.error('Seismic fetch error:', e);
    return [];
  }
}

async function fetchFires(): Promise<any[]> {
  try {
    const res = await fetchWithTimeout('https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Mediterranean_24h.csv', {}, 10000);
    if (!res.ok) throw new Error('FIRMS failed');
    const csv = await res.text();
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    const latIdx = headers.indexOf('latitude');
    const lngIdx = headers.indexOf('longitude');
    const brightIdx = headers.indexOf('brightness');
    const confIdx = headers.indexOf('confidence');

    return lines.slice(1)
      .map(l => l.split(','))
      .filter(cols => cols.length > Math.max(latIdx, lngIdx, brightIdx, confIdx))
      .map(cols => ({
        lat: parseFloat(cols[latIdx]),
        lng: parseFloat(cols[lngIdx]),
        brightness: parseFloat(cols[brightIdx]),
        confidence: parseInt(cols[confIdx]),
        time: Date.now(),
      }))
      .filter(f => isInMaltaBbox(f.lat, f.lng));
  } catch (e) {
    console.error('Fires fetch error:', e);
    return [];
  }
}

// --- Main Worker ---

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route to specific endpoint or return all
      if (path === '/api/malta/flights' || path === '/api/malta/live') {
        const cached = await getCached<any[]>(env, 'malta:flights');
        const data = cached || await fetchFlights();
        if (!cached) await setCached(env, 'malta:flights', data, CACHE_TTL.flights);
        return Response.json({ flights: data, total: data.length, timestamp: new Date().toISOString() }, { headers: corsHeaders });
      }

      if (path === '/api/malta/marine') {
        const cached = await getCached<any>(env, 'malta:marine');
        const data = cached || await fetchMarineConditions();
        if (!cached && data) await setCached(env, 'malta:marine', data, CACHE_TTL.marine);
        return Response.json(data, { headers: corsHeaders });
      }

      if (path === '/api/malta/omrg') {
        const cached = await getCached<any>(env, 'malta:omrg');
        const data = cached || await fetchOMRGData();
        if (!cached) await setCached(env, 'malta:omrg', data, CACHE_TTL.marine);
        return Response.json(data, { headers: corsHeaders });
      }

      if (path === '/api/malta/news') {
        const cached = await getCached<any[]>(env, 'malta:news');
        const data = cached || await fetchNews();
        if (!cached) await setCached(env, 'malta:news', data, CACHE_TTL.news);
        return Response.json({ news: data, total: data.length }, { headers: corsHeaders });
      }

      if (path === '/api/malta/seismic') {
        const cached = await getCached<any[]>(env, 'malta:seismic');
        const data = cached || await fetchSeismic();
        if (!cached) await setCached(env, 'malta:seismic', data, CACHE_TTL.seismic);
        return Response.json({ events: data, total: data.length }, { headers: corsHeaders });
      }

      if (path === '/api/malta/fires') {
        const cached = await getCached<any[]>(env, 'malta:fires');
        const data = cached || await fetchFires();
        if (!cached) await setCached(env, 'malta:fires', data, CACHE_TTL.fires);
        return Response.json({ fires: data, total: data.length }, { headers: corsHeaders });
      }

      // Combined live endpoint (used by frontend)
      if (path === '/api/malta/live') {
        const [flights, marine, omrg, news, seismic, fires] = await Promise.allSettled([
          getCached<any[]>(env, 'malta:flights') || fetchFlights(),
          getCached<any>(env, 'malta:marine') || fetchMarineConditions(),
          getCached<any>(env, 'malta:omrg') || fetchOMRGData(),
          getCached<any[]>(env, 'malta:news') || fetchNews(),
          getCached<any[]>(env, 'malta:seismic') || fetchSeismic(),
          getCached<any[]>(env, 'malta:fires') || fetchFires(),
        ]);

        const response = {
          timestamp: new Date().toISOString(),
          bbox: MALTA_BBOX,
          firBbox: MALTA_FIR_BBOX,
          aviation: { flights: flights.status === 'fulfilled' ? flights.value : [], total: flights.status === 'fulfilled' ? flights.value.length : 0 },
          maritime: { conditions: marine.status === 'fulfilled' ? marine.value : null, omrg: omrg.status === 'fulfilled' ? omrg.value : {} },
          environment: { seismic: seismic.status === 'fulfilled' ? seismic.value : [], fires: fires.status === 'fulfilled' ? fires.value : [] },
          intelligence: { news: news.status === 'fulfilled' ? news.value : [] },
        };

        // Cache individual results if they were freshly fetched
        if (flights.status === 'fulfilled' && !(await getCached(env, 'malta:flights'))) await setCached(env, 'malta:flights', flights.value, CACHE_TTL.flights);
        if (marine.status === 'fulfilled' && marine.value && !(await getCached(env, 'malta:marine'))) await setCached(env, 'malta:marine', marine.value, CACHE_TTL.marine);
        if (omrg.status === 'fulfilled' && !(await getCached(env, 'malta:omrg'))) await setCached(env, 'malta:omrg', omrg.value, CACHE_TTL.marine);
        if (news.status === 'fulfilled' && !(await getCached(env, 'malta:news'))) await setCached(env, 'malta:news', news.value, CACHE_TTL.news);
        if (seismic.status === 'fulfilled' && !(await getCached(env, 'malta:seismic'))) await setCached(env, 'malta:seismic', seismic.value, CACHE_TTL.seismic);
        if (fires.status === 'fulfilled' && !(await getCached(env, 'malta:fires'))) await setCached(env, 'malta:fires', fires.value, CACHE_TTL.fires);

        return Response.json(response, { headers: { ...corsHeaders, 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return Response.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
  },

  // Cron Trigger - runs every minute to pre-warm cache
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log('Cron trigger:', event.cron, 'at', new Date().toISOString());

    const results = await Promise.allSettled([
      (async () => { const data = await fetchFlights(); await setCached(env, 'malta:flights', data, CACHE_TTL.flights); })(),
      (async () => { const data = await fetchMarineConditions(); if (data) await setCached(env, 'malta:marine', data, CACHE_TTL.marine); })(),
      (async () => { const data = await fetchOMRGData(); await setCached(env, 'malta:omrg', data, CACHE_TTL.marine); })(),
      (async () => { const data = await fetchNews(); await setCached(env, 'malta:news', data, CACHE_TTL.news); })(),
      (async () => { const data = await fetchSeismic(); await setCached(env, 'malta:seismic', data, CACHE_TTL.seismic); })(),
      (async () => { const data = await fetchFires(); await setCached(env, 'malta:fires', data, CACHE_TTL.fires); })(),
    ]);

    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(`${failed} cron tasks failed`);
    }
  },
} satisfies ExportedHandler<Env>;