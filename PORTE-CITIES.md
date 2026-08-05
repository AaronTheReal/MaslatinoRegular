# Porte del módulo Cities

Fecha: 2026-08-05 · Rama: `feature/cities` (partiendo de `feature/seo-ia`)

Ejecución de `cities-module-port/PORTING-BRIEF.md`. Este documento recoge lo que
se hizo, lo que se decidió y lo que queda pendiente.

## 1. Qué se portó

Dos pantallas: `/cities` (rejilla de 11 ciudades) y `/cities/:ciudad` (hub con
clima en vivo y cinco secciones: Eventos, Para salir, Fan Zone, Turismo y
Restaurantes).

Puntos de entrada: la rejilla de ciudades sustituye a `conectar-raices` en la
portada, y el menú desplegable de la navbar tiene un enlace «Ciudades». El
componente `conectar-raices` sigue en el repositorio, solo deja de renderizarse
en el dashboard.

| Capa | Archivos |
|---|---|
| Backend | 4 controllers, 2 services, 4 models, 2 datasets, 1 util de fotos |
| Frontend | 6 servicios, 1 modelo compartido, 8 componentes |
| Rutas API | 12 del brief + 1 proxy de fotos |

## 2. Desviaciones del brief y por qué

### Bootstrap en lugar de Tailwind

El brief asume Tailwind 3.x. **Este proyecto usa Bootstrap 5.3 por CDN y no
tiene Tailwind.** Instalarlo habría sido una regresión: `shadow` (36 usos del
módulo), `rounded` (21) y `border` (7) existen en ambos frameworks, y como
`styles.css` carga después del CDN, las definiciones de Tailwind habrían
ganado y alterado páginas ya publicadas (noticias, panel).

Se reescribió la maquetación con utilidades de Bootstrap para rejilla,
espaciado y flexbox, dejando en el CSS de cada componente solo lo que Bootstrap
no cubre: proporciones (`aspect-ratio`), radios grandes, degradados por sección
y recorte de texto a dos líneas. La fuente Poppins que pedía el módulo se
descartó: el sitio usa Noir Pro.

### Ruta `/cities/:ciudad`

El brief señala que `/restaurantes/:ciudad` describe mal una página que no es de
restaurantes, y recomienda renombrarla. Se renombró. El componente vive en
`app/pages/ciudad/`.

### SSR en lugar de CSR

En el origen estas páginas eran cliente puro, sin SEO. Se verificó que el módulo
no usa `window`, `document`, `localStorage` ni `navigator`, así que se pusieron
en `RenderMode.Server` con `title`, `description`, Open Graph y canonical por
ciudad. El brief lo llama "la mejora de mayor impacto del módulo".

### Idioma unificado en español

El origen mezclaba UI en inglés con datos y errores en español. La UI se tradujo
al español, coherente con `<html lang="es">` y con el `languageCode: 'es'` que
ya se le pedía a Google Places.

### Menos duplicación de la que traía el módulo

- **Las 11 ciudades** estaban repetidas en cuatro sitios más once bloques `<a>`
  en el HTML. Ahora salen de la constante `CITIES` en
  `frontend/src/models/cities.model.ts`.
- **Las 5 secciones** (color, icono, textos) estaban repartidas entre `partes.ts`
  y el hero de cada sección. Ahora salen de `SECTIONS` en el mismo archivo.
- **Turismo, Hang out, Fan Zone y Restaurantes** tenían cuatro plantillas y
  cuatro CSS casi idénticos. Ahora comparten el componente presentacional
  `place-list`; cada sección solo aporta su origen de datos.

## 3. Los tres errores que el brief pedía corregir

### 🔴 Restaurantes consultaba por nombre, no por slug — corregido

`restaurantes-parte` llamaba a la API con `city().highlight` (`KANSAS CITY`),
así que pedía `/restaurants/kansas%20city` mientras las otras cuatro secciones
pedían `/…/kansas-city`. Eso generaba claves incoherentes en Mongo que el
frontend nunca volvía a leer. Ahora todas las secciones reciben `citySlug` y
consultan con el slug.

### 🔴 La API key de Google viajaba al cliente — corregido, y más a fondo

El origen incrustaba `GOOGLE_PLACES_API_KEY` en la URL de cada foto y **guardaba
esa URL en Mongo**: la credencial acababa en el navegador y rotarla invalidaba
todas las fotos almacenadas.

Ahora Mongo guarda solo el `photoName` de Google y la URL pública se construye
al leer, apuntando a `GET /places/photo/<photoName>` de este backend.

Una nota sobre el arreglo que propone el brief: redirigir con 302 a
`…/media?key=…` **seguiría filtrando la clave**, porque el navegador recibe esa
URL en la cabecera `Location`. En su lugar, el proxy pide a Google la URL
firmada con `skipHttpRedirect=true` (llamada servidor a servidor) y redirige a
esa URL temporal, que no contiene la credencial. La caché del redirect es corta
(10 min) a propósito: la URL firmada caduca.

El proxy solo acepta rutas con el formato exacto de Google
(`places/<id>/photos/<id>`), para no convertirse en un redirector abierto.

### 🟠 Endpoints de refresco públicos y de pago — corregido

`POST /restaurants/refresh-all` disparaba 11 llamadas facturables a Google sin
pedir autenticación. Los seis endpoints de refresco ahora exigen `verifyToken` +
rol editorial, igual que el resto de mutaciones administrativas del proyecto.

### Extra: índice duplicado en Mongoose

Los cuatro modelos declaraban `unique: true` y además `schema.index({city: 1})`,
lo que provocaba cuatro avisos en cada arranque. Se retiró la declaración
redundante.

## 4. Variables de entorno

| Variable | Obligatoria | Efecto si falta |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | Para las 4 secciones de lugares | Esas secciones dan error; clima y eventos siguen funcionando |

El clima usa Open-Meteo, que no pide credencial. Documentada en
`backend/.env.example`.

## 5. Pendiente

### Assets — copiados, renombrados y servidos por el Image CDN

Los 11 PNG de ciudad (28 MB) y los 13 iconos (2 MB) están en
`frontend/public/assets/cyties/` y `.../iconospartes/`.

**Los cuatro nombres con espacio se renombraron a guiones** (`los angeles.png`
→ `los-angeles.png`). No era una mejora opcional: en producción, Netlify
devolvía **404** para esos archivos incluso pidiéndolos en directo con el
espacio codificado, mientras que un archivo hermano sin espacio respondía 200.
La comprobación fue:

```
/assets/cyties/boston.png          -> 200
/assets/cyties/los%20angeles.png   -> 404
```

Como las rutas viven solo en `CITIES` (`frontend/src/models/cities.model.ts`),
el arreglo fue renombrar los archivos y actualizar esas cuatro entradas.

Esos pesos eran un problema real: `kansas city.png` son 8.7 MB y
`restaurantes.webp` 1.2 MB para mostrarse a 195 px, y la rejilla de ciudades
ahora vive en la portada. En vez de reconvertir los binarios, se usa el pipe
`cdnimg` que el proyecto ya tenía para exactamente este caso (Netlify Image CDN:
redimensiona y negocia WebP/AVIF):

| Uso | Ancho servido |
|---|---|
| Tarjeta de ciudad en `/cities` y en la portada | `cdnimg:600` |
| Hero de `/cities/:ciudad` (marca el LCP) | `cdnimg:1600` |
| Iconos de sección | `cdnimg:400` |

Los iconos del clima son SVG de ~500 bytes y no pasan por el pipe.

Queda pendiente, si se quiere: los originales siguen pesando 30 MB en el
repositorio. Convertirlos a WebP reduciría el tamaño del repo, aunque ya no
afecta a lo que descarga el visitante. Si se renombran sin espacios, el único
sitio a tocar es `CITIES` en `cities.model.ts`.

### Despliegue del backend en Render

Al dejar de versionar `backend/node_modules` (commit `02f7f0cf`), el despliegue
pasó a depender de que Render instale las dependencias. Se comprobó que no lo
estaba haciendo: tras fusionar a `main`, el backend seguía respondiendo con el
código anterior y todas las rutas del módulo devolvían el *catch-all*
`{"error":"Not Found"}` de `index.js`.

El mismo efecto se reprodujo en local: al fusionar, git borró del árbol de
trabajo los 18.718 archivos que `main` tenía versionados, y el backend dejó de
encontrar `express` hasta ejecutar `npm install`.

Dos cosas que hacen falta en el panel de Render:

| Ajuste | Valor |
|---|---|
| Build Command | `npm install` |
| Start Command | `npm start` (ahora existe; antes `package.json` no declaraba `start`) |

`backend/package.json` no tenía script `start`, así que se añadió
(`node index.js`). Sin él, el arranque dependía de un comando escrito a mano en
el panel.

### Precarga de datos

Con Mongo vacío, la primera visita a cada ciudad dispara el refresco contra
Google **dentro de la petición**: lenta y con coste para ese primer usuario.
Conviene precargar ciudad por ciudad, ahora con sesión editorial:

```bash
curl -X POST "$BASE/restaurants/refresh/boston" -H "Authorization: Bearer $TOKEN"
```

⚠️ Cada llamada consume cuota de pago. `refresh-all` son 11 seguidas: empieza por
una ciudad y comprueba el resultado antes de lanzar el resto.

### Decisiones del brief que quedaron como en el origen

- **Mundial 2026**: solo fase eliminatoria. Faltaría la fase de grupos.
- **`fanFest`**: solo 4 de 11 ciudades tienen sede confirmada; el resto recibe
  `null` y la sección simplemente no muestra ese bloque.
- **Frescura de los datos**: nunca caducan. `lastUpdated` se escribe pero no se
  lee; faltaría un TTL o un cron de refresco.

## 6. Verificación

- Backend: **37 pruebas pasan** (8 nuevas cubren el proxy de fotos, el saneado
  de la clave, los límites de ancho y la coherencia de slugs entre clima,
  Places y partidos).
- Frontend: **build SSR de producción correcto**, sin advertencias en el código
  nuevo.
- No verificado: no hay `.env` local ni credencial de Google, así que **ninguna
  ruta se ejecutó contra la API real ni contra Mongo**. Las pruebas cubren la
  lógica pura; la verificación end-to-end del brief (§ Fase 1 y checklist final)
  sigue pendiente de un entorno con credenciales.
