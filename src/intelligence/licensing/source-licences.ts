export interface SourceLicence {
  sourceId: string;
  publisher: string;
  licence: string;
  attributionText: string;
  attributionRequired: boolean;
  termsUrl?: string;
}

export const SOURCE_LICENCES: SourceLicence[] = [
  {
    sourceId: 'adsb-lol',
    publisher: 'ADSB.lol Community',
    licence: 'ODbL (Open Database License)',
    attributionText: 'Flight data by ADSB.lol',
    attributionRequired: true,
    termsUrl: 'https://www.adsb.lol/terms',
  },
  {
    sourceId: 'usgs-earthquake',
    publisher: 'United States Geological Survey',
    licence: 'Public Domain (US Government Work)',
    attributionText: 'Earthquake data by USGS',
    attributionRequired: false,
  },
  {
    sourceId: 'nasa-firms',
    publisher: 'NASA FIRMS',
    licence: 'NASA Open Data',
    attributionText: 'Fire data by NASA FIRMS',
    attributionRequired: false,
  },
  {
    sourceId: 'open-meteo-marine',
    publisher: 'Open-Meteo',
    licence: 'Free for non-commercial use with attribution',
    attributionText: 'Weather data by Open-Meteo',
    attributionRequired: true,
    termsUrl: 'https://open-meteo.com/terms',
  },
  {
    sourceId: 'cartocdn',
    publisher: 'CARTO',
    licence: 'Free with attribution',
    attributionText: '© CARTO',
    attributionRequired: true,
    termsUrl: 'https://carto.com/attributions',
  },
  {
    sourceId: 'lovin-malta',
    publisher: 'Lovin Malta',
    licence: 'Website Terms of Service',
    attributionText: 'News by Lovin Malta',
    attributionRequired: false,
  },
  {
    sourceId: 'council-eu-rss',
    publisher: 'Council of the European Union',
    licence: 'EUPL (European Union Public Licence)',
    attributionText: '© European Union',
    attributionRequired: false,
    termsUrl: 'https://www.consilium.europa.eu/en/legal-notice/',
  },
  {
    sourceId: 'eu-sanctions',
    publisher: 'European Commission',
    licence: 'EUPL (European Union Public Licence)',
    attributionText: '© European Union',
    attributionRequired: false,
    termsUrl: 'https://ec.europa.eu/info/legal-notice_en',
  },
  {
    sourceId: 'reliefweb',
    publisher: 'OCHA / ReliefWeb',
    licence: 'ReliefWeb API Terms',
    attributionText: 'Humanitarian data by ReliefWeb/OCHA',
    attributionRequired: true,
    termsUrl: 'https://reliefweb.int/terms-conditions',
  },
  {
    sourceId: 'world-bank',
    publisher: 'World Bank',
    licence: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
    attributionText: 'Data by World Bank',
    attributionRequired: true,
    termsUrl: 'https://www.worldbank.org/en/about/legal',
  },
];

export function getLicence(sourceId: string): SourceLicence | undefined {
  return SOURCE_LICENCES.find(l => l.sourceId === sourceId);
}
