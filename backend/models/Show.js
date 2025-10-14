import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;

const EpisodeSchema = new Schema({
  spotifyId: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  duration: Number, // en segundos
  releaseDate: Date,
  embedUrl: String,
  image: String
}, { _id: false }); // Para evitar _id anidados por cada episodio

const ShowSchema = new Schema({
  spotifyId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  image: { type: String }, // carátula del show
  url: { type: String },    // enlace a Spotify
  embedUrl: { type: String }, // link embed iframe (precalculado para show)
  duration: { type: Number }, // duración promedio (opcional)
  releaseDate: { type: Date }, // fecha de lanzamiento original

  // Relación opcional con un autor (creador interno)
  author: { type: Types.ObjectId, ref: 'User' },
  authorName: { type: String },

  // Episodios anidados directamente
  episodes: [EpisodeSchema],

  categories: [{
    type: String,
    enum: ['Mundo', 'Arte', 'Política', 'Finanzas', 'Familia', 'Deportes', 'Salud'],
    required: true
  }],
  tags: [{ type: String, trim: true }],
  language: {
    type: String,
    enum: [
      'es', 'es-MX', 'es-AR', 'es-BO', 'es-CL', 'es-CO', 'es-CR', 'es-CU', 'es-DO',
      'es-EC', 'es-SV', 'es-GT', 'es-HN', 'es-NI', 'es-PA', 'es-PY', 'es-PE', 'es-PR',
      'es-UY', 'es-VE', 'pt', 'pt-BR', 'fr', 'en-US', 'en-GB', 'en-CA'
    ],
    default: 'es'
  },

  meta: {
    description: { type: String },
    image: { type: String } // carátula alternativa
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

  // Autogenerar embedUrl si falta
  ShowSchema.pre('save', function (next) {
    if (this.spotifyId && !this.embedUrl) {
      this.embedUrl = `https://open.spotify.com/embed/episode/${this.spotifyId}`;
    }
    this.updatedAt = Date.now();
    next();
  });

export default model('Show', ShowSchema);
