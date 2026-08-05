// controllers/PlacesExtraController.js
import GooglePlacesService from '../services/GooglePlacesService.js';
import BestTurismo from '../models/BestTurismo.js';
import BestHangout from '../models/BestHangout.js';
import BestFanzone from '../models/BestFanzone.js';
import FAN_FEST_ZONES from '../data/fanFestZones.js';

// Configuración por categoría: modelo Mongo + mensaje de "no encontrado"
const CATEGORY_MODELS = {
  turismo: { model: BestTurismo, notFound: 'No se encontraron lugares de turismo para' },
  hangout: { model: BestHangout, notFound: 'No se encontraron lugares para hangout en' },
  fanzone: { model: BestFanzone, notFound: 'No se encontraron bares deportivos para' },
};

class PlacesExtraController {

  // Lógica común para GET /turismo/:city, /hangout/:city y /fanzone/:city
  // Si no hay datos en Mongo, automáticamente refresca desde Google Places.
  async getBestPlaces(category, req, res) {
    try {
      const { model, notFound } = CATEGORY_MODELS[category];
      const { city } = req.params;
      const cityLower = (city || '').toLowerCase().trim();

      if (!cityLower) {
        return res.status(400).json({ message: 'Falta el parámetro :city' });
      }

      let data = await model.findOne({ city: cityLower });

      // Auto-refresh si no existe o está vacío
      if (!data || !data.places || data.places.length === 0) {
        console.log(`ℹ️  [${category}] Sin datos para ${cityLower}, refrescando desde Google Places...`);
        data = await GooglePlacesService.updateCityCategory(category, cityLower);
      }

      if (!data || !data.places || data.places.length === 0) {
        return res.status(404).json({ message: `${notFound} ${city}.` });
      }

      const response = {
        city: data.city,
        lastUpdated: data.lastUpdated,
        count: data.places.length,
        places: data.places,
      };

      // Fanzone: agrega la zona oficial de FIFA Fan Festival si está confirmada para esta ciudad
      if (category === 'fanzone') {
        response.fanFest = FAN_FEST_ZONES[cityLower] || null;
      }

      res.json(response);
    } catch (err) {
      console.error(`apiGetBest${category} error:`, err);
      res.status(500).json({ message: `Error al obtener ${category}`, error: err.message });
    }
  }

  // GET /turismo/:city
  apiGetTurismo = (req, res) => this.getBestPlaces('turismo', req, res);

  // GET /hangout/:city
  apiGetHangout = (req, res) => this.getBestPlaces('hangout', req, res);

  // GET /fanzone/:city
  apiGetFanzone = (req, res) => this.getBestPlaces('fanzone', req, res);

  // POST /turismo/refresh/:city, /hangout/refresh/:city, /fanzone/refresh/:city
  async refreshCategory(category, req, res) {
    try {
      const { city } = req.params;
      const result = await GooglePlacesService.updateCityCategory(category, city);

      res.json({
        success: true,
        message: `✅ [${category}] ${city} actualizado correctamente`,
        count: result.places.length,
        lastUpdated: result.lastUpdated,
      });
    } catch (err) {
      console.error(`apiRefresh${category} error:`, err);
      res.status(500).json({
        success: false,
        message: `Error al actualizar ${category} de ${req.params.city}`,
        error: err.message,
      });
    }
  }

  apiRefreshTurismo = (req, res) => this.refreshCategory('turismo', req, res);
  apiRefreshHangout = (req, res) => this.refreshCategory('hangout', req, res);
  apiRefreshFanzone = (req, res) => this.refreshCategory('fanzone', req, res);
}

const placesExtraController = new PlacesExtraController();
export default placesExtraController;
