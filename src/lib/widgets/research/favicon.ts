/** Known source name → domain mappings */
const DOMAIN_MAP: Record<string, string> = {
  reddit: 'reddit.com',
  youtube: 'youtube.com',
  twitter: 'twitter.com',
  x: 'x.com',
  nytimes: 'nytimes.com',
  bbc: 'bbc.com',
  reuters: 'reuters.com',
  bloomberg: 'bloomberg.com',
  aljazeera: 'aljazeera.com',
  firstpost: 'firstpost.com',
  moneycontrol: 'moneycontrol.com',
  ndtv: 'ndtv.com',
  theweek: 'theweek.in',
  verge: 'theverge.com',
  wired: 'wired.com',
  techcrunch: 'techcrunch.com',
  gsmarena: 'gsmarena.com',
  tomsguide: 'tomsguide.com',
  lonelyplanet: 'lonelyplanet.com',
  tripadvisor: 'tripadvisor.com',
  MDN: 'developer.mozilla.org',
  mdn: 'developer.mozilla.org',
  'javascript.info': 'javascript.info',
  timesofindia: 'timesofindia.indiatimes.com',
  'hindustan times': 'hindustantimes.com',
  'energy.economictimes': 'energy.economictimes.com',
  'ft.com': 'ft.com',
  'NSE India': 'nseindia.com',
  'OpenWeather': 'openweathermap.org',
  IMD: 'mausam.imd.gov.in',
  BSE: 'bseindia.com',
  'japan-guide.com': 'japan-guide.com',
  madhyamam: 'madhyamam.com',
  'nvidia.com': 'nvidia.com'
};

/**
 * Derive a favicon URL from a source name.
 * Uses Google's favicon service for reliable, cached icons.
 */
export function faviconUrl(source: string): string {
  const domain = DOMAIN_MAP[source]
    ?? (source?.includes('.') ? source : `${source?.toLowerCase()?.replace(/\s+/g, '')}.com`);
  return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
}
