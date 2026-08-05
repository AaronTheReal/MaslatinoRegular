/**
 * Tipos del módulo Cities.
 *
 * En el proyecto de origen, `Place`, `PlacePhoto` y `CityPlacesResponse`
 * estaban duplicados literalmente en tres servicios (turismo, hangout, fanzone)
 * y con otros nombres en un cuarto (restaurantes). Aquí viven una sola vez.
 */

export interface PlacePhoto {
  /** URL servida por el proxy del backend; nunca contiene la clave de Google. */
  url: string;
  authorName?: string;
  authorUri?: string;
}

export interface Place {
  _id?: string;
  placeId: string;
  name: string;
  formattedAddress: string;
  rating: number;
  priceLevel?: string;
  googleMapsUri?: string;
  photos: PlacePhoto[];
  lastUpdated?: string;
}

export interface CityPlacesResponse {
  city: string;
  lastUpdated: string;
  count: number;
  places: Place[];
}

/** Los restaurantes tienen la misma forma; solo cambia el nombre del array. */
export interface CityRestaurantsResponse {
  city: string;
  lastUpdated: string;
  count: number;
  restaurants: Place[];
}

/** Sede oficial del FIFA Fan Festival, solo en las ciudades confirmadas. */
export interface FanFestZone {
  name: string;
  address: string;
  dates: string;
}

export interface CityFanzoneResponse extends CityPlacesResponse {
  fanFest?: FanFestZone | null;
}

export type WeatherCondition =
  | 'soleado'
  | 'parcialmente-nublado'
  | 'nublado'
  | 'lluvia'
  | 'tormenta'
  | 'nieve';

export interface WeatherData {
  city: string;
  coordinates: { lat: number; lon: number };
  temperature: number;
  feelsLike: number;
  weatherCode: number;
  condition: WeatherCondition;
  description: string;
  precipitationProbability: number;
  lastUpdated: string;
}

export const WEATHER_ICONS: Readonly<Record<WeatherCondition, string>> = {
  soleado: 'assets/iconospartes/sol.svg',
  'parcialmente-nublado': 'assets/iconospartes/nube-sol.svg',
  nublado: 'assets/iconospartes/nube.svg',
  lluvia: 'assets/iconospartes/lluvia.svg',
  tormenta: 'assets/iconospartes/tormenta.svg',
  nieve: 'assets/iconospartes/nieve.svg',
};

export const WEATHER_FEELS_LIKE_ICON = 'assets/iconospartes/termometro.svg';
export const WEATHER_PRECIPITATION_ICON = 'assets/iconospartes/gota.svg';

export interface MatchTeams {
  home: string;
  away: string;
}

export interface Match {
  id: string;
  citySlug: string;
  stadium: string;
  date: string;
  stage: string;
  teams: MatchTeams;
}

export interface CityMatchesResponse {
  city: string;
  count: number;
  matches: Match[];
}

/** Las 11 ciudades del módulo. Fuente única para rutas, API y navegación. */
export interface CityDefinition {
  slug: string;
  name: string;
  image: string;
}

export const CITIES: readonly CityDefinition[] = [
  { slug: 'atlanta', name: 'Atlanta', image: 'assets/cyties/atlanta.png' },
  { slug: 'boston', name: 'Boston', image: 'assets/cyties/boston.png' },
  { slug: 'dallas', name: 'Dallas', image: 'assets/cyties/dallas.png' },
  { slug: 'filadelfia', name: 'Filadelfia', image: 'assets/cyties/filadelfia.png' },
  { slug: 'houston', name: 'Houston', image: 'assets/cyties/houston.png' },
  { slug: 'kansas-city', name: 'Kansas City', image: 'assets/cyties/kansas city.png' },
  { slug: 'los-angeles', name: 'Los Ángeles', image: 'assets/cyties/los angeles.png' },
  { slug: 'miami', name: 'Miami', image: 'assets/cyties/miami.png' },
  { slug: 'new-york', name: 'Nueva York', image: 'assets/cyties/new york.png' },
  { slug: 'san-francisco', name: 'San Francisco', image: 'assets/cyties/san francisco.png' },
  { slug: 'seattle', name: 'Seattle', image: 'assets/cyties/seattle.png' },
] as const;

export function findCityBySlug(slug: string): CityDefinition | undefined {
  const normalized = (slug || '').toLowerCase().trim();
  return CITIES.find((city) => city.slug === normalized);
}

/** Las cinco secciones del hub de ciudad. */
export type SectionKey =
  | 'eventos'
  | 'hangout'
  | 'fanzone'
  | 'turismo'
  | 'restaurantes';

export interface SectionDefinition {
  id: SectionKey;
  /** Título grande del hero de la sección. */
  title: string;
  /** Línea corta sobre el título. */
  subtitle: string;
  icon: string;
  /** Color representativo: hero, punto del carrusel y acento del botón. */
  color: string;
  /** Cierre del degradado del hero. */
  colorDark: string;
}

/**
 * Orden cíclico usado por las flechas del carrusel y por los puntos
 * indicadores. Definir color, icono y textos aquí evita que cada componente
 * repita su propia copia, como ocurría en el módulo de origen.
 */
export const SECTIONS: readonly SectionDefinition[] = [
  {
    id: 'eventos',
    title: 'Eventos',
    subtitle: 'Para entretenerte',
    icon: 'assets/iconospartes/eventos.webp',
    color: '#fe0900',
    colorDark: '#c40700',
  },
  {
    id: 'hangout',
    title: 'Para salir',
    subtitle: 'Para pasar el rato',
    icon: 'assets/iconospartes/hangout.webp',
    color: '#b121fe',
    colorDark: '#8a19c6',
  },
  {
    id: 'fanzone',
    title: 'Fan Zone',
    subtitle: 'Vive la experiencia',
    icon: 'assets/iconospartes/fanzone.webp',
    color: '#00cf82',
    colorDark: '#00a266',
  },
  {
    id: 'turismo',
    title: 'Turismo',
    subtitle: 'Recorre la ciudad',
    icon: 'assets/iconospartes/turismo.webp',
    color: '#fdb700',
    colorDark: '#d99a00',
  },
  {
    id: 'restaurantes',
    title: 'Los mejores restaurantes',
    subtitle: 'Para comer',
    icon: 'assets/iconospartes/restaurantes.webp',
    color: '#9747ff',
    colorDark: '#7734cc',
  },
] as const;

export const SECTION_ORDER: readonly SectionKey[] = SECTIONS.map((s) => s.id);

export function findSection(id: SectionKey): SectionDefinition {
  return SECTIONS.find((section) => section.id === id) ?? SECTIONS[0];
}
