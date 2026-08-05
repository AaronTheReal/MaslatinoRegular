# PORTING BRIEF — Módulo Cities

> **Este es el archivo que debe leer primero el agente del proyecto destino.**
> Prompt sugerido: *"Lee `cities-module-port/PORTING-BRIEF.md` y ejecútalo."*

---

## 0. Qué tienes delante

Un paquete autocontenido para trasplantar el módulo **Cities** de MasLatino Network a otro proyecto.

```
cities-module-port/
├── PORTING-BRIEF.md    ← este archivo: qué hacer y en qué orden
├── SPEC-CITIES.md      ← cómo funciona el módulo (arquitectura, componentes, datos, bugs conocidos)
├── API-CONTRACTS.md    ← los 12 endpoints con payloads REALES capturados de producción
├── code/               ← el código fuente tal cual, fuente de verdad del detalle
│   ├── frontend/app/{pages/cities, pages/restaurantes, services}
│   └── backend/{api, services, models, data}
└── assets/ASSETS.md    ← inventario de imágenes + comandos para copiarlas (los binarios NO van aquí)
```

**Reparto de responsabilidades**: la spec dice *por qué*; el código dice *cómo exactamente*; los contratos dicen *qué entra y qué sale*. Ante una discrepancia entre spec y código, **gana el código**.

**Stack destino asumido**: Angular 20 (standalone + signals) + Tailwind 3.x en el front, Express + Mongoose (ESM) en el back. Es el mismo stack de origen, así que casi todo el código se copia sin tocar.

---

## 1. Qué es el módulo, en un párrafo

Dos pantallas encadenadas. `/cities` es una rejilla estática de 11 ciudades de EE. UU. que enlaza a `/restaurantes/:ciudad`. Esa segunda pantalla, pese al nombre, **no es una página de restaurantes**: es el hub de la ciudad, con clima en vivo (Open-Meteo) y un carrusel de cinco secciones — Events, Hang out, Fan Zone, Tourism, Restaurants. Las cuatro secciones de lugares se alimentan de **Google Places API** cacheada en MongoDB; Events sale de un dataset estático de partidos del Mundial 2026.

Detalle completo en [`SPEC-CITIES.md`](./SPEC-CITIES.md).

---

## 2. Orden de trabajo

Sigue estas cinco fases. Cada una es verificable por separado; no pases a la siguiente sin comprobar la anterior.

### Fase 1 — Backend (empieza aquí)

El frontend no sirve de nada sin API. Además el backend es lo más independiente del proyecto.

1. **Copia** de `code/backend/` a tu proyecto:
   - `api/` → `PlacesController.js`, `PlacesExtraController.js`, `WeatherController.js`, `EventosController.js`
   - `services/` → `GooglePlacesService.js`, `WeatherService.js`
   - `models/` → `BestRestaurants.js`, `BestTurismo.js`, `BestHangout.js`, `BestFanzone.js`
   - `data/` → `fanFestZones.js`, `worldCup2026Matches.js`

2. **Ajusta los imports.** El código asume esta disposición relativa:
   ```
   api/XController.js  →  import ... from '../services/…'  '../models/…'  '../data/…'
   services/GooglePlacesService.js → import ... from '../models/…'
   ```
   Si tu proyecto usa otra estructura (`src/controllers`, `src/routes`…), corrige las rutas relativas.

3. **Registra las rutas.** El orden importa: las estáticas **antes** que las dinámicas, o Express tratará `cities` y `refresh` como nombres de ciudad. Copia este bloque tal cual desde `MainRoute.js`:
   ```js
   router.route('/restaurants/cities').get(PlacesController.apiGetAvailableCities);
   router.route('/restaurants/refresh-all').post(PlacesController.apiRefreshAllCities);
   router.route('/restaurants/refresh/:city').post(PlacesController.apiRefreshRestaurants);
   router.route('/restaurants/:city').get(PlacesController.apiGetBestRestaurants);

   router.route('/weather/:city').get(WeatherController.apiGetWeather);

   router.route('/turismo/refresh/:city').post(PlacesExtraController.apiRefreshTurismo);
   router.route('/turismo/:city').get(PlacesExtraController.apiGetTurismo);
   router.route('/hangout/refresh/:city').post(PlacesExtraController.apiRefreshHangout);
   router.route('/hangout/:city').get(PlacesExtraController.apiGetHangout);
   router.route('/fanzone/refresh/:city').post(PlacesExtraController.apiRefreshFanzone);
   router.route('/fanzone/:city').get(PlacesExtraController.apiGetFanzone);

   router.route('/eventos/:city').get(EventosController.apiGetEventosByCity);
   ```

4. **Dependencias**: `express`, `mongoose`, `axios`, `cors`, `dotenv`. Nada más. Si tu backend ya las tiene, no instales nada.

5. **Variables de entorno**: `GOOGLE_PLACES_API_KEY` (obligatoria para las 4 secciones de Places) y `DB_URL` (Mongo). Open-Meteo no necesita credenciales.

6. **Prefijo**: en el origen todo cuelga de `/aaron/maslatinoNetwork`. Elige tu propio prefijo y anótalo — el frontend tendrá que apuntar ahí.

**✅ Verificación de la fase 1** — sin gastar cuota de Google:
```bash
curl "$BASE/eventos/boston"        # → 200 con 2 partidos, sin tocar Mongo ni Google
curl "$BASE/weather/boston"        # → 200 con temperatura en Fahrenheit
curl "$BASE/weather/no-existe"     # → 404 "Ciudad no soportada"
curl "$BASE/restaurants/cities"    # → 200, count: 0 con Mongo vacío
```
Si estos cuatro responden, el backend está bien montado. Los endpoints de Places necesitan además la key y **cuestan dinero en la primera llamada por ciudad** (ver §4).

---

### Fase 2 — Servicios del frontend

1. **Copia** los 6 archivos de `code/frontend/app/services/` a `src/app/services/`.

2. **🔧 Cambio obligatorio — no dejes la URL hardcodeada.** En el origen, los seis servicios tienen esto:
   ```ts
   private baseUrl = 'https://realnetworkmaslatino-teas.onrender.com/aaron/maslatinoNetwork/<recurso>';
   //private baseUrl = 'http://localhost:3000/aaron/maslatinoNetwork/<recurso>';
   ```
   Cambiar de entorno obliga a editar seis archivos a mano. Sustitúyelo por `environment.ts` o un `InjectionToken` con la base de tu API. **Esto no es opcional**: la URL apunta al backend de MasLatino y hay que cambiarla sí o sí.

3. **Opcional, recomendado**: `Place`, `PlacePhoto` y `CityPlacesResponse` están definidos idénticos en `turismo-service.ts`, `hangout-service.ts` y `fanzone-service.ts` (y con otros nombres en `places-service.ts`). Extráelos a un `models/place.model.ts` compartido. Solo fanzone añade algo propio: `FanFestZone` y el campo `fanFest?`.

4. Tu `app.config.ts` necesita `provideHttpClient()`. Si haces SSR, usa `withFetch()`.

---

### Fase 3 — Componentes

1. **Copia** de `code/frontend/app/pages/`:
   - `cities/` → `cities.ts`, `cities.html`, `cities.css` (vacío)
   - `restaurantes/` → el componente padre + toda la carpeta `partes/` (6 subcomponentes)

2. **Registra las rutas** en `app.routes.ts`:
   ```ts
   { path: 'cities', component: Cities },
   { path: 'restaurantes/:ciudad', component: Restaurantes },
   ```
   Si quieres cambiar el nombre de la ruta (`/restaurantes/:ciudad` describe mal lo que es — ver §5), hazlo aquí **y** en los 11 `[routerLink]` de `cities.html`.

3. **Decide el render mode.** En el origen, `app.routes.server.ts` manda todo a `RenderMode.Client` salvo `blog/:slug`. Las páginas de ciudad son CSR puro: **sin meta tags, sin OpenGraph, sin SEO**. Si en el destino el descubrimiento por ciudad importa, ponlas en `RenderMode.Server` y añade `Title`/`Meta` por ciudad. Es la mejora de mayor impacto del módulo.

4. **Tailwind es obligatorio.** Toda la UI son clases utility (`grid-cols-2 sm:grid-cols-3`, `rounded-[36px]`, `bg-[#9747FF]`…). Necesitas **Tailwind 3.x** configurado y el `content` de `tailwind.config.js` cubriendo las rutas nuevas. Sin Tailwind las páginas salen sin estilo. La tipografía es **Poppins** (Google Fonts, importada en `styles.css`).

5. **Añade el enlace de entrada** a `/cities` en tu navbar.

**✅ Verificación de la fase 3**: `/cities` muestra 11 tarjetas con imagen; al hacer clic navegas a `/restaurantes/boston`; se ve el hero, el titular "What's happening in BOSTON?" y las tres tarjetas de clima con datos; al pulsar una categoría se abre el carrusel con sus tarjetas.

---

### Fase 4 — Assets

Los binarios **no van en este paquete** (pesan 30 MB y duplicarlos en git no compensa). Comandos de copia e inventario exacto en [`assets/ASSETS.md`](./assets/ASSETS.md).

Resumen: `assets/cyties/` (11 PNG de ciudad, 28 MB) y `assets/iconospartes/` (13 iconos, 2 MB). Ambas rutas están **hardcodeadas** en el código, así que respeta los nombres — incluidos los cuatro que llevan espacio (`kansas city.png`).

**Optimízalas al copiarlas.** 28 MB para 11 fotos de hero es exagerado; `kansas city.png` pesa 8.4 MB y se carga con `priority`, bloqueando el LCP. Conviértelas a WebP/AVIF (~200 KB cada una) y aprovecha para renombrarlas sin espacios: `kansas-city.webp`. Si lo haces, actualiza `CITY_MAP` en `restaurantes.ts` y los 11 `style="background-image:…"` de `cities.html`.

---

### Fase 5 — Poblar los datos

Con Mongo vacío, la primera visita a cada ciudad dispara el auto-refresh contra Google Places **dentro de la petición**: respuesta lenta y con coste. Para evitar que lo pague el primer usuario, precarga:

```bash
curl -X POST "$BASE/restaurants/refresh-all"     # 11 ciudades, secuencial
curl -X POST "$BASE/turismo/refresh/boston"      # y así por ciudad y categoría
```

⚠️ Cada llamada consume cuota **de pago**. `refresh-all` son 11 llamadas seguidas. Empieza por una sola ciudad, comprueba el resultado, y solo entonces lanza el resto.

---

## 3. Errores que debes corregir al portar

Todos están diagnosticados en `SPEC-CITIES.md` §11. Estos tres no son opinión — arréglalos mientras copias, cuesta menos que después.

### 🔴 1. Restaurantes consulta la API con el nombre, no con el slug

`restaurantes.html` pasa solo `[city]` a `app-restaurantes-parte`, y ese componente llama a la API con `city().highlight` en minúsculas en vez del slug. Las otras cuatro secciones sí usan el slug. Resultado:

| Slug | Resto de secciones | Restaurantes |
|---|---|---|
| `kansas-city` | `/hangout/kansas-city` | `/restaurants/kansas%20city` |
| `filadelfia` | `/turismo/filadelfia` | `/restaurants/philadelphia` |

En la base de datos de producción esto ya ha creado claves incoherentes (`"new york"` y `"san francisco"` con espacio conviviendo con slugs con guion), y hace que `refresh-all` escriba en claves que el frontend nunca lee. La prueba empírica está en `API-CONTRACTS.md` §7.

**Arreglo** (dos líneas):
```html
<!-- restaurantes.html -->
<app-restaurantes-parte [city]="city()" [citySlug]="citySlug()"></app-restaurantes-parte>
```
```ts
// restaurantes-parte.ts — usa el slug, igual que parte-turismo/hangout/fanzone
citySlug = input<string>('');
constructor() {
  effect(() => { const slug = this.citySlug(); if (slug) this.loadRestaurants(slug); });
}
```
**Regla general: el slug es la clave única en URL, API, Mongo y Google. El nombre de display es solo para pintar.**

### 🔴 2. La API key de Google viaja al cliente

`GooglePlacesService.buildPhotoUrl()` incrusta `GOOGLE_PLACES_API_KEY` en la URL de cada foto, y esa URL se **guarda en Mongo** y se sirve al navegador. La key es pública en la API en vivo. Además, rotarla invalida todas las fotos guardadas.

**Arreglo**: guarda solo el `photoName` de Google y sirve la imagen por un endpoint proxy propio que añada la key en el servidor:
```
GET /photo/:photoName  →  302 hacia places.googleapis.com/v1/{photoName}/media?key=…
```
Así la key no sale nunca del backend y rotarla no rompe datos. Si decides no hacerlo, **restringe la key por HTTP referrer en la consola de GCP** — es imprescindible.

### 🟠 3. Los endpoints de refresco son públicos y cuestan dinero

`POST /restaurants/refresh-all` no pide autenticación y dispara 11 llamadas de pago a Google. Ponles autenticación, o quítalos de la API pública y conviértelos en un script/cron.

---

## 4. Decisiones que hay que tomar (no las tomes sin preguntar)

| Decisión | Estado en el origen | Recomendación |
|---|---|---|
| **Nombre de la ruta** | `/restaurantes/:ciudad` para una página que no es de restaurantes | Renombrar a `/cities/:ciudad` o `/city/:slug` |
| **Idioma** | UI en inglés; datos, errores y `languageCode: 'es'` de Google en español | Unificar. Si la UI es en inglés, `languageCode: 'en'` |
| **SSR** | CSR puro, sin SEO en páginas de ciudad | SSR + meta tags por ciudad |
| **Las 11 ciudades** | Hardcodeadas en 4 sitios + 11 enlaces en el HTML | Una sola fuente de verdad (constante compartida o colección en Mongo) |
| **Frescura de los datos** | Nunca caducan; `lastUpdated` se escribe pero no se lee | TTL (p. ej. 30 días) o cron de refresco |
| **Mundial 2026** | Solo fase eliminatoria, textos en español | Completar la fase de grupos o quitar la sección |
| **`fanFest`** | Solo 4 de 11 ciudades tienen sede confirmada | Confirmar las restantes o asumir el `null` |

---

## 5. Qué **no** copiar

- **`.spec.ts`**: van incluidos por completitud, pero son los stubs autogenerados de Angular CLI (`should create`). No aportan cobertura real; bórralos o escribe tests de verdad.
- **`cities.css`**: está vacío.
- **La allowlist de CORS** de `backend/index.js`: es específica de los dominios de MasLatino (Netlify, Render, maslatinonetwork.com). Pon los tuyos.
- **El resto del backend de origen**: el módulo **no usa** `socket.io`, `multer`, `bcrypt`, `jsonwebtoken`, `cheerio`, `marked`, `exceljs`, `pdfkit` ni `@mux/mux-node`, aunque estén en su `package.json`.
- **El resto del frontend de origen**: el módulo **no usa** `swiper`, `@angular/cdk` ni `@angular/forms`.
- **La configuración de Netlify**: `netlify.toml` es específica del despliegue de origen. Si aun así despliegas Angular SSR en Netlify, quédate con esta regla y nada más: **nunca añadas un fallback SPA** (`/* /index.html 200`) en `netlify.toml` ni en `public/_redirects` — intercepta todas las peticiones antes de la Edge Function y mata el SSR.

---

## 6. Checklist final

```
Backend
  [ ] 4 controllers + 2 services + 4 models + 2 data copiados, imports ajustados
  [ ] 12 rutas registradas, estáticas antes que dinámicas
  [ ] GOOGLE_PLACES_API_KEY y DB_URL en el entorno
  [ ] curl /eventos/boston y /weather/boston responden 200
  [ ] endpoints refresh protegidos o retirados

Frontend
  [ ] 6 servicios copiados y baseUrl movida a environment
  [ ] cities/ + restaurantes/ (con partes/) copiados
  [ ] rutas /cities y /restaurantes/:ciudad registradas
  [ ] render mode decidido (Client vs Server + meta tags)
  [ ] Tailwind 3.x activo y cubriendo las rutas nuevas; fuente Poppins
  [ ] enlace a /cities en el navbar
  [ ] assets/cyties/ y assets/iconospartes/ copiados (optimizados)

Correcciones
  [ ] restaurantes-parte consulta por citySlug, no por highlight
  [ ] API key de Google fuera de las URLs de foto guardadas
  [ ] endpoints de refresco con autenticación

Verificación end-to-end
  [ ] /cities pinta 11 tarjetas y navega correctamente
  [ ] /restaurantes/boston muestra hero + clima + las 5 secciones con datos
  [ ] el toggle °C/°F convierte sin volver a llamar a la API
  [ ] la sección Fan Zone muestra el bloque fanFest en Boston
  [ ] un slug inválido no rompe la página (decide: 404 o redirect a /cities)
```
