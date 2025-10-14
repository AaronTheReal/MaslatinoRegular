// controllers/CalendarPCController.js
import CalendarItemDesktop from '../models/CalendarioPC.js';
import Category from '../models/Categorias.js';
import mongoose from 'mongoose';

class CalendarPCController {
  // 1. Crear item de calendario
  async crearItem(req, res) {
    try {
      const item = new CalendarItemDesktop(req.body);
      await item.save();
      res.status(201).json(item);
    } catch (error) {
      console.error('Error al crear item de calendario (PC):', error);
      res.status(400).json({ mensaje: 'Error al crear el evento/anuncio', error });
    }
  }

  // 2. Obtener todos los items
  async obtenerItems(req, res) {
    try {
      const items = await CalendarItemDesktop.find().sort({ startAt: 1 });
      res.json(items);
    } catch (error) {
      console.error('Error al obtener items de calendario (PC):', error);
      res.status(500).json({ mensaje: 'Error al obtener los eventos/anuncios', error });
    }
  }

  // 3. Obtener destacados para home (máx 4)
  async obtenerDestacadosHome(req, res) {
    try {
      const items = await CalendarItemDesktop.find({ featured: true, status: 'published' })
        .sort({ startAt: 1 })
        .limit(4);
      res.json(items);
    } catch (error) {
      console.error('Error al obtener destacados (PC):', error);
      res.status(500).json({ mensaje: 'Error al obtener destacados para home', error });
    }
  }

  // 4. Obtener item por ID
  async obtenerItemPorId(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ mensaje: 'ID inválido' });
      }
      const item = await CalendarItemDesktop.findById(id).populate('categories');
      if (!item) return res.status(404).json({ mensaje: 'Item no encontrado' });
      res.json(item);
    } catch (error) {
      console.error('Error al obtener item (PC):', error);
      res.status(500).json({ mensaje: 'Error al obtener item por ID', error });
    }
  }

  // 5. Obtener por nombre de categoría
  async obtenerPorNombreCategoria(req, res) {
    try {
      const { name } = req.params;
      const category = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
      if (!category) return res.status(404).json({ mensaje: 'Categoría no encontrada' });

      const items = await CalendarItemDesktop.find({ categories: category._id, status: 'published' })
        .populate('categories')
        .sort({ startAt: 1 });

      res.json({ categoria: category, resultados: items });
    } catch (error) {
      console.error('Error por categoría (PC):', error);
      res.status(500).json({ mensaje: 'Error al obtener por categoría', error });
    }
  }

  // 6. Actualizar item
  async actualizarItem(req, res) {
    try {
      const { id } = req.params;
      const item = await CalendarItemDesktop.findByIdAndUpdate(id, req.body, { new: true });
      if (!item) return res.status(404).json({ mensaje: 'Item no encontrado' });
      res.json(item);
    } catch (error) {
      console.error('Error al actualizar item (PC):', error);
      res.status(400).json({ mensaje: 'Error al actualizar', error });
    }
  }

  // 7. Eliminar item
  async eliminarItem(req, res) {
    try {
      const { id } = req.params;
      const item = await CalendarItemDesktop.findByIdAndDelete(id);
      if (!item) return res.status(404).json({ mensaje: 'Item no encontrado' });
      res.json({ mensaje: 'Item eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar item (PC):', error);
      res.status(500).json({ mensaje: 'Error interno al eliminar', error });
    }
  }
}

const calendarPCController = new CalendarPCController();
export default calendarPCController;
