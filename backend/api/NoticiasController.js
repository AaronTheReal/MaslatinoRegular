import axios from 'axios';
import dotenv from 'dotenv';
import Noticia from '../models/Noticias.js';
import Category from '../models/Categorias.js';
import User from '../models/Usuarios.js';
import { recacheNoticia } from '../utils/prerender-service.js';

dotenv.config();
// Helpers
// Helpers (si ya los tienes definidos/importados, no dupliques)
function generarSlug(texto = '') {
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
async function ensureUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await Noticia.findOne({ slug }, { _id: 1 }).lean();
    if (!exists) return slug;
    slug = `${baseSlug}-${i++}`;
  }
}
class noticiasController {



async getNoticiasByArchive(req, res) {
  try {
    const { anio, mes } = req.params;
    const year = parseInt(anio);
    const month = parseInt(mes);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Año o mes inválido' });
    }
    console.log('Fetching archive:', { year, month });
    const noticias = await Noticia.find({
      createdAt: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1)
      },
      //autorizada: true
    })
      .populate('categories', 'name slug color')
      .lean();
    console.log('Noticias found:', noticias.length);
    res.status(200).json(noticias);
  } catch (e) {
    console.error('Error fetching noticias by archive:', e);
    res.status(500).json({ error: 'Error al obtener noticias por archivo' });
  }
}
async getArchivos(req, res) {
  try {
    const archivos = await Noticia.aggregate([
      //{ $match: { autorizada: true } },
      {
        $group: {
          _id: {
            anio: { $year: '$createdAt' },
            mes: { $month: '$createdAt' }
          },
          nombre: {
            $first: {
              $concat: [
                { $arrayElemAt: [
                    ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
                    { $subtract: [{ $month: '$createdAt' }, 1] }
                  ]
                },
                ' ',
                { $toString: { $year: '$createdAt' } }
              ]
            }
          }
        }
      },
      {
        $project: {
          anio: '$_id.anio',
          mes: '$_id.mes',
          nombre: 1,
          _id: 0
        }
      },
      { $sort: { anio: -1, mes: -1 } }
    ]);
    res.status(200).json(archivos);
  } catch (e) {
    console.error('Error fetching archivos:', e);
    res.status(500).json({ error: 'Error al obtener archivos' });
  }
}async getNoticiasByCategory(req, res) {
  try {
    const { slug } = req.params;
    console.log('Fetching noticias for category slug:', slug);
    const category = await Category.findOne({ slug }).lean();
    if (!category) {
      console.log('Category not found for slug:', slug);
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    console.log(category);
    const noticias = await Noticia.find({
      categories: category._id,
      //autorizada: true
    })
      .populate('categories', 'name slug color')
      .lean();
    console.log('Noticias found:', noticias);
    res.status(200).json(noticias);
  } catch (e) {
    console.error('Error fetching noticias by category:', e);
    res.status(500).json({ error: 'Error al obtener noticias por categoría' });
  }
}
async getCategorias(req, res) {
  try {
    const categorias = await Category.find().select('name slug color').lean();
    res.status(200).json(categorias);
  } catch (e) {
    console.error('Error fetching categorias:', e);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
}
 async updateNoticia(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      // Validar que la noticia existe
      const existingNoticia = await Noticia.findById(id);
      if (!existingNoticia) {
        return res.status(404).json({ error: 'Noticia no encontrada' });
      }

      // Actualizar la noticia
      const updatedNoticia = await Noticia.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
        .populate('categories', 'name slug color')
        .lean();

      if (!updatedNoticia) {
        return res.status(404).json({ error: 'Error al actualizar la noticia' });
      }

      // Trigger recache if published
      if (data.state === 'published') {
        await recacheNoticia(updatedNoticia.slug);
      }

      return res.status(200).json(updatedNoticia);
    } catch (e) {
      console.error('Error updating noticia:', e);
      return res.status(500).json({ error: 'Error al actualizar la noticia' });
    }
  }
   async deleteNoticia(req, res) {
    try {
      const { id } = req.params;

      console.log(req.params);
      const existingNoticia = await Noticia.findById(id);
      if (!existingNoticia) {
        return res.status(404).json({ error: 'Noticia no encontrada' });
      }

      await Noticia.findByIdAndDelete(id);

      if (existingNoticia.state === 'published') {
        await recacheNoticia(existingNoticia.slug);
      }

      return res.status(204).json();
    } catch (e) {
      console.error('Error deleting noticia:', e);
      return res.status(500).json({ error: 'Error al eliminar la noticia' });
    }
  }
   async toggleAutorizarNoticia(req, res) {
    try {
      console.log("si llega?");
      const { id } = req.params;
      const { autorizada } = req.body;

      // Validar que el campo autorizada es booleano
      if (typeof autorizada !== 'boolean') {
        return res.status(400).json({ error: 'El campo autorizada debe ser un booleano' });
      }

      // Validar que la noticia existe
      const existingNoticia = await Noticia.findById(id);
      if (!existingNoticia) {
        return res.status(404).json({ error: 'Noticia no encontrada' });
      }

      // Actualizar solo el campo autorizada
      const updatedNoticia = await Noticia.findByIdAndUpdate(
        id,
        { autorizada, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
        .populate('categories', 'name slug color')
        .lean();

      if (!updatedNoticia) {
        return res.status(404).json({ error: 'Error al actualizar la autorización de la noticia' });
      }

      return res.status(200).json(updatedNoticia);
    } catch (e) {
      console.error('Error toggling autorización:', e);
      return res.status(500).json({ error: 'Error al actualizar la autorización' });
    }
  }
async getNoticiasUsuario(req, res) {
  try {
    const { userId } = req.params;

    // 1) Traer categorías del usuario
    const user = await User.findById(userId).select('categories').lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const userCategories = user.categories ?? [];
    if (userCategories.length === 0) {
      // Si el usuario no tiene categorías, retornamos vacío
      return res.status(200).json({ items: [], total: 0 });
    }

    // 2) Filtro: Noticia que tenga AL MENOS una categoría del usuario
    const filter = { categories: { $in: userCategories } };

    // 3) Consulta SIN límite, ordenadas de más nuevas a más antiguas
    const items = await Noticia.find(filter)
      .sort({ createdAt: -1 }) // más recientes primero
      .select('title slug summary meta.image categories createdAt') // proyección ligera
      .populate('categories', 'name slug color') // info básica de categoría
      .lean();

    const total = items.length;

    return res.status(200).json({ items, total });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al obtener noticias por categorías de usuario' });
  }
}

// NoticiasController.js

async getNoticiaById(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID de noticia no proporcionado' });
    }

    // Buscar noticia por ID y poblar categorías
    const noticia = await Noticia.findById(id)
      .populate('categories', 'name slug color')
      .lean();

    if (!noticia) {
      return res.status(404).json({ error: 'Noticia no encontrada' });
    }

    // Respuesta exitosa
    return res.status(200).json({ noticia });
  } catch (e) {
    console.error('Error en getNoticiaById:', e);
    return res.status(500).json({ error: 'Error al obtener noticia por ID' });
  }
}
async getNoticiaBySlug(req, res) {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ error: 'Slug no proporcionado' });

    const noticia = await Noticia.findOne({ slug })
      .populate('categories', 'name slug color')
      .lean();

    if (!noticia) return res.status(404).json({ error: 'Noticia no encontrada' });
    return res.status(200).json({ noticia });
  } catch (e) {
    console.error('Error en getNoticiaBySlug:', e);
    return res.status(500).json({ error: 'Error al obtener noticia por slug' });
  }
}



 async obtenerNoticiasPorCategoriaId(req, res) {
  try {
    const categoriaId = req.params.id;

    // Buscar todas las noticias con esa categoría
    const noticias = await Noticia.find({ categories: categoriaId }).sort({ createdAt: -1 });

    res.json(noticias);
  } catch (error) {
    console.error('Error al obtener noticias por categoría ID:', error);
    res.status(500).json({ message: 'Error al obtener noticias por categoría' });
  }
}

async getNoticiasRecientes(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit));

    const noticias = await Noticia.find(
      {},
      'title slug createdAt meta.image' // solo campos necesarios para sidebar
    )
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json(noticias);
  } catch (e) {
    console.error('Error en getNoticiasRecientes:', e);
    res.status(500).json({ error: 'Error al obtener noticias recientes' });
  }
}
async getNoticiasRecomendadas(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit));

    const noticias = await Noticia.find(
      {},
      'title slug createdAt meta.image' // solo campos necesarios para sidebar
    )
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json(noticias);
  } catch (e) {
    console.error('Error en getNoticiasRecientes:', e);
    res.status(500).json({ error: 'Error al obtener noticias recientes' });
  }
}




    async getNoticiaDespliegue(req,res,next ){
  try {
    const noticiaId = req.body.noticia || [];

    if (!Array.isArray(noticiaId) || noticiaId.length === 0) {
      return res.status(400).json({ error: 'Debes proporcionar al menos una categoría.' });
    }


    // 4. Consulta filtrando por categorías
    const noticia = await Noticia.find({
      _id: noticiaId
    })
    res.status(200).json(noticia);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener noticias por categoría' });
  }
    }


 async getNoticiaCategorias(req, res, next) {
  try {
    const nombresCategorias = req.body.categorias || [];


    if (!Array.isArray(nombresCategorias) || nombresCategorias.length === 0) {
      return res.status(400).json({ error: 'Debes proporcionar al menos una categoría.' });
    }

    // 1. Busca los _id correspondientes a los nombres
    const categorias = await Category.find({
      name: { $in: nombresCategorias }
    }).select('_id');

    const idsCategorias = categorias.map(cat => cat._id);

    if (idsCategorias.length === 0) {
      return res.status(404).json({ error: 'Ninguna categoría encontrada.' });
    }

    const limite = parseInt(req.body.limite) || 10;

    // 2. Buscar noticias filtradas por ObjectId en categories[]
    const noticias = await Noticia.find({
      categories: { $in: idsCategorias }
    })
      .sort({ createdAt: -1 })
      .limit(limite);

    res.status(200).json(noticias);
  } catch (e) {
    console.error('Error en getNoticiaCategorias:', e);
    res.status(500).json({ error: 'Error al obtener noticias por categoría' });
  }
}

  
async getAllNoticias(req, res, next) {
  try {
    const noticias = await Noticia.find({})  //.sort({ createdAt: -1 }).limit(10); // solo las más recientes
    res.status(200).json(noticias);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener noticias' });
  }
} 
// dentro de tu controlador (donde ya tienes helpers generarSlug / ensureUniqueSlug, etc.)
async createNoticia(req, res, next) {
  try {
    const {
      title,
      slug: slugFromClient,
      summary,
      categories,
      tags,
      location,
      content,      // bloques “planos” del front (puede incluir itemsHtml en listas)
      body,         // HTML del editor (opcional)
      bodyHtml,     // preferido si ya lo mandas así
      state,
      publishAt,
      meta = {}
    } = req.body;

    // Requisitos mínimos
    if (!title) return res.status(400).json({ message: 'El campo title es obligatorio.' });
    if (!meta.description || !meta.image) {
      return res.status(400).json({ message: 'meta.description y meta.image son obligatorios.' });
    }

    // Autor
    let authorId;
    if (req.user && req.user.id) {
      authorId = req.user.id;
    } else if (req.body.author) {
      authorId = req.body.author;
    } else {
      return res.status(400).json({ message: 'No se proporcionó author.' });
    }

    // Slug final y único
    const baseSlug = slugFromClient ? generarSlug(slugFromClient) : generarSlug(title);
    const finalSlug = await ensureUniqueSlug(baseSlug);

    // Normalizar categorías/tags
    const normCategories = Array.isArray(categories)
      ? categories
      : typeof categories === 'string'
        ? categories.split(',').map(s => s.trim())
        : [];

    const normTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
        ? tags.split(',').map(s => s.trim())
        : [];

    // ===== NORMALIZAR CONTENT (mantener itemsHtml y limpiar textAlign inválido) =====
    const normContent = Array.isArray(content) ? content.map((b) => {
      const out = { ...b };

      // Aseguramos estructura style
      if (out.style) {
        const ta = (out.style.textAlign ?? '').toString().trim();
        if (!['left', 'center', 'right'].includes(ta)) {
          // deja que el setter/default del Schema decida
          delete out.style.textAlign;
        }
      }

      // En listas, permitir que venga itemsHtml (se saneará en el pre-save del Schema)
      if (out.type === 'list') {
        if (!Array.isArray(out.items)) out.items = [];
        if (!Array.isArray(out.itemsHtml)) out.itemsHtml = []; // <-- clave: preserva <a> dentro de <li>
      }

      return out;
    }) : [];

    // HTML (el Schema lo sanea en pre-save)
    const html = bodyHtml || body || '';

    const doc = new Noticia({
      title,
      slug: finalSlug,
      summary,
      author: authorId,
      categories: normCategories,
      tags: normTags,
      location: location || {},
      content: normContent,
      bodyHtml: html,
      meta: {
        description:    meta.description,
        image:          meta.image,
        imageAltGlobal: meta.imageAltGlobal || '',
        canonical:      meta.canonical || '',
        ogTitle:        meta.ogTitle || title,
        ogDescription:  meta.ogDescription || (summary || meta.description),
        twitterCard:    meta.twitterCard || 'summary_large_image',
        // ===== NUEVO: pie de foto global y su enlace =====
        imageCaption:    meta.imageCaption || '',
        imageCaptionUrl: meta.imageCaptionUrl || ''
      },
      state: state || 'draft',
      publishAt: publishAt || null
    });

    // Debug opcional
    // console.log('Saving noticia:', JSON.stringify(doc.toObject(), null, 2));

    const saved = await doc.save();

    // Recache (no bloqueante)
    try {
      await recacheNoticia(saved.slug);
    } catch (e) {
      console.warn('recacheNoticia falló (no bloqueante):', e?.message || e);
    }

    return res.status(201).json(saved);
  } catch (error) {
    console.error('Error en createNoticia:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
}

}

const NoticiasController = new noticiasController();
export default NoticiasController;
