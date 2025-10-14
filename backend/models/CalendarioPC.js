import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Reutilizables
const LinkSchema = new Schema({
  label: { type: String, trim: true },
  url: { type: String, trim: true },
  external: { type: Boolean, default: true }
}, { _id: false });

const LocationSchema = new Schema({
  name: { type: String, trim: true },
  address: { type: String, trim: true },
  lat: { type: Number },
  lng: { type: Number },
  mapEmbedUrl: { type: String, trim: true } // NUEVO: para mostrar un iframe de Google Maps
}, { _id: false });

const CalendarItemDesktopSchema = new Schema({
  kind: {
    type: String,
    enum: ['anuncio', 'evento'],
    default: 'anuncio'
  },

  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true, trim: true },
  excerpt: { type: String, trim: true, maxlength: 400 }, // ampliado para PC
  body: { type: String }, // contenido completo HTML

  image: { type: String, trim: true },
  gallery: [{ type: String }], // NUEVO: galería de imágenes

  // Fechas
  startAt: { type: Date, required: true },
  endAt: { type: Date },
  allDay: { type: Boolean, default: false },
  timezone: { type: String, default: 'America/Monterrey' },

  // Ubicación con más detalle
  location: LocationSchema,

  // Enlaces múltiples
  links: [LinkSchema],

  // Categorías, etiquetas
  categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  tags: [{ type: String, trim: true }],

  // Estado de publicación
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  featured: { type: Boolean, default: false },
  highlightColor: { type: String }, // NUEVO: para color destacado en frontend

  // SEO / redes
  meta: {
    title: { type: String },
    description: { type: String },
    image: { type: String }
  },

  // Autores
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  publishedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware
CalendarItemDesktopSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Índices
CalendarItemDesktopSchema.index({ startAt: 1 });
CalendarItemDesktopSchema.index({ status: 1, startAt: 1 });
CalendarItemDesktopSchema.index({ slug: 1 }, { unique: true });

export default model('CalendarItemDesktop', CalendarItemDesktopSchema);
