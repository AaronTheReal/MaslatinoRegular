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
  return `https://maslatino.com/${slug}`;
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
    const rawPage    = req.query.page;
    const rawLimit   = req.query.limit;
    const q          = (req.query.q || '').toString().trim();
    const categoryId = (req.query.categoryId || '').toString().trim();

    let page  = parseInt(rawPage, 10);
    let limit = parseInt(rawLimit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 5;
    if (limit > 50) limit = 50;

    const skip = (page - 1) * limit;

    const filtro = { autorizada: true };

    // ⭐ Búsqueda por texto
    if (q) {
      filtro.$or = [
        { title: { $regex: q, $options: 'i' } },
        { 'meta.excerpt': { $regex: q, $options: 'i' } },
        // agrega más campos si quieres buscar también en el cuerpo, etc.
      ];
    }

    // ⭐ Filtro por categoría (array de ObjectId)
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filtro.categories = new mongoose.Types.ObjectId(categoryId);
    }

    const [items, total] = await Promise.all([
      Noticia.find(filtro)
        .sort({ createdAt: -1 })
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
    if (!incomingSlug) {
      return res.status(400).json({ error: 'slug es requerido (o título para generarlo)' });
    }

    let finalSlug = incomingSlug;
    const slugChanged = incomingSlug !== existing.slug;
    if (slugChanged) {
      finalSlug = await ensureUniqueSlug(generarSlug(incomingSlug));
    }

    // 3) META: descripción + imagen hero (con soporte imageKey/CDN)
    const meta = data.meta || {};

    const metaDescription = String(
      meta.description || existing.meta?.description || ''
    ).trim();

    // Caption global -> imageCaptionHtml (igual lógica que createNoticia)
    let imageCaptionHtml = '';
    if (typeof meta.imageCaptionHtml === 'string' && meta.imageCaptionHtml.trim()) {
      imageCaptionHtml = meta.imageCaptionHtml.trim();
    } else if (
      typeof existing.meta?.imageCaptionHtml === 'string' &&
      existing.meta.imageCaptionHtml.trim() &&
      !meta.imageCaption && !meta.imageCaptionUrl
    ) {
      imageCaptionHtml = existing.meta.imageCaptionHtml.trim();
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

    // === Normalización de META hero a CDN (image / imageKey)
    const CDN = process.env.CDN_BASE_URL;

    let metaImageUrl = meta.image || '';
    let metaImageKey = meta.imageKey || undefined;

    if (!metaImageUrl && !metaImageKey) {
      metaImageUrl = existing.meta?.image || '';
      metaImageKey = existing.meta?.imageKey || undefined;
    }

    if (!metaDescription) {
      return res.status(400).json({ error: 'meta.description es obligatoria' });
    }

    if (!metaImageUrl && metaImageKey) {
      metaImageUrl = toCdnUrl(metaImageKey, CDN);
    } else if (metaImageUrl) {
      metaImageUrl = toCdnUrl(metaImageUrl, CDN);
    }

    if (!metaImageUrl) {
      return res.status(400).json({
        error: 'Se requiere meta.image (o imageKey) válido para la imagen destacada'
      });
    }

    // 4) Optional fields (don’t block)
    const summary        = String(data.summary || existing.summary || '').trim();
    const extracto       = String(data.extracto || existing.extracto || '').trim();
    const focusKeyphrase = String(data.focusKeyphrase || existing.focusKeyphrase || '').trim();
    const tags           = normTags(data.tags ?? existing.tags ?? []);

    const location = (data.location && typeof data.location === 'object')
      ? {
          country: data.location.country || '',
          region:  data.location.region || '',
          city:    data.location.city || ''
        }
      : {
          country: existing.location?.country || '',
          region:  existing.location?.region || '',
          city:    existing.location?.city || ''
        };

    const state = ['draft', 'review', 'published'].includes(data.state)
      ? data.state
      : (existing.state || 'draft');

    const publishAt = data.publishAt
      ? new Date(data.publishAt)
      : (existing.publishAt || null);

    const press = typeof data.press === 'boolean' ? data.press : (existing.press ?? false);   // ← NUEVO

    // 5) bodyHtml / content (normalizar listas, imágenes a CDN y EMBEDS)
    let bodyHtml = String(data.bodyHtml || data.body || existing.bodyHtml || '').trim();

    bodyHtml = bodyHtml
      .replace(/<p>\s*<p>/g, '<p>')
      .replace(/<\/p>\s*<\/p>/g, '</p>');

    const rawContent = Array.isArray(data.content)
      ? data.content
      : (existing.content || []);

    const normContent = Array.isArray(rawContent) ? rawContent.map((b) => {
      const out = { ...b };
      if (!out.type) return out;

      if (out.style) {
        const ta = (out.style.textAlign ?? '').toString().trim();
        if (!['left', 'center', 'right'].includes(ta)) {
          delete out.style.textAlign;
        }
      }

      if (out.type === 'list') {
        if (!Array.isArray(out.items)) out.items = [];
        if (!Array.isArray(out.itemsHtml)) out.itemsHtml = [];
      }

      if (out.type === 'image') {
        const cdnKey  = out.cdnKey || '';
        const mime    = out.mime || '';
        const bytes   = out.bytes ?? undefined;
        const width   = out.width ?? undefined;
        const height  = out.height ?? undefined;

        if (cdnKey && !out.url) {
          out.url = toCdnUrl(cdnKey, CDN);
        } else if (out.url) {
          out.url = toCdnUrl(out.url, CDN);
        }

        if (mime && !/^image\//i.test(mime)) delete out.mime;

        if (bytes !== undefined) out.bytes = Number(bytes) || undefined;
        if (width !== undefined) out.width = Number(width) || undefined;
        if (height !== undefined) out.height = Number(height) || undefined;

        if (out.variants) {
          const v = { ...out.variants };
          if (v.sm) v.sm = toCdnUrl(v.sm, CDN);
          if (v.md) v.md = toCdnUrl(v.md, CDN);
          if (v.lg) v.lg = toCdnUrl(v.lg, CDN);
          out.variants = v;
        }
      }

      if (out.type === 'embed') {
        if (typeof out.url === 'string') {
          out.url = out.url.trim();
        } else {
          out.url = undefined;
        }

        const allowedProviders = ['twitter', 'facebook', 'instagram', 'youtube', 'tiktok', 'generic'];
        if (out.provider) {
          const p = String(out.provider).toLowerCase();
          out.provider = allowedProviders.includes(p) ? p : 'generic';
        } else {
          out.provider = 'generic';
        }
      }

      return out;
    }) : [];

    // 6) Categorías
    const categories = await resolveCategories(
      data.categories || existing.categories || []
    );

    // 7) Meta final
    const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
    const canonical = String(
      meta.canonical ||
      existing.meta?.canonical ||
      pickCanonical(PUBLIC_BASE_URL, finalSlug, req)
    );

    const ogTitle = String(meta.ogTitle || existing.meta?.ogTitle || title);
    const ogDescription = String(
      meta.ogDescription ||
      existing.meta?.ogDescription ||
      extracto ||
      metaDescription
    );

    const imageAltGlobal = String(
      meta.imageAltGlobal || existing.meta?.imageAltGlobal || ''
    ).trim();

    const metaFinal = {
      description:    metaDescription,
      image:          metaImageUrl,
      canonical,
      ogTitle,
      ogDescription,
      imageAltGlobal,
      twitterCard:    meta.twitterCard || existing.meta?.twitterCard || 'summary_large_image',
      imageCaptionHtml,
      imageKey:       meta.imageKey || existing.meta?.imageKey || undefined,
      imageWidth:     meta.imageWidth || existing.meta?.imageWidth || undefined,
      imageHeight:    meta.imageHeight || existing.meta?.imageHeight || undefined,
      imageType:      meta.imageType || existing.meta?.imageType || undefined
    };

    // 8) Update doc
    const updateDoc = {
      title,
      slug: finalSlug,
      summary,
      extracto,
      focusKeyphrase,
      tags,
      categories,
      location,
      state,
      publishAt: publishAt || null,
      bodyHtml,
      content: normContent,
      meta: metaFinal,
      press,                    // ← AQUÍ SE ACTUALIZA
      updatedAt: new Date()
    };

    // 9) Save
    const updated = await Noticia.findByIdAndUpdate(id, updateDoc, {
      new: true,
      runValidators: true
    })
      .populate('categories', 'name slug color')
      .lean();

    if (!updated) {
      return res.status(404).json({ error: 'Error al actualizar la noticia' });
    }

    // 10) Recache
    try {
      if (state === 'published') {
        await recacheNoticia(updated.slug);
        if (slugChanged) {
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
// Ejemplo de ruta: router.get('/noticias/archivo/:anio/:mes', NoticiasController.getNoticiasByArchive);

async getNoticiasByArchive(req, res) {
  try {
    const { anio, mes } = req.params;

    const year = parseInt(anio, 10);
    const month = parseInt(mes, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Año o mes inválido' });
    }

    // Leer page y limit desde query string
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10; // 👈 10 noticias por página

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 1);

    const filter = {
      createdAt: { $gte: start, $lt: end },
      autorizada: true,
    };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Noticia.find(filter)
        .populate('categories', 'name slug color')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Noticia.countDocuments(filter),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    console.log('Archive noticias found:', { total, page, totalPages });

    return res.status(200).json({
      items,
      total,
      page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (e) {
    console.error('Error fetching noticias by archive:', e);
    return res.status(500).json({ error: 'Error al obtener noticias por archivo' });
  }
}


async getArchivos(req, res) {
  try {
    // Leer page y limit desde query, con valores por defecto
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 12; // por ejemplo, 12 meses por página
    if (page < 1) page = 1;
    if (limit < 1) limit = 12;

    const skip = (page - 1) * limit;

    const result = await Noticia.aggregate([
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
                {
                  $arrayElemAt: [
                    [
                      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                    ],
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
      { $sort: { anio: -1, mes: -1 } },
      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [
            { $count: 'count' }
          ]
        }
      }
    ]);

    const facet = result[0] || { items: [], totalCount: [] };
    const items = facet.items || [];
    const total = facet.totalCount[0]?.count || 0;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    return res.status(200).json({
      items,
      total,
      page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });
  } catch (e) {
    console.error('Error fetching archivos:', e);
    return res.status(500).json({ error: 'Error al obtener archivos' });
  }
}

async getNoticiasByCategory(req, res) {
  try {
    const { slug } = req.params;
    console.log('Fetching noticias for category slug:', slug);

    // Leer page y limit desde query, con defaults
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const category = await Category.findOne({ slug }).lean();
    if (!category) {
      console.log('Category not found for slug:', slug);
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    const filter = {
      categories: category._id,
      autorizada: true
    };

    const [total, noticias] = await Promise.all([
      Noticia.countDocuments(filter),
      Noticia.find(filter)
        .populate('categories', 'name slug color')
        .sort({ createdAt: -1 })       // opcional: más recientes primero
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    console.log(`Noticias found (page ${page}):`, noticias.length);

    return res.status(200).json({
      items: noticias,
      total,
      page,
      totalPages,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });
  } catch (e) {
    console.error('Error fetching noticias by category:', e);
    return res.status(500).json({ error: 'Error al obtener noticias por categoría' });
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
async createNoticia(req, res, next) {
  try {
    const {
      title,
      slug: slugFromClient,
      extracto,
      focusKeyphrase,
      summary,
      categories,
      tags,
      location,
      content,      // bloques “planos” del front
      body,
      bodyHtml,
      state,
      publishAt,
      meta = {},
      press   // ← NUEVO
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

    // ===== NORMALIZAR CONTENT (listas, imágenes a CDN y EMBEDS sociales) =====
    const normContent = Array.isArray(content) ? content.map((b) => {
      const out = { ...b };

      if (!out.type) return out;

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

      // 🔥 EMBEDS sociales: solo normalizamos url y provider
      if (out.type === 'embed') {
        // URL limpia
        if (typeof out.url === 'string') {
          out.url = out.url.trim();
        } else {
          out.url = undefined;
        }

        // Provider a minúsculas + fallback a 'generic'
        const allowedProviders = ['twitter', 'facebook', 'instagram', 'youtube', 'tiktok', 'generic'];
        if (out.provider) {
          const p = String(out.provider).toLowerCase();
          out.provider = allowedProviders.includes(p) ? p : 'generic';
        } else {
          out.provider = 'generic';
        }
      }

      return out;
    }) : [];

    // Construir documento
    const doc = new Noticia({
      title,
      slug: finalSlug,
      extracto,
      focusKeyphrase,
      summary,
      author: authorId,
      categories: normCategories,
      tags: normTags,
      location: location || {},
      content: normContent,
      bodyHtml: html,
      meta: {
        description:    meta.description,
        image:          metaImageUrl,
        imageAltGlobal: meta.imageAltGlobal || '',
        canonical:      meta.canonical || '',
        ogTitle:        meta.ogTitle || title,
        ogDescription:  meta.ogDescription || (summary || meta.description),
        twitterCard:    meta.twitterCard || 'summary_large_image',
        imageCaptionHtml,
        imageKey:       meta.imageKey || undefined,
        imageWidth:     meta.imageWidth || undefined,
        imageHeight:    meta.imageHeight || undefined,
        imageType:      meta.imageType || undefined
      },
      state: state || 'draft',
      publishAt: publishAt || null,
      press: typeof press === 'boolean' ? press : false   // ← AQUÍ SE GUARDA
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

async getAdminNoticiasPaginadas(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);

    const { q, state, autorizada, categoryId, press, sort = 'updatedAt' } = req.query;   // ← press agregado

    const filtro = {};

    if (autorizada !== undefined) filtro.autorizada = autorizada === 'true';
    if (state && ['draft','review','published'].includes(state)) filtro.state = state;
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filtro.categories = new mongoose.Types.ObjectId(categoryId);
    }
    if (press !== undefined) {                       // ← NUEVO: filtro por press
      filtro.press = press === 'true';
    }
    if (q) {
      filtro.$or = [
        { title: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
        { 'meta.description': { $regex: q, $options: 'i' } }
      ];
    }

    const projection = 'title slug createdAt updatedAt state autorizada press meta.image meta.description categories authorName';   // ← press en proyección

    const sortOption = sort.includes('-') 
      ? { [sort.replace('-','')]: -1 } 
      : { [sort]: 1 };

    const [items, total] = await Promise.all([
      Noticia.find(filtro)
        .select(projection)
        .populate('categories', 'name slug color')
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Noticia.countDocuments(filtro)
    ]);

    res.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error cargando noticias admin' });
  }
}
}

const NoticiasController = new noticiasController();
export default NoticiasController;
