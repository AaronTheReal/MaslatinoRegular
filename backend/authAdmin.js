// middlewares/authAdmin.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import UserAdmin from './models/UsuarioAdmin.js';

dotenv.config();

/**
 * Verifica JWT y mete el usuario en req.user
 */
export async function verifyToken(req, res, next) {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET no está configurado');
      return res.status(503).json({ message: 'Autenticación temporalmente no disponible' });
    }

    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, jwtSecret);
    if (!decoded || typeof decoded !== 'object' || !decoded.id) {
      return res.status(401).json({ message: 'Token de administrador inválido' });
    }
    const adminUser = await UserAdmin.findById(decoded.id)
      .select('name email role isActive')
      .lean();

    if (!adminUser || !adminUser.isActive) {
      return res.status(401).json({ message: 'Sesión de administrador no válida' });
    }

    req.user = {
      ...decoded,
      id: String(adminUser._id),
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role
    };
    next();
  } catch (error) {
    console.error('Error verifyToken:', error);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

/**
 * Requiere uno de los roles permitidos
 * Ej: requireRole(['Administrador']) o requireRole(['Administrador','Tecnico'])
 */
export function requireRole(rolesPermitidos = []) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permisos para esta acción' });
    }
    next();
  };
}
