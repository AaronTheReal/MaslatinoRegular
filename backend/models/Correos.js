import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const CorreoSchema = new Schema({
  correo: {
    type: String,
    required: [true, 'El correo es obligatorio'],
    unique: true,           // Evita duplicados (muy importante para newsletters)
    trim: true,             // Quita espacios al inicio y final
    lowercase: true,        // Guarda siempre en minúsculas
    match: [/.+\@.+\..+/, 'Por favor ingresa un correo electrónico válido'] // Validación básica de formato
  }
}, {
  timestamps: true        // Agrega automáticamente createdAt y updatedAt
});

// Ya no necesitas el pre('save') manual porque timestamps lo maneja mejor
export default model('Correo', CorreoSchema);