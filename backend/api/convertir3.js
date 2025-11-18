import fs from 'fs';
import mongoose from 'mongoose';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { decode } from 'html-entities';
import Noticia from '../models/Noticias.js';
import Category from '../models/Categorias.js';
// Si usas Node < 18, descomenta esta línea y haz: npm i node-fetch
// import fetch from 'node-fetch';

dotenv.config();

/* =========================
   CONFIG
   ========================= */

const MONGO_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://aaronguapo69:X3B7D2o5jPZMgMlm@cluster0.uxax8yp.mongodb.net/RealMedia';

// Ruta del JSON exportado desde phpMyAdmin (wp_posts)
const SQL_EXPORT_PATH = '../api/wp_posts_sql.json';

// Imagen por defecto si no encontramos ninguna <img> ni featured
const DEFAULT_IMAGE_URL =
  process.env.DEFAULT_NEWS_IMAGE ||
  'https://maslatino.com/wp-content/uploads/2024/01/placeholder-maslatino.jpg';

/* =========================
   UTILIDADES GENERALES
   ========================= */

/** Normaliza comillas y espacios */
function normalizeQuotes(str = '') {
  return decode(str)
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Slugifica nombres con acentos: "Noticias Locales" -> "noticias-locales"; "Política" -> "politica" */
function nameToSlug(name = '') {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Extrae slugs de categorías desde el JSON tipo WP REST.
 *  Con el JSON de SQL NO tendremos class_list ni yoast, así que esto normalmente
 *  devolverá vacío y usaremos categoría por defecto ("Mundo").
 */
function extractWpCategorySlugs(noticia) {
  const slugs = new Set();

  // 1) De class_list: tokens "category-deportes", ...
  const cls = Array.isArray(noticia.class_list) ? noticia.class_list : [];
  for (const token of cls) {
    if (token && token.startsWith('category-')) {
      const slug = token.slice('category-'.length).trim();
      if (slug) slugs.add(slug);
    }
  }

  // 2) De Yoast: articleSection ["Deportes","Entretenimiento", ...]
  const graphArticleSection =
    noticia?.yoast_head_json?.schema?.['@graph']?.find(x => x['@type'] === 'Article')?.articleSection;
  const plainArticleSection = noticia?.yoast_head_json?.articleSection;

  const sections = Array.isArray(graphArticleSection)
    ? graphArticleSection
    : Array.isArray(plainArticleSection)
    ? plainArticleSection
    : [];

  for (const nombre of sections) {
    const slug = nameToSlug(nombre);
    if (slug) slugs.add(slug);
  }

  return slugs;
}

/** Convierte HTML a bloques simples (tu formato interno) */
function htmlToBlocks(html = '') {
  const $ = cheerio.load(html);
  const blocks = [];

  $('body')
    .children()
    .each((_, el) => {
      const tag = el.tagName ? el.tagName.toLowerCase() : 'p';
      const $el = $(el);

      if (tag === 'p') {
        const text = $el.text();
        if (!text.trim()) return;
        const link = $el.find('a').first();
        if (link.length && $el.children().length === 1) {
          blocks.push({
            type: 'link',
            href: link.attr('href'),
            textLink: link.text(),
            tag: 'p'
          });
        } else {
          blocks.push({
            type: 'text',
            text: text,
            tag: 'p'
          });
        }
      } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        const text = $el.text();
        if (!text.trim()) return;
        blocks.push({ type: 'text', text, tag });
      } else if (tag === 'blockquote') {
        const quote = $el.text();
        if (!quote.trim()) return;
        blocks.push({ type: 'quote', quote });
      } else if (tag === 'ul' || tag === 'ol') {
        const items = [];
        $el.find('li').each((_, li) => {
          const $li = $(li);
          const a = $li.find('a');
          if (a.length) {
            const text = a.text();
            const href = a.attr('href');
            items.push(`[${text}](${href})`);
          } else {
            items.push($li.text());
          }
        });
        if (items.length === 0) return;
        blocks.push({ type: 'list', ordered: tag === 'ol', items });
      } else if (tag === 'hr') {
        blocks.push({ type: 'text', text: '---', tag: 'p' });
      } else {
        const text = $el.text();
        if (!text.trim()) return;
        blocks.push({ type: 'text', text, tag: 'p' });
      }
    });

  return blocks;
}

/** En este flujo no tendremos featured_image_url ni _embed, así que lo dejamos nulo */
function getFeaturedImageUrl() {
  return null;
}

/** Extrae la primera imagen <img src="..."> del HTML del contenido */
function extractFirstImageSrc(html = '') {
  const $ = cheerio.load(html);
  const img = $('img').first();
  const src = img.attr('src');
  return src || null;
}

/** Genera una meta description corta a partir de excerpt o content */
function buildMetaDescription(noticia) {
  const rawExcerpt = noticia.excerpt?.rendered || '';
  const rawContent = noticia.content?.rendered || '';

  let text = rawExcerpt || rawContent;

  // quitar HTML
  text = text.replace(/<[^>]+>/g, ' ');
  text = normalizeQuotes(text);

  if (text.length > 220) {
    text = text.slice(0, 217) + '...';
  }

  return text || 'Noticias y análisis en Más Latino.';
}

/* =========================
   CARGA Y NORMALIZACIÓN DESDE JSON SQL
   ========================= */

/**
 * Lee el JSON exportado por phpMyAdmin y lo convierte a objetos tipo "WP REST"
 * (id, slug, date, title.rendered, content.rendered, excerpt.rendered, etc.).
 */
function loadFromSqlJson(filePath) {
  console.log('📥 Leyendo JSON exportado desde SQL:', filePath);
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Busca el objeto de tipo "table" con name = "wp_posts"
  const tableObj = raw.find(obj => obj.type === 'table' && obj.name === 'wp_posts');
  if (!tableObj || !Array.isArray(tableObj.data)) {
    throw new Error('No se encontró la tabla wp_posts en el JSON exportado.');
  }

  const rows = tableObj.data;

  const mapped = rows.map(row => {
    // Normalizamos fechas (evitar "0000-00-00 00:00:00")
    const postDate =
      row.post_date && row.post_date !== '0000-00-00 00:00:00'
        ? row.post_date.replace(' ', 'T')
        : null;
    const postDateGmt =
      row.post_date_gmt && row.post_date_gmt !== '0000-00-00 00:00:00'
        ? row.post_date_gmt.replace(' ', 'T')
        : null;
    const postModified =
      row.post_modified && row.post_modified !== '0000-00-00 00:00:00'
        ? row.post_modified.replace(' ', 'T')
        : postDate;
    const postModifiedGmt =
      row.post_modified_gmt && row.post_modified_gmt !== '0000-00-00 00:00:00'
        ? row.post_modified_gmt.replace(' ', 'T')
        : postDateGmt;

    return {
      id: Number(row.ID),
      slug: row.post_name,
      status: row.post_status,
      type: row.post_type,
      link: row.guid,
      date: postDate,
      date_gmt: postDateGmt,
      modified: postModified,
      modified_gmt: postModifiedGmt,
      title: { rendered: row.post_title || '' },
      content: { rendered: row.post_content || '' },
      excerpt: { rendered: row.post_excerpt || '' },
      // No tenemos estos campos en el JSON de SQL, los dejamos vacíos
      yoast_head_json: {},
      class_list: []
    };
  });

  console.log(`📄 Posts mapeados desde SQL: ${mapped.length}`);
  return mapped;
}

/* =========================
   PIPELINE PRINCIPAL
   ========================= */

async function run() {
  try {
    console.log('==============================');
    console.log('📥 INICIO IMPORTACIÓN DESDE JSON SQL (phpMyAdmin)');
    console.log('==============================');

    // 1) Cargar JSON exportado desde SQL y normalizarlo
    const rawData = loadFromSqlJson(SQL_EXPORT_PATH);

    if (!rawData.length) {
      console.error('❌ No hay posts en el JSON. Abortando.');
      process.exit(1);
    }

    // 2) Conectar a Mongo
    console.log('🧬 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // 3) Construir mapa de categorías por SLUG a partir de tu DB
    console.log('📚 Leyendo categorías desde MongoDB...');
    const categorias = await Category.find({});
    const dbCatBySlug = {}; // { 'deportes': ObjectId, 'mundo': ObjectId, ... }
    for (const cat of categorias) {
      const slug = nameToSlug(cat.name);
      dbCatBySlug[slug] = cat._id;
    }

    const defaultCategoryId = dbCatBySlug['mundo'] ?? Object.values(dbCatBySlug)[0];
    if (!defaultCategoryId) {
      throw new Error('No hay ninguna categoría en la BD para usar como fallback.');
    }
    console.log(`📎 Categoría por defecto (fallback): ${defaultCategoryId}`);

    // 4) Recorrer cada noticia y guardarla
    console.log('🧱 Comenzando importación noticia x noticia...');

    for (const noticia of rawData) {
      // si solo quieres las publicadas:
      if (noticia.status !== 'publish') {
        continue; // quita este if si también quieres drafts, revisiones, etc.
      }

      // === Categorías ===
      const wpSlugs = extractWpCategorySlugs(noticia); // con JSON SQL estará vacío
      const categoryIds = Array.from(wpSlugs)
        .map(slug => dbCatBySlug[slug])
        .filter(Boolean);

      if (categoryIds.length === 0) {
        console.warn(
          `⚠️  Sin match de categorías para: ${noticia.slug}. ` +
            `-> usando categoría por defecto`
        );
      }

      // === Contenido a bloques ===
      const htmlContent = noticia.content?.rendered || '';
      let content = htmlToBlocks(htmlContent);

      // Post-proceso de lista "Fuentes:"
      for (let i = 0; i < content.length - 1; i++) {
        if (
          content[i].type === 'text' &&
          content[i].text &&
          content[i + 1] &&
          content[i + 1].type === 'list'
        ) {
          const trimmedText = content[i].text.trim().replace(/\s+/g, '').toLowerCase();
          if (trimmedText === 'fuentes:') {
            const items = content[i + 1].items;
            const newItems = items.map(item => {
              if (item.includes('](')) {
                return item; // ya viene como link markdown
              } else {
                const cleanName = item.toLowerCase().replace(/\s+/g, '');
                const href = `https://www.${cleanName}.com`;
                return `[${item}](${href})`;
              }
            });
            content[i + 1].items = newItems;
            break;
          }
        }
      }

      // === Meta: imagen y descripción (obligatorios en tu schema) ===
      const firstImageSrc = extractFirstImageSrc(htmlContent);
      const featuredImageUrl = getFeaturedImageUrl(noticia); // en este flujo será null
      const finalImageUrl = firstImageSrc || featuredImageUrl || DEFAULT_IMAGE_URL;

      const metaDescription = buildMetaDescription(noticia);

      const createdAt =
        (noticia.date_gmt && new Date(noticia.date_gmt)) ||
        (noticia.date && new Date(noticia.date)) ||
        new Date();
      const updatedAt =
        (noticia.modified_gmt && new Date(noticia.modified_gmt)) ||
        (noticia.modified && new Date(noticia.modified)) ||
        createdAt;

      const nueva = new Noticia({
        title: normalizeQuotes(noticia.title?.rendered || ''),
        rawTitle: noticia.title?.rendered || '',
        slug: noticia.slug,
        summary: normalizeQuotes(
          (noticia.excerpt?.rendered || '').replace(/<[^>]+>/g, '')
        ),
        originalUrl: noticia.link,
        authorName: 'Redacción', // desde SQL no tenemos yoast_head_json.author
        categories: categoryIds.length ? categoryIds : [defaultCategoryId],
        content,
        meta: {
          description: metaDescription,
          image: finalImageUrl
        },
        createdAt,
        updatedAt,
        autorizada: true
      });

      try {
        await nueva.save();
        console.log(
          `✅ Guardada: ${nueva.slug} | categorías: ${
            categoryIds.length ? categoryIds.length : 1
          } | img: ${finalImageUrl}`
        );
      } catch (err) {
        console.error(`❌ Error guardando ${nueva.slug}:`, err.message);
      }
    }

    // 5) Cerrar conexión
    await mongoose.disconnect();
    console.log('📦 Importación finalizada. MongoDB desconectado.');
  } catch (err) {
    console.error('💥 Error general:', err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

run();
