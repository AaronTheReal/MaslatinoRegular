// controllers/EventosController.js
import WORLD_CUP_2026_MATCHES from '../data/worldCup2026Matches.js';

class EventosController {

  // GET /eventos/:city
  // Devuelve los partidos del Mundial 2026 que se juegan en una ciudad, ordenados por fecha.
  apiGetEventosByCity(req, res) {
    const { city } = req.params;
    const cityLower = (city || '').toLowerCase().trim();

    if (!cityLower) {
      return res.status(400).json({ message: 'Falta el parámetro :city' });
    }

    const matches = WORLD_CUP_2026_MATCHES
      .filter(match => match.citySlug === cityLower)
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      city: cityLower,
      count: matches.length,
      matches,
    });
  }
}

const eventosController = new EventosController();
export default eventosController;
