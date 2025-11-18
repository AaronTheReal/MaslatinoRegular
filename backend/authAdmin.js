// middlewares/authAdmin.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Verifica JWT y mete el usuario en req.user
 */
export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
    req.user = decoded;
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
