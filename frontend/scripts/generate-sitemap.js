import fs from 'fs';

const API_BASE = (process.env.SITEMAP_API_BASE || 'https://maslatinoregular.onrender.com/aaron/maslatino')
  .replace(/\/+$/, '');
const API = `${API_BASE}/sitemap-data`;
const OUT = 'public/sitemap.xml';
const PUBLIC_ORIGIN = 'https://maslatino.com';
const STATIC_PATHS = ['/'];

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
  return `${PUBLIC_ORIGIN}${url.pathname}`.replace(/\/+$/, '') || PUBLIC_ORIGIN;
}

async function run() {
  const res = await fetch(API, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    throw new Error(`No se pudo obtener sitemap-data (${res.status})`);
  }

  const apiUrls = await res.json();
  if (!Array.isArray(apiUrls)) throw new Error('sitemap-data no devolvió una lista');

  const today = new Date().toISOString().slice(0, 10);
  const staticUrls = STATIC_PATHS.map((pathname) => ({
    loc: `${PUBLIC_ORIGIN}${pathname === '/' ? '' : pathname}`,
    lastmod: today,
    changefreq: pathname === '/' ? 'daily' : 'weekly',
    priority: pathname === '/' ? '1.0' : '0.7',
  }));
  const deduplicated = new Map();
  for (const item of [...staticUrls, ...apiUrls]) {
    const loc = normalizePublicUrl(item.loc);
    deduplicated.set(loc, { ...item, loc });
  }
  const urls = [...deduplicated.values()];

  const xmlUrls = urls.map(u => `
  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${escapeXml(u.lastmod)}</lastmod>
    <changefreq>${escapeXml(u.changefreq)}</changefreq>
    <priority>${escapeXml(u.priority)}</priority>
  </url>
`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;

  fs.writeFileSync(OUT, xml);
  console.log('✅ sitemap.xml generado');
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
