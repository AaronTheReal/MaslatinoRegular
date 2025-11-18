// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model } = mongoose;

// Roles fijos para el panel
export const USER_ROLES = [
  'Periodista',
  'Escritor',
  'Administrador',
  'Tecnico'
];

const UserAdminSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  // Contraseña encriptada (NO guardes texto plano)
  password: {
    type: String,
    required: true,
    select: false // por seguridad no se devuelve por defecto
  },

  // Rol de acceso para el panel admin
  role: {
    type: String,
    enum: USER_ROLES,
    default: 'Escritor'
  },

  // Para bloquear cuentas sin borrarlas
  isActive: {
    type: Boolean,
    default: true
  },

  // Auditoría básica
  lastLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index para búsquedas rápidas por email
UserAdminSchema.index({ email: 1 });

// Middleware para actualizar updatedAt
UserAdminSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

/**
 * Encripta la contraseña antes de guardar
 */
UserAdminSchema.pre('save', async function (next) {
  // Si la contraseña no cambió, no vuelvas a hashearla
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10); // puedes ajustar el cost factor
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Si actualizas contraseña vía findOneAndUpdate, también se hashea aquí
 */
UserAdminSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();

  if (update?.password) {
    try {
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(update.password, salt);
      this.setUpdate(update);
    } catch (err) {
      return next(err);
    }
  }

  // mantener updatedAt
  this.setUpdate({
    ...update,
    updatedAt: Date.now()
  });

  next();
});

/**
 * Método de instancia para comparar contraseñas
 */
UserAdminSchema.methods.comparePassword = async function (candidatePassword) {
  // Ojo: password viene de la BD, ya hasheada
  return bcrypt.compare(candidatePassword, this.password);
};

// Para poder usar los roles en otras partes del código
UserAdminSchema.statics.ROLES = USER_ROLES;

export default model('UserAdmin', UserAdminSchema);
