import fs from 'fs';

const API = 'https://maslatinoregular.onrender.com/aaron/maslatino/sitemap-data';
const OUT = 'public/sitemap.xml';

async function run() {
  const res = await fetch(API); // fetch NATIVO de Node 18+
  if (!res.ok) {
    throw new Error('No se pudo obtener sitemap-data');
  }

  const urls = await res.json();

  const xmlUrls = urls.map(u => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
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
  process.exit(1);
});
