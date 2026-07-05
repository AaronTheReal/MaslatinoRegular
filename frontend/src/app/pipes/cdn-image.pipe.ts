import { isDevMode, Pipe, PipeTransform } from '@angular/core';

// Hosts remotos permitidos en [images] remote_images de netlify.toml.
// Si el host no esta en la allowlist, el Image CDN devuelve 403, asi que
// esas URLs se dejan sin transformar.
const REMOTE_HOSTS = new Set([
  'd1w8u1yfnsws5m.cloudfront.net',
  'maslatino-contenido.s3.us-east-2.amazonaws.com',
  'maslatino.com',
  'www.maslatino.com',
]);

/**
 * Sirve imagenes via Netlify Image CDN (/.netlify/images) redimensionadas
 * al ancho indicado y en formato moderno (webp/avif) negociado por el CDN.
 * Las portadas originales llegan a 8000px / 4.5MB; sin esto la primera
 * visita al home descarga ~15-20MB de imagenes.
 *
 * Uso: [src]="url | cdnimg:600"
 */
@Pipe({ name: 'cdnimg', standalone: true })
export class CdnImagePipe implements PipeTransform {
  transform(url: string | null | undefined, width = 800): string {
    if (!url) return '';
    // En ng serve no existe /.netlify/images; servir la original
    if (isDevMode()) return url;
    if (url.startsWith('data:') || url.includes('/.netlify/images')) return url;

    if (/^https?:\/\//i.test(url)) {
      let host: string;
      try {
        host = new URL(url).hostname;
      } catch {
        return url;
      }
      if (!REMOTE_HOSTS.has(host)) return url;
      return `/.netlify/images?url=${encodeURIComponent(url)}&w=${width}`;
    }

    // Asset local del propio sitio: no requiere allowlist
    const path = url.startsWith('/') ? url : `/${url}`;
    return `/.netlify/images?url=${encodeURIComponent(path)}&w=${width}`;
  }
}
