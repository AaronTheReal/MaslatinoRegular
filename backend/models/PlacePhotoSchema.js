// models/PlacePhotoSchema.js
import mongoose from 'mongoose';

/**
 * Foto de un lugar de Google Places, compartida por los cuatro modelos
 * (restaurantes, turismo, hangout, fanzone).
 *
 * Guardamos `photoName` (el identificador que devuelve Google, del estilo
 * `places/ChIJ.../photos/AeJ...`) y NO la URL final. El módulo original
 * guardaba la URL con `?key=GOOGLE_PLACES_API_KEY` incrustada, lo que
 * publicaba la credencial en el navegador y ademas dejaba la base de datos
 * inservible al rotar la clave. La URL publica se construye al leer, apuntando
 * al proxy del backend (ver utils/place-photos.js).
 */
const PlacePhotoSchema = new mongoose.Schema({
  photoName: { type: String, required: true },
  authorName: String,
  authorUri: String,
}, { _id: false });

export default PlacePhotoSchema;
