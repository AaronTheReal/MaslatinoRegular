// netlify/functions/sitemap.js

export async function handler() {
  try {
    // 👉 aquí llamas a tu backend en Render
    const res = await fetch(
      'https://maslatinoregular.onrender.com/aaron/maslatino/sitemap-data'
    );

    if (!res.ok) {
      throw new Error('No se pudo obtener el sitemap');
    }

    const urls = await res.json(); 
    // urls = [{ loc, lastmod, changefreq, priority }]

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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      },
      body: xml
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: error.message
    };
  }
}
