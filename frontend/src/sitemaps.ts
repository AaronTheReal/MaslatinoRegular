/**
 * Sitemaps generados en el momento en que se piden.
 *
 * Antes eran archivos fijos que el build escribía en public/ (prebuild): una
 * nota nueva no entraba al sitemap hasta el siguiente deploy, y el de Google
 * News, que solo lista lo de las últimas 48 horas, salía casi siempre vacío
 * porque el sitio se despliega poco (cada deploy cuesta créditos de Netlify).
 * El 04/10/2026 tenía 0 notas.
 *
 * Ahora los arma server.ts con los mismos datos del backend (/sitemap-data y
 * /news-sitemap-data), y el CDN de Netlify los guarda un rato. Este módulo
 * solo construye el XML: no sabe nada de red ni de Angular, para poder
 * probarlo aparte.
 */

const PUBLIC_ORIGIN = 'https://maslatino.com';

/** Lo que devuelve GET /sitemap-data por cada URL. */
export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

/** Lo que devuelve GET /news-sitemap-data por cada nota de las últimas 48 h. */
export interface NewsSitemapEntry {
  loc: string;
  publication_date: string;
  title: string;
}

export function escapeXml(value: unknown = ''): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Fuerza el dominio público y quita query string y fragmento: el backend puede
 * devolver rutas relativas o con otro host, y en el sitemap solo cabe la URL
 * canónica.
 */
function urlPublica(value: string, quitarBarraFinal: boolean): string {
  const url = new URL(String(value || ''), PUBLIC_ORIGIN);
  const completa = `${PUBLIC_ORIGIN}${url.pathname}`;
  return quitarBarraFinal ? completa.replace(/\/+$/, '') || PUBLIC_ORIGIN : completa;
}

/**
 * sitemap.xml: la portada más todas las URL que manda el backend, sin
 * duplicados. `hoy` es la fecha (AAAA-MM-DD) que lleva la portada como lastmod.
 */
export function buildSitemapXml(entries: SitemapEntry[], hoy: string): string {
  const portada: SitemapEntry = {
    loc: PUBLIC_ORIGIN,
    lastmod: hoy,
    changefreq: 'daily',
    priority: '1.0',
  };

  const unicas = new Map<string, SitemapEntry>();
  for (const entry of [portada, ...entries]) {
    if (!entry?.loc) continue;
    const loc = urlPublica(entry.loc, true);
    unicas.set(loc, { ...entry, loc });
  }

  const urls = [...unicas.values()]
    .map((u) => {
      const campos = [`    <loc>${escapeXml(u.loc)}</loc>`];
      if (u.lastmod) campos.push(`    <lastmod>${escapeXml(u.lastmod)}</lastmod>`);
      if (u.changefreq) campos.push(`    <changefreq>${escapeXml(u.changefreq)}</changefreq>`);
      if (u.priority) campos.push(`    <priority>${escapeXml(u.priority)}</priority>`);
      return `  <url>\n${campos.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/**
 * news-sitemap.xml (Google News). Una lista vacía es válida: significa que no
 * hubo notas en las últimas 48 horas.
 */
export function buildNewsSitemapXml(entries: NewsSitemapEntry[]): string {
  const urls = entries
    .filter((u) => u?.loc && u?.title && u?.publication_date)
    .map(
      (u) => `  <url>
    <loc>${escapeXml(urlPublica(u.loc, false))}</loc>
    <news:news>
      <news:publication>
        <news:name>Mas Latino</news:name>
        <news:language>es</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(u.publication_date)}</news:publication_date>
      <news:title>${escapeXml(u.title)}</news:title>
    </news:news>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;
}
