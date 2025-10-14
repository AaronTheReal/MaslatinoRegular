// controllers/CalendarioController.js
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import CalendarItem from '../models/Calendario.js';
import Category from '../models/Categorias.js';

dotenv.config();

/**
 * Helpers
 */
const DEFAULT_TIMEZONE = process.env.APP_TZ || 'America/Monterrey';

const parsePagination = (req) => {
  const page  = Math.max(parseInt(req.query.page ?? '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit ?? '10', 10), 1), 100);
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
};

const parseSort = (sortStr = '-startAt') => {
  // Ej: "startAt:asc" | "createdAt:desc" | "-createdAt"
  if (!sortStr) return { createdAt: -1 };
  if (sortStr.includes(':')) {
    const [field, dir] = sortStr.split(':');
    return { [field]: dir === 'asc' ? 1 : -1 };
  }
  if (sortStr.startsWith('-')) {
    return { [sortStr.slice(1)]: -1 };
  }
  return { [sortStr]: 1 };
};

const buildDateRangeFilter = ({ from, to }) => {
  if (!from && !to) return undefined;
  const filter = {};
  if (from) filter.$gte = new Date(from);
  if (to)   filter.$lte = new Date(to);
  return filter;
};

const slugify = (str) =>
  str
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

async function ensureUniqueSlug(baseSlug, idToExclude = null) {
  let slug = baseSlug || '';
  let counter = 0;
  // Si no hay slug base, crea uno temporal
  if (!slug) slug = `item-${Date.now()}`;

  // Construye un regex para encontrar slugs que empiezan con el base
  const regex = new RegExp(`^${slug}(?:-(\\d+))?$`, 'i');

  const existing = await CalendarItem.find({ slug: regex, ...(idToExclude ? { _id: { $ne: idToExclude } } : {}) })
    .select('slug')
    .lean();

  if (existing.length === 0) return slug;

  const numbers = existing
    .map(doc => {
      const m = doc.slug.match(regex);
      if (m && m[1]) return parseInt(m[1], 10);
      if (doc.slug === slug) return 0;
      return null;
    })
    .filter(n => n !== null);

  if (!numbers.includes(0)) {
    // hay slug libre exacto
    return slug;
  }

  counter = Math.max(...numbers) + 1;
  return `${slug}-${counter}`;
}

class CalendarioController {
  /**
   * POST /calendar
   */
  static async crearItem(req, res, next) {
    try {
      const {
        kind = 'anuncio',
        title,
        slug,
        excerpt,
        body,
        image,
        startAt,
        endAt,
        allDay = false,
        timezone = DEFAULT_TIMEZONE,
        location,
        link,
        categories = [],
        tags = [],
        status = 'draft',
        featured = false
      } = req.body;

      if (!title) {
        return res.status(400).json({ ok: false, message: 'title es requerido' });
      }
      if (!startAt) {
        return res.status(400).json({ ok: false, message: 'startAt es requerido' });
      }

      const baseSlug = slug || slugify(title);
      const uniqueSlug = await ensureUniqueSlug(baseSlug);

      const item = new CalendarItem({
        kind,
        title,
        slug: uniqueSlug,
        excerpt,
        body,
        image,
        startAt,
        endAt,
        allDay,
        timezone,
        location,
        link,
        categories,
        tags,
        status,
        featured,
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      });

      await item.save();

      return res.status(201).json({ ok: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /calendar
   * ?status=published&from=2025-10-01&to=2025-10-31&q=design&category=...&tag=...&page=1&limit=10&sort=startAt:asc
   */
  static async listar(req, res, next) {
    try {
      const { page, limit, skip } = parsePagination(req);
      const {
        status,
        from,
        to,
        q,
        category,
        tag,
        kind,
        featured
      } = req.query;

      const filter = {};

      if (status) filter.status = status;
      if (kind) filter.kind = kind;
      if (featured !== undefined) filter.featured = featured === 'true';

      const dateRange = buildDateRangeFilter({ from, to });
      if (dateRange) filter.startAt = dateRange;

      if (category && mongoose.isValidObjectId(category)) {
        filter.categories = category;
      }

      if (tag) {
        filter.tags = { $in: [tag] };
      }

      if (q) {
        filter.$or = [
          { title: { $regex: q, $options: 'i' } },
          { excerpt: { $regex: q, $options: 'i' } },
          { body: { $regex: q, $options: 'i' } }
        ];
      }

      const sort = parseSort(req.query.sort);

      const [items, total] = await Promise.all([
        CalendarItem.find(filter)
          .populate('categories', 'name slug color')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        CalendarItem.countDocuments(filter)
      ]);

      return res.json({
        ok: true,
        data: items,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /calendar/upcoming
   */
  static async listarProximos(req, res, next) {
    try {
      const { page, limit, skip } = parsePagination(req);
      const now = new Date();

      const filter = {
        status: 'published',
        startAt: { $gte: now }
      };

      const sort = parseSort(req.query.sort || 'startAt:asc');

      const [items, total] = await Promise.all([
        CalendarItem.find(filter)
          .populate('categories', 'name slug color')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        CalendarItem.countDocuments(filter)
      ]);

      return res.json({
        ok: true,
        data: items,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /calendar/past
   */
  static async listarPasados(req, res, next) {
    try {
      const { page, limit, skip } = parsePagination(req);
      const now = new Date();

      const filter = {
        status: 'published',
        startAt: { $lt: now }
      };

      const sort = parseSort(req.query.sort || 'startAt:desc');

      const [items, total] = await Promise.all([
        CalendarItem.find(filter)
          .populate('categories', 'name slug color')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        CalendarItem.countDocuments(filter)
      ]);

      return res.json({
        ok: true,
        data: items,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /calendar/:id
   */
  static async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ ok: false, message: 'ID inválido' });
      }

      const item = await CalendarItem.findById(id)
        .populate('categories', 'name slug color')
        .lean();

      if (!item) {
        return res.status(404).json({ ok: false, message: 'No encontrado' });
      }

      return res.json({ ok: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /calendar/slug/:slug
   */
  static async obtenerPorSlug(req, res, next) {
    try {
      const { slug } = req.params;
      const item = await CalendarItem.findOne({ slug })
        .populate('categories', 'name slug color')
        .lean();

      if (!item) {
        return res.status(404).json({ ok: false, message: 'No encontrado' });
      }

      return res.json({ ok: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /calendar/by-category-name/:name
   */
  static async obtenerPorNombreCategoria(req, res, next) {
    try {
      const { name } = req.params;
      const cat = await Category.findOne({ name }).lean();
      if (!cat) {
        return res.status(404).json({ ok: false, message: 'Categoría no encontrada' });
      }

      const { page, limit, skip } = parsePagination(req);
      const sort = parseSort(req.query.sort || 'startAt:asc');

      const filter = {
        status: 'published',
        categories: cat._id
      };

      const [items, total] = await Promise.all([
        CalendarItem.find(filter)
          .populate('categories', 'name slug color')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        CalendarItem.countDocuments(filter)
      ]);

      return res.json({
        ok: true,
        data: items,
        meta: {
          category: { _id: cat._id, name: cat.name, slug: cat.slug },
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /calendar/:id
   */
  static async actualizarItem(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ ok: false, message: 'ID inválido' });
      }

      const updates = { ...req.body, updatedBy: req.user?._id };

      // Si actualizan el título y no pasaron slug, podríamos regenerarlo
      if (updates.title && !updates.slug) {
        const baseSlug = slugify(updates.title);
        updates.slug = await ensureUniqueSlug(baseSlug, id);
      } else if (updates.slug) {
        updates.slug = await ensureUniqueSlug(slugify(updates.slug), id);
      }

      const item = await CalendarItem.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true
      }).populate('categories', 'name slug color');

      if (!item) {
        return res.status(404).json({ ok: false, message: 'No encontrado' });
      }

      return res.json({ ok: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /calendar/:id/publish
   */
  static async publicarItem(req, res, next) {
    try {
      const { id } = req.params;

      const item = await CalendarItem.findById(id);
      if (!item) {
        return res.status(404).json({ ok: false, message: 'No encontrado' });
      }

      item.status = 'published';
      if (!item.publishedAt) item.publishedAt = new Date();
      item.updatedBy = req.user?._id;

      await item.save();

      return res.json({ ok: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /calendar/:id/archive
   */
  static async archivarItem(req, res, next) {
    try {
      const { id } = req.params;

      const item = await CalendarItem.findById(id);
      if (!item) {
        return res.status(404).json({ ok: false, message: 'No encontrado' });
      }

      item.status = 'archived';
      item.updatedBy = req.user?._id;
      await item.save();

      return res.json({ ok: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /calendar/:id/featured
   * body: { featured: boolean }
   */
  static async toggleDestacado(req, res, next) {
    try {
      const { id } = req.params;
      const { featured } = req.body;

      const item = await CalendarItem.findByIdAndUpdate(
        id,
        { featured: !!featured, updatedBy: req.user?._id },
        { new: true }
      );

      if (!item) {
        return res.status(404).json({ ok: false, message: 'No encontrado' });
      }

      return res.json({ ok: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /calendar/:id
   */
  static async eliminarItem(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ ok: false, message: 'ID inválido' });
      }

      const item = await CalendarItem.findByIdAndDelete(id);
      if (!item) {
        return res.status(404).json({ ok: false, message: 'No encontrado' });
      }

      return res.json({ ok: true, message: 'Eliminado correctamente' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * (Opcional) GET /calendar/stats
   * Devuelve counts básicos.
   */
  static async stats(req, res, next) {
    try {
      const now = new Date();
      const [total, published, upcoming, past] = await Promise.all([
        CalendarItem.countDocuments({}),
        CalendarItem.countDocuments({ status: 'published' }),
        CalendarItem.countDocuments({ status: 'published', startAt: { $gte: now } }),
        CalendarItem.countDocuments({ status: 'published', startAt: { $lt: now } })
      ]);

      return res.json({
        ok: true,
        data: { total, published, upcoming, past }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * (Opcional) PATCH /calendar/bulk/publish
   * body: { ids: [] }
   */
  static async publicarBulk(req, res, next) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ ok: false, message: 'ids array requerido' });
      }

      const result = await CalendarItem.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'published', publishedAt: new Date() } }
      );

      return res.json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * (Opcional) DELETE /calendar/bulk
   * body: { ids: [] }
   */
  static async eliminarBulk(req, res, next) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ ok: false, message: 'ids array requerido' });
      }

      const result = await CalendarItem.deleteMany({ _id: { $in: ids } });
      return res.json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export default CalendarioController;
