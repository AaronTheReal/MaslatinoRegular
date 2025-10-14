import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;

// Subdocumento para episodios
const DesktopEpisodeSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  audioUrl: { type: String, required: true },
  image: { type: String },
  duration: { type: Number },
  releaseDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const PodcastDesktopSchema = new Schema({
  title: { type: String, required: true },
  subtitle: { type: String }, // opcional para versión web
  description: { type: String },
  coverImage: { type: String },
  bannerImage: { type: String }, // imagen horizontal para presentación web
  featured: { type: Boolean, default: false }, // para destacar en home web

  language: {
    type: String,
    enum: [
      'es', 'es-MX', 'es-AR', 'es-BO', 'es-CL', 'es-CO', 'es-CR', 'es-CU', 'es-DO',
      'es-EC', 'es-SV', 'es-GT', 'es-HN', 'es-NI', 'es-PA', 'es-PY', 'es-PE', 'es-PR',
      'es-UY', 'es-VE', 'pt', 'pt-BR', 'fr', 'en-US', 'en-GB', 'en-CA'
    ],
    default: 'es'
  },

  episodes: [DesktopEpisodeSchema],

  author: { type: Types.ObjectId, ref: 'User' },
  authorName: { type: String },

  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }],
  tags: [{ type: String, trim: true }],
  relatedLinks: [{ type: String }], // para sitios, redes, etc.

  meta: {
    description: { type: String },
    image: { type: String },
    keywords: [{ type: String }]
  },
  order: { type: Number, default: 0 },

  layout: { type: String, enum: ['classic', 'grid', 'carousel'], default: 'classic' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware para actualizar fecha
PodcastDesktopSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default model('PodcastDesktop', PodcastDesktopSchema);
