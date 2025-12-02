// models/Category.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const CategorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Ej: "Arte", "Finanzas"
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true, // Ej: "arte", "finanzas" (para URL)
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },

  // 🔹 Campos SEO
  metaTitle: {
    type: String,
    trim: true,
    maxlength: 70 // recomendado para <title>
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: 160 // recomendado para meta description
  },
  seoIndexable: {
    type: Boolean,
    default: true // si pones false luego puedes renderizar <meta name="robots" content="noindex">
  },

  image: {
    type: String, // URL de imagen representativa
    required: false
  },
  color: {
    type: String, // HEX o nombre de color
    default: '#007bff'
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CategorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default model('Category', CategorySchema);
