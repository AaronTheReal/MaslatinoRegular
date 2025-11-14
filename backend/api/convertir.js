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
   CONFIGURACIÓN WP & MONGO
   ========================= */

const WP_BASE_URL = process.env.WP_BASE_URL || 'https://maslatino.com';
const WP_POST_TYPE = process.env.WP_POST_TYPE || 'posts'; // si fuera custom: 'noticia', etc.
const WP_PER_PAGE = Number(process.env.WP_PER_PAGE || 100);

const MONGO_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://aaronguapo69:X3B7D2o5jPZMgMlm@cluster0.uxax8yp.mongodb.net/RealMedia';

/* =========================
   UTILIDADES GENERALES
   ========================= */

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

/** Intenta obtener la URL de la imagen destacada desde WP (_embed o campo custom) */
function getFeaturedImageUrl(noticia) {
  // 1) campo custom que tú ya estabas usando
  if (noticia.featured_image_url) return noticia.featured_image_url;

  // 2) vía _embed (si llamamos a WP con &_embed=1)
  const media = noticia?._embedded?.['wp:featuredmedia']?.[0];
  if (media?.source_url) return media.source_url;

  return null;
}

/* =========================
   DESCARGA EXHAUSTIVA DESDE WORDPRESS
   ========================= */

async function fetchAllWpPosts() {
  const base = WP_BASE_URL.replace(/\/$/, '');
  const endpoint = `${base}/wp-json/wp/v2/${WP_POST_TYPE}`;

  console.log('🌐 Conectando a WordPress:', endpoint);
  console.log('➡️  per_page =', WP_PER_PAGE);

  // 1) primera petición para saber cuántas páginas hay
  const firstUrl = `${endpoint}?per_page=${WP_PER_PAGE}&page=1&_embed=1`;

  const firstRes = await fetch(firstUrl);
  if (!firstRes.ok) {
    throw new Error(`❌ Error al pedir la página 1 de WP: ${firstRes.status} ${firstRes.statusText}`);
  }

  const totalPages = parseInt(firstRes.headers.get('X-WP-TotalPages') || '1', 10);
  const totalPosts = parseInt(firstRes.headers.get('X-WP-Total') || '0', 10);

  console.log(`📊 WordPress dice: ${totalPosts} posts en ${totalPages} páginas`);

  const firstData = await firstRes.json();
  let all = Array.isArray(firstData) ? [...firstData] : [];

  // 2) traer el resto de páginas
  for (let page = 2; page <= totalPages; page++) {
    const url = `${endpoint}?per_page=${WP_PER_PAGE}&page=${page}&_embed=1`;
    console.log(`📥 Descargando página ${page}/${totalPages} → ${url}`);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`⚠️  Error en página ${page}: ${res.status} ${res.statusText} (se continúa con las demás)`);
        continue;
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        all = all.concat(data);
        console.log(`   ✅ Página ${page} OK. Acumulados: ${all.length}`);
      } else {
        console.warn(`   ⚠️ Página ${page} vacía o formato raro.`);
      }
      // Pequeño delay para no bombardear WP
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.warn(`   💥 Error de red en página ${page}:`, err.message);
    }
  }

  console.log(`✅ Descarga completa desde WP. Total en memoria: ${all.length} posts`);

  // 3) Backup local para que siempre tengas el JSON crudo de WP
  try {
    const backupPath = '../api/NoticiasWP-descargadas.json';
    fs.writeFileSync(backupPath, JSON.stringify(all, null, 2), 'utf8');
    console.log(`💾 Backup guardado en: ${backupPath}`);
  } catch (err) {
    console.warn('⚠️  No se pudo escribir el backup JSON:', err.message);
  }

  return all;
}

/* =========================
   PIPELINE PRINCIPAL
   ========================= */

async function run() {
  try {
    // 1) Descargar TODO desde WordPress
    console.log('==============================');
    console.log('📥 INICIO DESCARGA WORDPRESS');
    console.log('==============================');
    const rawData = await fetchAllWpPosts();
    console.log(`📄 Posts recibidos de WP: ${rawData.length}`);

    if (!rawData.length) {
      console.error('❌ No se recibió ningún post desde WordPress. Abortando.');
      process.exit(1);
    }

    // 2) Conectar a Mongo
    console.log('🧬 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // 3) Construir mapa de categorías por SLUG a partir de tu DB
    console.log('📚 Leyendo categorías desde MongoDB...');
    const categorias = await Category.find({});
    const dbCatBySlug = {}; // { 'deportes': ObjectId, 'noticias-locales': ObjectId, ... }
    for (const cat of categorias) {
      const slug = nameToSlug(cat.name);
      dbCatBySlug[slug] = cat._id;
    }

    const defaultCategoryId = dbCatBySlug['mundo'] ?? Object.values(dbCatBySlug)[0];
    if (!defaultCategoryId) {
      throw new Error('No hay ninguna categoría en la BD para usar como fallback.');
    }

    console.log(`📎 Categoría por defecto (fallback): ${defaultCategoryId}`);

    // 4) Recorrer cada noticia de WP y guardarla en tu colección Noticia
    console.log('🧱 Comenzando importación noticia x noticia...');

    for (const noticia of rawData) {
      // === Categorías desde WP (class_list + yoast) ===
      const wpSlugs = extractWpCategorySlugs(noticia);
      const categoryIds = Array.from(wpSlugs)
        .map(slug => dbCatBySlug[slug])
        .filter(Boolean);

      if (categoryIds.length === 0) {
        console.warn(
          `⚠️  Sin match de categorías para: ${noticia.slug}. ` +
            `Slugs detectados: ${Array.from(wpSlugs).join(', ') || '(ninguno)'} -> usando 'Mundo'`
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

      const featuredImageUrl = getFeaturedImageUrl(noticia);

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
          image: featuredImageUrl
        },
        createdAt: new Date(noticia.date_gmt || Date.now()),
        updatedAt: new Date(noticia.modified_gmt || Date.now()),
        autorizada:true
      });

      try {
        await nueva.save();
        console.log(
          `✅ Guardada: ${nueva.slug} | categorías: ${categoryIds.length ? categoryIds.length : 1} | img: ${
            featuredImageUrl ? 'sí' : 'no'
          }`
        );
      } catch (err) {
        console.error(`❌ Error guardando ${noticia.slug}:`, err.message);
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
