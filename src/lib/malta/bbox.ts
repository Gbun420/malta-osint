/**
 * Malta Geographic Constants
 * All coordinates in WGS84 (EPSG:4326)
 */

// Malta archipelago bounding box (includes Malta, Gozo, Comino, Filfla)
export const MALTA_BBOX = {
  north: 36.10,
  south: 35.55,
  east: 14.60,
  west: 14.10,
} as const;

// Malta Flight Information Region (FIR) - larger area for aviation
export const MALTA_FIR_BBOX = {
  north: 37.00,
  south: 34.00,
  east: 16.00,
  west: 12.00,
} as const;

// Mediterranean Sea bbox for wider maritime context
export const MEDITERRANEAN_BBOX = {
  north: 46.00,
  south: 30.00,
  east: 36.00,
  west: -6.00,
} as const;

// Key Malta coordinates
export const MALTA_COORDS = {
  valletta: { lat: 35.8989, lng: 14.5146 },
  mla_airport: { lat: 35.8575, lng: 14.4775 }, // MLA/LMML
  gzo_airport: { lat: 36.0278, lng: 14.2728 }, // GZO/LMMG
  grand_harbour: { lat: 35.8917, lng: 14.5167 },
  marsaxlokk: { lat: 35.8333, lng: 14.5500 },
  mgarr_gozo: { lat: 36.0278, lng: 14.2972 },
  comino: { lat: 36.0111, lng: 14.3333 },
  filfla: { lat: 35.7500, lng: 14.4167 },
} as const;

// Malta maritime zones (approximate)
export const MALTA_MARITIME_ZONES = {
  territorial_sea: 12, // nautical miles
  contiguous_zone: 24,
  eez: 200,
  fishery_zone: 25, // Malta's declared fishery management zone
} as const;

// AIS message types we care about
export const AIS_MESSAGE_TYPES = {
  POSITION_REPORT: ['PositionReport', '1', '2', '3'],
  STATIC_DATA: ['ShipStaticData', '5'],
  VOYAGE_DATA: ['VoyageData', '6'],
} as const;

// Ship type categories for styling (from AIS ship type codes)
export const SHIP_TYPE_CATEGORIES = {
  cargo: [70, 71, 72, 73, 74, 75, 76, 77, 78, 79],
  tanker: [80, 81, 82, 83, 84, 85, 86, 87, 88, 89],
  passenger: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],
  fishing: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
  military: [35, 36, 37], // Some overlap with fishing
  pleasure: [37, 38, 39],
  high_speed: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
  tug: [52, 53, 54],
  other: [90, 91, 92, 93, 94, 95, 96, 97, 98, 99],
} as const;

export function getShipCategory(typeCode: number): string {
  for (const [category, codes] of Object.entries(SHIP_TYPE_CATEGORIES)) {
    if (codes.includes(typeCode)) return category;
  }
  return 'other';
}

export function isInMaltaBbox(lat: number, lng: number, bbox?: { north: number; south: number; east: number; west: number }): boolean {
  const b = bbox ?? MALTA_BBOX;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

export function isInMaltaFir(lat: number, lng: number): boolean {
  return isInMaltaBbox(lat, lng, MALTA_FIR_BBOX);
}

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}