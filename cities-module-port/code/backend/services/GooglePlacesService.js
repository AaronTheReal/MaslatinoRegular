// services/GooglePlacesService.js
import BestRestaurants from '../models/BestRestaurants.js';
import BestTurismo from '../models/BestTurismo.js';
import BestHangout from '../models/BestHangout.js';
import BestFanzone from '../models/BestFanzone.js';
import axios from 'axios';

// Convierte un slug (kansas-city, los-angeles) en nombre legible para la búsqueda
const SLUG_TO_QUERY = {
  'atlanta':       'Atlanta',
  'boston':        'Boston',
  'dallas':        'Dallas',
  'filadelfia':    'Philadelphia',
  'houston':       'Houston',
  'kansas-city':   'Kansas City',
  'los-angeles':   'Los Angeles',
  'miami':         'Miami',
  'new-york':      'New York',
  'san-francisco': 'San Francisco',
  'seattle':       'Seattle',
};

// Configuración por categoría: cada una reutiliza la misma integración de
// Google Places (GOOGLE_PLACES_API_KEY), solo cambia el modelo, el tipo de
// lugar y el texto de búsqueda.
const CATEGORY_CONFIG = {
  turismo: {
    model: BestTurismo,
    includedType: 'tourist_attraction',
    textQuery: (cityName) => `best tourist attractions, museums and parks in ${cityName}`,
  },
  hangout: {
    model: BestHangout,
    includedType: 'bar',
    textQuery: (cityName) => `best bars, cafes and nightlife spots in ${cityName}`,
  },
  fanzone: {
    model: BestFanzone,
    includedType: 'bar',
    textQuery: (cityName) => `best sports bars in ${cityName}`,
  },
};

class GooglePlacesService {

  /**
   * URL pública de la foto. ⚠️ La API key viaja al cliente: restringe la key
   * por HTTP referrer en GCP Console para mitigar abuso.
   */
  static buildPhotoUrl(photoName, maxWidth = 800) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    return `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=${maxWidth}`;
  }

  /**
   * Convierte un slug a nombre de ciudad para la búsqueda de texto.
   */
  static slugToCityName(slug) {
    const cityLower = (slug || '').toLowerCase().trim();
    return SLUG_TO_QUERY[cityLower] || cityLower.replace(/-/g, ' ');
  }

  /**
   * Actualiza (o crea) los mejores restaurantes de una ciudad.
   * Recibe el slug (ej: 'kansas-city'); se guarda con ese slug en Mongo.
   */
  static async updateCity(city) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY no está definida en el .env');
    }

    const cityLower = (city || '').toLowerCase().trim();
    if (!cityLower) {
      throw new Error('Ciudad vacía');
    }

    const cityName = GooglePlacesService.slugToCityName(cityLower);

    try {
      const response = await axios.post(
        'https://places.googleapis.com/v1/places:searchText',
        {
          textQuery: `best restaurants in ${cityName}`,
          includedType: 'restaurant',
          languageCode: 'es',
          pageSize: 20,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': [
              'places.id',
              'places.displayName',
              'places.formattedAddress',
              'places.rating',
              'places.userRatingCount',
              'places.priceLevel',
              'places.googleMapsUri',
              'places.websiteUri',
              'places.photos',
            ].join(','),
          },
        }
      );

      const places = response.data.places || [];

      const restaurants = places.map(place => ({
        placeId: place.id || place.name,
        name: place.displayName?.text || 'Sin nombre',
        formattedAddress: place.formattedAddress || '',
        rating: place.rating || 0,
        priceLevel: place.priceLevel || '',
        googleMapsUri: place.googleMapsUri || '',
        photos: (place.photos || []).slice(0, 5).map(photo => ({
          url: GooglePlacesService.buildPhotoUrl(photo.name),
          authorName: photo.authorAttributions?.[0]?.displayName || '',
          authorUri: photo.authorAttributions?.[0]?.uri || '',
        })),
        lastUpdated: new Date(),
      }));

      const result = await BestRestaurants.findOneAndUpdate(
        { city: cityLower },
        {
          city: cityLower,
          restaurants,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log(`✅ ${cityName} (${cityLower}) actualizado: ${restaurants.length} restaurantes`);
      return result;

    } catch (error) {
      const detail = error.response?.data || error.message;
      console.error(`❌ Error actualizando ${cityLower}:`, detail);
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }
  }

  /**
   * Categorías soportadas para búsquedas genéricas (turismo, hangout, fanzone).
   */
  static getSupportedCategories() {
    return Object.keys(CATEGORY_CONFIG);
  }

  /**
   * Actualiza (o crea) los mejores lugares de una categoría (turismo, hangout, fanzone)
   * para una ciudad. Reutiliza la misma integración/credencial de Google Places que
   * los restaurantes, solo cambia el tipo de lugar y el texto de búsqueda.
   */
  static async updateCityCategory(category, city) {
    const config = CATEGORY_CONFIG[category];
    if (!config) {
      throw new Error(`Categoría no soportada: ${category}`);
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY no está definida en el .env');
    }

    const cityLower = (city || '').toLowerCase().trim();
    if (!cityLower) {
      throw new Error('Ciudad vacía');
    }

    const cityName = GooglePlacesService.slugToCityName(cityLower);

    try {
      const response = await axios.post(
        'https://places.googleapis.com/v1/places:searchText',
        {
          textQuery: config.textQuery(cityName),
          includedType: config.includedType,
          languageCode: 'es',
          pageSize: 20,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': [
              'places.id',
              'places.displayName',
              'places.formattedAddress',
              'places.rating',
              'places.userRatingCount',
              'places.priceLevel',
              'places.googleMapsUri',
              'places.websiteUri',
              'places.photos',
            ].join(','),
          },
        }
      );

      const placesData = response.data.places || [];

      const places = placesData.map(place => ({
        placeId: place.id || place.name,
        name: place.displayName?.text || 'Sin nombre',
        formattedAddress: place.formattedAddress || '',
        rating: place.rating || 0,
        priceLevel: place.priceLevel || '',
        googleMapsUri: place.googleMapsUri || '',
        photos: (place.photos || []).slice(0, 5).map(photo => ({
          url: GooglePlacesService.buildPhotoUrl(photo.name),
          authorName: photo.authorAttributions?.[0]?.displayName || '',
          authorUri: photo.authorAttributions?.[0]?.uri || '',
        })),
        lastUpdated: new Date(),
      }));

      const result = await config.model.findOneAndUpdate(
        { city: cityLower },
        {
          city: cityLower,
          places,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log(`✅ [${category}] ${cityName} (${cityLower}) actualizado: ${places.length} lugares`);
      return result;

    } catch (error) {
      const detail = error.response?.data || error.message;
      console.error(`❌ [${category}] Error actualizando ${cityLower}:`, detail);
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }
  }
}

export default GooglePlacesService;
