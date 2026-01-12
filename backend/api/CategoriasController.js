import dotenv from 'dotenv';
import Category from '../models/Categorias.js';
import User from '../models/Usuarios.js';

dotenv.config();

class CategoriasController {
  // ─────────────────────────────
  // 1. Crear categoría
  // ─────────────────────────────
  async crearCategoria(req, res) {
    try {
      const {
        name,
        description,
        image,
        color,
        metaTitle,
        metaDescription,
        seoIndexable,
        canonicalUrl,
        ogTitle,
        ogDescription,
        ogImage,
        status,
        schemaType,
        order
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'El nombre es obligatorio.' });
      }

      // Fallbacks SEO inteligentes
      const metaTitleFinal = metaTitle?.trim() || name;
      const metaDescriptionFinal =
        metaDescription?.trim() ||
        description?.slice(0, 160) ||
        `Contenido relacionado con ${name}`;

      const nuevaCategoria = new Category({
        name,
        description,
        image,
        color,
        order,

        // SEO
        metaTitle: metaTitleFinal,
        metaDescription: metaDescriptionFinal,
        seoIndexable: typeof seoIndexable === 'boolean' ? seoIndexable : true,
        canonicalUrl,

        // Open Graph
        ogTitle: ogTitle?.trim() || metaTitleFinal,
        ogDescription: ogDescription?.trim() || metaDescriptionFinal,
        ogImage: ogImage || image,

        // Editorial / Schema
        status: status || 'published',
        schemaType: schemaType || 'CollectionPage'
      });

      await nuevaCategoria.save();

      return res.status(201).json({
        message: 'Categoría creada exitosamente',
        categoria: nuevaCategoria
      });
    } catch (error) {
      console.error('Error al crear categoría:', error);

      if (error.code === 11000) {
        return res.status(409).json({ error: 'La categoría ya existe.' });
      }

      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // ─────────────────────────────
  // 2. Obtener todas las categorías (admin)
  // ─────────────────────────────
  async obtenerCategorias(req, res) {
    try {
      const categorias = await Category.find().sort({ order: 1, createdAt: -1 });
      return res.status(200).json(categorias);
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return res.status(500).json({ error: 'Error interno al obtener categorías' });
    }
  }

  // ─────────────────────────────
  // 3. Obtener categorías públicas (SEO)
  // ─────────────────────────────
  async obtenerCategoriasPublicas(req, res) {
    try {
      const categorias = await Category.find({
        status: 'published',
        seoIndexable: true
      }).sort({ order: 1 });

      return res.status(200).json(categorias);
    } catch (error) {
      console.error('Error al obtener categorías públicas:', error);
      return res.status(500).json({ error: 'Error interno' });
    }
  }

  // ─────────────────────────────
  // 4. Obtener categoría por ID
  // ─────────────────────────────
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
      return res.status(500).json({ error: 'Error interno' });
    }
  }

  // ─────────────────────────────
  // 5. Obtener categoría por SLUG (SEO 🔥)
  // ─────────────────────────────
  async obtenerCategoriaPorSlug(req, res) {
    try {
      const { slug } = req.params;

      const categoria = await Category.findOne({
        slug,
        status: 'published'
      });

      if (!categoria) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      return res.status(200).json(categoria);
    } catch (error) {
      console.error('Error al obtener categoría por slug:', error);
      return res.status(500).json({ error: 'Error interno' });
    }
  }

  // ─────────────────────────────
  // 6. Actualizar categoría
  // ─────────────────────────────
  async actualizarCategoria(req, res) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      // Limpieza de campos undefined
      Object.keys(updateData).forEach(
        key => updateData[key] === undefined && delete updateData[key]
      );

      const categoria = await Category.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!categoria) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      return res.status(200).json({
        message: 'Categoría actualizada correctamente',
        categoria
      });
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      return res.status(500).json({ error: 'Error interno al actualizar' });
    }
  }

  // ─────────────────────────────
  // 7. Eliminar categoría
  // ─────────────────────────────
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
      return res.status(500).json({ error: 'Error interno' });
    }
  }

  // ─────────────────────────────
  // 8. Categorías por usuario
  // ─────────────────────────────
  async obtenerCategoriasUsuario(req, res) {
    try {
      const userId = req.params.id;

      const usuario = await User.findById(userId)
        .populate('categories')
        .select('categories name email');

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      return res.status(200).json(usuario.categories);
    } catch (error) {
      console.error('Error al obtener categorías del usuario:', error);
      return res.status(500).json({ error: 'Error interno' });
    }
  }

  // ─────────────────────────────
  // 9. Obtener categorías por IDs (nueva función para el frontend)
  // ─────────────────────────────
  async obtenerCategoriasPorIds(req, res) {
    try {
      const { ids } = req.body;

      console.log(req.body);
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de IDs válido.' });
      }

      // Buscar categorías por _id en $in, solo las publicadas
      const categorias = await Category.find({
        _id: { $in: ids }
        }).sort({ order: 1 });

      console.log(categorias);
      return res.status(200).json(categorias);
    } catch (error) {
      console.error('Error al obtener categorías por IDs:', error);
      return res.status(500).json({ error: 'Error interno al obtener categorías' });
    }
  }
}

const categoriasController = new CategoriasController();
export default categoriasController;