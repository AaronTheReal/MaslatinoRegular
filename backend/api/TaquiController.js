// controllers/radioController.js
import dotenv from 'dotenv';
import Taquicardia from '../models/Taquicardia.js';

dotenv.config();

class taquicardiaController {
    async live(req, res, next) {
      console.log("si llega");
      try {
        const lives = await Taquicardia.find({});
        console.log("lives",lives);
        res.status(200).json(lives);
      } catch (err) {
        console.error('Error al obtener radios:', err);
        res.status(500).json({ error: 'Error interno al obtener radios' });
      }
    }
  
}

const TaquicardiaController = new taquicardiaController();
export default TaquicardiaController;
