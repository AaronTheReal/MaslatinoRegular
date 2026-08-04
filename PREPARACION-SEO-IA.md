# Preparación para SEO con IA — Mas Latino

Fecha de análisis: 2026-07-28

## 1. Resumen del proyecto

Mas Latino es una plataforma editorial multimedia con:

- noticias y notas de prensa;
- categorías, archivos por fecha y noticias recomendadas;
- podcasts, episodios, audio y video mediante Mux;
- eventos/calendario;
- radio y streaming;
- registro de usuarios, favoritos y notificaciones;
- newsletter/captura de correos;
- panel administrativo editorial;
- monetización publicitaria mediante Ezoic/Google (`ads.txt` y componentes de anuncios).

La aplicación está dividida en dos proyectos:

| Capa | Tecnología | Despliegue |
|---|---|---|
| Frontend | Angular 20, standalone components, SSR, TransferState | Netlify CDN + Angular Runtime |
| Backend | Node.js, Express 4, Mongoose/MongoDB | Render (`maslatinoregular.onrender.com`) |
| Multimedia | AWS S3/CloudFront y Mux | Servicios externos |
| Dominio público | `https://maslatino.com` | Netlify |

## 2. Mapa técnico

### Frontend

- `frontend/src/app/app.routes.ts`: rutas públicas y administrativas.
- `frontend/src/app/app.routes.server.ts`: estrategia SSR/CSR/prerender por ruta.
- `frontend/src/server.ts`: SSR y caché CDN.
- `frontend/src/app/services/`: acceso a la API.
- `frontend/src/app/pages/noticias-individuales/`: página SEO crítica de una noticia.
- `frontend/src/app/componentes/admin/panel-noticias/`: creación, edición, validación y vista previa editorial.
- `frontend/src/app/shared/seo-validators.ts`: validadores SEO del formulario.
- `frontend/scripts/generate-sitemap.js`: sitemap general.
- `frontend/scripts/generate-news-sitemap.js`: sitemap de Google News.

### Backend

- `backend/index.js`: Express, CORS, MongoDB y Socket.IO.
- `backend/api/MainRoute.js`: registro central de endpoints.
- `backend/api/NoticiasController.js`: creación, consulta, edición, publicación y listados de noticias.
- `backend/models/Noticias.js`: documento editorial y bloques de contenido.
- `backend/models/Categorias.js`: categorías y metadatos SEO.
- `backend/models/Podcast*.js`: podcasts y episodios.
- `backend/models/Calendario*.js`: eventos y anuncios.

La API usa el prefijo:

`/aaron/maslatino`

## 3. Rutas públicas relevantes

| Ruta | Contenido | Render |
|---|---|---|
| `/` | portada | SSR |
| `/noticia/:slug` | noticia individual | SSR |
| `/noticias-recientes` | últimas noticias | SSR |
| `/categoria/:slug` | archivo de categoría | SSR |
| `/archivo/:anio/:mes` | archivo mensual | SSR |
| `/eventos-show` | eventos | SSR |
| `/podcast-show` | listado de podcasts | SSR |
| `/podcasts/:slug` | podcast con URL legible | SSR |
| `/podcast-pagina/:id` | detalle/episodio | SSR |
| `/noticias-todas` | listado general | cliente |

El panel administrativo se renderiza solo en cliente y usa un guard de Angular.

## 4. Flujo editorial de noticias

1. El redactor crea o edita una noticia desde el panel Angular.
2. El formulario captura título, keyword principal, slug, resumen/extracto, categorías, autor, ubicación, etiquetas, fecha, imagen y metadatos sociales.
3. El contenido se guarda como HTML y como bloques estructurados: texto, imagen, cita, enlace, lista, embed o iframe.
4. El backend sanitiza HTML y normaliza el contenido.
5. La noticia pasa por estados `draft`, `review` o `published`, además del indicador separado `autorizada`.
6. La noticia pública se consulta por slug.
7. Angular SSR genera HTML visible para buscadores y bots sociales.
8. El frontend inyecta metadatos, canonical y JSON-LD de tipo `NewsArticle`.
9. Los endpoints de sitemap exponen URLs al proceso de build del frontend.

## 5. SEO que ya existe

- slug único;
- keyword principal;
- metadescripción;
- imagen, alt, dimensiones y tipo;
- Open Graph y Twitter Cards;
- canonical;
- fecha de publicación y modificación;
- etiquetas y ubicación;
- validadores y checklist en el panel;
- vista previa SEO;
- SSR para páginas públicas importantes;
- JSON-LD `NewsArticle`;
- sitemap general y sitemap de noticias;
- `robots.txt`;
- SEO específico de categorías;
- campos SEO básicos para podcasts y eventos;
- CDN de imágenes y caché SSR.

El “SEO IA” debe ampliar este sistema, no reemplazarlo.

## 6. Hallazgos prioritarios antes de integrar IA

### Críticos

1. Varias rutas de escritura del backend (noticias, categorías, podcasts, calendario y uploads) aparecen sin middleware de autenticación/autorización en `MainRoute.js`. El guard de Angular no protege una API. Antes de exponer endpoints de IA o publicación, hay que proteger servidor a servidor todas las mutaciones.
2. `backend/serviceAccountKey.json` está dentro del repositorio. Debe comprobarse si contiene una credencial real; si es real, rotarla y sustituirla por variables/secretos del entorno.
3. Hay dos conceptos de publicación (`state` y `autorizada`) que pueden divergir. Debe existir una única regla de elegibilidad pública compartida por consultas, SSR, sitemap y SEO IA.

### Altos

1. El sitemap general consulta todas las noticias (`find({})`) y puede incluir borradores o noticias no autorizadas.
2. El sitemap general asume que `updatedAt` siempre existe y llama directamente a `toISOString()`.
3. El sitemap de noticias declara idioma `en`, aunque el contenido principal es español; debería usar el idioma editorial real, normalmente `es`.
4. Los scripts de sitemap no están conectados al script `build` de `package.json`; los XML pueden quedar desactualizados entre despliegues.
5. Existe inconsistencia entre `maslatino.com` y `www.maslatino.com` en canonical, sitemaps y metadatos.
6. El campo `meta.canonical` se presenta en partes del panel como “fuente de la imagen”, mientras la página pública ignora ese campo y construye su propio canonical. Hay que separar `canonicalUrl` de `imageSourceUrl`.
7. `NewsArticle.author` siempre se publica como organización, aunque existe `authorName`.
8. El logo estructurado apunta a `/logo.png`, archivo que no se observa entre los assets públicos revisados.
9. La página de noticia recorta la descripción a 300 caracteres, mientras el editor exige 120–160; la salida debe respetar la metadescripción editorial validada.
10. En errores o noticias inexistentes faltan reglas robustas de `noindex` y un estado HTTP 404 verificable desde SSR.

### Medios

1. Los metadatos `ogTitle`, `ogDescription` y `twitterCard` guardados no son usados completamente en la página pública.
2. `meta keywords` tiene poco valor para buscadores modernos y no debe ser una métrica central del nuevo sistema.
3. Podcasts y eventos tienen modelos SEO, pero requieren JSON-LD específico (`PodcastSeries`, `PodcastEpisode`, `Event`) y sitemaps/canonicals consistentes.
4. Hay rutas API duplicadas o solapadas, especialmente en podcasts y categorías, que conviene normalizar antes de ampliar el backend.
5. El modelo TypeScript de bloques no incluye `iframe`, aunque MongoDB sí lo permite.
6. Hay `console.log` editoriales y código legado/comentado que incrementan ruido y riesgo de mantenimiento.
7. El repositorio no tiene una suite real de pruebas del backend.

## 7. Arquitectura propuesta para SEO IA

La IA debe operar como asistente editorial bajo aprobación humana:

```text
Contenido del redactor
        ↓
Extractor determinista (texto limpio, entidades y métricas)
        ↓
Servicio SEO IA en backend
        ↓
Respuesta estructurada y validada
        ↓
Comparación/diff en el panel
        ↓
Aceptación parcial o total por el editor
        ↓
Guardado como borrador
        ↓
Validaciones finales + autorización humana
        ↓
Publicación, SSR, schema y sitemaps
```

### Funciones iniciales recomendadas

- proponer keyword principal e intención de búsqueda;
- sugerir título SEO, slug, metadescripción y extracto;
- proponer entidades, temas y etiquetas;
- sugerir estructura de subtítulos y preguntas frecuentes;
- recomendar enlaces internos usando noticias existentes;
- revisar legibilidad, duplicidad y cobertura temática;
- generar alt text basado en la imagen y contexto, sujeto a revisión;
- crear un resumen de cambios y alertas verificables;
- generar JSON-LD desde datos editoriales, no como texto libre;
- marcar afirmaciones que requieran fuente, sin inventar fuentes.

### Controles obligatorios

- salida JSON con esquema estricto;
- temperatura baja para campos factuales;
- límites de longitud aplicados por código;
- ninguna publicación automática;
- registro de modelo, versión de prompt, fecha, entrada resumida y editor que aceptó;
- protección contra prompt injection contenida en artículos o embeds;
- exclusión de secretos, tokens y datos personales del prompt;
- timeouts, reintentos limitados y control de costo;
- idempotencia para evitar múltiples cargos por doble clic;
- estados `pending`, `completed`, `failed`, `stale`;
- edición manual siempre disponible;
- invalidar sugerencias cuando cambie sustancialmente el artículo.

## 8. Cambios de datos propuestos

Añadir a noticias un objeto separado, sin mezclar sugerencias con campos publicados:

```text
aiSeo:
  status
  generatedAt
  sourceContentHash
  provider
  model
  promptVersion
  suggestions
  scores
  warnings
  acceptedFields
  acceptedBy
  acceptedAt
```

No guardar razonamiento interno del modelo. Guardar solamente resultados, métricas, advertencias y auditoría.

También conviene normalizar:

- `publicationStatus` como fuente única de verdad;
- `canonicalUrl`;
- `imageSourceUrl`;
- `language`;
- autor como persona u organización;
- historial de cambios de slug con redirecciones 301.

## 9. Endpoints propuestos

- `POST /admin/noticias/:id/seo-ai/analyze`
- `GET /admin/noticias/:id/seo-ai`
- `POST /admin/noticias/:id/seo-ai/apply`
- `POST /admin/noticias/:id/seo-ai/regenerate`
- `GET /admin/noticias/:id/internal-link-candidates`

Todos deben exigir JWT y un rol editorial autorizado. `apply` debe aceptar una lista explícita de campos para permitir aprobación parcial.

## 10. Fases de implementación

### Fase 0 — saneamiento

- proteger endpoints de escritura;
- retirar/rotar secretos;
- unificar regla de publicación;
- corregir canonical, sitemaps, idioma y JSON-LD;
- establecer pruebas mínimas.

### Fase 1 — base SEO determinista

- servicio central de metadatos/canonical/schema;
- auditor SEO común para crear y editar;
- puntuación reproducible sin IA;
- pruebas unitarias de validación y schema.

### Fase 2 — asistente IA

- proveedor configurable desde backend;
- prompts versionados;
- respuestas JSON validadas;
- UI para generar, comparar y aceptar campo por campo;
- trazabilidad y presupuesto.

### Fase 3 — inteligencia de contenido

- enlaces internos;
- detección de canibalización;
- clusters temáticos;
- actualización de artículos antiguos;
- soporte específico para podcasts y eventos.

### Fase 4 — medición

- Search Console/analítica;
- CTR, impresiones, posición y tráfico orgánico;
- comparación antes/después;
- alertas por caída, contenido obsoleto o schema inválido.

## 11. Criterios de “listo”

- ninguna ruta de IA o publicación puede usarse sin autorización;
- la IA nunca publica directamente;
- cada sugerencia muestra el valor actual y el propuesto;
- el redactor puede aceptar campos individualmente;
- SSR entrega title, description, canonical, OG y JSON-LD correctos;
- [pendiente de migración editorial] borradores y no autorizadas nunca aparecen
  en sitemaps; por compatibilidad, hoy la elegibilidad todavía usa
  `autorizada` + `publishAt` y no puede exigir `state=published`;
- errores/noticias inexistentes entregan 404 y `noindex`;
- noticias, podcasts y eventos pasan validación de datos estructurados;
- existen pruebas de regresión para canonical, schemas y elegibilidad pública;
- costo, latencia y tasa de error de IA quedan registrados.

## 12. Próximo bloque de trabajo recomendado

Comenzar por la Fase 0 y la base determinista. Una vez estabilizada, implementar el primer botón del panel: **“Analizar con IA”**, limitado a título, keyword, slug, metadescripción, extracto, tags y advertencias, con aprobación campo por campo.

## 13. Avance implementado en `feature/seo-ia`

Respaldo previo a IA:

- rama: `main`;
- commit: `1382f0d0` (`docs: respaldo previo a SEO con IA`);
- respaldo confirmado en GitHub antes de iniciar estos cambios.

Base técnica ya implementada:

- regla pública compartida: `autorizada=true` y `publishAt` vacío o vencido;
- compatibilidad mantenida con el histórico: todavía no se filtra por `state`,
  porque 1,389 de las 1,390 noticias productivas no están marcadas como
  `published`;
- canonical único sobre `https://maslatino.com/noticia/:slug`;
- separación entre canonical e `imageSourceUrl`;
- sitemap general conectado al build, dominio apex, XML escapado y portada;
- news sitemap en español y limitado a las últimas 48 horas;
- `NewsArticle` con autor real cuando existe y fallback editorial;
- noticias inexistentes con respuesta SSR `404`, errores de dependencia con
  `503` y ambos con `noindex`;
- consultas con `?page=` excluidas de la caché CDN para no mezclar páginas;
- rutas administrativas con `X-Robots-Tag: noindex`;
- rutas de creación, edición, eliminación, autorización, lectura administrativa
  y firma de uploads protegidas con JWT y roles editoriales;
- eliminación del fallback inseguro `JWT_SECRET || "changeme"`;
- verificación del usuario administrador activo y de su rol actual en base de
  datos;
- credencial Firebase retirada del seguimiento de Git y carga por secreto de
  entorno;
- URI de MongoDB retirada de tres scripts de migración y sustituida por
  `MONGODB_URI`/`DB_URL`;
- token de Prerender retirado del código y sustituido por `PRERENDER_TOKEN`;
- recaché de noticias alineado con la elegibilidad pública para no precachear
  borradores, notas no autorizadas o publicaciones futuras;
- `contentUpdatedAt` separado de la actividad interna de IA para no falsear
  `dateModified` ni `lastmod`;
- almacenamiento preparado en `aiSeo`, sin guardar razonamiento interno.

Primer flujo SEO IA ya preparado:

- endpoints protegidos `GET /admin/seo-ai/status` y
  `POST /admin/seo-ai/analyze`;
- contrato estructurado para ocho campos seguros;
- validación de tamaño, texto plano y defensa contra instrucciones incrustadas;
- proveedor mock determinista, marcado visualmente como simulación y habilitable
  solo con `SEO_AI_MOCK=true`;
- componente compartido en crear y editar noticias;
- comparación entre valor actual y sugerido;
- aplicación manual campo por campo;
- aplicar un título no cambia el slug existente;
- ninguna sugerencia se guarda o publica automáticamente.

La credencial Firebase y la contraseña de MongoDB que estuvieron versionadas,
junto con el token histórico de Prerender, deben rotarse, porque retirarlas del
commit actual no las elimina del historial previo.

## 14. Proveedor real de IA implementado

El asistente ya no depende del mock. El proveedor real es **Anthropic (Claude)**
sobre `claude-opus-5`, elegido en lugar del OpenAI que asumía el andamiaje
inicial. La constante `gpt-5.6-sol` que quedó en la preparación nunca fue un
modelo verificado; se retiró junto con las variables `OPENAI_*`.

### Cómo se activa

| Variable | Efecto |
|---|---|
| `ANTHROPIC_API_KEY` | Activa el modo `live`. Es lo único obligatorio. |
| `SEO_AI_MOCK=true` | Fuerza la simulación local aunque exista credencial. Tiene prioridad para no gastar tokens sin querer en desarrollo. |
| Ninguna de las dos | El asistente queda en `disabled` y el botón permanece apagado. |

El resto de los ajustes (`ANTHROPIC_MODEL`, `ANTHROPIC_EFFORT`,
`ANTHROPIC_MAX_TOKENS`, `ANTHROPIC_TIMEOUT_MS`, `ANTHROPIC_MAX_RETRIES`,
`SEO_AI_IDEMPOTENCY_TTL_MS`, `SEO_AI_FALLBACK`) está documentado en
`backend/.env.example` con sus valores por defecto.

### Controles aplicados

- salida JSON con esquema estricto (`output_config.format`), no texto libre;
- los límites de longitud los aplica el código, no la confianza en el modelo:
  toda respuesta vuelve a pasar por el mismo saneador anti-inyección que ya
  filtraba el contenido editorial;
- el borrador viaja delimitado y el prompt declara que su contenido es material
  a analizar, nunca instrucciones a obedecer;
- `stop_reason: "refusal"` se detecta antes de leer el contenido y se traduce a
  un 422 explicable, en vez de tratarse como análisis válido;
- respuesta truncada por límite de tokens → error explícito, nunca JSON parcial;
- `timeout` configurable y un solo reintento automático;
- reintento en otro modelo (`fallbacks`) si el clasificador declina, degradando
  al endpoint estable si el SDK instalado no lo expone;
- idempotencia por `sourceContentHash` + modelo + versión de prompt: un doble
  clic sobre el mismo borrador reutiliza el análisis y no genera un segundo
  cargo;
- caché de prompt sobre el bloque de sistema para abaratar análisis repetidos;
- el proveedor real omite los campos donde no propone ningún cambio; el editor
  solo revisa diferencias reales.

### Telemetría

`GET /admin/seo-ai/status` devuelve, solo en modo `live`, un bloque `telemetry`
con análisis completados, reutilizados por caché, fallos, rechazos, tasa de
error, latencia media y costo estimado en USD. El panel lo muestra bajo el
estado del asistente. Los contadores viven en memoria por proceso: alcanzan para
vigilar el gasto desde el panel sin añadir almacenamiento nuevo, y se pierden al
reiniciar el backend.

Lo que **no** cambió: la IA sigue sin publicar nada, sin escribir en la noticia y
sin aplicar sugerencias por su cuenta. La aprobación campo por campo del editor
continúa siendo el único camino.

## 15. Bloqueadores restantes

- migrar y normalizar `state` antes de excluir borradores históricos
  autorizados;
- proteger y adaptar las mutaciones administrativas heredadas de podcasts,
  categorías, calendario, radio, streaming, correos y notificaciones;
- completar SEO específico y datos estructurados de podcasts y eventos;
- `backend/node_modules` está versionado (18.718 archivos rastreados). No
  bloquea el despliegue porque Render instala dependencias, pero conviene
  añadirlo a `.gitignore` y sacarlo del índice en un cambio aparte;
- ejecutar una prueba de humo contra la API real con la credencial puesta: la
  suite actual cubre el contrato con un cliente falso, no la red.

## 16. Verificación actual

- backend: 29 pruebas pasan (`npm test` en `backend/`);
- frontend Angular SSR: build de producción correcto;
- advertencias de build restantes: preexistentes y no bloqueantes;
- corregido de paso un desbordamiento de un carácter en el recorte por palabras
  (`compactAtWord`) que afectaba también al mock.
