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

/**
 * Antigüedad máxima de un documento de lugares antes de volver a pedirlo.
 *
 * Google avisa de que el `photoName` no se puede cachear porque caduca: pasado
 * un tiempo, `/media` responde 400 "The photo resource in the request is
 * invalid" y todas las tarjetas se quedan sin foto. Antes solo se refrescaba
 * cuando la ciudad no tenía datos, así que un documento guardado una vez servía
 * fotos rotas para siempre (Nueva York, guardada el 14-ago, ya no cargaba
 * ninguna el 28-sep).
 */
const PLACES_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Refrescos en curso por `categoria:ciudad`. La página de una ciudad pide varias
// secciones a la vez y varios visitantes pueden llegar juntos: sin esto, cada
// petición sobre un documento viejo lanzaría su propia búsqueda de pago.
const inFlightRefreshes = new Map();

class GooglePlacesService {

  /**
   * `true` si el documento no existe, está vacío o es más viejo que
   * `PLACES_MAX_AGE_MS`. `listField` es `restaurants` o `places` según el modelo.
   */
  static needsRefresh(doc, listField, now = Date.now()) {
    if (!doc?.[listField]?.length) return true;

    const updatedAt = new Date(doc.lastUpdated).getTime();
    if (!Number.isFinite(updatedAt)) return true;

    return now - updatedAt > PLACES_MAX_AGE_MS;
  }

  /**
   * Devuelve `doc` si sigue vigente o el resultado de `refresh()` si no.
   *
   * Si Google falla y ya había datos, se sirven los viejos: mejor tarjetas sin
   * foto que la sección entera en error. Si no había nada, el error se propaga.
   */
  static async ensureFresh(doc, listField, key, refresh) {
    if (!GooglePlacesService.needsRefresh(doc, listField)) return doc;

    let pending = inFlightRefreshes.get(key);
    if (!pending) {
      pending = Promise.resolve()
        .then(refresh)
        .finally(() => inFlightRefreshes.delete(key));
      inFlightRefreshes.set(key, pending);
    }

    try {
      return await pending;
    } catch (error) {
      if (doc?.[listField]?.length) {
        console.error(`⚠️  No se pudo refrescar ${key}, se sirven los datos guardados:`, error.message);
        return doc;
      }
      throw error;
    }
  }

  /**
   * Referencia de la foto tal y como la devuelve Google. Solo se guarda el
   * identificador: la URL pública se construye al leer y apunta al proxy del
   * backend, para que `GOOGLE_PLACES_API_KEY` no viaje nunca al navegador ni
   * quede congelada dentro de los documentos de Mongo.
   */
  static toStoredPhoto(photo) {
    return {
      photoName: photo?.name || '',
      authorName: photo?.authorAttributions?.[0]?.displayName || '',
      authorUri: photo?.authorAttributions?.[0]?.uri || '',
    };
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
        photos: (place.photos || [])
          .slice(0, 5)
          .map(GooglePlacesService.toStoredPhoto)
          .filter(photo => photo.photoName),
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
        photos: (place.photos || [])
          .slice(0, 5)
          .map(GooglePlacesService.toStoredPhoto)
          .filter(photo => photo.photoName),
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
