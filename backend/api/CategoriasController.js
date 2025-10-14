import dotenv from 'dotenv';
import slugify from 'slugify';
import Category from '../models/Categorias.js';
import User from '../models/Usuarios.js';

dotenv.config();

class CategoriasController {
  // 1. Crear categoría
  async crearCategoria(req, res) {
    try {
      const { name, slug, description, image, color } = req.body;

      if (!name || !image || !color) {
        return res.status(400).json({ error: 'Faltan campos requeridos (name, image o color).' });
      }

      const slugFinal = slug?.trim() || slugify(name, { lower: true, strict: true });
      const existe = await Category.findOne({ slug: slugFinal });
      if (existe) {
        return res.status(409).json({ error: 'Ya existe una categoría con ese slug.' });
      }

      const nuevaCategoria = new Category({
        name,
        slug: slugFinal,
        description,
        image,
        color
      });

      await nuevaCategoria.save();
      return res.status(201).json({ message: 'Categoría creada exitosamente', categoria: nuevaCategoria });
    } catch (error) {
      console.error('Error al crear categoría:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // 2. Obtener todas las categorías
  async obtenerCategorias(req, res) {
    try {
      const categorias = await Category.find().sort({ createdAt: -1 });
      return res.status(200).json(categorias);
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return res.status(500).json({ error: 'Error interno al obtener categorías' });
    }
  }

  // 3. Obtener una categoría por ID
  async obtenerCategoriaPorId(req, res) {
    try {
      const { id } = req.params;
      const categoria = await Category.findById(id);
      if (!categoria) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }
      return res.status(200).json(categoria);
    } catch (error) {
      console.error('Error al obtener categoría:', error);
      return res.status(500).json({ error: 'Error interno al buscar categoría' });
    }
  }

  // 4. Actualizar una categoría
  async actualizarCategoria(req, res) {
    try {
      const { id } = req.params;
      const { name, slug, description, image, color } = req.body;

      const slugFinal = slug?.trim() || slugify(name, { lower: true, strict: true });

      const categoria = await Category.findByIdAndUpdate(
        id,
        { name, slug: slugFinal, description, image, color, updatedAt: Date.now() },
        { new: true }
      );

      if (!categoria) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      return res.status(200).json({ message: 'Categoría actualizada', categoria });
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      return res.status(500).json({ error: 'Error interno al actualizar' });
    }
  }

  // 5. Eliminar una categoría
  async eliminarCategoria(req, res) {
    try {
      const { id } = req.params;
      const categoria = await Category.findByIdAndDelete(id);
      if (!categoria) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }
      return res.status(200).json({ message: 'Categoría eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      return res.status(500).json({ error: 'Error interno al eliminar categoría' });
    }
  }

async categoriasUsuarioDelete(req, res) {
    try {
      const { userId, id } = req.params; // Assuming userId and category id are passed as URL parameters
      // Alternatively, if userId comes from authentication middleware:
      // const userId = req.user.id;
      console.log(req.params);

      // Check if the category exists
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      // Update the user by pulling the category ID from the categories array
      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { categories: id } },
        { new: true } // Return the updated document
      );

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      return res.status(200).json({ message: 'Categoría eliminada del usuario correctamente', user });
    } catch (error) {
      console.error('Error al eliminar categoría del usuario:', error);
      return res.status(500).json({ error: 'Error interno al eliminar categoría' });
    }
  }

 async obtenerCategoriasUsuario(req, res) {
    try {
      const userId = req.params.id; // o req.user._id si usas auth con JWT

      console.log(userId);
      
      // Buscar al usuario y poblar categorías
      const usuario = await User.findById(userId)
        .populate('categories') // esto convierte los ObjectId en docs de Category
        .select('categories name email'); // opcional, selecciona solo lo necesario

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      return res.status(200).json(usuario.categories);
    } catch (error) {
      console.error('Error al obtener categorías del usuario:', error);
      return res.status(500).json({ error: 'Error interno al obtener categorías del usuario' });
    }
  }
}

const categoriasController = new CategoriasController();
export default categoriasController;
