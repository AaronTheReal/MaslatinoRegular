import fs from 'fs';
import mongoose from 'mongoose';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { decode } from 'html-entities';
import Noticia from '../models/Noticias.js';
import Category from '../models/Categorias.js';

dotenv.config();

/** Normaliza comillas y espacios */
function normalizeQuotes(str = '') {
  return decode(str)
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // comillas dobles tipográficas -> "
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // comillas simples tipográficas -> '
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

/** Extrae slugs de categorías desde el JSON de WordPress */
function extractWpCategorySlugs(noticia) {
  const slugs = new Set();

  // 1) De class_list: tokens "category-deportes", "category-entretenimiento", ...
  const cls = Array.isArray(noticia.class_list) ? noticia.class_list : [];
  for (const token of cls) {
    if (token && token.startsWith('category-')) {
      const slug = token.slice('category-'.length).trim();
      if (slug) slugs.add(slug);
    }
  }

  // 2) De Yoast: articleSection ["Deportes","Entretenimiento", ...] → slug
  //    A veces viene en schema['@graph'] (Article), a veces directo en yoast_head_json.articleSection
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

/** Convierte HTML a bloques simples */
function htmlToBlocks(html) {
  const $ = cheerio.load(html);
  const blocks = [];

  $('body').children().each((_, el) => {
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
    } else if (['h1','h2','h3','h4','h5','h6'].includes(tag)) {
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

async function run() {
  const rawData = JSON.parse(fs.readFileSync('../api/NoticiasCambiar.json', 'utf8'));

  // Usa tu cadena actual. Idealmente usa MONGODB_URI en .env
  await mongoose.connect('mongodb+srv://aaronguapo69:X3B7D2o5jPZMgMlm@cluster0.uxax8yp.mongodb.net/RealMedia');

  // Construir mapa de categorías por SLUG a partir de tu DB
  const categorias = await Category.find({});
  const dbCatBySlug = {}; // { 'deportes': ObjectId, 'noticias-locales': ObjectId, ... }
  for (const cat of categorias) {
    const slug = nameToSlug(cat.name);
    dbCatBySlug[slug] = cat._id;
  }
  const defaultCategoryId = dbCatBySlug['mundo'] ?? Object.values(dbCatBySlug)[0];

  for (const noticia of rawData) {
    // === Categorías desde WP (class_list + yoast) ===
    const wpSlugs = extractWpCategorySlugs(noticia);
    const categoryIds = Array.from(wpSlugs)
      .map(slug => dbCatBySlug[slug])
      .filter(Boolean);

    if (categoryIds.length === 0) {
      console.warn(
        `⚠️  Sin match de categorías para: ${noticia.slug}. Slugs detectados: ${Array.from(wpSlugs).join(', ') || '(ninguno)'} -> usando 'Mundo'`
      );
    }

    // === Contenido a bloques ===
    let content = htmlToBlocks(noticia.content?.rendered || '');

    // Post-proceso de lista "Fuentes:" → asegura formato [texto](href) si faltara
    for (let i = 0; i < content.length - 1; i++) {
      if (content[i].type === 'text' && content[i].text && content[i + 1] && content[i + 1].type === 'list') {
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

    const nueva = new Noticia({
      title: normalizeQuotes(noticia.title?.rendered || ''),
      rawTitle: noticia.title?.rendered || '',
      slug: noticia.slug,
      summary: normalizeQuotes((noticia.excerpt?.rendered || '').replace(/<[^>]+>/g, '')),
      originalUrl: noticia.link,
      authorName: noticia.yoast_head_json?.author || 'Redacción',
      categories: categoryIds.length ? categoryIds : [defaultCategoryId],
      content,
      meta: {
        description: normalizeQuotes(noticia.yoast_head_json?.description || ''),
        image: noticia.featured_image_url
      },
      createdAt: new Date(noticia.date_gmt || Date.now()),
      updatedAt: new Date(noticia.modified_gmt || Date.now())
    });

    try {
      await nueva.save();
      console.log(`✅ Guardada: ${nueva.slug} | categorías: ${categoryIds.length ? categoryIds.length : 1}`);
    } catch (err) {
      console.error(`❌ Error con ${noticia.slug}:`, err.message);
    }
  }

  await mongoose.disconnect();
  console.log('📦 Importación finalizada.');
}

run().catch(err => {
  console.error('💥 Error general:', err);
  process.exit(1);
});














/*



import fs from 'fs';
import mongoose from 'mongoose';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { decode } from 'html-entities';
import Noticia from '../models/Noticias.js';
import Category from '../models/Categorias.js';

dotenv.config();

function normalizeQuotes(str = '') {
  // decodifica entidades y reemplaza comillas tipográficas por comillas rectas
  return decode(str)
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // comillas dobles tipográficas -> "
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // comillas simples tipográficas -> '
    .replace(/\s+/g, ' ') // opcional: colapsar espacios múltiples
    .trim();
}

function htmlToBlocks(html) {
  const $ = cheerio.load(html);
  const blocks = [];

  $('body').children().each((_, el) => {
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
    } else if (['h1','h2','h3','h4','h5','h6'].includes(tag)) {
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

async function run() {
  const rawData = JSON.parse(fs.readFileSync('../api/NoticiasCambiar.json', 'utf8'));

  await mongoose.connect('mongodb+srv://aaronguapo69:X3B7D2o5jPZMgMlm@cluster0.uxax8yp.mongodb.net/RealMedia');

  const categorias = await Category.find({});
  const categoryMap = {};
  for (const cat of categorias) categoryMap[cat.name] = cat._id;

  for (const noticia of rawData) {
    const categoryIds = (noticia.yoast_head_json?.articleSection || [])
      .map(nombre => categoryMap[nombre])
      .filter(Boolean);

    let content = htmlToBlocks(noticia.content?.rendered || '');

    // Procesar lista "Fuentes:" — fijé las plantillas y la creación de href
    for (let i = 0; i < content.length - 1; i++) {
      if (content[i].type === 'text' && content[i].text && content[i + 1] && content[i + 1].type === 'list') {
        const trimmedText = content[i].text.trim().replace(/\s+/g, '').toLowerCase();
        if (trimmedText === 'fuentes:') {
          const items = content[i + 1].items;
          const newItems = items.map(item => {
            if (item.includes('](')) {
              return item; // ya es link markdown
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

    const nueva = new Noticia({
      title: normalizeQuotes(noticia.title?.rendered || ''),
      rawTitle: noticia.title?.rendered || '', // opcional, si quieres conservar el original
      slug: noticia.slug,
      summary: normalizeQuotes((noticia.excerpt?.rendered || '').replace(/<[^>]+>/g, '')),
      originalUrl: noticia.link,
      authorName: noticia.yoast_head_json?.author || 'Redacción',
      categories: categoryIds.length ? categoryIds : [categoryMap['Mundo']],
      content,
      meta: {
        description: normalizeQuotes(noticia.yoast_head_json?.description || ''),
        image: noticia.featured_image_url
      },
      createdAt: new Date(noticia.date_gmt || Date.now()),
      updatedAt: new Date(noticia.modified_gmt || Date.now())
    });

    try {
      await nueva.save();
      console.log(`✅ Guardada: ${nueva.slug}`);
    } catch (err) {
      console.error(`❌ Error con ${noticia.slug}:`, err.message);
    }
  }

  await mongoose.disconnect();
}

run();

*/