import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPlacePhotoUrl,
  PLACE_PHOTO_NAME_PATTERN,
  resolvePhotoMaxWidth,
  servePlacePhoto,
  toPublicPhotos,
  toPublicPlaces,
} from '../utils/place-photos.js';
import GooglePlacesService from '../services/GooglePlacesService.js';
import WeatherService from '../services/WeatherService.js';
import WORLD_CUP_2026_MATCHES from '../data/worldCup2026Matches.js';
import FAN_FEST_ZONES from '../data/fanFestZones.js';

const API_KEY = 'clave-secreta-que-no-debe-filtrarse';

function fakeRequest(overrides = {}) {
  return {
    baseUrl: '/aaron/maslatino',
    protocol: 'http',
    headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'api.maslatino.com' },
    get: (header) => (header.toLowerCase() === 'host' ? 'interno:3000' : undefined),
    params: {},
    query: {},
    ...overrides,
  };
}

function fakeResponse() {
  return {
    statusCode: 0,
    body: undefined,
    headers: {},
    redirectedTo: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    set(key, value) { this.headers[key] = value; return this; },
    redirect(code, url) { this.statusCode = code; this.redirectedTo = url; return this; },
  };
}

test('la URL pública de la foto apunta al proxy propio y respeta el proxy inverso', () => {
  const url = buildPlacePhotoUrl(fakeRequest(), 'places/ABC123/photos/XYZ789');

  // Render termina TLS por delante: sin leer las cabeceras reenviadas saldria http.
  assert.equal(
    url,
    'https://api.maslatino.com/aaron/maslatino/places/photo/places/ABC123/photos/XYZ789'
  );
});

test('las fotos servidas nunca incluyen la credencial de Google', () => {
  const photos = toPublicPhotos(fakeRequest(), [
    { photoName: 'places/ABC/photos/UNO', authorName: 'Ana', authorUri: 'https://x.test' },
    { photoName: '', authorName: 'sin referencia' },
  ]);

  assert.equal(photos.length, 1, 'las fotos sin photoName se descartan');
  assert.equal(photos[0].authorName, 'Ana');
  assert.equal(photos[0].url.includes('key='), false);
  assert.equal(photos[0].url.includes(API_KEY), false);
  assert.equal(photos[0].url.includes('places.googleapis.com'), false);
});

test('toPublicPlaces conserva el resto de campos del lugar', () => {
  const places = toPublicPlaces(fakeRequest(), [
    {
      placeId: 'p1',
      name: 'Café Central',
      rating: 4.5,
      googleMapsUri: 'https://maps.test/p1',
      photos: [{ photoName: 'places/ABC/photos/UNO' }],
    },
  ]);

  assert.equal(places[0].name, 'Café Central');
  assert.equal(places[0].rating, 4.5);
  assert.equal(places[0].photos.length, 1);
  assert.match(places[0].photos[0].url, /\/places\/photo\//u);
});

test('el servicio guarda la referencia de la foto, no una URL con la clave', () => {
  const stored = GooglePlacesService.toStoredPhoto({
    name: 'places/ABC/photos/UNO',
    authorAttributions: [{ displayName: 'Ana', uri: 'https://x.test' }],
  });

  assert.deepEqual(stored, {
    photoName: 'places/ABC/photos/UNO',
    authorName: 'Ana',
    authorUri: 'https://x.test',
  });
  assert.equal(JSON.stringify(stored).includes('key='), false);
});

test('el proxy de fotos rechaza rutas que no son de Google', async () => {
  const previous = process.env.GOOGLE_PLACES_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = API_KEY;

  try {
    for (const malicioso of [
      '../../etc/passwd',
      'https://evil.test/imagen.png',
      'places/ABC/photos/UNO/extra',
      'otra-cosa',
    ]) {
      const res = fakeResponse();
      await servePlacePhoto(
        fakeRequest({ params: { 0: malicioso } }),
        res
      );
      assert.equal(res.statusCode, 400, `deberia rechazar: ${malicioso}`);
    }

    assert.equal(PLACE_PHOTO_NAME_PATTERN.test('places/ABC123/photos/XYZ_789-abc'), true);
  } finally {
    process.env.GOOGLE_PLACES_API_KEY = previous;
  }
});

test('sin credencial configurada el proxy responde 503 y no revela nada', async () => {
  const previous = process.env.GOOGLE_PLACES_API_KEY;
  delete process.env.GOOGLE_PLACES_API_KEY;

  try {
    const res = fakeResponse();
    await servePlacePhoto(
      fakeRequest({ params: { 0: 'places/ABC/photos/UNO' } }),
      res
    );
    assert.equal(res.statusCode, 503);
    assert.equal(res.redirectedTo, undefined);
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = previous;
  }
});

test('el ancho de la foto se acota para no pedir imágenes desmedidas', () => {
  assert.equal(resolvePhotoMaxWidth(undefined), 800);
  assert.equal(resolvePhotoMaxWidth('400'), 400);
  assert.equal(resolvePhotoMaxWidth('99999'), 1600);
  assert.equal(resolvePhotoMaxWidth('-5'), 800);
  assert.equal(resolvePhotoMaxWidth('abc'), 800);
});

test('los slugs de ciudad son coherentes entre clima, Places y partidos', () => {
  const weatherCities = WeatherService.getSupportedCities();

  assert.equal(weatherCities.length, 11);
  for (const slug of weatherCities) {
    assert.match(slug, /^[a-z-]+$/u, `slug con formato inesperado: ${slug}`);
    // El slug debe traducirse a un nombre de búsqueda distinto del propio slug
    // cuando lleva guion, o Google buscaria "kansas-city" en vez de "Kansas City".
    const cityName = GooglePlacesService.slugToCityName(slug);
    assert.equal(cityName.includes('-'), false, `slug sin traducir: ${slug}`);
  }

  // Toda ciudad con partidos o con fan fest debe existir en la lista soportada.
  for (const match of WORLD_CUP_2026_MATCHES) {
    assert.ok(
      weatherCities.includes(match.citySlug),
      `partido en ciudad no soportada: ${match.citySlug}`
    );
  }
  for (const slug of Object.keys(FAN_FEST_ZONES)) {
    assert.ok(weatherCities.includes(slug), `fan fest en ciudad no soportada: ${slug}`);
  }
});

test('una respuesta de Google acaba en una foto que el navegador puede pedir', () => {
  // Camino completo: lo que devuelve Google -> lo que se guarda en Mongo ->
  // lo que recibe el frontend. Se escribió al investigar por qué Boston salía
  // sin fotos: sirve para separar un fallo de código de unos datos viejos.
  const respuestaDeGoogle = {
    id: 'ChIJ-3vNbw1644kRQUMVs5yqVL4',
    displayName: { text: 'The Salty Pig' },
    formattedAddress: '130 Dartmouth St, Boston, MA 02116',
    rating: 4.5,
    photos: [
      {
        name: 'places/ChIJ-3vNbw1644kRQUMVs5yqVL4/photos/AeJbb3d_FOTO',
        authorAttributions: [{ displayName: 'Ana', uri: 'https://x.test' }],
      },
    ],
  };

  const guardado = respuestaDeGoogle.photos.map((p) => GooglePlacesService.toStoredPhoto(p));
  assert.equal(guardado[0].photoName, 'places/ChIJ-3vNbw1644kRQUMVs5yqVL4/photos/AeJbb3d_FOTO');

  const [publico] = toPublicPlaces(fakeRequest(), [
    { placeId: respuestaDeGoogle.id, name: 'The Salty Pig', photos: guardado },
  ]);

  assert.equal(publico.photos.length, 1, 'la foto tiene que sobrevivir al viaje');
  assert.equal(
    publico.photos[0].url,
    'https://api.maslatino.com/aaron/maslatino/places/photo/places/ChIJ-3vNbw1644kRQUMVs5yqVL4/photos/AeJbb3d_FOTO'
  );
  // La ruta resultante tiene que pasar el filtro del propio proxy.
  const ruta = publico.photos[0].url.split('/places/photo/')[1];
  assert.equal(PLACE_PHOTO_NAME_PATTERN.test(ruta), true);
});

test('un documento con el formato de fotos anterior llega vacío al frontend', () => {
  // Los documentos escritos antes del porte guardaban la URL final con la
  // clave dentro, sin `photoName`. Es lo que hay hoy en Boston: 20
  // restaurantes y ninguna foto. No es un fallo, y no se puede rescatar sin
  // volver a publicar la credencial: hay que refrescar contra Google.
  const documentoViejo = {
    placeId: 'ChIJ-3vNbw1644kRQUMVs5yqVL4',
    name: 'The Salty Pig',
    photos: [{ url: 'https://maps.googleapis.com/...&key=CLAVE_FILTRADA' }],
  };

  const [publico] = toPublicPlaces(fakeRequest(), [documentoViejo]);

  assert.deepEqual(publico.photos, [], 'sin photoName no hay foto que servir');
  assert.equal(JSON.stringify(publico).includes('key='), false);
});

test('un documento con más de un día se vuelve a pedir a Google', () => {
  // Los `photoName` de Google caducan: Nueva York, guardada el 14-ago, ya
  // respondía 400 en todas sus fotos el 28-sep.
  const ahora = Date.parse('2026-09-28T12:00:00Z');
  const conLugares = (lastUpdated) => ({ lastUpdated, restaurants: [{ placeId: 'p1' }] });

  assert.equal(GooglePlacesService.needsRefresh(null, 'restaurants', ahora), true);
  assert.equal(GooglePlacesService.needsRefresh({ restaurants: [] }, 'restaurants', ahora), true);
  assert.equal(
    GooglePlacesService.needsRefresh(conLugares('2026-09-28T02:00:00Z'), 'restaurants', ahora),
    false,
    'lo de hoy se sirve tal cual'
  );
  assert.equal(
    GooglePlacesService.needsRefresh(conLugares('2026-08-14T18:57:56Z'), 'restaurants', ahora),
    true
  );
  assert.equal(GooglePlacesService.needsRefresh({ places: [{}] }, 'places', ahora), true);
});

test('si Google falla se sirven los datos viejos en vez de un error', async () => {
  const viejo = { lastUpdated: '2026-06-25T16:03:52Z', restaurants: [{ placeId: 'p1' }] };
  const falla = async () => { throw new Error('cuota agotada'); };

  const servido = await GooglePlacesService.ensureFresh(viejo, 'restaurants', 'test:viejo', falla);
  assert.equal(servido, viejo);

  await assert.rejects(
    GooglePlacesService.ensureFresh(null, 'restaurants', 'test:vacio', falla),
    /cuota agotada/u,
    'sin nada guardado no hay a qué volver'
  );
});

test('peticiones simultáneas sobre un documento viejo comparten un solo refresco', async () => {
  let llamadas = 0;
  const nuevo = { lastUpdated: new Date(), restaurants: [{ placeId: 'p1' }] };
  const refresh = async () => { llamadas += 1; return nuevo; };

  const [a, b] = await Promise.all([
    GooglePlacesService.ensureFresh(null, 'restaurants', 'test:simultaneo', refresh),
    GooglePlacesService.ensureFresh(null, 'restaurants', 'test:simultaneo', refresh),
  ]);

  assert.equal(llamadas, 1);
  assert.equal(a, nuevo);
  assert.equal(b, nuevo);
});
