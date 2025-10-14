import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const LinkSchema = new Schema({
  label: { type: String, trim: true }, // Ej: "Ver más", "Ir al evento"
  url:   { type: String, trim: true },
  external: { type: Boolean, default: true }
}, { _id: false });

const LocationSchema = new Schema({
  name:    { type: String, trim: true }, // Ej: "Auditorio Principal"
  address: { type: String, trim: true },
  lat:     { type: Number },
  lng:     { type: Number }
}, { _id: false });

const CalendarItemSchema = new Schema({
  kind: {
    type: String,
    enum: ['anuncio', 'evento'],   // “anuncio” = sin necesidad de asistencia física; “evento” = algo a lo que vas.
    default: 'anuncio'
  },

  title:   { type: String, required: true, trim: true },
  slug:    { type: String, unique: true, lowercase: true, trim: true },
  excerpt: { type: String, trim: true, maxlength: 280 }, // lo que ves en la card
  body:    { type: String }, // HTML/markdown opcional si luego quieres una vista detalle

  image:   { type: String, trim: true }, // portada para la card

  // Fechas
  startAt: { type: Date, required: true },
  endAt:   { type: Date },               // opcional
  allDay:  { type: Boolean, default: false },
  timezone:{ type: String, default: 'America/Monterrey' },

  // Ubicación opcional
  location: LocationSchema,

  // CTA / enlace
  link: LinkSchema,

  // Taxonomías
  categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  tags: [{ type: String, trim: true }],

  // Estado de publicación
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  featured: { type: Boolean, default: false },

  // Metadatos
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  publishedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CalendarItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Índices útiles
CalendarItemSchema.index({ startAt: 1 });
CalendarItemSchema.index({ status: 1, startAt: 1 });
CalendarItemSchema.index({ slug: 1 }, { unique: true });

export default model('CalendarItem', CalendarItemSchema);
