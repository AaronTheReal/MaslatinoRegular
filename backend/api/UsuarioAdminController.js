// controllers/usuarioAdminController.js
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import UserAdmin from '../models/UsuarioAdmin.js'; // tu modelo de usuarios del panel

dotenv.config();

class UserAdminController {
  /**
   * POST /admin/usuarios
   * Crear usuario para el panel (Administrador, Periodista, etc.)
   */
  async crearUsuario(req, res) {
    try {
      console.log("llega?")
      const { name, email, password, role } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'name, email, password y role son obligatorios' });
      }

      // Validar rol permitido
      const ROLES_PERMITIDOS = ['Periodista', 'Escritor', 'Administrador', 'Tecnico'];
      if (!ROLES_PERMITIDOS.includes(role)) {
        return res.status(400).json({ message: 'Rol no válido' });
      }

      // Verificar que no exista el correo
      const existente = await UserAdmin.findOne({ email });
      if (existente) {
        return res.status(409).json({ message: 'Ya existe un usuario con ese email' });
      }

      const nuevoUsuario = new UserAdmin({
        name,
        email,
        password, // se encripta en el pre('save') del modelo
        role
      });

      await nuevoUsuario.save();

      // Limpiamos la respuesta (no mandes password)
      const { password: _, ...usuarioLimpio } = nuevoUsuario.toObject();

      return res.status(201).json({
        message: 'Usuario creado correctamente',
        user: usuarioLimpio
      });
    } catch (error) {
      console.error('Error crearUsuario:', error);
      return res.status(500).json({ message: 'Error al crear el usuario', error: error.message });
    }
  }

  /**
   * GET /admin/usuarios
   * Listar todos los usuarios del panel
   */
  async listarUsuarios(req, res) {
    try {
      const usuarios = await UserAdmin
        .find()
        .select('-password') // ocultar password
        .sort({ createdAt: -1 });

      return res.json(usuarios);
    } catch (error) {
      console.error('Error listarUsuarios:', error);
      return res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
    }
  }

  /**
   * GET /admin/usuarios/:id
   * Obtener un usuario por ID
   */
  async obtenerUsuario(req, res) {
    try {
      const { id } = req.params;
      const usuario = await UserAdmin.findById(id).select('-password');

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      return res.json(usuario);
    } catch (error) {
      console.error('Error obtenerUsuario:', error);
      return res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
    }
  }

  /**
   * PUT /admin/usuarios/:id
   * Actualizar datos de un usuario (nombre, email, rol, isActive, password opcional)
   */
  async actualizarUsuario(req, res) {
    try {
      const { id } = req.params;
      const { name, email, role, isActive, password } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (password) updateData.password = password; // se hashea en pre('findOneAndUpdate')

      const usuarioActualizado = await UserAdmin.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
          context: 'query'
        }
      ).select('-password');

      if (!usuarioActualizado) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      return res.json({
        message: 'Usuario actualizado correctamente',
        user: usuarioActualizado
      });
    } catch (error) {
      console.error('Error actualizarUsuario:', error);
      return res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
    }
  }

  /**
   * DELETE /admin/usuarios/:id
   * Eliminar usuario (aquí hago soft delete con isActive=false, cámbialo a delete real si quieres)
   */
  async eliminarUsuario(req, res) {
    try {
      const { id } = req.params;

      const usuario = await UserAdmin.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      ).select('-password');

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      return res.json({
        message: 'Usuario desactivado correctamente',
        user: usuario
      });
    } catch (error) {
      console.error('Error eliminarUsuario:', error);
      return res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
    }
  }

  /**
   * POST /admin/login
   * Login para el panel admin (devuelve JWT)
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'email y password son obligatorios' });
      }

      // Traer password explícitamente porque tiene select:false en el schema
      const usuario = await UserAdmin.findOne({ email }).select('+password');

      if (!usuario) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      if (!usuario.isActive) {
        return res.status(403).json({ message: 'Usuario desactivado' });
      }

      // Usa el método comparePassword del modelo (o bcrypt directamente)
      const passwordCorrecta = await usuario.comparePassword(password);
      if (!passwordCorrecta) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      const payload = {
        id: usuario._id,
        role: usuario.role,
        name: usuario.name,
        email: usuario.email
      };

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'changeme',
        { expiresIn: '8h' }
      );

      return res.json({
        message: 'Login exitoso',
        token,
        user: {
          id: usuario._id,
          name: usuario.name,
          email: usuario.email,
          role: usuario.role
        }
      });
    } catch (error) {
      console.error('Error login admin:', error);
      return res.status(500).json({ message: 'Error en el login', error: error.message });
    }
  }
}

const userAdminController = new UserAdminController();
export default userAdminController;
