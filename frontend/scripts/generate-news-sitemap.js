import fs from 'fs';

const API_BASE = (process.env.SITEMAP_API_BASE || 'https://maslatinoregular.onrender.com/aaron/maslatino')
  .replace(/\/+$/, '');
const API = `${API_BASE}/news-sitemap-data`;
const OUT = 'public/news-sitemap.xml';
const PUBLIC_ORIGIN = 'https://maslatino.com';

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizePublicUrl(value) {
  const url = new URL(String(value || ''), PUBLIC_ORIGIN);
  return `${PUBLIC_ORIGIN}${url.pathname}`;
}

async function run() {
  const res = await fetch(API, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    throw new Error(`No se pudo obtener news-sitemap-data (${res.status})`);
  }

  const urls = await res.json();

  if (!Array.isArray(urls) || urls.length === 0) {
    console.log('⚠️ No hay noticias recientes (48h)');
  }

  const xmlUrls = urls.map(u => `
  <url>
    <loc>${escapeXml(normalizePublicUrl(u.loc))}</loc>
    <news:news>
      <news:publication>
        <news:name>Mas Latino</news:name>
        <news:language>es</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(u.publication_date)}</news:publication_date>
      <news:title>${escapeXml(u.title)}</news:title>
    </news:news>
  </url>
`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${xmlUrls}
</urlset>`;

  fs.writeFileSync(OUT, xml);
  console.log('✅ news-sitemap.xml generado');
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
