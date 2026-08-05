# Módulo Cities — Especificación técnica completa

> Documento de referencia del módulo **Cities** de MasLatino Network
> (`https://maslatinonetwork.com/cities` → `https://maslatinonetwork.com/restaurantes/:ciudad`).
> Cubre navegación, componentes, servicios, APIs, integraciones externas, datos y despliegue.
> Fecha de extracción: 2026-08-05. Rama origen: `master`.

---

## 1. Qué es el módulo

Cities es el **hub geográfico** del sitio. Son dos pantallas encadenadas:

1. **`/cities`** — Rejilla estática de 11 ciudades de EE. UU. Es solo navegación: no hace ninguna llamada HTTP.
2. **`/restaurantes/:ciudad`** — La página real de ciudad. Pese al nombre de la ruta, **no es una página de restaurantes**: es un hub con clima en vivo y cinco secciones de contenido (Events, Hang out, Fan Zone, Tourism, Restaurants). Restaurantes es solo la sección por defecto.

El contenido de las secciones sale de **Google Places API** (cacheado en MongoDB), el clima de **Open-Meteo**, y los partidos del Mundial 2026 de un **dataset estático** en el backend.

### Diagrama de flujo

```
Navbar "Cities"
      │
      ▼
  /cities  ──── 11 tarjetas (RouterLink) ────► /restaurantes/:ciudad
 (estático)                                         │
                                                    ├─► GET /weather/:slug            → Open-Meteo
                                                    │
                                                    └─► selector de secciones (app-partes)
                                                          ├─ eventos     → GET /eventos/:slug     → dataset estático
                                                          ├─ hangout     → GET /hangout/:slug     → Google Places (bar)
                                                          ├─ fanzone     → GET /fanzone/:slug     → Google Places (bar) + fanFestZones
                                                          ├─ turismo     → GET /turismo/:slug     → Google Places (tourist_attraction)
                                                          └─ restaurantes→ GET /restaurants/:name → Google Places (restaurant)
```

---

## 2. Rutas

### Frontend (Angular Router)

| Ruta | Componente | Archivo | Notas |
|---|---|---|---|
| `/cities` | `Cities` | `app.routes.ts:42` | Sin parámetros |
| `/restaurantes/:ciudad` | `Restaurantes` | `app.routes.ts:41` | `:ciudad` = slug |

Ambas se declaran en `frontend/src/app/app.routes.ts` (rutas eager, no lazy).

### Puntos de entrada

- **Navbar desktop**: `navbar.component.html:32` → `routerLink="/cities"`
- **Navbar móvil**: `navbar.component.html:60` → `routerLink="/cities"`
- No hay enlaces entrantes a `/restaurantes/:ciudad` fuera de `/cities`.

### Render mode (SSR)

`frontend/src/app/app.routes.server.ts`:

```ts
{ path: 'blog/:slug', renderMode: RenderMode.Server },  // única ruta con SSR real
{ path: '**',         renderMode: RenderMode.Client },  // todo lo demás = CSR
```

**`/cities` y `/restaurantes/:ciudad` se sirven como SPA (Client).** El servidor devuelve el shell y Angular renderiza en el navegador. Consecuencias:

- No hay meta tags / OpenGraph por ciudad. Las páginas de ciudad **no tienen SEO ni preview social**.
- Ninguna llamada a la API ocurre en el servidor: todo el fetching es del navegador.
- El comentario del archivo lo dice explícitamente: SSR solo para noticias, el resto sin riesgo.

---

## 3. Las 11 ciudades

Los slugs son la clave que atraviesa **todo** el sistema (URL → CITY_MAP → API → Mongo → Google query → coordenadas).

| Slug (URL) | `name` / `highlight` (UI) | Query a Google | Coordenadas (clima) | Imagen |
|---|---|---|---|---|
| `atlanta` | ATLANTA | Atlanta | 33.7490, -84.3880 | `atlanta.png` |
| `boston` | BOSTON | Boston | 42.3601, -71.0589 | `boston.png` |
| `dallas` | DALLAS | Dallas | 32.7767, -96.7970 | `dallas.png` |
| `filadelfia` | **PHILADELPHIA** | **Philadelphia** | 39.9526, -75.1652 | `filadelfia.png` |
| `houston` | HOUSTON | Houston | 29.7604, -95.3698 | `houston.png` |
| `kansas-city` | KANSAS CITY | Kansas City | 39.0997, -94.5786 | `kansas city.png` |
| `los-angeles` | LOS ANGELES | Los Angeles | 34.0522, -118.2437 | `los angeles.png` |
| `miami` | MIAMI | Miami | 25.7617, -80.1918 | `miami.png` |
| `new-york` | NEW YORK | New York | 40.7128, -74.0060 | `new york.png` |
| `san-francisco` | SAN FRANCISCO | San Francisco | 37.7749, -122.4194 | `san francisco.png` |
| `seattle` | SEATTLE | Seattle | 47.6062, -122.3321 | `seattle.png` |

**Ojo con dos casos:**
- `filadelfia` es el único slug en español; su display y su query son *Philadelphia*.
- Varios nombres de imagen **contienen espacios** (`kansas city.png`) y se referencian URL-encodeados (`kansas%20city.png`) tanto en `cities.html` como en `CITY_MAP`.

La lista se repite en **cuatro sitios** que deben mantenerse sincronizados:
1. `CITY_MAP` en `restaurantes.ts:27`
2. `SUPPORTED_CITIES` en `PlacesController.js:6`
3. `SLUG_TO_QUERY` en `GooglePlacesService.js:9`
4. `CITY_COORDINATES` en `WeatherService.js:5`

(Y de forma implícita, los 11 `<a>` hardcodeados de `cities.html`.)

---

## 4. Página `/cities`

**Archivos**: `pages/cities/cities.ts` (12 líneas), `cities.html` (87), `cities.css` (**vacío**).

```ts
@Component({ selector: 'app-cities', imports: [RouterLink], ... })
export class Cities {}   // cuerpo vacío: cero lógica
```

- **Sin estado, sin servicios, sin HTTP.** Es una plantilla estática.
- 100 % Tailwind, sin CSS propio.
- Título: `¿WHAT'S YOUR NEXT / STOP?`
- Layout en pirámide: rejilla de 9 ciudades (`grid-cols-1 / sm:2 / lg:3`) + fila final centrada con **San Francisco y Seattle**.
- Cada tarjeta: `<a [routerLink]="['/restaurantes', '<slug>']">` con `aspect-[1.72/1]`, `rounded-3xl`, imagen de fondo por `style="background-image: url(...)"`, degradado oscuro superpuesto y el nombre abajo a la izquierda.
- Los 11 enlaces están **hardcodeados uno por uno** en el HTML (no hay `@for` sobre un array).

---

## 5. Página `/restaurantes/:ciudad`

**Archivos**: `pages/restaurantes/restaurantes.ts` (188), `restaurantes.html` (235), `restaurantes.css` (29, solo dos animaciones `carousel-fade` y `carousel-pop`).

### 5.1 Estado (Angular signals)

| Signal / computed | Tipo | Origen |
|---|---|---|
| `city` | `CityInfo` | `route.paramMap` → `CITY_MAP[slug]` ?? `DEFAULT_CITY` |
| `citySlug` | `string` | `route.paramMap` (minúsculas) |
| `weather` | `WeatherData \| null` | `WeatherService.getWeather(slug)` |
| `weatherLoading` / `weatherError` | `boolean` / `string \| null` | estados de carga |
| `weatherIcon` | `string` | computed: `WEATHER_ICONS[condition]` |
| `selectedSection` | `SectionKey` | por defecto `'restaurantes'` |
| `carouselMode` | `boolean` | por defecto `false` |
| `temperatureUnit` | `'C' \| 'F'` | por defecto `'F'` |
| `displayTemperature` / `displayFeelsLike` | `number \| null` | computed con conversión local |
| `activeSectionColor` | `string` | computed: `SECTION_COLORS[selectedSection]` |

`DEFAULT_CITY = { name: 'YOUR CITY', image: '', highlight: 'YOUR CITY' }` — es el fallback para un slug desconocido. La página **no devuelve 404**: renderiza "What's happening in YOUR CITY?" sin imagen y sin datos (el `effect` del clima no dispara porque el slug no está en `CITY_MAP`, y las secciones sí disparan con un slug inválido → error de carga).

### 5.2 Carga del clima

```ts
effect(() => {
  const slug = this.citySlug();
  if (slug && CITY_MAP[slug]) this.loadWeather(slug);
});
```

El backend **siempre devuelve Fahrenheit**. La conversión a Celsius es local, sin volver a llamar a la API:

```ts
this.temperatureUnit() === 'F' ? Math.round(f) : Math.round((f - 32) * 5 / 9)
```

Unidad por defecto `'F'` (ciudades de EE. UU.). El toggle `°C | °F` aparece dos veces (temperatura y sensación térmica) y ambos escriben el mismo signal.

### 5.3 Estructura visual

1. **Hero de ciudad** — imagen `assets/cyties/<ciudad>.png` a pantalla completa (`h-[340px]` → `xl:h-[700px]`), con `NgOptimizedImage` (`fill priority`) y degradado blanco de abajo hacia arriba.
2. **Titular** — `What's happening in <CIUDAD>?` con la ciudad en morado `#9333EA`, superpuesto al hero con margen negativo (`-mt-24` → `lg:-mt-48`).
3. **Tres tarjetas de clima** — WEATHER (icono + temp + toggle), FEELS LIKE (termómetro + temp + toggle), CHANCE OF RAIN (gota + %). Placeholder `--` mientras no hay datos.
4. **Selector de secciones** (`app-partes`) o **carrusel**, según `carouselMode()`.

### 5.4 Selector de secciones — `app-partes`

`pages/restaurantes/partes/partes.ts` + `partes.html` (61 líneas).

| id (`SectionKey`) | Título | Subtítulo | Color | Icono |
|---|---|---|---|---|
| `eventos` | Events | For entertainment | `#fe0900` | `eventos.webp` |
| `hangout` | Hang out | To pass the time | `#b121fe` | `hangout.webp` |
| `fanzone` | Fan Zone | Live the experience | `#00cf82` | `fanzone.webp` |
| `turismo` | Tourism | Tour the city | `#fdb700` | `turismo.webp` |
| `restaurantes` | The best restaurants | To eat | `#9747FF` * | `restaurantes.webp` |

\* `SECTION_COLORS.restaurantes = '#9747FF'` en `restaurantes.ts`, pero `foodCategory.bg = 'bg-[#b121fe]'` en `partes.ts` — **los dos valores no coinciden**. El morado del hero de la sección es `#9747FF`; el de la tarjeta del selector es `#b121fe`.

API del componente: `selectedSection = input<SectionKey>()`, `sectionSelected = output<SectionKey>()`. Las 4 primeras categorías van en un array; `restaurantes` es una propiedad aparte (`foodCategory`) porque se maqueta como tarjeta ancha destacada.

### 5.5 Modo carrusel

Al hacer clic en una categoría: `onSectionSelected()` fija la sección y pone `carouselMode = true`. El selector desaparece y se muestra:

- **Flechas fijas** izquierda/derecha (`position: fixed`, centradas verticalmente) → `prevSection()` / `nextSection()`, cíclicas sobre
  `SECTION_ORDER = ['eventos', 'hangout', 'fanzone', 'turismo', 'restaurantes']`.
- **Contenido** en un `@switch (selectedSection())` que monta el componente `parte-*` correspondiente, envuelto en `.carousel-fade`.
- **Dots** abajo (uno por sección, el activo se agranda y toma `colorFor(section)`) + **botón de cerrar** con borde del color activo → `closeCarousel()`.

**Paso de datos a las partes** (nota importante):

```html
<app-parte-eventos      [city]="city()" [citySlug]="citySlug()">
<app-parte-hangout      [city]="city()" [citySlug]="citySlug()">
<app-parte-fanzone      [city]="city()" [citySlug]="citySlug()">
<app-parte-turismo      [city]="city()" [citySlug]="citySlug()">
<app-restaurantes-parte [city]="city()">          <!-- ⚠️ sin citySlug -->
```

`restaurantes-parte` es el único que **no recibe el slug** y consulta la API con `city().highlight`. Ver §8.1.

---

## 6. Las cinco secciones (`parte-*`)

Las cinco comparten exactamente el mismo patrón:

```ts
export class Parte<X> {
  private service = inject(<X>Service);
  city     = input<CityInfo>(DEFAULT_CITY);
  citySlug = input<string>('');
  places   = signal<Place[]>([]);   // o matches / restaurants
  loading  = signal<boolean>(true);
  error    = signal<string | null>(null);

  constructor() {
    effect(() => { const slug = this.citySlug(); if (slug) this.load(slug); });
  }
}
```

Cada uno redefine su propia constante local `DEFAULT_CITY` (duplicada 5 veces) e importa el tipo `CityInfo` desde `../../restaurantes`, lo que crea un **acoplamiento hijo → padre**.

| Componente | Servicio | Endpoint | Campo de respuesta | Mensaje de error |
|---|---|---|---|---|
| `parte-eventos` | `EventosService` | `/eventos/:slug` | `matches` | "We could not load the World Cup matches right now." |
| `parte-hangout` | `HangoutService` | `/hangout/:slug` | `places` | "We could not load the hangout spots right now." |
| `parte-fanzone` | `FanzoneService` | `/fanzone/:slug` | `places` + `fanFest` | "We could not load the sports bars right now." |
| `parte-turismo` | `TurismoService` | `/turismo/:slug` | `places` | "We could not load the tourist attractions right now." |
| `restaurantes-parte` | `RestaurantsService` | `/restaurants/:name` | `restaurants` | "We could not load the restaurants right now." |

**Particularidades:**

- **`parte-eventos`** añade `formatDate(dateStr)` → `new Date(\`${dateStr}T00:00:00\`)` (fuerza hora local para evitar el corrimiento de un día por UTC) y formatea en `en-US` como "1 July 2026".
- **`parte-fanzone`** guarda además `fanFest = signal<FanFestZone | null>()` con la zona oficial del FIFA Fan Festival, cuando la ciudad la tiene.
- **`restaurantes-parte`** dispara sobre `city()` (no sobre `citySlug()`) y condiciona con `if (currentCity.highlight !== 'YOUR CITY')`.

### Patrón de tarjeta (idéntico en las 4 secciones de Places)

Hero de sección con degradado de su color + icono, y rejilla `grid-cols-2 / sm:3 / lg:4` de `<article>`:
foto cuadrada (`photos[0].url`), nombre, dirección, `★ rating`, `priceLevel` con `.replace('PRICE_LEVEL_', '')`, y botón negro **"View on Maps"** → `googleMapsUri` en pestaña nueva.

Estados: `*ngIf="loading()"` → "Loading the best restaurants in {{ city().name }}…"; `*ngIf="error()"` → texto rojo centrado. **No hay estado vacío**: si la API responde `count: 0`, se pinta una rejilla vacía sin mensaje.

---

## 7. Servicios del frontend

Los seis viven en `frontend/src/app/services/` y son `@Injectable({ providedIn: 'root' })`.

```ts
private baseUrl = 'https://realnetworkmaslatino-teas.onrender.com/aaron/maslatinoNetwork/<recurso>';
//private baseUrl = 'http://localhost:3000/aaron/maslatinoNetwork/<recurso>';   ← comentada
```

⚠️ **La URL de producción está hardcodeada en cada servicio**, con la de localhost comentada al lado. No se usa `environment.ts`. Cambiar de entorno hoy significa editar seis archivos a mano.

| Servicio | Archivo | Métodos |
|---|---|---|
| `RestaurantsService` | `places-service.ts` | `getBestRestaurants(city)`, `getAvailableCities()`, `refreshRestaurants(city)`, `refreshAllCities()` |
| `WeatherService` | `weather-service.ts` | `getWeather(city)` + constantes `WEATHER_ICONS`, `WEATHER_FEELS_LIKE_ICON`, `WEATHER_PRECIPITATION_ICON` |
| `TurismoService` | `turismo-service.ts` | `getBestTurismo(city)` |
| `HangoutService` | `hangout-service.ts` | `getBestHangout(city)` |
| `FanzoneService` | `fanzone-service.ts` | `getBestFanzone(city)` |
| `EventosService` | `eventos-service.ts` | `getEventosByCity(city)` |

Todos aplican `city.toLowerCase().trim()` antes de construir la URL.

**Duplicación de tipos**: `Place`, `PlacePhoto` y `CityPlacesResponse` están definidos **por triplicado**, idénticos, en `turismo-service.ts`, `hangout-service.ts` y `fanzone-service.ts`; `places-service.ts` tiene los mismos campos bajo los nombres `Restaurant` / `RestaurantPhoto` / `CityRestaurantsResponse`. Solo `fanzone` añade algo propio (`FanFestZone`, `fanFest?`).

Solo `getBestRestaurants`, `refreshRestaurants`, `refreshAllCities` y `getAvailableCities` del servicio de restaurantes existen; **los métodos `refresh*` no se usan desde ninguna UI** (no hay panel de admin para ellos).

### Mapa de iconos del clima

```ts
WEATHER_ICONS = {
  soleado:                'assets/iconospartes/sol.svg',
  'parcialmente-nublado': 'assets/iconospartes/nube-sol.svg',
  nublado:                'assets/iconospartes/nube.svg',
  lluvia:                 'assets/iconospartes/lluvia.svg',
  tormenta:               'assets/iconospartes/tormenta.svg',
  nieve:                  'assets/iconospartes/nieve.svg',
};
WEATHER_FEELS_LIKE_ICON    = 'assets/iconospartes/termometro.svg';
WEATHER_PRECIPITATION_ICON = 'assets/iconospartes/gota.svg';
```

---

## 8. Backend

Express + Mongoose, ESM (`"type": "module"`). Todo se monta bajo el prefijo **`/aaron/maslatinoNetwork`** (`backend/index.js:54`).

### 8.1 Tabla de endpoints

| Método | Ruta (tras el prefijo) | Controlador | Qué hace |
|---|---|---|---|
| `GET` | `/restaurants/cities` | `PlacesController.apiGetAvailableCities` | Lista ciudades con datos en Mongo + `SUPPORTED_CITIES` |
| `POST` | `/restaurants/refresh-all` | `PlacesController.apiRefreshAllCities` | Refresca las 11 ciudades **secuencialmente** |
| `POST` | `/restaurants/refresh/:city` | `PlacesController.apiRefreshRestaurants` | Refresca una ciudad desde Google Places |
| `GET` | `/restaurants/:city` | `PlacesController.apiGetBestRestaurants` | Restaurantes (auto-refresca si vacío) |
| `GET` | `/weather/:city` | `WeatherController.apiGetWeather` | Clima actual vía Open-Meteo |
| `GET` | `/turismo/:city` | `PlacesExtraController.apiGetTurismo` | Atracciones turísticas |
| `POST` | `/turismo/refresh/:city` | `PlacesExtraController.apiRefreshTurismo` | Refresco manual |
| `GET` | `/hangout/:city` | `PlacesExtraController.apiGetHangout` | Bares / cafés / ocio |
| `POST` | `/hangout/refresh/:city` | `PlacesExtraController.apiRefreshHangout` | Refresco manual |
| `GET` | `/fanzone/:city` | `PlacesExtraController.apiGetFanzone` | Bares deportivos + FIFA Fan Fest |
| `POST` | `/fanzone/refresh/:city` | `PlacesExtraController.apiRefreshFanzone` | Refresco manual |
| `GET` | `/eventos/:city` | `EventosController.apiGetEventosByCity` | Partidos del Mundial 2026 |

**El orden de registro importa**: en `MainRoute.js` las rutas estáticas (`/restaurants/cities`, `/restaurants/refresh-all`, `/*/refresh/:city`) se declaran **antes** de la dinámica `/:city`, o Express interpretaría `cities` y `refresh` como nombres de ciudad. Está comentado en el propio archivo (líneas 95 y 113).

⚠️ **Los endpoints `refresh` no tienen autenticación.** Cualquiera puede lanzar `POST /restaurants/refresh-all` y disparar 11 llamadas de pago a Google Places.

### 8.2 `PlacesController` — restaurantes

```js
let data = await BestRestaurants.findOne({ city: cityLower });
if (!data || !data.restaurants?.length) {
  data = await GooglePlacesService.updateCity(cityLower);   // auto-refresh
}
if (!data || !data.restaurants?.length) return res.status(404).json(...);
```

**Auto-refresh perezoso**: la primera visita a una ciudad sin datos dispara la llamada a Google Places dentro del ciclo de la petición (respuesta lenta y con coste). Una vez poblada, **los datos nunca caducan**: no hay TTL ni cron. `lastUpdated` se guarda pero nadie lo comprueba. Refrescar exige llamar a mano a los endpoints `refresh`.

### 8.3 `PlacesExtraController` — turismo / hangout / fanzone

Un único método `getBestPlaces(category, req, res)` parametrizado por:

```js
CATEGORY_MODELS = {
  turismo: { model: BestTurismo, notFound: 'No se encontraron lugares de turismo para' },
  hangout: { model: BestHangout, notFound: 'No se encontraron lugares para hangout en' },
  fanzone: { model: BestFanzone, notFound: 'No se encontraron bares deportivos para' },
};
```

Misma lógica de auto-refresh. Para `fanzone` añade al final:

```js
response.fanFest = FAN_FEST_ZONES[cityLower] || null;
```

Los handlers son **propiedades de clase con arrow function** (`apiGetTurismo = (req, res) => ...`) precisamente para conservar el `this` al pasarlos como referencia al router.

### 8.4 `WeatherController` + `WeatherService`

A diferencia de Places, aquí **sí se valida la ciudad**: si el slug no está en `CITY_COORDINATES`, responde `404 Ciudad no soportada`.

`WeatherService` consulta Open-Meteo (**sin API key**):

```
GET https://api.open-meteo.com/v1/forecast
    ?latitude=..&longitude=..
    &current=temperature_2m,apparent_temperature,weather_code
    &hourly=precipitation_probability
    &temperature_unit=fahrenheit
    &timezone=auto
    &forecast_days=1
```

- **Caché en memoria** (`Map`) con TTL de **10 minutos** por ciudad. Se pierde en cada reinicio y no se comparte entre instancias.
- La probabilidad de lluvia se saca buscando `hourly.time.indexOf(current.time)`; si no lo encuentra, usa el índice 0.
- Normaliza los códigos WMO a seis condiciones:

| Condición | Códigos WMO | Descripción devuelta |
|---|---|---|
| `soleado` | 0 | Soleado |
| `parcialmente-nublado` | 1, 2 | Parcialmente nublado |
| `nublado` | 3, 45, 48 | Nublado |
| `lluvia` | 51–57, 61–67, 80–82 | Lluvia |
| `tormenta` | 95, 96, 99 | Tormenta |
| `nieve` | 71, 73, 75, 77, 85, 86 | Nieve |

Cualquier código no listado cae en `parcialmente-nublado`. Las `description` están **en español** aunque toda la UI está en inglés (solo se usan como `alt` del icono).

### 8.5 `EventosController`

Cero I/O: filtra el array estático `WORLD_CUP_2026_MATCHES` por `citySlug` y ordena por fecha con `localeCompare` (funciona porque las fechas son `YYYY-MM-DD`). **No valida** que la ciudad exista: un slug desconocido devuelve `200` con `count: 0`.

### 8.6 `GooglePlacesService`

Integración única con **Google Places API v1** (`places:searchText`), reutilizada por las cuatro categorías.

```js
POST https://places.googleapis.com/v1/places:searchText
Headers: X-Goog-Api-Key: <GOOGLE_PLACES_API_KEY>
         X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,
                           places.rating,places.userRatingCount,places.priceLevel,
                           places.googleMapsUri,places.websiteUri,places.photos
Body:    { textQuery, includedType, languageCode: 'es', pageSize: 20 }
```

| Categoría | `includedType` | `textQuery` |
|---|---|---|
| restaurantes | `restaurant` | `best restaurants in ${cityName}` |
| turismo | `tourist_attraction` | `best tourist attractions, museums and parks in ${cityName}` |
| hangout | `bar` | `best bars, cafes and nightlife spots in ${cityName}` |
| fanzone | `bar` | `best sports bars in ${cityName}` |

- `languageCode: 'es'` → los datos devueltos por Google vienen en español pese a que la UI está en inglés.
- Se guardan como máximo **5 fotos** por lugar (`photos.slice(0, 5)`), aunque la UI solo usa `photos[0]`.
- Escritura con `findOneAndUpdate({ city }, {...}, { upsert: true, new: true })`.
- `updateCity()` (restaurantes) y `updateCityCategory()` (las otras tres) son **casi idénticos**: mismo request, mismo mapeo, solo cambia el modelo y el campo (`restaurants` vs `places`).

⚠️ **La API key viaja al cliente.** `buildPhotoUrl()` construye:

```js
`https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=800`
```

y esa URL se **persiste en MongoDB** y se sirve al navegador. Dos implicaciones: (1) la key es pública — hay que restringirla por HTTP referrer en GCP, como avisa el comentario del código; (2) **rotar la key invalida todas las fotos guardadas**, porque la key vieja quedó incrustada en cada documento.

### 8.7 Modelos de MongoDB

Cuatro colecciones con esquema prácticamente idéntico:

| Modelo | Archivo | Colección | Campo del array |
|---|---|---|---|
| `BestRestaurants` | `models/BestRestaurants.js` | `bestrestaurants` | **`restaurants`** |
| `BestTurismo` | `models/BestTurismo.js` | `bestturismos` | `places` |
| `BestHangout` | `models/BestHangout.js` | `besthangouts` | `places` |
| `BestFanzone` | `models/BestFanzone.js` | `bestfanzones` | `places` |

```js
{
  city: { type: String, required: true, unique: true, lowercase: true, trim: true },
  places: [PlaceSchema],          // o restaurants: [RestaurantSchema]
  lastUpdated: { type: Date, default: Date.now }
}
// PlaceSchema: placeId*, name*, formattedAddress, rating, priceLevel, googleMapsUri,
//              photos: [{ url*, authorName, authorUri }], lastUpdated
```

Un documento por ciudad, con los lugares embebidos. `city` es único e indexado (`schema.index({ city: 1 })`, redundante con `unique: true`).

### 8.8 Datos estáticos

**`data/fanFestZones.js`** — Solo **4 de las 11 ciudades** tienen sede confirmada del FIFA Fan Festival: `los-angeles`, `boston`, `filadelfia`, `san-francisco`. El resto devuelve `fanFest: null` y la sección funciona solo con bares deportivos.

**`data/worldCup2026Matches.js`** — 245 líneas. Solo **fase eliminatoria** (dieciseisavos en adelante); la fase de grupos aún no está incluida. Cada partido:

```js
{ id: 'm80', citySlug: 'atlanta', stadium: 'Mercedes-Benz Stadium',
  date: '2026-07-01', stage: 'Dieciseisavos de final',
  teams: { home: 'Ganador del Grupo L', away: '3.º mejor de los Grupos E, H, I, J o K' } }
```

Cuando el equipo no está definido se usa la descripción del cruce ("Ganador del Grupo L"), no "Por definir". `stage` y `teams` están **en español**.

---

## 9. Configuración y entorno

### Variables de entorno (backend)

| Variable | Uso | Obligatoria |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | Google Places v1 (búsqueda + URLs de foto) | **Sí** para Places |
| `DB_URL` | Cadena de conexión de MongoDB | **Sí** |
| `PORT` | Puerto del servidor (por defecto `4200`) | No |

Open-Meteo **no necesita credenciales**.

### CORS

`backend/index.js:20` mantiene una allowlist explícita de orígenes (incluye `https://maslatinonetwork.com`, varios `*.netlify.app`, `*.onrender.com` y localhost 4200/4000/8100/3000/5000). Las peticiones **sin `origin` se permiten siempre**. Un origen nuevo exige tocar este array.

### Frontend

- **Angular 20** con componentes standalone, signals, `@if` / `@for` / `@switch`, `NgOptimizedImage`.
- **Tailwind CSS 3.4.3** (`frontend/tailwind.config.js`, directivas `@tailwind` en `src/styles.css`). Toda la UI del módulo es utility-first: sin Tailwind, las páginas quedan sin estilo.
- Fuente **Poppins** importada desde Google Fonts en `styles.css`.
- `app.config.ts`: `provideHttpClient(withFetch(), withInterceptors([ssrStripCookiesInterceptor]))`, `provideClientHydration(withEventReplay())`, scroll restoration a `'top'`.

### Despliegue

- **Frontend** → Netlify. `netlify.toml`: base `frontend`, publish `dist/realnetwork/browser`, plugin `@netlify/angular-runtime` (Edge Function para SSR), Node 22.
  🚫 **Nunca añadir un fallback SPA** (`/* /index.html 200`) en `netlify.toml` ni en `public/_redirects`: interceptaría todas las peticiones antes de la Edge Function y mataría el SSR. Está documentado en el propio archivo y fue la causa de varios bugs recientes.
- **Backend** → Render (`realnetworkmaslatino-teas.onrender.com`). En plan gratuito el servicio **se duerme**: la primera petición tras inactividad tarda decenas de segundos, y ese arranque en frío se suma al auto-refresh de Google Places.

---

## 10. Assets

**`frontend/public/assets/cyties/`** — 11 PNG, uno por ciudad. **28 MB en total** (`kansas city.png` 8.4 MB, `miami.png` 6.7 MB). Se usan como hero a pantalla completa y como fondo de las tarjetas de `/cities`. Cuatro nombres llevan espacio y se referencian con `%20`.

**`frontend/public/assets/iconospartes/`** — 2 MB:
- Categorías: `eventos.webp`, `hangout.webp`, `fanzone.webp`, `turismo.webp`, `restaurantes.webp`
- Clima: `sol.svg`, `nube-sol.svg`, `nube.svg`, `lluvia.svg`, `tormenta.svg`, `nieve.svg`, `termometro.svg`, `gota.svg`

---

## 11. Problemas conocidos

Detectados al leer el código; **no replicarlos en el proyecto destino**.

### 11.1 🔴 Restaurantes consulta la API con el nombre, no con el slug

`restaurantes.html:197` pasa solo `[city]`, y `restaurantes-parte.ts:33` llama `loadRestaurants(currentCity.highlight)`. El servicio hace `toLowerCase()`, así que la petición sale con el **nombre de display**, no con el slug:

| Ciudad | Resto de secciones (slug) | Restaurantes (highlight) |
|---|---|---|
| `kansas-city` | `GET /hangout/kansas-city` | `GET /restaurants/kansas%20city` |
| `filadelfia` | `GET /turismo/filadelfia` | `GET /restaurants/philadelphia` |

Funciona por casualidad: el backend no reconoce esas claves en `SLUG_TO_QUERY`, cae al fallback `slug.replace(/-/g, ' ')`, busca en Google y **guarda el documento con esa clave**. Consecuencias reales:

- Mongo acaba con documentos duplicados: `kansas city` **y** `kansas-city`, `philadelphia` **y** `filadelfia`.
- `POST /restaurants/refresh-all` itera sobre `SUPPORTED_CITIES` (slugs) y escribe en `kansas-city` / `filadelfia`, que **no son las claves que lee el frontend**. Refrescar esas dos ciudades no tiene ningún efecto visible.

**Arreglo**: pasar `[citySlug]="citySlug()"` a `app-restaurantes-parte` y consultar por slug, igual que las otras cuatro secciones.

### 11.2 🟠 Sin caducidad de datos

Una vez poblada una ciudad, sus datos de Google Places **no se vuelven a pedir nunca**. `lastUpdated` se escribe pero no se lee. No hay cron ni TTL. La única vía es llamar a mano a los endpoints `refresh`, que además no están expuestos en ninguna UI.

### 11.3 🟠 Endpoints de refresh sin autenticación

`POST /restaurants/refresh-all` es público y dispara 11 llamadas de pago a Google Places, secuenciales.

### 11.4 🟠 API key de Google incrustada en las URLs de foto guardadas

Ver §8.6. La key es visible en el HTML y queda persistida en cada documento de Mongo.

### 11.5 🟡 Slug inválido no da 404

`/restaurantes/cualquier-cosa` renderiza "What's happening in YOUR CITY?" con hero vacío y todas las secciones en error. Debería ser un 404 o un redirect a `/cities`.

### 11.6 🟡 Sin SEO en las páginas de ciudad

Al ser `RenderMode.Client`, ninguna página de ciudad tiene meta tags, OpenGraph ni datos estructurados. Para un producto de descubrimiento por ciudad es la carencia más cara del módulo.

### 11.7 🟡 Duplicación

- `Place` / `PlacePhoto` / `CityPlacesResponse` definidos 3 veces idénticos en los servicios de turismo, hangout y fanzone (4 con el de restaurantes, bajo otro nombre).
- `DEFAULT_CITY` redefinido en 5 componentes.
- La lista de ciudades mantenida en 4 fuentes + 11 enlaces hardcodeados.
- `updateCity()` y `updateCityCategory()` son casi el mismo método.

### 11.8 🟡 Imágenes sin optimizar

28 MB de PNG para 11 fotos de hero. `miami.png` (6.7 MB) y `kansas city.png` (8.4 MB) se cargan con `priority`, bloqueando el LCP.

### 11.9 🟡 Mezcla de idiomas

UI en inglés; `description` del clima, `stage` y `teams` de los partidos, mensajes de error del backend y `languageCode: 'es'` de Google, todo en español.

### 11.10 🟡 Colores inconsistentes en la sección de restaurantes

`#9747FF` en `SECTION_COLORS` (hero y dots) vs `bg-[#b121fe]` en `foodCategory` (tarjeta del selector) — y `#b121fe` es además el color de Hangout.

---

## 12. Inventario de archivos

### Núcleo del módulo — se porta tal cual

```
frontend/src/app/pages/cities/
  cities.ts · cities.html · cities.css (vacío) · cities.spec.ts

frontend/src/app/pages/restaurantes/
  restaurantes.ts · restaurantes.html · restaurantes.css · restaurantes.spec.ts
  partes/
    partes.ts · partes.html · partes.css · partes.spec.ts
    parte-eventos/     parte-eventos.{ts,html,css,spec.ts}
    parte-hangout/     parte-hangout.{ts,html,css,spec.ts}
    parte-fanzone/     parte-fanzone.{ts,html,css,spec.ts}
    parte-turismo/     parte-turismo.{ts,html,css,spec.ts}
    restaurantes-parte/restaurantes-parte.{ts,html,css,spec.ts}

frontend/src/app/services/
  places-service.ts · weather-service.ts · eventos-service.ts
  turismo-service.ts · hangout-service.ts · fanzone-service.ts

backend/api/
  PlacesController.js · PlacesExtraController.js
  WeatherController.js · EventosController.js
backend/services/
  GooglePlacesService.js · WeatherService.js
backend/models/
  BestRestaurants.js · BestTurismo.js · BestHangout.js · BestFanzone.js
backend/data/
  fanFestZones.js · worldCup2026Matches.js
```

### Archivos externos que hay que tocar — no se copian, se editan

| Archivo | Qué hay que hacer |
|---|---|
| `frontend/src/app/app.routes.ts` | Registrar `/cities` y `/restaurantes/:ciudad` |
| `frontend/src/app/app.routes.server.ts` | Decidir render mode (hoy Client por el `**`) |
| `frontend/src/app/app.config.ts` | Requiere `provideHttpClient()` |
| `frontend/src/styles.css` + `tailwind.config.js` | Tailwind 3.x y fuente Poppins |
| `frontend/src/app/components/navbar/navbar.component.html` | Enlace "Cities" (líneas 32 y 60) |
| `backend/api/MainRoute.js` | Registrar las 12 rutas, estáticas antes que dinámicas |
| `backend/index.js` | Prefijo `/aaron/maslatinoNetwork`, CORS, conexión a Mongo |
| `backend/.env` | `GOOGLE_PLACES_API_KEY`, `DB_URL` |
| `frontend/public/assets/cyties/` + `iconospartes/` | Copiar los binarios |

### Dependencias

**Frontend**: `@angular/core|common|router|ssr` ^20, `rxjs` ~7.8, `tailwindcss` ^3.4.3.
El módulo **no usa** `swiper`, `@angular/cdk`, `@angular/forms` ni ninguna otra librería del proyecto.

**Backend**: `express` ^4.19, `mongoose` ^8.16, `axios` ^1.10, `cors`, `dotenv`.
El módulo **no usa** `socket.io`, `multer`, `bcrypt`, `jsonwebtoken`, `cheerio`, `marked`, `exceljs`, `pdfkit` ni `@mux/mux-node`.
