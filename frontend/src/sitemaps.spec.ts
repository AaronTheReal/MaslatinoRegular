import { buildNewsSitemapXml, buildSitemapXml, escapeXml } from './sitemaps';

describe('sitemaps', () => {
  describe('buildSitemapXml', () => {
    it('incluye la portada con la fecha de hoy', () => {
      const xml = buildSitemapXml([], '2026-10-04');

      expect(xml).toContain('<loc>https://maslatino.com</loc>');
      expect(xml).toContain('<lastmod>2026-10-04</lastmod>');
    });

    it('fuerza el dominio público y quita query string y barra final', () => {
      const xml = buildSitemapXml(
        [
          { loc: '/noticia/una-nota/', lastmod: '2026-09-21' },
          { loc: 'https://otro-host.com/noticia/otra?utm=x', lastmod: '2026-09-20' },
        ],
        '2026-10-04'
      );

      expect(xml).toContain('<loc>https://maslatino.com/noticia/una-nota</loc>');
      expect(xml).toContain('<loc>https://maslatino.com/noticia/otra</loc>');
      expect(xml).not.toContain('otro-host');
      expect(xml).not.toContain('utm=');
    });

    it('no repite una URL aunque el backend la mande dos veces', () => {
      const xml = buildSitemapXml(
        [
          { loc: '/noticia/repetida', lastmod: '2026-09-01' },
          { loc: 'https://maslatino.com/noticia/repetida/', lastmod: '2026-09-02' },
        ],
        '2026-10-04'
      );

      expect(xml.match(/noticia\/repetida/g)?.length).toBe(1);
    });

    it('no pinta etiquetas vacías cuando falta un campo', () => {
      const xml = buildSitemapXml([{ loc: '/noticia/sin-fecha' }], '2026-10-04');

      expect(xml).not.toContain('<lastmod></lastmod>');
      expect(xml).not.toContain('<priority></priority>');
    });

    it('es XML con la cabecera y el espacio de nombres de sitemaps', () => {
      const xml = buildSitemapXml([], '2026-10-04');

      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBeTrue();
      expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    });
  });

  describe('buildNewsSitemapXml', () => {
    const nota = {
      loc: '/noticia/kraft-impide-a-macklemore',
      publication_date: '2026-09-21T22:29:28.192Z',
      title: 'Kraft & Macklemore: "sin show"',
    };

    it('lista cada nota con su fecha y su título escapados', () => {
      const xml = buildNewsSitemapXml([nota]);

      expect(xml).toContain('<loc>https://maslatino.com/noticia/kraft-impide-a-macklemore</loc>');
      expect(xml).toContain('<news:publication_date>2026-09-21T22:29:28.192Z</news:publication_date>');
      expect(xml).toContain('<news:title>Kraft &amp; Macklemore: &quot;sin show&quot;</news:title>');
      expect(xml).toContain('<news:name>Mas Latino</news:name>');
      expect(xml).toContain('<news:language>es</news:language>');
    });

    it('con cero notas sigue siendo un sitemap válido, sin entradas', () => {
      const xml = buildNewsSitemapXml([]);

      expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
      expect(xml).not.toContain('<url>');
    });

    it('descarta entradas incompletas en vez de publicar una nota sin título', () => {
      const xml = buildNewsSitemapXml([nota, { loc: '/noticia/rota', publication_date: '', title: '' }]);

      expect(xml).not.toContain('/noticia/rota');
      expect(xml.match(/<url>/g)?.length).toBe(1);
    });
  });

  it('escapeXml tolera null y undefined', () => {
    expect(escapeXml(null)).toBe('');
    expect(escapeXml(undefined)).toBe('');
  });
});
