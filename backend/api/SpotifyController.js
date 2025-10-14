// SpotifyController.js

import axios from 'axios';
import dotenv from 'dotenv';
import Podcast from '../models/Podcast.js'; // asegúrate de importar el modelo
import Show from '../models/Show.js'; // asegúrate de importar el modelo


dotenv.config();

class SpotifyController {
  constructor() {
    this.spotifyToken = null;
    this.tokenExpiration = null;
    this.savePodcast = this.savePodcast.bind(this);

    // Enlazar método si vas a usarlo como handler directamente
    this.apiSearchPodcast = this.apiSearchPodcast.bind(this);
  }


 async getShowDespliegue(req, res) {
  try {
    //console.log("🟢 Entró a getShowDespliegue");

    const showId = req.body.id;
    const show = await Show.findById(showId);

    if (!show) {
      return res.status(404).json({ message: 'Show no encontrado' });
    }

    const spotifyId = show.spotifyId;

    // ⛓️ Obtener token de Spotify
    const spotifyAccessToken = await this.getSpotifyToken(); // <-- usar el método de clase

    // 🔍 Llamar a Spotify para obtener episodios del show
    const response = await axios.get(
      `https://api.spotify.com/v1/shows/${spotifyId}/episodes?limit=20`,
      {
        headers: {
          Authorization: `Bearer ${spotifyAccessToken}`,
        },
      }
    );

    const episodes = response.data.items || [];

    // Combinar datos del show con los episodios
    const result = {
      ...show.toObject(),
      episodes,
    };

    res.json(result);
  } catch (error) {
    console.error('❌ Error en getShowDespliegue:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
}


async getShowsAndEpisodes(req, res) {
    try {
      // Query all shows with relevant fields and their episodes
      const shows = await Show.find()
        .select('spotifyId title image embedUrl episodes')
        .lean(); // Convert to plain JavaScript objects for better performance
        //console.log(shows)
 res.status(200).json(shows); // sin `{ success, data }`

    } catch (error) {
      console.error('Error fetching shows and episodes:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching shows and episodes',
        error: error.message,
      });
    }
  }

  async getPodcastDespliegue(req, res) {
    try {

      const podcastId = req.body.id; // Obtener el ID del parámetro de la URL

      const podcast = await Podcast.findById(podcastId); // Buscar el podcast en la base de datos
      if (!podcast) {
        return res.status(404).json({ message: 'Podcast no encontrado' });
      }
      res.json(podcast); // Devolver los detalles del podcast
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error del servidor' });
    }
  }

  async getSpotifyToken() {
    
    const now = Date.now();
    if (this.spotifyToken && this.tokenExpiration && now < this.tokenExpiration) {
      return this.spotifyToken;
    }

    const credentials = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.spotifyToken = response.data.access_token;
      this.tokenExpiration = now + response.data.expires_in * 1000;

      return this.spotifyToken;

    } catch (error) {
      console.error('Error fetching Spotify token:', error.response?.data || error.message);
      throw error;
    }
  }

async apiSearchPodcast(req, res) {
  try {
    const q = req.query.q;

    if (!q) {
      return res.status(400).json({ error: "Falta el parámetro ?q=" });
    }

    const token = await this.getSpotifyToken();

    const makeRequest = async () => {
      return await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          q,
          type: 'show',
          limit: 10,
        },
        validateStatus: () => true, // permite manejar manualmente errores como 429
      });
    };

    let response = await makeRequest();

    // Si recibimos 429, intentamos una vez más después del tiempo recomendado
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers['retry-after'] || '1', 10); // en segundos
      console.warn(`Rate limit alcanzado. Reintentando en ${retryAfter} segundos...`);

      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      response = await makeRequest(); // segundo intento
    }

    // Si aún falla, devolvemos error
    if (response.status !== 200) {
      console.error('Spotify API error:', response.status, response.data);
      return res.status(response.status).json({ error: "Error al buscar en Spotify" });
    }

    const results = response.data.shows.items.map(show => ({
      spotifyId: show.id,
      title: show.name,
      description: show.description,
      image: show.images?.[0]?.url,
      url: show.external_urls.spotify,
      embedUrl: `https://open.spotify.com/embed/show/${show.id}`,
    }));

    //console.log(results);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error inesperado al buscar en Spotify" });
  }
}

  
async savePodcast(req, res) {
  try {
    const { spotifyId, title, description, image, url, embedUrl } = req.body;

    if (!spotifyId || !embedUrl) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const exists = await Podcast.findOne({ spotifyId });
    if (exists) {
      return res.status(409).json({ message: 'Podcast ya guardado' });
    }

    const newPodcast = new Podcast({
      spotifyId,
      title,
      description,
      image,
      url,
      embedUrl,
    });

    await newPodcast.save();
    res.status(201).json({ message: 'Podcast guardado exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el podcast' });
  }
}
async getAllPodcasts(req, res) {
  try {
    const all = await Podcast.find().sort({ addedAt: -1 });

    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los podcasts' });
  }
}

}

const spotifyController = new SpotifyController();
export default spotifyController;
