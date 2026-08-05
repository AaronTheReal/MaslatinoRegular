// controllers/PlacesController.js
import GooglePlacesService from '../services/GooglePlacesService.js';
import BestRestaurants from '../models/BestRestaurants.js';

// Ciudades soportadas (deben coincidir con los slugs del frontend)
const SUPPORTED_CITIES = [
  'atlanta',
  'boston',
  'dallas',
  'filadelfia',
  'houston',
  'kansas-city',
  'los-angeles',
  'miami',
  'new-york',
  'san-francisco',
  'seattle',
];

class PlacesController {

  // GET /restaurants/:city
  // Si no hay datos en Mongo, automáticamente refresca desde Google Places.
  async apiGetBestRestaurants(req, res) {
    try {
      const { city } = req.params;
      const cityLower = (city || '').toLowerCase().trim();

      if (!cityLower) {
        return res.status(400).json({ message: 'Falta el parámetro :city' });
      }

      let data = await BestRestaurants.findOne({ city: cityLower });

      // Auto-refresh si no existe o está vacío
      if (!data || !data.restaurants || data.restaurants.length === 0) {
        console.log(`ℹ️  Sin datos para ${cityLower}, refrescando desde Google Places...`);
        data = await GooglePlacesService.updateCity(cityLower);
      }

      if (!data || !data.restaurants || data.restaurants.length === 0) {
        return res.status(404).json({
          message: `No se encontraron restaurantes para ${city}.`,
        });
      }

      res.json({
        city: data.city,
        lastUpdated: data.lastUpdated,
        count: data.restaurants.length,
        restaurants: data.restaurants
      });
    } catch (err) {
      console.error('apiGetBestRestaurants error:', err);
      res.status(500).json({ message: 'Error al obtener restaurantes', error: err.message });
    }
  }

  // POST /restaurants/refresh/:city
  async apiRefreshRestaurants(req, res) {
    try {
      const { city } = req.params;
      const result = await GooglePlacesService.updateCity(city);

      res.json({
        success: true,
        message: `✅ ${city} actualizado correctamente`,
        count: result.restaurants.length,
        lastUpdated: result.lastUpdated
      });
    } catch (err) {
      console.error('apiRefreshRestaurants error:', err);
      res.status(500).json({
        success: false,
        message: `Error al actualizar ${req.params.city}`,
        error: err.message
      });
    }
  }

  // GET /restaurants/cities
  async apiGetAvailableCities(req, res) {
    try {
      const cities = await BestRestaurants.find({}).select('city lastUpdated restaurants').lean();
      res.json({
        count: cities.length,
        supported: SUPPORTED_CITIES,
        cities: cities.map(c => ({
          city: c.city,
          lastUpdated: c.lastUpdated,
          restaurantCount: c.restaurants?.length || 0
        }))
      });
    } catch (err) {
      console.error('apiGetAvailableCities error:', err);
      res.status(500).json({ message: 'Error al obtener ciudades', error: err.message });
    }
  }

  // POST /restaurants/refresh-all
  // Actualiza secuencialmente para no saturar la cuota de Google Places.
  async apiRefreshAllCities(req, res) {
    const results = [];
    const errors = [];

    for (const city of SUPPORTED_CITIES) {
      try {
        const r = await GooglePlacesService.updateCity(city);
        results.push({ city, count: r.restaurants.length });
      } catch (err) {
        console.error(`❌ Error en ${city}:`, err.message);
        errors.push({ city, error: err.message });
      }
    }

    res.json({
      success: errors.length === 0,
      message: errors.length === 0
        ? 'Todas las ciudades actualizadas'
        : `Actualizado con ${errors.length} error(es)`,
      updated: results,
      errors
    });
  }
}

const placesController = new PlacesController();
export default placesController;
