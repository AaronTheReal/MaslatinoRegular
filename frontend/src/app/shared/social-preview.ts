/**
 * Piezas de la tarjeta que ven WhatsApp, Facebook, X y LinkedIn cuando alguien
 * comparte un enlace del sitio.
 *
 * Están aquí, fuera de los componentes, porque son cálculo puro: se pueden
 * probar sin montar una página y las comparte cualquier plantilla que quiera
 * emitir Open Graph (noticia, podcast, ciudad...).
 */

/** Dominio público; las URLs de Open Graph tienen que ser absolutas. */
const SITE_ORIGIN = 'https://maslatino.com';

/** Portada de respaldo cuando la nota no trae imagen propia. */
const FALLBACK_IMAGE = `${SITE_ORIGIN}/assets/iconosnavbar/maslatinologo.png`;

/**
 * 1200x630 (1.91:1) es el formato que piden WhatsApp, Facebook y LinkedIn.
 * Al servirla siempre a esa medida podemos declarar `og:image:width/height`
 * como constantes y el bot ya no necesita descargar la imagen para saber si le
 * sirve.
 */
export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;
export const SOCIAL_IMAGE_TYPE = 'image/jpeg';

/**
 * WhatsApp recorta la descripción a un par de líneas (~130 caracteres) y no
 * tiene campo de autor, así que lo poco que quepa tiene que venir por delante.
 */
export const SOCIAL_DESCRIPTION_MAX = 200;

/** Firma cuando la nota no dice quién la escribió. */
export const DEFAULT_AUTHOR = 'Redacción Mas Latino';

export function ensureAbsoluteHttpsUrl(url: string): string {
  const clean = (url ?? '').trim();
  if (!clean) return FALLBACK_IMAGE;
  if (clean.startsWith('https://')) return clean;
  if (clean.startsWith('http://')) return clean.replace('http://', 'https://');
  return `${SITE_ORIGIN}${clean.startsWith('/') ? '' : '/'}${clean}`;
}

/**
 * Portada pasada por el Image CDN de Netlify.
 *
 * Las portadas originales llegan de CloudFront a 1920-2900 px y pesan entre
 * 300 KB y 1 MB. WhatsApp descarta en silencio las imágenes grandes, así que
 * la nota se compartía sin foto; el CDN las deja en 1200x630 JPG (~100-200 KB).
 * Es la misma receta que ya usaba la página de podcast.
 */
export function buildSocialImageUrl(rawImage: string): string {
  const absolute = ensureAbsoluteHttpsUrl(rawImage);
  const params = [
    `url=${encodeURIComponent(absolute)}`,
    `w=${SOCIAL_IMAGE_WIDTH}`,
    `h=${SOCIAL_IMAGE_HEIGHT}`,
    'fit=cover',
    'fm=jpg',
    'q=80',
  ].join('&');

  return `${SITE_ORIGIN}/.netlify/images?${params}`;
}

/** Quita etiquetas y espacios de más de un texto que viene del editor. */
export function stripHtml(value: string): string {
  return (value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Corta sin partir palabras y sin dejar un guion o una coma colgando.
 */
export function truncate(value: string, max: number): string {
  const clean = stripHtml(value);
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const body = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;

  return `${body.replace(/[\s,;:.\-–—]+$/, '')}…`;
}

/**
 * Descripción social con la firma delante.
 *
 * La tarjeta de WhatsApp solo tiene cuatro huecos —título, descripción, imagen
 * y dominio—: no existe ninguna etiqueta de autor que pinte. Si el nombre de
 * quien firma tiene que verse al compartir, el único sitio donde cabe es el
 * principio de la descripción.
 */
export function buildSocialDescription(
  authorName: string,
  description: string
): string {
  const author = stripHtml(authorName);
  const body = stripHtml(description);

  if (!author) return truncate(body, SOCIAL_DESCRIPTION_MAX);
  if (!body) return `Por ${author}`;

  const prefix = `Por ${author} — `;
  return `${prefix}${truncate(body, SOCIAL_DESCRIPTION_MAX - prefix.length)}`;
}
