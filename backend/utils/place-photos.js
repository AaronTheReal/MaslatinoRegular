/**
 * Fotos de Google Places servidas por un proxy propio.
 *
 * El módulo original incrustaba `GOOGLE_PLACES_API_KEY` en la URL de cada foto
 * y guardaba esa URL en Mongo, así que la credencial acababa en el navegador de
 * cualquier visitante y rotarla invalidaba todas las fotos almacenadas. Aquí la
 * base de datos guarda solo el `photoName` de Google y la URL pública apunta a
 * este backend, que añade la clave en el servidor al redirigir.
 */

import axios from 'axios';

export const PLACE_PHOTO_PATH = '/places/photo';

const DEFAULT_MAX_WIDTH = 800;
const MAX_ALLOWED_WIDTH = 1600;

/**
 * Origen público de esta API. Detrás del proxy de Render, `req.protocol` reporta
 * http salvo que se active `trust proxy`, así que leemos las cabeceras
 * reenviadas de forma explícita en vez de depender de esa configuración.
 */
function resolveRequestOrigin(req) {
  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const forwardedHost = String(req?.headers?.['x-forwarded-host'] || '')
    .split(',')[0]
    .trim();

  const protocol = forwardedProto || req?.protocol || 'https';
  const host = forwardedHost || req?.get?.('host') || '';

  return host ? `${protocol}://${host}` : '';
}

/** Prefijo bajo el que se montó el router (`/aaron/maslatino`). */
function resolveApiPrefix(req) {
  return String(req?.baseUrl || '').replace(/\/+$/, '');
}

export function buildPlacePhotoUrl(req, photoName) {
  const name = String(photoName || '').trim();
  if (!name) return '';

  // `photoName` trae barras (places/<id>/photos/<id>); se conservan como ruta
  // para no depender de que el proxy acepte %2F codificado.
  const encodedPath = name
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');

  return `${resolveRequestOrigin(req)}${resolveApiPrefix(req)}${PLACE_PHOTO_PATH}/${encodedPath}`;
}

/** Convierte las fotos guardadas en su forma pública, sin exponer la clave. */
export function toPublicPhotos(req, photos = []) {
  if (!Array.isArray(photos)) return [];

  return photos
    .map((photo) => {
      const photoName = photo?.photoName || '';
      if (!photoName) return null;
      return {
        url: buildPlacePhotoUrl(req, photoName),
        authorName: photo?.authorName || '',
        authorUri: photo?.authorUri || '',
      };
    })
    .filter(Boolean);
}

/** Aplica `toPublicPhotos` a una lista de lugares (o restaurantes). */
export function toPublicPlaces(req, places = []) {
  if (!Array.isArray(places)) return [];

  return places.map((place) => {
    const plain = typeof place?.toObject === 'function' ? place.toObject() : { ...place };
    return { ...plain, photos: toPublicPhotos(req, plain.photos) };
  });
}

export function resolvePhotoMaxWidth(value) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_WIDTH;
  return Math.min(parsed, MAX_ALLOWED_WIDTH);
}

export const PLACE_PHOTO_NAME_PATTERN =
  /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

/**
 * `GET /places/photo/<photoName>` → redirige a la imagen.
 *
 * Importante: NO se redirige a `…/media?key=…`. Esa URL lleva la credencial en
 * la cabecera `Location`, así que el navegador acabaría viéndola igualmente.
 * En su lugar se pide a Google la URL firmada con `skipHttpRedirect=true` —
 * llamada servidor a servidor— y se redirige a esa URL temporal, que no
 * contiene la clave.
 */
export async function servePlacePhoto(req, res) {
  const apiKey = String(process.env.GOOGLE_PLACES_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(503).json({ message: 'GOOGLE_PLACES_API_KEY no está configurada' });
  }

  const photoName = String(req.params?.[0] || '').trim();
  // Solo aceptamos el formato que emite Google: evita que el proxy se convierta
  // en un redirector abierto hacia rutas arbitrarias.
  if (!PLACE_PHOTO_NAME_PATTERN.test(photoName)) {
    return res.status(400).json({ message: 'photoName inválido' });
  }

  const maxWidth = resolvePhotoMaxWidth(req.query?.w);

  try {
    const { data } = await axios.get(
      `https://places.googleapis.com/v1/${photoName}/media`,
      {
        params: { maxWidthPx: maxWidth, skipHttpRedirect: true },
        headers: { 'X-Goog-Api-Key': apiKey },
        timeout: 10_000,
      }
    );

    const photoUri = data?.photoUri;
    if (!photoUri) {
      return res.status(502).json({ message: 'Google no devolvió una URL de imagen' });
    }

    // La URL firmada caduca, así que la caché es corta: si fuera larga, el
    // navegador reutilizaría un enlace ya vencido y la imagen dejaría de cargar.
    res.set('Cache-Control', 'private, max-age=600');
    return res.redirect(302, photoUri);
  } catch (error) {
    const status = error?.response?.status === 404 ? 404 : 502;
    console.error('servePlacePhoto error:', error?.response?.data || error.message);
    return res.status(status).json({ message: 'No se pudo obtener la foto del lugar' });
  }
}
