import {
  DEFAULT_AUTHOR,
  SOCIAL_DESCRIPTION_MAX,
  SOCIAL_IMAGE_HEIGHT,
  SOCIAL_IMAGE_WIDTH,
  buildSocialDescription,
  buildSocialImageUrl,
  ensureAbsoluteHttpsUrl,
  truncate,
} from './social-preview';

describe('social-preview', () => {
  describe('ensureAbsoluteHttpsUrl', () => {
    it('deja pasar una URL que ya es https', () => {
      const url = 'https://d1w8u1yfnsws5m.cloudfront.net/uploads/portada.jpg';

      expect(ensureAbsoluteHttpsUrl(url)).toBe(url);
    });

    it('sube a https lo que venga por http', () => {
      expect(ensureAbsoluteHttpsUrl('http://ejemplo.com/foto.jpg')).toBe(
        'https://ejemplo.com/foto.jpg'
      );
    });

    it('completa el dominio en las rutas relativas', () => {
      expect(ensureAbsoluteHttpsUrl('assets/foto.jpg')).toBe(
        'https://maslatino.com/assets/foto.jpg'
      );
      expect(ensureAbsoluteHttpsUrl('/assets/foto.jpg')).toBe(
        'https://maslatino.com/assets/foto.jpg'
      );
    });

    it('cae en el logo cuando la noticia no trae portada', () => {
      expect(ensureAbsoluteHttpsUrl('')).toContain('maslatinologo.png');
      expect(ensureAbsoluteHttpsUrl('   ')).toContain('maslatinologo.png');
    });
  });

  describe('buildSocialImageUrl', () => {
    const portada = 'https://d1w8u1yfnsws5m.cloudfront.net/uploads/2026/09/15/alex saab.jpg';

    it('pasa la portada por el Image CDN a 1200x630', () => {
      const url = buildSocialImageUrl(portada);

      expect(url).toContain('https://maslatino.com/.netlify/images?');
      expect(url).toContain(`w=${SOCIAL_IMAGE_WIDTH}`);
      expect(url).toContain(`h=${SOCIAL_IMAGE_HEIGHT}`);
      expect(url).toContain('fit=cover');
      expect(url).toContain('fm=jpg');
    });

    it('escapa la URL original para no romper los parámetros', () => {
      const url = buildSocialImageUrl(portada);

      expect(url).toContain(encodeURIComponent(portada));
      expect(url).not.toContain('alex saab.jpg');
    });

    it('también sirve el logo de respaldo por el CDN', () => {
      expect(buildSocialImageUrl('')).toContain('maslatinologo.png');
    });
  });

  describe('truncate', () => {
    it('no toca lo que ya cabe', () => {
      expect(truncate('Texto corto', 40)).toBe('Texto corto');
    });

    it('corta sin partir palabras y cierra con puntos suspensivos', () => {
      const result = truncate('palabra '.repeat(20), 30);

      expect(result.length).toBeLessThanOrEqual(30);
      expect(result.endsWith('…')).toBeTrue();
      expect(result).not.toContain('pala…');
    });

    it('limpia el HTML del editor', () => {
      expect(truncate('<p>Hola <strong>mundo</strong></p>', 40)).toBe('Hola mundo');
    });
  });

  describe('buildSocialDescription', () => {
    const resumen =
      'El empresario colombiano Alex Saab se declaró culpable en Miami por lavado de dinero y acordó colaborar con las autoridades estadounidenses en investigaciones abiertas sobre corrupción internacional.';

    it('pone la firma delante, que es lo poco que WhatsApp enseña', () => {
      const description = buildSocialDescription('Viviana', resumen);

      expect(description.startsWith('Por Viviana — ')).toBeTrue();
    });

    it('respeta el largo máximo aunque el resumen sea enorme', () => {
      const description = buildSocialDescription('Viviana', resumen);

      expect(description.length).toBeLessThanOrEqual(SOCIAL_DESCRIPTION_MAX);
    });

    it('se queda solo con el resumen si no hay autor', () => {
      const description = buildSocialDescription('', resumen);

      expect(description.startsWith('Por')).toBeFalse();
      expect(description.startsWith('El empresario colombiano')).toBeTrue();
    });

    it('se queda solo con la firma si no hay resumen', () => {
      expect(buildSocialDescription(DEFAULT_AUTHOR, '')).toBe(`Por ${DEFAULT_AUTHOR}`);
    });

    it('limpia el HTML antes de firmar', () => {
      expect(buildSocialDescription('Viviana', '<p>Resumen <em>con</em> etiquetas</p>')).toBe(
        'Por Viviana — Resumen con etiquetas'
      );
    });
  });
});
