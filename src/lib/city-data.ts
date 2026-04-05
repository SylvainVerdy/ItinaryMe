export interface CityInfo {
  iata: string;        // main airport IATA code
  lat: number;
  lng: number;
  country: string;
}

// Key: lowercase city name / common alias
export const CITY_DATA: Record<string, CityInfo> = {
  // France
  paris: { iata: 'CDG', lat: 48.8566, lng: 2.3522, country: 'FR' },
  lyon: { iata: 'LYS', lat: 45.7640, lng: 4.8357, country: 'FR' },
  marseille: { iata: 'MRS', lat: 43.2965, lng: 5.3698, country: 'FR' },
  nice: { iata: 'NCE', lat: 43.7102, lng: 7.2620, country: 'FR' },
  bordeaux: { iata: 'BOD', lat: 44.8378, lng: -0.5792, country: 'FR' },
  toulouse: { iata: 'TLS', lat: 43.6047, lng: 1.4442, country: 'FR' },
  // Japan
  tokyo: { iata: 'NRT', lat: 35.6762, lng: 139.6503, country: 'JP' },
  osaka: { iata: 'KIX', lat: 34.6937, lng: 135.5023, country: 'JP' },
  kyoto: { iata: 'KIX', lat: 35.0116, lng: 135.7681, country: 'JP' },
  // USA
  'new york': { iata: 'JFK', lat: 40.7128, lng: -74.0060, country: 'US' },
  'new york city': { iata: 'JFK', lat: 40.7128, lng: -74.0060, country: 'US' },
  nyc: { iata: 'JFK', lat: 40.7128, lng: -74.0060, country: 'US' },
  'los angeles': { iata: 'LAX', lat: 34.0522, lng: -118.2437, country: 'US' },
  miami: { iata: 'MIA', lat: 25.7617, lng: -80.1918, country: 'US' },
  chicago: { iata: 'ORD', lat: 41.8781, lng: -87.6298, country: 'US' },
  'san francisco': { iata: 'SFO', lat: 37.7749, lng: -122.4194, country: 'US' },
  // UK
  london: { iata: 'LHR', lat: 51.5074, lng: -0.1278, country: 'GB' },
  manchester: { iata: 'MAN', lat: 53.4808, lng: -2.2426, country: 'GB' },
  edinburgh: { iata: 'EDI', lat: 55.9533, lng: -3.1883, country: 'GB' },
  // Spain
  barcelona: { iata: 'BCN', lat: 41.3851, lng: 2.1734, country: 'ES' },
  madrid: { iata: 'MAD', lat: 40.4168, lng: -3.7038, country: 'ES' },
  seville: { iata: 'SVQ', lat: 37.3891, lng: -5.9845, country: 'ES' },
  // Italy
  rome: { iata: 'FCO', lat: 41.9028, lng: 12.4964, country: 'IT' },
  milan: { iata: 'MXP', lat: 45.4654, lng: 9.1859, country: 'IT' },
  venice: { iata: 'VCE', lat: 45.4408, lng: 12.3155, country: 'IT' },
  florence: { iata: 'FLR', lat: 43.7696, lng: 11.2558, country: 'IT' },
  // Germany
  berlin: { iata: 'BER', lat: 52.5200, lng: 13.4050, country: 'DE' },
  munich: { iata: 'MUC', lat: 48.1351, lng: 11.5820, country: 'DE' },
  // Greece
  athens: { iata: 'ATH', lat: 37.9838, lng: 23.7275, country: 'GR' },
  santorini: { iata: 'JTR', lat: 36.3932, lng: 25.4615, country: 'GR' },
  // Indonesia
  bali: { iata: 'DPS', lat: -8.3405, lng: 115.0920, country: 'ID' },
  // Morocco
  marrakech: { iata: 'RAK', lat: 31.6295, lng: -7.9811, country: 'MA' },
  casablanca: { iata: 'CMN', lat: 33.5731, lng: -7.5898, country: 'MA' },
  // Thailand
  bangkok: { iata: 'BKK', lat: 13.7563, lng: 100.5018, country: 'TH' },
  'phuket': { iata: 'HKT', lat: 7.8804, lng: 98.3923, country: 'TH' },
  // UAE
  dubai: { iata: 'DXB', lat: 25.2048, lng: 55.2708, country: 'AE' },
  // Singapore
  singapore: { iata: 'SIN', lat: 1.3521, lng: 103.8198, country: 'SG' },
  // Canada
  montreal: { iata: 'YUL', lat: 45.5017, lng: -73.5673, country: 'CA' },
  toronto: { iata: 'YYZ', lat: 43.6532, lng: -79.3832, country: 'CA' },
  vancouver: { iata: 'YVR', lat: 49.2827, lng: -123.1207, country: 'CA' },
  // Portugal
  lisbon: { iata: 'LIS', lat: 38.7223, lng: -9.1393, country: 'PT' },
  porto: { iata: 'OPO', lat: 41.1496, lng: -8.6109, country: 'PT' },
  // Netherlands
  amsterdam: { iata: 'AMS', lat: 52.3676, lng: 4.9041, country: 'NL' },
  // Belgium
  brussels: { iata: 'BRU', lat: 50.8503, lng: 4.3517, country: 'BE' },
  // Switzerland
  zurich: { iata: 'ZRH', lat: 47.3769, lng: 8.5417, country: 'CH' },
  geneva: { iata: 'GVA', lat: 46.2044, lng: 6.1432, country: 'CH' },
  // Mexico
  'mexico city': { iata: 'MEX', lat: 19.4326, lng: -99.1332, country: 'MX' },
  cancun: { iata: 'CUN', lat: 21.1619, lng: -86.8515, country: 'MX' },
  // Brazil
  'rio de janeiro': { iata: 'GIG', lat: -22.9068, lng: -43.1729, country: 'BR' },
  'sao paulo': { iata: 'GRU', lat: -23.5505, lng: -46.6333, country: 'BR' },
  // Australia
  sydney: { iata: 'SYD', lat: -33.8688, lng: 151.2093, country: 'AU' },
  melbourne: { iata: 'MEL', lat: -37.8136, lng: 144.9631, country: 'AU' },
  // South Korea
  seoul: { iata: 'ICN', lat: 37.5665, lng: 126.9780, country: 'KR' },
  // China
  beijing: { iata: 'PEK', lat: 39.9042, lng: 116.4074, country: 'CN' },
  shanghai: { iata: 'PVG', lat: 31.2304, lng: 121.4737, country: 'CN' },
  // India
  mumbai: { iata: 'BOM', lat: 19.0760, lng: 72.8777, country: 'IN' },
  delhi: { iata: 'DEL', lat: 28.6139, lng: 77.2090, country: 'IN' },
  // Egypt
  cairo: { iata: 'CAI', lat: 30.0444, lng: 31.2357, country: 'EG' },
};

/** Returns city info from a city name (case-insensitive, accent-tolerant) */
export function getCityInfo(name: string): CityInfo | null {
  const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (CITY_DATA[normalized]) return CITY_DATA[normalized];
  // Partial match fallback
  const key = Object.keys(CITY_DATA).find((k) => k.includes(normalized) || normalized.includes(k));
  return key ? CITY_DATA[key] : null;
}
