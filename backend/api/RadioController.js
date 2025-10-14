// controllers/radioController.js
import dotenv from 'dotenv';
import RadioStation from '../models/Radio.js';

dotenv.config();

class radioController {
  // POST /radioPost
  async guardarRadios(req, res, next) {
    try {
      const {
        title,
        description,
        image,
        scriptEmbed,
        streamUrl,
        categories,
        tags,
        language,
        author,
        authorName,
        meta
      } = req.body;

      if (!title || !scriptEmbed || !categories?.length) {
        return res.status(400).json({ error: 'Título, scriptEmbed y categorías son obligatorios.' });
      }

      const newRadio = new RadioStation({
        title,
        description,
        image,
        scriptEmbed,
        streamUrl,
        categories,
        tags,
        language,
        author,
        authorName,
        meta
      });

      await newRadio.save();

      res.status(201).json({ message: 'Radio guardada correctamente', radio: newRadio });
    } catch (err) {
      console.error('Error al guardar la radio:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // GET /radios
  async obtenerRadios(req, res, next) {
    try {
      const radios = await RadioStation.find().sort({ createdAt: -1 });
      res.status(200).json(radios);
    } catch (err) {
      console.error('Error al obtener radios:', err);
      res.status(500).json({ error: 'Error interno al obtener radios' });
    }
  }

  // GET /radios/:id
  async obtenerRadioPorId(req, res, next) {
    try {
      const { id } = req.params;
      const radio = await RadioStation.findById(id);
      if (!radio) {
        return res.status(404).json({ error: 'Radio no encontrada' });
      }
      res.status(200).json(radio);
    } catch (err) {
      console.error('Error al obtener la radio por ID:', err);
      res.status(500).json({ error: 'Error interno al obtener la radio' });
    }
  }
}

const RadioController = new radioController();
export default RadioController;
