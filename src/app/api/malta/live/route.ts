import { NextResponse } from 'next/server';
import { MALTA_BBOX, MALTA_FIR_BBOX, isInMaltaBbox, isInMaltaFir, getShipCategory } from '@/lib/malta/bbox';

const ADSB_LOL_REGIONS = [
  { lat: 35.9, lon: 14.4, dist: 300 },  // Malta FIR center
  { lat: 35.9, lon: 14.4, dist: 500 },  // Extended
];

const OMRG_API_BASE = 'https://ocean.mt/api';
const DATA_GOV_MT_BASE = 'https://data.gov.mt/api';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchMaltaFlights() {
  try {
    const results = await Promise.allSettled(
      ADSB_LOL_REGIONS.map(r =>
        fetchWithTimeout(`https://api.adsb.lol/v2/lat/${r.lat}/lon/${r.lon}/dist/${r.dist}`)
      )
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
                gs: ac.gs ? Math.round(ac.gs * 1.852) : null, // knots to km/h
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
  } catch (e) {
    console.error('[Malta API] Flight fetch error:', e);
    return [];
  }
}

async function fetchMarineConditions() {
  try {
    // Open-Meteo Marine API for Malta coordinates
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=35.9375&longitude=14.3754&hourly=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,sea_surface_temperature,ocean_current_velocity,ocean_current_direction&current=wave_height,wave_direction,wave_period,sea_surface_temperature&timezone=Europe/Malta&forecast_days=3`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error('Marine API failed');
    return await res.json();
  } catch (e) {
    console.error('[Malta API] Marine conditions error:', e);
    return null;
  }
}

async function fetchOMRGData() {
  try {
    // OMRG (University of Malta) public endpoints
    // These are documented at https://ocean.mt/data/
    const endpoints = [
      '/meteo-stations',
      '/porto-stations',
      '/hf-radar',
    ];

    const results = await Promise.allSettled(
      endpoints.map(ep => fetchWithTimeout(`${OMRG_API_BASE}${ep}`))
    );

    const data: Record<string, any> = {};
    for (let i = 0; i < endpoints.length; i++) {
      if (results[i].status === 'fulfilled' && results[i].value.ok) {
        data[endpoints[i].replace('/', '')] = await results[i].value.json();
      }
    }
    return data;
  } catch (e) {
    console.error('[Malta API] OMRG fetch error:', e);
    return {};
  }
}

async function fetchMaltaNews() {
  try {
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
          // Simple RSS parsing
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
        console.warn(`[Malta API] Failed to fetch ${feed.name}:`, e);
      }
    }

    return items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  } catch (e) {
    console.error('[Malta API] News fetch error:', e);
    return [];
  }
}

async function fetchSeismicData() {
  try {
    // USGS Earthquake API - Mediterranean filter
    const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error('USGS failed');
    const data = await res.json();

    const events = (data.features || [])
      .filter((f: any) => {
        const coords = f.geometry?.coordinates;
        return coords && isInMaltaBbox(coords[1], coords[0], {
          north: 37, south: 34, east: 16, west: 12
        });
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

    return events;
  } catch (e) {
    console.error('[Malta API] Seismic fetch error:', e);
    return [];
  }
}

async function fetchFiresData() {
  try {
    // NASA FIRMS - requires API key for full access, but public CSV available
    // Using the public MODIS CSV for Mediterranean
    const url = 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Mediterranean_24h.csv';
    const res = await fetchWithTimeout(url, {}, 10000);
    if (!res.ok) throw new Error('FIRMS failed');
    const csv = await res.text();
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    const latIdx = headers.indexOf('latitude');
    const lngIdx = headers.indexOf('longitude');
    const brightIdx = headers.indexOf('brightness');
    const confIdx = headers.indexOf('confidence');

    const fires = lines.slice(1)
      .map(l => l.split(','))
      .filter(cols => cols.length > Math.max(latIdx, lngIdx, brightIdx, confIdx))
      .map(cols => ({
        lat: parseFloat(cols[latIdx]),
        lng: parseFloat(cols[lngIdx]),
        brightness: parseFloat(cols[brightIdx]),
        confidence: parseInt(cols[confIdx]),
        time: Date.now(),
      }))
      .filter(f => isInMaltaBbox(f.lat, f.lng, { north: 37, south: 34, east: 16, west: 12 }));

    return fires;
  } catch (e) {
    console.error('[Malta API] Fires fetch error:', e);
    return [];
  }
}

async function fetchStaticMaritimeZones() {
  // These would be served from public/data/malta-maritime/
  // For now return empty - will be populated from BlueBahar GeoJSON
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
      flights,
      marineConditions,
      omrgData,
      news,
      seismic,
      fires,
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

    const response = {
      timestamp: new Date().toISOString(),
      bbox: MALTA_BBOX,
      firBbox: MALTA_FIR_BBOX,
      aviation: {
        flights: flights.status === 'fulfilled' ? flights.value : [],
        total: flights.status === 'fulfilled' ? flights.value.length : 0,
      },
      maritime: {
        conditions: marineConditions.status === 'fulfilled' ? marineConditions.value : null,
        omrg: omrgData.status === 'fulfilled' ? omrgData.value : {},
        staticZones: staticMaritime.status === 'fulfilled' ? staticMaritime.value : {},
      },
      environment: {
        seismic: seismic.status === 'fulfilled' ? seismic.value : [],
        fires: fires.status === 'fulfilled' ? fires.value : [],
      },
      intelligence: {
        news: news.status === 'fulfilled' ? news.value : [],
      },
      meta: {
        sources: {
          aviation: 'adsb.lol (OpenSky/ADSB Exchange aggregate)',
          marine: 'Open-Meteo Marine API',
          omrg: 'University of Malta Physical Oceanography Research Group',
          news: 'Times of Malta, MaltaToday, TVM RSS feeds',
          seismic: 'USGS Earthquake Hazards Program',
          fires: 'NASA FIRMS MODIS',
        },
        rateLimits: {
          aviation: 'No key required, ~60s cache recommended',
          marine: 'No key, 10,000 calls/day',
          omrg: 'Public research data',
          news: 'RSS, respect crawl-delay',
          seismic: 'No key, generous limits',
          fires: 'Public CSV, no key',
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