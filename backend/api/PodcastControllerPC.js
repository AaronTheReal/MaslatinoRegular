
import axios from 'axios';
import dotenv from 'dotenv';
import PodcastDesktop from '../models/PodcastPC.js'; // asegúrate de importar el modelo
import Category from '../models/Categorias.js';

dotenv.config();
// util pequeñito para escapar regex
function escapeRegExp(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class PodcastControllerPC {
  // 🔹 Crear un nuevo podcast
  async crearPodcast(req, res) {
    try {
      console.log(req.body);
      const podcast = new PodcastDesktop(req.body);
      await podcast.save();
      res.status(201).json(podcast);
    }  catch (error) {
        console.error('❌ Error al crear podcast:', error);
        res.status(400).json({ mensaje: 'Error al crear el podcast', error });
      }
  }

    // 🔹 Obtener todos los podcasts (ordenados por "order" ascendente)
    async obtenerPodcasts(req, res) {
    try {
        const podcasts = await PodcastDesktop.find().sort({ order: 1, createdAt: -1 });
        res.json(podcasts);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener los podcasts', error });
    }
    }
    // 🔹 Obtener los podcasts destacados para home (máximo 4)
    async obtenerPodcastsHome(req, res) {
      console.log("si llega?");
    try {
        const podcasts = await PodcastDesktop.find({ featured: true })
        .sort({ order: 1 })
        .limit(4);
        res.json(podcasts);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener podcasts para home', error });
    }
    }


  // 🔹 Obtener un podcast por ID
  async obtenerPodcastPorId(req, res) {
    try {
      const podcast = await PodcastDesktop.findById(req.params.id);
      if (!podcast) return res.status(404).json({ mensaje: 'Podcast no encontrado' });
      res.json(podcast);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al obtener el podcast', error });
    }
  }

   // 🔹 Obtener un podcast por ID

async obtenerPodcastsPorNombreCategoria(req, res) {z
  try {
    const { name } = req.params;              // p.ej. "Deportes"
    const { page = 1, limit = 20 } = req.query;

    console.log("si llega?", name);
    // Busca la categoría por nombre (case-insensitive)
    const category = await Category.findOne({
      name: new RegExp(`^${escapeRegExp(name)}$`, 'i')
    });

    if (!category) {
      return res.status(404).json({ mensaje: `Categoría '${name}' no encontrada` });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [results, total] = await Promise.all([
      PodcastDesktop.find({ categories: category._id })
        .populate('categories', 'name slug color')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      PodcastDesktop.countDocuments({ categories: category._id })
    ]);

    return res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      category: { _id: category._id, name: category.name, slug: category.slug },
      results
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: 'Error al obtener podcasts por categoría (nombre)', error });
  }
};



  // 🔹 Actualizar un podcast
  async actualizarPodcast(req, res) {
    try {
      const podcast = await PodcastDesktop.findByIdAndUpdate(req.params.id, req.body, {
        new: true
      });
      if (!podcast) return res.status(404).json({ mensaje: 'Podcast no encontrado' });
      res.json(podcast);
    } catch (error) {
      res.status(400).json({ mensaje: 'Error al actualizar el podcast', error });
    }
  }

  // 🔹 Eliminar un podcast
  async eliminarPodcast(req, res) {
    try {
      const podcast = await PodcastDesktop.findByIdAndDelete(req.params.id);
      if (!podcast) return res.status(404).json({ mensaje: 'Podcast no encontrado' });
      res.json({ mensaje: 'Podcast eliminado correctamente' });
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al eliminar el podcast', error });
    }
  }

  // 🔹 Agregar un episodio a un podcast
  async agregarEpisodio(req, res) {
    try {
      const { id } = req.params;
      const podcast = await PodcastDesktop.findById(id);
      if (!podcast) return res.status(404).json({ mensaje: 'Podcast no encontrado' });

      podcast.episodes.push(req.body);
      podcast.updatedAt = Date.now();
      await podcast.save();

      res.status(201).json(podcast);
    } catch (error) {
      res.status(400).json({ mensaje: 'Error al agregar episodio', error });
    }
  }

  // 🔹 Editar un episodio
  async editarEpisodio(req, res) {
    try {
      const { id, episodioId } = req.params;
      const podcast = await PodcastDesktop.findById(id);
      if (!podcast) return res.status(404).json({ mensaje: 'Podcast no encontrado' });

      const episodio = podcast.episodes.id(episodioId);
      if (!episodio) return res.status(404).json({ mensaje: 'Episodio no encontrado' });

      Object.assign(episodio, req.body);
      podcast.updatedAt = Date.now();
      await podcast.save();

      res.json(episodio);
    } catch (error) {
      res.status(400).json({ mensaje: 'Error al editar episodio', error });
    }
  }

  // 🔹 Eliminar un episodio
  async eliminarEpisodio(req, res) {
    try {
      const { id, episodioId } = req.params;
      const podcast = await PodcastDesktop.findById(id);
      if (!podcast) return res.status(404).json({ mensaje: 'Podcast no encontrado' });

      const episodio = podcast.episodes.id(episodioId);
      if (!episodio) return res.status(404).json({ mensaje: 'Episodio no encontrado' });

      episodio.remove();
      podcast.updatedAt = Date.now();
      await podcast.save();

      res.json({ mensaje: 'Episodio eliminado correctamente' });
    } catch (error) {
      res.status(400).json({ mensaje: 'Error al eliminar episodio', error });
    }
  }
}

const podcastControllerPC = new PodcastControllerPC();
export default podcastControllerPC;
