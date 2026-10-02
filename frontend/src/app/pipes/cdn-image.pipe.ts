import { isDevMode, Pipe, PipeTransform } from '@angular/core';

// Hosts remotos permitidos en [images] remote_images de netlify.toml.
// Si el host no esta en la allowlist, el Image CDN devuelve 403, asi que
// esas URLs se dejan sin transformar.
const REMOTE_HOSTS = new Set([
  'd1w8u1yfnsws5m.cloudfront.net',
  'maslatino-contenido.s3.us-east-2.amazonaws.com',
]);

// El propio sitio: sus imagenes se piden al CDN como ruta relativa, que no
// necesita allowlist. Si se pidieran con la URL absoluta, netlify.toml solo
// permite /assets/iconosnavbar/ y el CDN devolveria 403 para todo lo demas.
const SITE_HOSTS = new Set(['maslatino.com', 'www.maslatino.com']);

/**
 * URL de la imagen pasada por el Netlify Image CDN, redimensionada al ancho
 * indicado y en formato moderno (webp/avif) negociado por el CDN. Las
 * portadas originales llegan a 8000px / 4.5MB; sin esto la primera visita al
 * home descarga ~15-20MB de imagenes.
 *
 * Devuelve null si la URL no se puede transformar (vacia, data:, host no
 * permitido o modo desarrollo, donde /.netlify/images no existe).
 */
function cdnUrl(url: string | null | undefined, width: number): string | null {
  if (!url) return null;
  if (isDevMode()) return null;
  if (url.startsWith('data:') || url.includes('/.netlify/images')) return null;

  if (/^https?:\/\//i.test(url)) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (SITE_HOSTS.has(parsed.hostname)) {
      return `/.netlify/images?url=${encodeURIComponent(parsed.pathname)}&w=${width}`;
    }
    if (!REMOTE_HOSTS.has(parsed.hostname)) return null;
    return `/.netlify/images?url=${encodeURIComponent(url)}&w=${width}`;
  }

  // Asset local del propio sitio: no requiere allowlist
  const path = url.startsWith('/') ? url : `/${url}`;
  return `/.netlify/images?url=${encodeURIComponent(path)}&w=${width}`;
}

/**
 * Uso: [src]="url | cdnimg:600"
 */
@Pipe({ name: 'cdnimg', standalone: true })
export class CdnImagePipe implements PipeTransform {
  transform(url: string | null | undefined, width = 800): string {
    return cdnUrl(url, width) ?? url ?? '';
  }
}

/**
 * srcset con varios anchos de la misma imagen, para que cada pantalla baje
 * la que necesita en vez de la de escritorio. Va junto a un `sizes` que diga
 * a qué ancho se muestra la imagen.
 *
 * Usar anchos que el sitio ya pida en otros sitios: cada ancho nuevo es otra
 * variante que el CDN tiene que generar y guardar por cada imagen.
 *
 * Uso: [attr.srcset]="url | cdnsrcset:[200, 400, 500]" sizes="180px"
 * Devuelve null si la imagen no pasa por el CDN: así el atributo no se pinta.
 */
@Pipe({ name: 'cdnsrcset', standalone: true })
export class CdnSrcsetPipe implements PipeTransform {
  transform(url: string | null | undefined, widths: number[]): string | null {
    const candidatos = widths
      .map((w) => {
        const u = cdnUrl(url, w);
        return u ? `${u} ${w}w` : null;
      })
      .filter((c): c is string => c !== null);
    return candidatos.length ? candidatos.join(', ') : null;
  }
}
