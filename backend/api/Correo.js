// controllers/CorreoController.js
import Correo from '../models/Correo.js';
import mongoose from 'mongoose';

class CorreoController {

  // 1. Crear / Suscribir correo (POST)
  async suscribir(req, res) {
    try {
      const { correo } = req.body;

      const nuevoCorreo = new Correo({ correo });
      await nuevoCorreo.save();

      res.status(201).json({
        mensaje: 'Suscripción exitosa',
        correo: nuevoCorreo
      });
    } catch (error) {
      console.error('Error al suscribir correo:', error);

      // Manejo de correo duplicado (unique: true)
      if (error.code === 11000) {
        return res.status(409).json({ mensaje: 'Este correo ya está suscrito' });
      }

      res.status(400).json({ 
        mensaje: 'Error al guardar el correo', 
        error 
      });
    }
  }

  // 2. Obtener todos los correos (GET)
  async obtenerCorreos(req, res) {
    try {
      const correos = await Correo.find()
        .sort({ createdAt: -1 });   // Los más recientes primero

      res.json(correos);
    } catch (error) {
      console.error('Error al obtener correos:', error);
      res.status(500).json({ 
        mensaje: 'Error al obtener los correos', 
        error 
      });
    }
  }

  // 3. Eliminar un correo (DELETE) - útil para admin
  async eliminarCorreo(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ mensaje: 'ID inválido' });
      }

      const correo = await Correo.findByIdAndDelete(id);

      if (!correo) {
        return res.status(404).json({ mensaje: 'Correo no encontrado' });
      }

      res.json({ mensaje: 'Correo eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar correo:', error);
      res.status(500).json({ 
        mensaje: 'Error al eliminar el correo', 
        error 
      });
    }
  }
}

const correoController = new CorreoController();
export default correoController;