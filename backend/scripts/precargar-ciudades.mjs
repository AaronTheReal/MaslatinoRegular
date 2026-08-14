#!/usr/bin/env node
/**
 * Precarga las 4 secciones de lugares de cada ciudad contra Google Places.
 *
 * Por qué hace falta: los documentos que hay en Mongo se escribieron con el
 * formato de fotos anterior, que guardaba la URL final con la clave de Google
 * dentro. El esquema actual (models/PlacePhotoSchema.js) guarda `photoName` y
 * construye la URL publica al leer, asi que esos documentos viejos llegan al
 * frontend con `photos: []` y las tarjetas salen sin imagen. Refrescar vuelve
 * a pedir los datos a Google y los guarda ya en el formato nuevo.
 *
 * Sin esto, la primera visita a cada ciudad dispara el refresco DENTRO de la
 * peticion (ver PlacesController.apiGetBestRestaurants): lenta y facturable
 * para ese visitante.
 *
 * ⚠️ Cada llamada consume cuota de pago de Google Places. Por defecto el script
 * no hace nada: hay que pasarle explicitamente que refrescar.
 *
 * Uso:
 *   node scripts/precargar-ciudades.mjs --token "<JWT>" --ciudad boston
 *   node scripts/precargar-ciudades.mjs --token "<JWT>" --ciudad boston --seccion restaurantes
 *   node scripts/precargar-ciudades.mjs --token "<JWT>" --todas
 *
 * El token sale de POST /admin/login con un usuario de rol editorial.
 * Tambien se puede pasar por entorno: MASLATINO_TOKEN=...
 *
 * Opciones:
 *   --base <url>      Raiz de la API (por defecto la de produccion)
 *   --pausa <ms>      Espera entre llamadas (por defecto 1500)
 *   --dry-run         Enumera lo que haria, sin llamar a nada
 */

const CIUDADES = [
  'atlanta', 'boston', 'dallas', 'filadelfia', 'houston', 'kansas-city',
  'los-angeles', 'miami', 'new-york', 'san-francisco', 'seattle',
];

const SECCIONES = ['restaurants', 'turismo', 'hangout', 'fanzone'];

// El endpoint de restaurantes se llama `restaurants`; el resto coincide con su
// nombre. Se acepta el alias en espanol para no obligar a recordarlo.
const ALIAS_SECCION = { restaurantes: 'restaurants', restaurants: 'restaurants' };

const DEFAULT_BASE = 'https://maslatinoregular.onrender.com/aaron/maslatino';

function parseArgs(argv) {
  const args = { pausa: 1500, base: DEFAULT_BASE, token: process.env.MASLATINO_TOKEN || '' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--token') args.token = next();
    else if (a === '--ciudad') args.ciudad = String(next() || '').toLowerCase().trim();
    else if (a === '--seccion') args.seccion = String(next() || '').toLowerCase().trim();
    else if (a === '--base') args.base = String(next() || '').replace(/\/+$/, '');
    else if (a === '--pausa') args.pausa = Number.parseInt(next(), 10) || 0;
    else if (a === '--todas') args.todas = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function refrescar({ base, token, seccion, ciudad, dryRun }) {
  const url = `${base}/${seccion}/refresh/${encodeURIComponent(ciudad)}`;
  if (dryRun) return { ok: true, detalle: `(dry-run) POST ${url}` };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const texto = await res.text();
    let cuerpo;
    try { cuerpo = JSON.parse(texto); } catch { cuerpo = { raw: texto.slice(0, 160) }; }

    if (!res.ok) return { ok: false, detalle: `HTTP ${res.status} ${cuerpo.message || cuerpo.raw || ''}` };
    return { ok: true, detalle: `${cuerpo.count ?? '?'} lugares` };
  } catch (e) {
    return { ok: false, detalle: e.message };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || (!args.ciudad && !args.todas)) {
    console.log(`
Precarga de las secciones de lugares del modulo Cities.

  --token <JWT>       Sesion editorial (o variable MASLATINO_TOKEN)
  --ciudad <slug>     Una ciudad: ${CIUDADES.join(', ')}
  --todas             Las 11 ciudades (44 llamadas facturables)
  --seccion <nombre>  Solo una: restaurantes, turismo, hangout, fanzone
  --base <url>        Raiz de la API (por defecto produccion)
  --pausa <ms>        Espera entre llamadas (por defecto 1500)
  --dry-run           Enumera sin llamar

Empieza por una ciudad y comprueba el resultado antes de lanzar el resto.
`);
    process.exit(args.help ? 0 : 1);
  }

  if (!args.token && !args.dryRun) {
    console.error('Falta --token (o MASLATINO_TOKEN). Los endpoints de refresco exigen rol editorial.');
    process.exit(1);
  }

  const ciudades = args.todas ? CIUDADES : [args.ciudad];
  const desconocida = ciudades.find((c) => !CIUDADES.includes(c));
  if (desconocida) {
    console.error(`Ciudad no soportada: ${desconocida}\nDisponibles: ${CIUDADES.join(', ')}`);
    process.exit(1);
  }

  let secciones = SECCIONES;
  if (args.seccion) {
    const normalizada = ALIAS_SECCION[args.seccion] || args.seccion;
    if (!SECCIONES.includes(normalizada)) {
      console.error(`Seccion no soportada: ${args.seccion}\nDisponibles: restaurantes, turismo, hangout, fanzone`);
      process.exit(1);
    }
    secciones = [normalizada];
  }

  const total = ciudades.length * secciones.length;
  console.log(`Refrescando ${total} combinacion(es) contra ${args.base}`);
  if (!args.dryRun) console.log('⚠️  Cada una consume cuota de pago de Google Places.\n');

  let ok = 0;
  let fallos = 0;

  for (const ciudad of ciudades) {
    for (const seccion of secciones) {
      const etiqueta = `${ciudad}/${seccion}`.padEnd(28);
      const r = await refrescar({ ...args, ciudad, seccion });
      if (r.ok) { ok += 1; console.log(`  ✔ ${etiqueta} ${r.detalle}`); }
      else { fallos += 1; console.log(`  ✘ ${etiqueta} ${r.detalle}`); }

      if (args.pausa) await dormir(args.pausa);
    }
  }

  console.log(`\nHecho: ${ok} correcta(s), ${fallos} con error.`);
  if (fallos) process.exitCode = 1;
}

main();
