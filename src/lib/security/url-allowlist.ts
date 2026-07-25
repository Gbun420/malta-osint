const ALLOWED_HOSTS = new Set([
  'api.adsb.lol',
  'earthquake.usgs.gov',
  'firms.modaps.eosdis.nasa.gov',
  'eonet.gsfc.nasa.gov',
  'marine-api.open-meteo.com',
  'api.open-meteo.com',
  'basemaps.cartocdn.com',
  'tiles.basemaps.cartocdn.com',
  'tiles-a.basemaps.cartocdn.com',
  'tiles-b.basemaps.cartocdn.com',
  'tiles-c.basemaps.cartocdn.com',
  'tiles-d.basemaps.cartocdn.com',
  'server.arcgisonline.com',
  'stream.aisstream.io',
  'api.vesselapi.com',
  'api.reliefweb.int',
  'www.gdacs.org',
  'newsbook.com.mt',
  'lovinmalta.com',
  'tvmnews.mt',
  'feeds.bbci.co.uk',
  'www.aljazeera.com',
  't.me',
  'consilium.europa.eu',
  'data.consilium.europa.eu',
  'ec.europa.eu',
  'eur-lex.europa.eu',
  'eeas.europa.eu',
  'news.un.org',
  'un.org',
  'api.worldbank.org',
  'ec.europa.eu/eurostat',
  'comtrade.un.org',
  'api.comtrade.un.org',
  'opensky-network.org',
]);

export function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.has(parsed.hostname) ||
      parsed.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

export function addAllowedHost(host: string): void {
  ALLOWED_HOSTS.add(host);
}
