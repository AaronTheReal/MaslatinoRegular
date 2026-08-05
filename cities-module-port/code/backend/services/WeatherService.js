// services/WeatherService.js
import axios from 'axios';

// Coordenadas de cada ciudad soportada (deben coincidir con los slugs del CITY_MAP del frontend)
const CITY_COORDINATES = {
  'atlanta':       { lat: 33.7490,  lon: -84.3880 },
  'boston':        { lat: 42.3601,  lon: -71.0589 },
  'dallas':        { lat: 32.7767,  lon: -96.7970 },
  'filadelfia':    { lat: 39.9526,  lon: -75.1652 },
  'houston':       { lat: 29.7604,  lon: -95.3698 },
  'kansas-city':   { lat: 39.0997,  lon: -94.5786 },
  'los-angeles':   { lat: 34.0522,  lon: -118.2437 },
  'miami':         { lat: 25.7617,  lon: -80.1918 },
  'new-york':      { lat: 40.7128,  lon: -74.0060 },
  'san-francisco': { lat: 37.7749,  lon: -122.4194 },
  'seattle':       { lat: 47.6062,  lon: -122.3321 },
};

// Códigos meteorológicos WMO (Open-Meteo) agrupados por condición normalizada
const WEATHER_CODE_GROUPS = {
  soleado: [0],
  'parcialmente-nublado': [1, 2],
  nublado: [3, 45, 48],
  lluvia: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82],
  tormenta: [95, 96, 99],
  nieve: [71, 73, 75, 77, 85, 86],
};

const CONDITION_DESCRIPTIONS = {
  soleado: 'Soleado',
  'parcialmente-nublado': 'Parcialmente nublado',
  nublado: 'Nublado',
  lluvia: 'Lluvia',
  tormenta: 'Tormenta',
  nieve: 'Nieve',
};

function resolveCondition(weatherCode) {
  for (const [condition, codes] of Object.entries(WEATHER_CODE_GROUPS)) {
    if (codes.includes(weatherCode)) return condition;
  }
  return 'parcialmente-nublado';
}

// Cache simple en memoria para no saturar a Open-Meteo
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

class WeatherService {

  static getSupportedCities() {
    return Object.keys(CITY_COORDINATES);
  }

  /**
   * Obtiene el clima actual para una ciudad (slug del CITY_MAP del frontend).
   * Consulta Open-Meteo y devuelve un objeto limpio y normalizado.
   */
  static async getWeatherForCity(citySlug) {
    const cityLower = (citySlug || '').toLowerCase().trim();
    const coords = CITY_COORDINATES[cityLower];

    if (!coords) {
      throw new Error(`Ciudad no soportada: ${citySlug}`);
    }

    const cached = cache.get(cityLower);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      return cached.data;
    }

    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: coords.lat,
        longitude: coords.lon,
        current: 'temperature_2m,apparent_temperature,weather_code',
        hourly: 'precipitation_probability',
        temperature_unit: 'fahrenheit',
        timezone: 'auto',
        forecast_days: 1,
      },
    });

    const { current, hourly } = response.data;
    const weatherCode = current.weather_code;
    const condition = resolveCondition(weatherCode);

    let precipitationProbability = 0;
    if (hourly?.time && hourly?.precipitation_probability) {
      const idx = hourly.time.indexOf(current.time);
      precipitationProbability = hourly.precipitation_probability[idx >= 0 ? idx : 0] ?? 0;
    }

    const data = {
      city: cityLower,
      coordinates: coords,
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      weatherCode,
      condition,
      description: CONDITION_DESCRIPTIONS[condition],
      precipitationProbability: Math.round(precipitationProbability),
      lastUpdated: new Date(),
    };

    cache.set(cityLower, { data, timestamp: Date.now() });
    return data;
  }
}

export default WeatherService;
