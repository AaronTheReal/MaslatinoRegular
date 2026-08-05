// controllers/WeatherController.js
import WeatherService from '../services/WeatherService.js';

class WeatherController {

  // GET /weather/:city
  async apiGetWeather(req, res) {
    try {
      const { city } = req.params;
      const cityLower = (city || '').toLowerCase().trim();

      if (!cityLower) {
        return res.status(400).json({ message: 'Falta el parámetro :city' });
      }

      if (!WeatherService.getSupportedCities().includes(cityLower)) {
        return res.status(404).json({ message: `Ciudad no soportada: ${city}` });
      }

      const weather = await WeatherService.getWeatherForCity(cityLower);
      res.json(weather);
    } catch (err) {
      console.error('apiGetWeather error:', err);
      res.status(500).json({ message: 'Error al obtener el clima', error: err.message });
    }
  }
}

const weatherController = new WeatherController();
export default weatherController;
