import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { MALTA_BBOX, MALTA_FIR_BBOX, isInMaltaBbox, isInMaltaFir } from '@/lib/malta/bbox';
import type { MaltaLiveResponse, SourceMeta, MaltaFlight, FireEvent, SeismicEvent } from '@/lib/malta-live-types';

const ADSB_LOL_REGIONS = [
  { lat: 35.9, lon: 14.4, dist: 250 },
];

const MALTA_MED_BBOX = { north: 37, south: 34, east: 16, west: 12 };

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function sourceMeta(
  status: SourceMeta['status'],
  count: number,
  error: string | null,
  latencyMs: number | null,
): SourceMeta {
  return { status, count, updatedAt: status === 'ok' || status === 'empty' ? new Date().toISOString() : null, latencyMs, error };
}

async function fetchMaltaFlights(): Promise<{ flights: MaltaFlight[]; meta: SourceMeta }> {
  const start = Date.now();
  try {
    const results = await Promise.allSettled(
      ADSB_LOL_REGIONS.map(r =>
        fetchWithTimeout(`https://api.adsb.lol/v2/lat/${r.lat}/lon/${r.lon}/dist/${r.dist}`)
      )
    );

    const allAircraft: MaltaFlight[] = [];
    const seenHex = new Set<string>();

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (!result.value.ok) {
          console.warn(`[Malta API] ADSB.lol returned ${result.value.status}: ${await result.value.text().catch(() => '')}`);
          continue;
        }
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
      } else {
        console.error('[Malta API] ADSB.lol request rejected:', result.reason);
      }
    }

    const elapsed = Date.now() - start;
    return { flights: allAircraft, meta: sourceMeta(allAircraft.length > 0 ? 'ok' : 'empty', allAircraft.length, null, elapsed) };
  } catch (e) {
    const elapsed = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Malta API] Flight fetch error:', msg);
    return { flights: [], meta: sourceMeta('error', 0, msg, elapsed) };
  }
}

async function fetchMarineConditions(): Promise<{ conditions: Record<string, unknown> | null; meta: SourceMeta }> {
  const start = Date.now();
  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=35.9375&longitude=14.3754&hourly=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,sea_surface_temperature,ocean_current_velocity,ocean_current_direction&current=wave_height,wave_direction,wave_period,sea_surface_temperature&timezone=Europe/Malta&forecast_days=3`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Marine API returned ${res.status}`);
    const data = await res.json();
    const elapsed = Date.now() - start;
    return { conditions: data, meta: sourceMeta('ok', 1, null, elapsed) };
  } catch (e) {
    const elapsed = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Malta API] Marine conditions error:', msg);
    return { conditions: null, meta: sourceMeta('error', 0, msg, elapsed) };
  }
}

async function fetchOMRGData(): Promise<{ omrg: Record<string, unknown>; meta: SourceMeta }> {
  return { omrg: {}, meta: sourceMeta('unconfigured', 0, 'Unverified endpoint — no confirmed API documentation available', null) };
}

async function fetchMaltaNews(): Promise<{ news: MaltaNewsArticle[]; meta: SourceMeta }> {
  const start = Date.now();
  const parser = new Parser({
    timeout: 5000,
    headers: { 'User-Agent': 'Malta-OSINT/1.0' },
  });

  const feedConfigs = [
    { name: 'Lovin Malta', url: 'https://lovinmalta.com/feed/' },
    { name: 'Newsbook', url: 'https://newsbook.com.mt/feed/' },
    { name: 'TVM News', url: 'https://tvmnews.mt/feed/' },
  ];

  const allItems: MaltaNewsArticle[] = [];
  const seenGuids = new Set<string>();

  for (const feed of feedConfigs) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items || []) {
        const guid = item.guid || item.link || '';
        if (guid && seenGuids.has(guid)) continue;
        if (guid) seenGuids.add(guid);
        allItems.push({
          title: item.title || '',
          description: item.contentSnippet || item.content || '',
          link: item.link || '',
          pubDate: item.isoDate || item.pubDate || '',
          source: feed.name,
          guid,
        });
      }
    } catch (e) {
      console.warn(`[Malta API] Failed to fetch ${feed.name}:`, e instanceof Error ? e.message : e);
    }
  }

  const sorted = allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  const elapsed = Date.now() - start;
  return { news: sorted, meta: sourceMeta(sorted.length > 0 ? 'ok' : 'empty', sorted.length, null, elapsed) };
}

interface MaltaNewsArticle {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  guid: string;
}

async function fetchSeismicData(): Promise<{ seismic: SeismicEvent[]; meta: SourceMeta }> {
  const start = Date.now();
  try {
    const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`USGS returned ${res.status}`);
    const data = await res.json();

    const events = (data.features || [])
      .filter((f: any) => {
        const coords = f.geometry?.coordinates;
        return coords && isInMaltaBbox(coords[1], coords[0], MALTA_MED_BBOX);
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

    const elapsed = Date.now() - start;
    return { seismic: events, meta: sourceMeta(events.length > 0 ? 'ok' : 'empty', events.length, null, elapsed) };
  } catch (e) {
    const elapsed = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Malta API] Seismic fetch error:', msg);
    return { seismic: [], meta: sourceMeta('error', 0, msg, elapsed) };
  }
}

async function fetchFiresData(): Promise<{ fires: FireEvent[]; meta: SourceMeta }> {
  const start = Date.now();
  try {
    const firmsApiKey = process.env.FIRMS_API_KEY;
    if (!firmsApiKey) {
      return { fires: [], meta: sourceMeta('unconfigured', 0, 'FIRMS_API_KEY not set', null) };
    }

    let fires: FireEvent[] = [];
    let sourceUsed = '';

    const areaSources = [
      { name: 'VIIRS', url: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsApiKey}/VIIRS_SNPP_NRT/global/2` },
      { name: 'MODIS', url: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsApiKey}/MODIS_NRT/global/2` },
    ];

    for (const s of areaSources) {
      try {
        const res = await fetch(s.url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          console.warn(`[Malta API] FIRMS ${s.name} returned ${res.status}: ${body.slice(0, 200)}`);
          continue;
        }
        const text = await res.text();
        if (text && text.includes('latitude') && text.length > 200) {
          const parsed = parseFIRMSCSV(text);
          const filtered = parsed.filter(f => isInMaltaBbox(f.lat, f.lng, MALTA_MED_BBOX));
          if (filtered.length > 0) {
            fires = filtered;
            sourceUsed = s.name;
            break;
          }
        }
      } catch {
        continue;
      }
    }

    const elapsed = Date.now() - start;
    if (fires.length === 0 && sourceUsed) {
      return { fires: [], meta: sourceMeta('empty', 0, 'No fires in Malta bbox', elapsed) };
    }
    return { fires, meta: sourceMeta(fires.length > 0 ? 'ok' : 'empty', fires.length, null, elapsed) };
  } catch (e) {
    const elapsed = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Malta API] Fires fetch error:', msg);
    return { fires: [], meta: sourceMeta('error', 0, msg, elapsed) };
  }
}

function parseFIRMSCSV(csv: string): FireEvent[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].split(',');
  const latIdx = header.indexOf('latitude');
  const lngIdx = header.indexOf('longitude');
  const brightIdx = header.indexOf('bright_ti4') !== -1 ? header.indexOf('bright_ti4') : header.indexOf('brightness');
  const confIdx = header.indexOf('confidence');
  const dateIdx = header.indexOf('acq_date');
  const timeIdx = header.indexOf('acq_time');

  const fires: FireEvent[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);
    if (isNaN(lat) || isNaN(lng)) continue;
    fires.push({
      lat: Math.round(lat * 1000) / 1000,
      lng: Math.round(lng * 1000) / 1000,
      brightness: parseFloat(cols[brightIdx]) || 0,
      confidence: cols[confIdx] || 'unknown',
      time: dateIdx !== -1 ? new Date(cols[dateIdx] + (cols[timeIdx] ? 'T' + cols[timeIdx].padStart(4, '0') : '')).getTime() : Date.now(),
    });
  }
  return fires;
}

async function fetchStaticMaritimeZones() {
  return {
    restrictionZones: [],
    bathymetry: [],
    beaches: [],
    divingSites: [],
    ports: [],
  };
}

export async function GET() {
  try {
    const [
      flightsResult,
      marineResult,
      omrgResult,
      newsResult,
      seismicResult,
      firesResult,
      staticMaritime,
    ] = await Promise.allSettled([
      fetchMaltaFlights(),
      fetchMarineConditions(),
      fetchOMRGData(),
      fetchMaltaNews(),
      fetchSeismicData(),
      fetchFiresData(),
      fetchStaticMaritimeZones(),
    ]);

    const flights = flightsResult.status === 'fulfilled' ? flightsResult.value : { flights: [] as MaltaFlight[], meta: sourceMeta('error', 0, 'fetchMaltaFlights rejected', null) };
    const marine = marineResult.status === 'fulfilled' ? marineResult.value : { conditions: null, meta: sourceMeta('error', 0, 'fetchMarineConditions rejected', null) };
    const omrg = omrgResult.status === 'fulfilled' ? omrgResult.value : { omrg: {}, meta: sourceMeta('error', 0, 'fetchOMRGData rejected', null) };
    const news = newsResult.status === 'fulfilled' ? newsResult.value : { news: [] as MaltaNewsArticle[], meta: sourceMeta('error', 0, 'fetchMaltaNews rejected', null) };
    const seismic = seismicResult.status === 'fulfilled' ? seismicResult.value : { seismic: [] as SeismicEvent[], meta: sourceMeta('error', 0, 'fetchSeismicData rejected', null) };
    const fires = firesResult.status === 'fulfilled' ? firesResult.value : { fires: [] as FireEvent[], meta: sourceMeta('error', 0, 'fetchFiresData rejected', null) };

    const response: MaltaLiveResponse = {
      timestamp: new Date().toISOString(),
      bbox: MALTA_BBOX,
      firBbox: MALTA_FIR_BBOX,
      aviation: {
        flights: flights.flights,
        total: flights.flights.length,
      },
      maritime: {
        conditions: marine.conditions,
        omrg: omrg.omrg,
        staticZones: staticMaritime.status === 'fulfilled' ? staticMaritime.value : {},
      },
      environment: {
        seismic: seismic.seismic,
        fires: fires.fires,
      },
      intelligence: {
        news: news.news,
      },
      meta: {
        sources: {
          aviation: flights.meta,
          marine: marine.meta,
          omrg: omrg.meta,
          news: news.meta,
          seismic: seismic.meta,
          fires: fires.meta,
        },
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Malta API] Live data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live data', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
