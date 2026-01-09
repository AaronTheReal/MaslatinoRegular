import fs from 'fs';

const API = 'https://maslatinoregular.onrender.com/aaron/maslatino/news-sitemap-data';
const OUT = 'public/news-sitemap.xml';

async function run() {
  const res = await fetch(API);
  if (!res.ok) throw new Error('No se pudo obtener news-sitemap-data');

  const urls = await res.json();

  const xmlUrls = urls.map(u => `
  <url>
    <loc>${u.loc}</loc>
    <news:news>
      <news:publication>
        <news:name>Mas Latino</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${u.publication_date}</news:publication_date>
      <news:title><![CDATA[${u.title}]]></news:title>
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
  process.exit(1);
});
