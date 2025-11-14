import axios from 'axios';
import dotenv from 'dotenv';
import Noticia from '../models/Noticias.js';
import Category from '../models/Categorias.js';
import User from '../models/Usuarios.js';
import { recacheNoticia } from '../utils/prerender-service.js';
import mongoose from 'mongoose';

dotenv.config();

// Extract mongoose helpers in JS style
const { Types, isValidObjectId } = mongoose;

// ---------- Helpers ----------
function generarSlug(texto = '') {
  return String(texto)
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

function normTags(tags) {
  if (!Array.isArray(tags)) return [];
  const cleaned = tags.map(t => String(t || '').trim()).filter(Boolean);
  return Array.from(new Set(cleaned)).slice(0, 5);
}
function toCdnUrl(keyOrUrl, cdnBase) {
  if (!keyOrUrl) return keyOrUrl;
  const base = cdnBase?.replace(/\/$/, '') || '';
  const isAbs = /^https?:\/\//i.test(keyOrUrl);
  if (isAbs) {
    // Si viene de S3, reescribe al CDN manteniendo path
    try {
      const u = new URL(keyOrUrl);
      // si ya es tu CDN, regresa tal cual
      if (base && keyOrUrl.startsWith(base)) return keyOrUrl;
      // si parece s3, reescribe
      if (/\.s3[.-]/i.test(u.hostname)) {
        return `${base}${u.pathname}`;
      }
      return keyOrUrl;
    } catch { return keyOrUrl; }
  }
  // Es una key relativa
  return `${base}/${String(keyOrUrl).replace(/^\/+/, '')}`;
}
// Resolve categories from IDs / slugs / names -> ObjectId[]
async function resolveCategories(input) {
  if (!Array.isArray(input) || input.length === 0) return [];

  const idSet = new Set();
  const lookup = []; // slugs or names to search in DB

  for (const c of input) {
    if (!c) continue;

    if (typeof c === 'string') {
      const s = c.trim();
      if (!s) continue;
      if (isValidObjectId ? isValidObjectId(s) : mongoose.isValidObjectId(s)) {
        idSet.add(s);
      } else {
        lookup.push(s);
      }
      continue;
    }

    if (typeof c === 'object') {
      const maybeId = c._id || c.id;
      if (maybeId && (isValidObjectId ? isValidObjectId(String(maybeId)) : mongoose.isValidObjectId(String(maybeId)))) {
        idSet.add(String(maybeId));
      } else if (c.slug) {
        lookup.push(String(c.slug));
      } else if (c.name) {
        lookup.push(String(c.name));
      }
    }
  }

  if (lookup.length) {
    const extra = await Category.find(
      { $or: [{ slug: { $in: lookup } }, { name: { $in: lookup } }] },
      { _id: 1 }
    ).lean();
    for (const row of extra) idSet.add(String(row._id));
  }

  return Array.from(idSet).map(id => new Types.ObjectId(id));
}

// Build canonical if not provided
function pickCanonical(publicBaseUrl, slug, req) {
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/+$/, '')}/${slug}`;
  }
  // Fallback from request
  try {
    const proto = (req.headers['x-forwarded-proto'] || '').split(',')[0] || req.protocol || 'https';
    const host = req.get ? req.get('host') : req.headers.host;
    if (host) return `${proto}://${host}/${slug}`;
  } catch (_) {}
  return `https://yourdomain.com/${slug}`;
}
// ---- Helpers para normalizar blocks provenientes del front ----
function toPlainHtml(val) {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  // Angular SafeHtml serializado: { changingThisBreaksApplicationSecurity: '...html...' }
  if (typeof val === 'object' && Object.prototype.hasOwnProperty.call(val, 'changingThisBreaksApplicationSecurity')) {
    return String(val.changingThisBreaksApplicationSecurity || '');
  }
  return String(val);
}

function normalizeBlock(b) {
  const type = String((b && b.type) || 'text');
  const tag  = String((b && b.tag)  || 'p');

  const out = { type, tag };

  if (type === 'list') {
    const items = Array.isArray(b.items) ? b.items.map(x => String(x || '')) : [];
    const itemsHtml = Array.isArray(b.itemsHtml) ? b.itemsHtml.map(toPlainHtml) : [];
    out.items = items;
    out.itemsHtml = itemsHtml;
  } else if (type === 'image') {
    out.url = String((b && b.url) || '');
    out.alt = String((b && b.alt) || '');
    if (b && b.captionHtml != null) out.captionHtml = toPlainHtml(b.captionHtml);
  } else if (type === 'link') {
    out.href = String((b && b.href) || '');
    out.textLink = String((b && b.textLink) || '');
  } else {
    // text / quote / cualquier otro con html/text
    out.html = toPlainHtml(b && b.html);
    out.text = String((b && b.text) || '');
  }

  // style: aseguramos shape simple { textAlign: 'left'|'center'|'right'|'' }
  const ta = b && b.style && b.style.textAlign ? String(b.style.textAlign) : '';
  out.style = { textAlign: ['left','center','right'].includes(ta) ? ta : '' };

  return out;
}

function normalizeContent(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(normalizeBlock)
    // opcional: filtra bloques vacíos de texto
    .filter(bl =>
      bl.type === 'list' ? (bl.items && bl.items.length) :
      bl.type === 'image' ? (bl.url && bl.url.length) :
      bl.type === 'link'  ? (bl.href && bl.href.length) :
      (bl.html && bl.html.trim().length) || (bl.text && bl.text.trim().length)
    );
}
class noticiasController {


   async getNoticiasPaginadas(req, res) {
    try {
      const rawPage  = req.query.page;
      const rawLimit = req.query.limit;

      let page  = parseInt(rawPage, 10);
      let limit = parseInt(rawLimit, 10);

      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(limit) || limit < 1) limit = 5;
      // límite de seguridad para no matar el server
      if (limit > 50) limit = 50;

      const skip = (page - 1) * limit;

      const filtro = { autorizada: true }; // ajusta si quieres mostrar también no autorizadas

      const [items, total] = await Promise.all([
        Noticia.find(filtro)
          .sort({ createdAt: -1 }) // más recientes primero
          .skip(skip)
          .limit(limit)
          .lean(),
        Noticia.countDocuments(filtro)
      ]);

      return res.json({
        items,
        total,
        page,
        limit,
      });
    } catch (err) {
      console.error('Error en getNoticiasPaginadas:', err);
      return res.status(500).json({
        error: 'Error al obtener noticias paginadas'
      });
    }
  }

  async updateNoticia(req, res) {
    try {
      const { id } = req.params;
      const data = req.body || {};

      // 1) Exists?
      const existing = await Noticia.findById(id);
      if (!existing) return res.status(404).json({ error: 'Noticia no encontrada' });

      // 2) Title/slug
      const title = String(data.title || existing.title || '').trim();
      let incomingSlug = String(data.slug || '').trim();
      if (!incomingSlug && title) incomingSlug = generarSlug(title);
      if (!incomingSlug) return res.status(400).json({ error: 'slug es requerido (o título para generarlo)' });

      let finalSlug = incomingSlug;
      const slugChanged = incomingSlug !== existing.slug;
      if (slugChanged) {
        finalSlug = await ensureUniqueSlug(generarSlug(incomingSlug));
      }

      // 3) Required meta
      const meta = data.meta || {};
      const metaDescription = String(meta.description || '').trim();
      const metaImage = String(meta.image || '').trim();
      if (!title) return res.status(400).json({ error: 'title es obligatorio' });
      if (!finalSlug) return res.status(400).json({ error: 'slug es obligatorio' });
      if (!metaDescription) return res.status(400).json({ error: 'meta.description es obligatoria' });
      if (!metaImage) return res.status(400).json({ error: 'meta.image es obligatoria' });

      // 4) Optional fields (don’t block)
      const summary  = String(data.summary || '').trim();
      const extracto = String(data.extracto || '').trim();
      const tags     = normTags(data.tags);

      const location = (data.location && typeof data.location === 'object')
        ? {
            country: data.location.country || '',
            region:  data.location.region || '',
            city:    data.location.city || ''
          }
        : { country: '', region: '', city: '' };

      const state = ['draft', 'review', 'published'].includes(data.state)
        ? data.state
        : (existing.state || 'draft');

      const publishAt = data.publishAt ? new Date(data.publishAt) : (existing.publishAt || null);

      // body/content
      let bodyHtml = String(data.bodyHtml || data.body || '').trim();
      // tidy nested <p><p>…</p></p> if your editor creates them
      bodyHtml = bodyHtml.replace(/<p>\s*<p>/g, '<p>').replace(/<\/p>\s*<\/p>/g, '</p>');

      const content = normalizeContent(Array.isArray(data.content) ? data.content : (existing.content || []));

      // categories
      const categories = await resolveCategories(data.categories || existing.categories || []);

      // 5) Meta final
      const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
      const canonical = String(meta.canonical || pickCanonical(PUBLIC_BASE_URL, finalSlug, req));
      const ogTitle = String(meta.ogTitle || title);
      const ogDescription = String(meta.ogDescription || extracto || metaDescription);
      const imageAltGlobal = String(meta.imageAltGlobal || '').trim();
      const imageCaption = String(meta.imageCaption || '').trim();
      const imageCaptionUrl = String(meta.imageCaptionUrl || '').trim();

      const metaFinal = {
        description: metaDescription,
        image: metaImage,
        canonical,
        ogTitle,
        ogDescription,
        imageAltGlobal,
        imageCaption,
        imageCaptionUrl,
        twitterCard: 'summary_large_image'
      };

      // 6) Update doc
      const updateDoc = {
        title,
        slug: finalSlug,
        summary,
        extracto,
        tags,
        categories,
        location,
        state,
        publishAt: publishAt || null,
        bodyHtml,
        content,
        meta: metaFinal,
        updatedAt: new Date()
      };

      // 7) Save
      const updated = await Noticia.findByIdAndUpdate(id, updateDoc, {
        new: true,
        runValidators: true
      })
        .populate('categories', 'name slug color')
        .lean();

      if (!updated) return res.status(404).json({ error: 'Error al actualizar la noticia' });

      // 8) Recache on publish / slug change
      try {
        if (state === 'published') {
          await recacheNoticia(updated.slug);
          if (slugChanged) {
            // optionally invalidate old slug
            await recacheNoticia(existing.slug).catch(() => {});
          }
        }
      } catch (e) {
        console.warn('recacheNoticia warning:', e && e.message ? e.message : e);
      }

      return res.status(200).json(updated);
    } catch (e) {
      console.error('Error updating noticia:', e);
      return res.status(500).json({ error: 'Error al actualizar la noticia' });
    }
  }
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
      autorizada: true
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
      { $match: { autorizada: true } },
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
      autorizada: true
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
      
      {autorizada: true},
      //'title slug createdAt meta.image'
        // solo campos necesarios para sidebar
    )
      .populate('categories', 'name slug color')
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
async  createNoticia(req, res, next) {
  try {
    const {
      title,
      slug: slugFromClient,
      summary,
      categories,
      tags,
      location,
      content,      // bloques “planos” del front
      body,
      bodyHtml,
      state,
      publishAt,
      meta = {}
    } = req.body;

    // Requisitos mínimos
    if (!title) return res.status(400).json({ message: 'El campo title es obligatorio.' });

    // Autor (igual que antes)
    let authorId;
    if (req.user?.id) authorId = req.user.id;
    else if (req.body.author) authorId = req.body.author;
    else return res.status(400).json({ message: 'No se proporcionó author.' });

    // Slug final y único
    const baseSlug = slugFromClient ? generarSlug(slugFromClient) : generarSlug(title);
    const finalSlug = await ensureUniqueSlug(baseSlug);

    // Normalizar categorías/tags
    const normCategories = Array.isArray(categories)
      ? categories
      : typeof categories === 'string'
        ? categories.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const normTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
        ? tags.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    // === HTML (el Schema lo sanea en pre-save)
    const html = bodyHtml || body || '';

    // === Backfill de caption global (igual que tenías)
    let imageCaptionHtml = '';
    if (typeof meta.imageCaptionHtml === 'string' && meta.imageCaptionHtml.trim()) {
      imageCaptionHtml = meta.imageCaptionHtml.trim();
    } else if (meta.imageCaption || meta.imageCaptionUrl) {
      const txt = (meta.imageCaption || '').toString().trim();
      const url = (meta.imageCaptionUrl || '').toString().trim();
      if (url) {
        let host = '';
        try { host = new URL(url).hostname.replace(/^www\./, ''); } catch {}
        const anchorText = host || 'Fuente';
        imageCaptionHtml = txt
          ? `${txt} — <a href="${url}">${anchorText}</a>`
          : `<a href="${url}">${anchorText}</a>`;
      } else {
        imageCaptionHtml = txt;
      }
    }

    // === Normalización de imágenes a CDN (meta + bloques)
    const CDN = process.env.CDN_BASE_URL;

    // Meta hero: aceptar imageKey o image absoluta/cdnKey
    let metaImageUrl = meta.image || '';
    if (!metaImageUrl && meta.imageKey) {
      metaImageUrl = toCdnUrl(meta.imageKey, CDN);
    } else if (metaImageUrl) {
      metaImageUrl = toCdnUrl(metaImageUrl, CDN);
    }

    // Si tras normalizar no tenemos hero image → error
    if (!meta.description || !metaImageUrl) {
      return res.status(400).json({ message: 'meta.description y meta.image (o imageKey) son obligatorios.' });
    }

    // ===== NORMALIZAR CONTENT (mantener itemsHtml, limpiar align, y reescribir images a CDN)
    const normContent = Array.isArray(content) ? content.map((b) => {
      const out = { ...b };

      // Asegura style.textAlign válido
      if (out.style) {
        const ta = (out.style.textAlign ?? '').toString().trim();
        if (!['left', 'center', 'right'].includes(ta)) {
          delete out.style.textAlign;
        }
      }

      // Listas: preserva itemsHtml; el schema saneará en pre-save
      if (out.type === 'list') {
        if (!Array.isArray(out.items)) out.items = [];
        if (!Array.isArray(out.itemsHtml)) out.itemsHtml = [];
      }

      // Imágenes: aceptar cdnKey o url absoluta o s3 y reescribir a CDN
      if (out.type === 'image') {
        // campos nuevos (si llegan)
        const cdnKey = out.cdnKey || '';
        const mime   = out.mime || '';
        const bytes  = out.bytes || undefined;
        const width  = out.width || undefined;
        const height = out.height || undefined;

        if (cdnKey && !out.url) {
          out.url = toCdnUrl(cdnKey, CDN);
        } else if (out.url) {
          out.url = toCdnUrl(out.url, CDN);
        }

        // Endurecer mime: solo image/*
        if (mime && !/^image\//i.test(mime)) delete out.mime;

        // Asegura tipos numéricos
        if (bytes !== undefined) out.bytes = Number(bytes) || undefined;
        if (width !== undefined) out.width = Number(width) || undefined;
        if (height !== undefined) out.height = Number(height) || undefined;

        // Variantes (si te llegan desde front)
        if (out.variants) {
          const v = { ...out.variants };
          if (v.sm) v.sm = toCdnUrl(v.sm, CDN);
          if (v.md) v.md = toCdnUrl(v.md, CDN);
          if (v.lg) v.lg = toCdnUrl(v.lg, CDN);
          out.variants = v;
        }
      }

      return out;
    }) : [];

    // Construir documento
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
        image:          metaImageUrl,                // ya normalizada a CDN
        imageAltGlobal: meta.imageAltGlobal || '',
        canonical:      meta.canonical || '',
        ogTitle:        meta.ogTitle || title,
        ogDescription:  meta.ogDescription || (summary || meta.description),
        twitterCard:    meta.twitterCard || 'summary_large_image',
        imageCaptionHtml,
        // nuevos opcionales
        imageKey:       meta.imageKey || undefined,
        imageWidth:     meta.imageWidth || undefined,
        imageHeight:    meta.imageHeight || undefined,
        imageType:      meta.imageType || undefined
      },
      state: state || 'draft',
      publishAt: publishAt || null
    });

    const saved = await doc.save();

    // Recache (no bloqueante)
    try { await recacheNoticia(saved.slug); } catch (e) {
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
