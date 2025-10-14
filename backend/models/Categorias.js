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
  image: {
    type: String, // URL de imagen representativa
    required: false
  },
    color: {
    type: String, // HEX o nombre de color
    default: '#007bff' // Azul por defecto si no se especifica
  },
  order: {
    type: Number,
    default: 0 // Puedes ordenar visualmente las categorías
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CategorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default model('Category', CategorySchema);
