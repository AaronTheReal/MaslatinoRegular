# Contratos de API — Módulo Cities

> **Payloads reales**, capturados el 2026-08-05 contra el backend de producción
> `https://realnetworkmaslatino-teas.onrender.com/aaron/maslatinoNetwork`.
> No son ejemplos inventados. Solo se ha recortado la longitud de los tokens de foto
> y **redactado la API key de Google** (`key=AIza…REDACTED`) — ver la nota de seguridad al final.

**Base URL**: `https://realnetworkmaslatino-teas.onrender.com/aaron/maslatinoNetwork`
**Local**: `http://localhost:3000/aaron/maslatinoNetwork`

Todos los endpoints devuelven `application/json`. Ninguno requiere autenticación.

---

## Índice

| Método | Ruta | Sección |
|---|---|---|
| `GET` | `/weather/:city` | [1](#1-get-weathercity) |
| `GET` | `/restaurants/:city` | [2](#2-get-restaurantscity) |
| `GET` | `/turismo/:city` | [3](#3-get-turismocity) |
| `GET` | `/hangout/:city` | [4](#4-get-hangoutcity) |
| `GET` | `/fanzone/:city` | [5](#5-get-fanzonecity) |
| `GET` | `/eventos/:city` | [6](#6-get-eventoscity) |
| `GET` | `/restaurants/cities` | [7](#7-get-restaurantscities) |
| `POST` | `/restaurants/refresh/:city` | [8](#8-endpoints-de-refresco-escritura) |
| `POST` | `/restaurants/refresh-all` | [8](#8-endpoints-de-refresco-escritura) |
| `POST` | `/{turismo\|hangout\|fanzone}/refresh/:city` | [8](#8-endpoints-de-refresco-escritura) |

---

## 1. `GET /weather/:city`

Clima actual. `:city` es el **slug** (`kansas-city`). Validado contra `CITY_COORDINATES`.

**Petición**
```http
GET /aaron/maslatinoNetwork/weather/boston
```

**200 — respuesta real**
```json
{
  "city": "boston",
  "coordinates": { "lat": 42.3601, "lon": -71.0589 },
  "temperature": 88,
  "feelsLike": 90,
  "weatherCode": 3,
  "condition": "nublado",
  "description": "Nublado",
  "precipitationProbability": 0,
  "lastUpdated": "2026-08-05T18:40:06.100Z"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `temperature`, `feelsLike` | `number` | **Siempre en Fahrenheit**, redondeados. La conversión a °C se hace en el cliente. |
| `weatherCode` | `number` | Código WMO crudo de Open-Meteo |
| `condition` | `enum` | `soleado` · `parcialmente-nublado` · `nublado` · `lluvia` · `tormenta` · `nieve` — es la clave de `WEATHER_ICONS` |
| `description` | `string` | Texto **en español** ("Nublado"), solo usado como `alt` |
| `precipitationProbability` | `number` | 0–100 |

**404 — ciudad no soportada** *(respuesta real)*
```json
{ "message": "Ciudad no soportada: no-existe" }
```

**500**
```json
{ "message": "Error al obtener el clima", "error": "<mensaje>" }
```

> Caché en memoria de **10 minutos** por ciudad. Sin API key: Open-Meteo es gratuito y abierto.

---

## 2. `GET /restaurants/:city`

⚠️ **Este endpoint recibe hoy el nombre de display, no el slug** — el frontend llama con `city().highlight` en minúsculas. Ver §11.1 de la spec.

**Petición**
```http
GET /aaron/maslatinoNetwork/restaurants/boston
```

**200 — respuesta real** (recortada: 20 elementos, 5 fotos cada uno)
```json
{
  "city": "boston",
  "lastUpdated": "2026-06-25T16:03:52.685Z",
  "count": 20,
  "restaurants": [
    {
      "placeId": "ChIJ-3vNbw1644kRQUMVs5yqVL4",
      "name": "The Salty Pig",
      "formattedAddress": "130 Dartmouth St, Boston, MA 02116, EE. UU.",
      "rating": 4.5,
      "priceLevel": "PRICE_LEVEL_MODERATE",
      "googleMapsUri": "https://maps.google.com/?cid=13714774355246138177&g_mp=Cidnb29…",
      "photos": [
        {
          "url": "https://places.googleapis.com/v1/places/ChIJ-3vNbw1644kRQUMVs5yqVL4/photos/AaVGc3m6axvm…/media?key=AIza…REDACTED&maxWidthPx=800",
          "authorName": "The Salty Pig",
          "authorUri": "https://maps.google.com/maps/contrib/102173430586728777465",
          "_id": "6a2f821c9e77fa8c21ab…"
        }
      ],
      "lastUpdated": "2026-06-25T16:03:52.685Z",
      "_id": "6a2f821c9e77fa8c21ab…"
    }
  ]
}
```

**Detalles que no están en las interfaces TypeScript:**

- Mongo añade **`_id` a cada lugar y a cada foto** (subdocumentos embebidos). Las interfaces del frontend declaran `_id?` solo en el nivel del lugar; en las fotos existe pero no está tipado.
- `formattedAddress` termina en **`, EE. UU.`** — consecuencia de `languageCode: 'es'` en la llamada a Google.
- `priceLevel` es un enum de Google (`PRICE_LEVEL_INEXPENSIVE` · `PRICE_LEVEL_MODERATE` · `PRICE_LEVEL_EXPENSIVE` · `PRICE_LEVEL_VERY_EXPENSIVE`) o **cadena vacía** `""` si Google no lo informa. La UI hace `.replace('PRICE_LEVEL_', '')`.
- `count` es siempre **20** (`pageSize: 20` en la llamada a Google).
- Cada lugar trae hasta **5 fotos**; la UI solo pinta `photos[0]`.

**404**
```json
{ "message": "No se encontraron restaurantes para <city>." }
```

**500**
```json
{ "message": "Error al obtener restaurantes", "error": "<mensaje>" }
```

> ⚠️ **Efecto secundario con coste**: si la ciudad no tiene datos en Mongo, este `GET` dispara una llamada de pago a Google Places **dentro de la petición**. La respuesta tarda varios segundos y consume cuota.

---

## 3. `GET /turismo/:city`

Atracciones turísticas, museos y parques. `:city` es el **slug**.

**200 — respuesta real** (recortada)
```json
{
  "city": "boston",
  "lastUpdated": "2026-06-15T04:40:16.473Z",
  "count": 20,
  "places": [
    {
      "placeId": "ChIJLxyMQZZw44kRxTZwZ5PGulc",
      "name": "Museum of Science",
      "formattedAddress": "1 Science Pk, Boston, MA 02114, EE. UU.",
      "rating": 4.7,
      "priceLevel": "",
      "googleMapsUri": "https://maps.google.com/?cid=6321583363365811909&g_mp=Cidnb29…",
      "photos": [
        {
          "url": "https://places.googleapis.com/v1/places/ChIJLxyMQZZw44kRxTZwZ5PGulc/photos/AaVGc3ljxSlb…/media?key=AIza…REDACTED&maxWidthPx=800",
          "authorName": "…",
          "authorUri": "https://maps.google.com/maps/contrib/…",
          "_id": "…"
        }
      ],
      "lastUpdated": "2026-06-15T04:40:16.473Z",
      "_id": "…"
    }
  ]
}
```

Idéntico a `/restaurants/:city` salvo que **el array se llama `places`, no `restaurants`**. En turismo `priceLevel` suele venir vacío.

**404**: `{ "message": "No se encontraron lugares de turismo para <city>." }`

---

## 4. `GET /hangout/:city`

Bares, cafés y ocio nocturno. Misma forma exacta que `/turismo/:city`.

**404**: `{ "message": "No se encontraron lugares para hangout en <city>." }`

---

## 5. `GET /fanzone/:city`

Bares deportivos **+ la zona oficial del FIFA Fan Festival** si la ciudad la tiene.

**200 — respuesta real** (recortada)
```json
{
  "city": "boston",
  "lastUpdated": "2026-06-15T04:39:56.119Z",
  "count": 20,
  "places": [
    {
      "placeId": "ChIJh-_ZLPZ544kRu4Hl0OcbiFg",
      "name": "Bleacher Bar",
      "formattedAddress": "82A Lansdowne St, Boston, MA 02215, EE. UU.",
      "rating": 4.5,
      "priceLevel": "PRICE_LEVEL_MODERATE",
      "googleMapsUri": "https://maps.google.com/?cid=6379379554626404795&g_mp=Cidnb29…",
      "photos": [
        {
          "url": "https://places.googleapis.com/v1/places/ChIJh-_ZLPZ544kRu4Hl0OcbiFg/photos/AaVGc3lOhH3b…/media?key=AIza…REDACTED&maxWidthPx=800",
          "authorName": "Benjamin Spiegel",
          "authorUri": "https://maps.google.com/maps/contrib/113881962011416363686",
          "_id": "6a2f821c9e77fa8c21ab398e"
        }
      ],
      "lastUpdated": "2026-06-15T04:39:56.119Z",
      "_id": "6a2f821c9e77fa8c21ab39ff"
    }
  ],
  "fanFest": {
    "name": "Boston City Hall Plaza",
    "address": "1 City Hall Square, Boston, MA 02203",
    "dates": "12–27 de junio de 2026"
  }
}
```

`fanFest` es `null` en las 7 ciudades sin sede confirmada. Solo lo tienen `los-angeles`, `boston`, `filadelfia` y `san-francisco`. El campo `dates` es **texto libre en español**, no una fecha parseable.

**404**: `{ "message": "No se encontraron bares deportivos para <city>." }`

---

## 6. `GET /eventos/:city`

Partidos del Mundial 2026 en esa ciudad. Dataset estático, sin Mongo ni Google.

**200 — respuesta real (completa)**
```json
{
  "city": "boston",
  "count": 2,
  "matches": [
    {
      "id": "m74",
      "citySlug": "boston",
      "stadium": "Gillette Stadium",
      "date": "2026-06-29",
      "stage": "Dieciseisavos de final",
      "teams": {
        "home": "Ganador del Grupo E",
        "away": "3.º mejor de los Grupos A, B, C, D o F"
      }
    },
    {
      "id": "m97",
      "citySlug": "boston",
      "stadium": "Gillette Stadium",
      "date": "2026-07-09",
      "stage": "Cuartos de final",
      "teams": { "home": "Ganador del Partido 89", "away": "Ganador del Partido 90" }
    }
  ]
}
```

- `date` es `YYYY-MM-DD` **sin hora ni zona horaria**. El frontend hace `new Date(\`${date}T00:00:00\`)` para forzar hora local y evitar el corrimiento de un día que provoca el parseo UTC.
- `stage` y `teams` están **en español**; la UI está en inglés.
- Solo hay datos de **fase eliminatoria**. La fase de grupos no está cargada.
- **No valida la ciudad** — respuesta real para un slug inexistente:

```json
{ "city": "no-existe", "count": 0, "matches": [] }
```
`[HTTP 200]` — nunca devuelve 404. El frontend pinta una lista vacía sin mensaje.

---

## 7. `GET /restaurants/cities`

Diagnóstico: qué ciudades tienen datos en Mongo. No lo usa ninguna pantalla.

**200 — respuesta real (completa, 2026-08-05)**
```json
{
  "count": 9,
  "supported": ["atlanta","boston","dallas","filadelfia","houston","kansas-city",
                "los-angeles","miami","new-york","san-francisco","seattle"],
  "cities": [
    { "city": "boston",        "lastUpdated": "2026-06-25T16:03:52.685Z", "restaurantCount": 20 },
    { "city": "atlanta",       "lastUpdated": "2026-06-25T16:04:00.124Z", "restaurantCount": 20 },
    { "city": "seattle",       "lastUpdated": "2026-06-25T16:04:01.153Z", "restaurantCount": 20 },
    { "city": "filadelfia",    "lastUpdated": "2026-06-15T01:32:49.538Z", "restaurantCount": 20 },
    { "city": "new york",      "lastUpdated": "2026-06-15T18:00:14.642Z", "restaurantCount": 20 },
    { "city": "san francisco", "lastUpdated": "2026-06-15T18:00:23.799Z", "restaurantCount": 20 },
    { "city": "dallas",        "lastUpdated": "2026-06-15T18:00:43.205Z", "restaurantCount": 20 },
    { "city": "miami",         "lastUpdated": "2026-06-15T18:02:55.373Z", "restaurantCount": 20 },
    { "city": "houston",       "lastUpdated": "2026-06-15T18:37:18.796Z", "restaurantCount": 20 }
  ]
}
```

### 🔴 Esta respuesta es la prueba del bug de claves

Fíjate en las claves guardadas: **`"new york"` y `"san francisco"` con espacio**, mientras `supported` declara `new-york` y `san-francisco` con guion. Conviven dos convenciones de clave en la misma colección porque hay dos rutas de escritura:

- **Escritura por auto-refresh** (usuario visitando la web) → usa lo que manda el frontend = el nombre de display → `new york`, `san francisco`.
- **Escritura por `refresh-all`** (manual) → itera `SUPPORTED_CITIES` = slugs → `filadelfia`, `kansas-city`.

Cruzando lo que hay guardado con lo que el frontend pide (`highlight` en minúsculas):

| Slug de la URL | El frontend pide | ¿Existe en Mongo? |
|---|---|---|
| `boston`, `atlanta`, `seattle`, `dallas`, `miami`, `houston` | mismo nombre | ✅ acierta |
| `new-york` | `new york` | ✅ acierta (clave con espacio) |
| `san-francisco` | `san francisco` | ✅ acierta (clave con espacio) |
| `filadelfia` | **`philadelphia`** | ❌ **falla** — lo guardado es `filadelfia` |
| `kansas-city` | **`kansas city`** | ❌ **falla** — no hay ningún documento |
| `los-angeles` | **`los angeles`** | ❌ **falla** — no hay ningún documento |

Las tres ciudades que fallan **disparan una llamada de pago a Google Places en cada visita** hasta que el auto-refresh consiga guardar el documento. Y el documento `filadelfia` que sí existe es peso muerto: ninguna pantalla lo lee nunca.

> Al portar: **usa el slug como clave única en todas partes** y esto desaparece.

---

## 8. Endpoints de refresco (escritura)

⚠️ **Sin autenticación y con coste real**: cada llamada consume cuota de pago de Google Places. `refresh-all` dispara 11 llamadas secuenciales. No se han ejecutado al elaborar este documento.

| Método | Ruta |
|---|---|
| `POST` | `/restaurants/refresh/:city` |
| `POST` | `/restaurants/refresh-all` |
| `POST` | `/turismo/refresh/:city` |
| `POST` | `/hangout/refresh/:city` |
| `POST` | `/fanzone/refresh/:city` |

Cuerpo de la petición: vacío (`{}`).

**200 — refresco de una ciudad** *(forma según `PlacesController.js:65` y `PlacesExtraController.js:75`)*
```json
{
  "success": true,
  "message": "✅ boston actualizado correctamente",
  "count": 20,
  "lastUpdated": "2026-06-25T16:03:52.685Z"
}
```

**500**
```json
{ "success": false, "message": "Error al actualizar boston", "error": "<mensaje>" }
```

**200 — `refresh-all`** *(según `PlacesController.js:116`)*
```json
{
  "success": true,
  "message": "Todas las ciudades actualizadas",
  "updated": [ { "city": "atlanta", "count": 20 } ],
  "errors": []
}
```
`success` es `false` y `message` pasa a `"Actualizado con N error(es)"` si alguna ciudad falla; las que fallan van en `errors` como `{ city, error }`. **Devuelve 200 aunque haya errores.**

---

## 9. Integraciones externas

### Google Places API v1 — `places:searchText`

```http
POST https://places.googleapis.com/v1/places:searchText
Content-Type: application/json
X-Goog-Api-Key: <GOOGLE_PLACES_API_KEY>
X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.rating,
                  places.userRatingCount,places.priceLevel,places.googleMapsUri,
                  places.websiteUri,places.photos

{ "textQuery": "best restaurants in Boston", "includedType": "restaurant",
  "languageCode": "es", "pageSize": 20 }
```

| Categoría | `includedType` | `textQuery` |
|---|---|---|
| restaurantes | `restaurant` | `best restaurants in ${city}` |
| turismo | `tourist_attraction` | `best tourist attractions, museums and parks in ${city}` |
| hangout | `bar` | `best bars, cafes and nightlife spots in ${city}` |
| fanzone | `bar` | `best sports bars in ${city}` |

Mapeo Google → nuestro modelo:

| Nuestro campo | Campo de Google |
|---|---|
| `placeId` | `place.id` (fallback `place.name`) |
| `name` | `place.displayName.text` (fallback `'Sin nombre'`) |
| `formattedAddress` | `place.formattedAddress` |
| `rating` | `place.rating` (fallback `0`) |
| `priceLevel` | `place.priceLevel` (fallback `''`) |
| `googleMapsUri` | `place.googleMapsUri` |
| `photos[]` | `place.photos.slice(0,5)` → `{ url: buildPhotoUrl(photo.name), authorName: photo.authorAttributions[0].displayName, authorUri: … }` |

`userRatingCount` y `websiteUri` **se piden en el FieldMask pero se descartan** en el mapeo: se paga por ellos y no se guardan.

### Open-Meteo — sin credenciales

```http
GET https://api.open-meteo.com/v1/forecast
    ?latitude=42.3601&longitude=-71.0589
    &current=temperature_2m,apparent_temperature,weather_code
    &hourly=precipitation_probability
    &temperature_unit=fahrenheit&timezone=auto&forecast_days=1
```

---

## 🔒 Nota de seguridad — API key expuesta

Las URLs de foto que devuelven `/restaurants/:city`, `/turismo/:city`, `/hangout/:city` y `/fanzone/:city` llevan la `GOOGLE_PLACES_API_KEY` **en texto plano dentro del parámetro `key=`**, y esas URLs están **persistidas en MongoDB** y se sirven a cualquiera que llame a la API.

Al capturar estos payloads, la key de producción venía visible en cada URL de foto. Aquí está redactada, pero **es pública en la API en vivo**.

Dos consecuencias prácticas:

1. La key **debe estar restringida por HTTP referrer** en la consola de GCP (lo avisa el propio comentario de `GooglePlacesService.js:47`). Conviene verificar que la restricción está puesta de verdad.
2. **Rotar la key rompe todas las fotos ya guardadas**, porque la key vieja quedó incrustada en cada documento de Mongo. Rotar exige refrescar las 4 categorías × 11 ciudades.

**Al portar**: no incrustes la key en la URL guardada. Guarda solo `photoName` y sirve la imagen a través de un endpoint proxy propio (`GET /photo/:photoName`) que añada la key en el servidor. Así la key nunca sale del backend y rotarla no invalida ningún dato.
