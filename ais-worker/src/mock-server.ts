import http from 'node:http';

interface MockVessel {
  mmsi: string;
  lat: number;
  lon: number;
  sog: number;
  cog: number;
  heading: number;
  status: string;
  length: number;
  type: string;
  imo?: string;
  callsign?: string;
  name?: string;
}

const MALTA_BBOX = { minLat: 35.6, maxLat: 36.2, minLon: 14.0, maxLon: 14.8 };

const VESSEL_NAMES = [
  'MALTA STAR', 'VALLETTA', 'GOZO QUEEN', 'MEDITERRANEAN', 'SEA WATCH',
  'HOPPER', 'TUG MASTER', 'FERRY NORD', 'CARGO PLUS', 'TANKER ALPHA',
  'RESEARCH BUOY', 'FISHING 1', 'PASSENGER 7', 'NAVIGATOR', 'PIONEER',
  'DAMAVAND', 'ALABAMA', 'SANTORINI', 'CORFU PRIDE', 'EASY FERRY',
  'GRAND HARBOR', 'BLUE MARLIN', 'REDFIN', 'SILVER PELICAN', 'GOLDEN ARROW',
];

const VESSEL_TYPES = ['cargo', 'passenger', 'tanker', 'fishing', 'tug'] as const;
const NAV_STATUSES = ['under-5-knots', 'at-anchor', 'not-under-command', 'restricted-manoeuvrability', 'constrained-by-draught'];

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function generateVessels(count: number): MockVessel[] {
  const vessels: MockVessel[] = [];
  for (let i = 0; i < count; i++) {
    vessels.push({
      mmsi: `${900000000 + i}`,
      lat: randomInRange(MALTA_BBOX.minLat, MALTA_BBOX.maxLat),
      lon: randomInRange(MALTA_BBOX.minLon, MALTA_BBOX.maxLon),
      sog: randomInRange(0, 20),
      cog: Math.random() * 360,
      heading: Math.random() * 360,
      status: NAV_STATUSES[Math.floor(Math.random() * NAV_STATUSES.length)],
      length: randomInRange(10, 250),
      type: VESSEL_TYPES[Math.floor(Math.random() * VESSEL_TYPES.length)],
      callsign: `9HA${10000 + i}`,
      name: VESSEL_NAMES[i % VESSEL_NAMES.length],
      imo: i % 3 === 0 ? `IMO${9000000 + i}` : undefined,
    });
  }
  return vessels;
}

const mockVessels = generateVessels(30);

function updateMockPositions(): void {
  for (const vessel of mockVessels) {
    vessel.lat += (Math.random() - 0.5) * 0.001;
    vessel.lon += (Math.random() - 0.5) * 0.001;
    vessel.sog = Math.max(0, vessel.sog + (Math.random() - 0.5) * 0.3);
    vessel.cog = (vessel.cog + (Math.random() - 0.5) * 3 + 360) % 360;
    vessel.heading = vessel.cog;
  }
}

export function createMockAISServer(port: number = 7701): http.Server {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);

    if (url.pathname === '/vessels') {
      updateMockPositions();

      const bbox = url.searchParams.get('bbox');
      let filtered = mockVessels;
      if (bbox) {
        const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(Number);
        filtered = mockVessels.filter((v) =>
          v.lat >= minLat && v.lat <= maxLat && v.lon >= minLon && v.lon <= maxLon,
        );
      }

      const positions = filtered.map((v) => ({
        messageType: 1,
        mmsi: v.mmsi,
        lat: v.lat.toFixed(6),
        lon: v.lon.toFixed(6),
        sog: v.sog.toFixed(1),
        cog: v.cog.toFixed(1),
        heading: v.heading.toFixed(1),
        navStatus: v.status,
        length: v.length.toFixed(1),
        shipType: v.type,
        imo: v.imo || '',
        callsign: v.callsign || '',
        name: v.name || '',
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ positions, count: positions.length, source: 'mock' }));
      return;
    }

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', mode: 'mock', vessels: mockVessels.length }));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(port, () => {
    console.log(`[Mock AIS Server] Listening on :${port}`);
    console.log(`[Mock AIS Server] Vessels endpoint: http://localhost:${port}/vessels`);
  });

  setInterval(() => {
    updateMockPositions();
  }, 3000);

  return server;
}
