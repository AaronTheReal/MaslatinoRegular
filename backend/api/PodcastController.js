// controllers/podcast.controller.ts (o .js si no transpilas)
import Podcast from '../models/Podcast.js';
import Category from '../models/Categorias.js';
import { Types } from 'mongoose';

// util: escapar regex
function escapeRegExp(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 👇 Normaliza lo que envía tu FRONT para Mux:
// - Caso A (tu flujo actual): el form manda muxPlaybackId/muxPolicy/muxAssetId
// - Caso B (opcional): el form ya manda "mux" listo (por si en el futuro)
function buildMuxFromBody(body) {
  // Prioridad 1: campos simples del form
  if (body.muxPlaybackId && body.muxPolicy) {
    return {
      status: 'ready', // ya existe en Mux
      assetId: body.muxAssetId || undefined,
      playbackIds: [{ id: body.muxPlaybackId, policy: body.muxPolicy }],
    };
  }
  // Prioridad 2: body.mux completo (si lo mandas así)
  if (body.mux && (Array.isArray(body.mux.playbackIds) || body.mux.assetId)) {
    return body.mux;
  }
  // Si no hay nada, devolvemos indefinido y la validación más arriba decide.
  return undefined;
}

class PodcastController {
  async getPodcastByEpisodeId(req, res) {
    try {
      const { id } = req.params;
      let episodeObjectId;
      try {
        episodeObjectId = new Types.ObjectId(id);
      } catch (error) {
        return res.status(400).json({ message: 'ID de episodio inválido' });
      }

      const podcast = await Podcast.findOne({ 'episodes._id': episodeObjectId })
        .populate('categories', 'name')
        .populate('author', 'name email');

        console.log("podcast backend",podcast);
      if (!podcast) return res.status(404).json({ message: 'Episodio no encontrado' });
      res.json(podcast);
    } catch (error) {
      console.error('Error al obtener podcast por ID de episodio:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async obtenerPodcastsPorCategoriaId(req, res) {
    try {
      const categoriaId = req.params.id;
      const podcasts = await Podcast.find({ categories: categoriaId }).sort({ createdAt: -1 });
      res.json(podcasts);
    } catch (error) {
      console.error('Error al obtener podcasts por categoría ID:', error);
      res.status(500).json({ message: 'Error al obtener podcasts por categoría' });
    }
  }

  async crearPodcast(req, res) {
    try {
      const podcast = new Podcast(req.body);
      await podcast.save();
      res.status(201).json(podcast);
    } catch (error) {
      console.error('❌ Error al crear podcast:', error);
      res.status(400).json({ mensaje: 'Error al crear el podcast', error });
    }
  }

  async obtenerPodcasts(req, res) {
    try {
      const podcasts = await Podcast.find().sort({ createdAt: -1 });
      res.json(podcasts);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al obtener los podcasts', error });
    }
  }

  async obtenerPodcastPorId(req, res) {
    try {
      const podcast = await Podcast.findById(req.params.id);
      if (!podcast) return res.status(404).json({ mensaje: 'Podcast no encontrado' });
      res.json(podcast);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al obtener el podcast', error });
    }
  }

  async obtenerPodcastsPorNombreCategoria(req, res) {
    try {
      const { name } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const category = await Category.findOne({
        name: new RegExp(`^${escapeRegExp(name)}$`, 'i')
      });

      if (!category) {
        return res.status(404).json({ mensaje: `Categoría '${name}' no encontrada` });
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [results, total] = await Promise.all([
        Podcast.find({ categories: category._id })
          .populate('categories', 'name slug color')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Podcast.countDocuments({ categories: category._id })
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
  }

  async actualizarPodcast(req, res) {
    try {
      const podcast = await Podcast.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!podcast) return res.status(404).json({ mensaje: 'Podcast no encontrado' });
      res.json(podcast);
    } catch (error) {
      res.status(400).json({ mensaje: 'Error al actualizar el podcast', error });
    }
  }

  async eliminarPodcast(req, res) {
    try {
      const podcast = await Podcast.findByIdAndDelete(req.params.id);
      if (!podcast) return res.status(404).json({ mensaje: 'Podcast no encontrado' });
      res.json({ mensaje: 'Podcast eliminado correctamente' });
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al eliminar el podcast', error });
    }
  }

  // --- EPISODIOS ---

  // Crear episodio (A: ya existe en Mux | B: o vendrá vacío y lo llenan luego por webhook)
  async agregarEpisodio(req, res) {
    try {
      const { id } = req.params;
      const podcast = await Podcast.findById(id);
      if (!podcast) return res.status(404).json({ mensaje: 'Podcast no encontrado' });

      const mux = buildMuxFromBody(req.body);
      const ads = req.body.ads?.enabled ? req.body.ads : { enabled: false }; // default sin ads

      const episodio = {
        title: req.body.title,
        description: req.body.description || '',
        image: req.body.image || '',
        kind: req.body.kind, // 'video'|'audio'
        language: req.body.language || 'es',
        defaultPlaybackPolicy: req.body.defaultPlaybackPolicy || 'public',
        releaseDate: req.body.releaseDate || Date.now(),
        ads,
        mux: mux || undefined,
      };

      podcast.episodes.push(episodio);
      podcast.updatedAt = Date.now();
      await podcast.save();

      // Devolvemos el episodio recién creado (último)
      const created = podcast.episodes[podcast.episodes.length - 1];
      res.status(201).json(created);
    } catch (error) {
      console.error(error);
      res.status(400).json({ mensaje: 'Error al agregar episodio', error });
    }
  }

  async editarEpisodio(req, res) {
    try {
      const { id, episodioId } = req.params;
      const podcast = await Podcast.findById(id);
      if (!podcast) return res.status(404).json({ mensaje: 'Podcast no encontrado' });

      const episodio = podcast.episodes.id(episodioId);
      if (!episodio) return res.status(404).json({ mensaje: 'Episodio no encontrado' });

      // Actualizamos campos editoriales
      episodio.title = req.body.title ?? episodio.title;
      episodio.description = req.body.description ?? episodio.description;
      episodio.image = req.body.image ?? episodio.image;
      episodio.kind = req.body.kind ?? episodio.kind;
      episodio.language = req.body.language ?? episodio.language;
      episodio.defaultPlaybackPolicy = req.body.defaultPlaybackPolicy ?? episodio.defaultPlaybackPolicy;
      episodio.releaseDate = req.body.releaseDate ?? episodio.releaseDate;

      // Ads
      episodio.ads = req.body.ads?.enabled ? req.body.ads : { enabled: false };

      // Mux (si te mandan playbackId/policy o mux completo)
      const mux = buildMuxFromBody(req.body);
      if (mux) {
        episodio.mux = {
          ...episodio.mux?.toObject?.() ?? episodio.mux ?? {},
          ...mux
        };
      }

      podcast.updatedAt = Date.now();
      await podcast.save();

      res.json(episodio);
    } catch (error) {
      console.error(error);
      res.status(400).json({ mensaje: 'Error al editar episodio', error });
    }
  }

  async eliminarEpisodio(req, res) {
    try {
      const { id, episodioId } = req.params;
      const podcast = await Podcast.findById(id);
      if (!podcast) return res.status(404).json({ mensaje: 'Podcast no encontrado' });

      const episodio = podcast.episodes.id(episodioId);
      if (!episodio) return res.status(404).json({ mensaje: 'Episodio no encontrado' });

      episodio.deleteOne(); // (o .remove() según versión de Mongoose)
      podcast.updatedAt = Date.now();
      await podcast.save();

      res.json({ mensaje: 'Episodio eliminado correctamente' });
    } catch (error) {
      console.error(error);
      res.status(400).json({ mensaje: 'Error al eliminar episodio', error });
    }
  }
}

const podcastController = new PodcastController();
export default podcastController;
