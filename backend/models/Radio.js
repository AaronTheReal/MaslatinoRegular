import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;

const RadioSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  image: { type: String }, // carátula personalizada

  scriptEmbed: { type: String, required: true }, // Script completo (pegado por el usuario)
  streamUrl: { type: String }, // URL directa (opcional)

  // Autor que sube la estación
  author: { type: Types.ObjectId, ref: 'User' },
  authorName: { type: String },

  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category',
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
    image: { type: String }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

RadioSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default model('RadioStation', RadioSchema);
