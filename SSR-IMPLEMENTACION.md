# SSR Implementación — Mas Latino

> Documentación completa de la implementación de Server-Side Rendering (SSR) de Angular 20 sobre Netlify para **maslatino.com**.
> Última actualización: **2026-06-24**. Estado: **✅ FUNCIONANDO EN PRODUCCIÓN**.

---

## 1. ¿Por qué SSR? (el objetivo)

Cuando alguien comparte una noticia (`/noticia/:slug`) en WhatsApp, Facebook, X/Twitter o LinkedIn, el bot de esa red social hace un `GET` a la URL y **lee el HTML crudo de la respuesta** — no ejecuta JavaScript. Sin SSR, una SPA de Angular devuelve un `index.html` vacío (solo `<app-root></app-root>`), por lo que el bot no ve título, imagen ni descripción → el preview sale en blanco.

**SSR resuelve esto**: el servidor (Edge Function de Netlify) ejecuta Angular, renderiza la noticia, e inyecta en el `<head>` los meta tags reales:

- `og:title`, `og:description`, `og:image`, `og:url`, `og:type=article`
- `twitter:card=summary_large_image`, `twitter:title`, `twitter:image`
- `<link rel="canonical">`
- `<script type="application/ld+json">` con `NewsArticle` (Google News / SEO)
- `<h1>` y el contenido real de la noticia

---

## 2. Stack y arquitectura

```
Visitante / Bot social
        │  GET https://maslatino.com/noticia/mi-noticia
        ▼
┌─────────────────────────────────────────────────────────┐
│  Netlify CDN                                             │
│   └─ Edge Function (Deno)  ← generada por               │
│        @netlify/angular-runtime@4                        │
│        importa: server.mjs → netlifyAppEngineHandler     │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  server.mjs  (bundle SSR de Angular)                    │
│   1. import manifest from './angular-app-engine-manifest'│
│   2. ɵsetAngularAppEngineManifest(manifest)  ← CLAVE     │
│   3. new AngularAppEngine()                              │
│   4. AngularAppEngine.handle(request)                   │
│        └─ renderiza App con app.config.server.ts        │
└──────────────────────┬──────────────────────────────────┘
                       ▼  (HTTP al backend para traer la noticia)
┌─────────────────────────────────────────────────────────┐
│  Backend API (Render / OnRender)                        │
│   https://maslatinoregular.onrender.com/aaron/maslatino  │
└─────────────────────────────────────────────────────────┘
```

### Versiones instaladas (verificadas 2026-06-24)

| Paquete | Versión |
|---|---|
| `@angular/core` | 20.3.4 |
| `@angular/ssr` | 20.3.9 |
| `@angular/build` | 20.3.5 |
| `@netlify/angular-runtime` | 4.0.0 |
| Node (local) | 22.16.0 |
| Node (CI / GitHub Actions) | 24 |

> ⚠️ `@netlify/angular-runtime@4` requiere Node `^22.22.0 || ^24.13.1 || >=26.0.0`. La máquina local tiene 22.16.0 (no cumple), por eso **el deploy se hace por GitHub Actions con Node 24**, no localmente.

---

## 3. 🔑 EL FIX QUE LO HIZO FUNCIONAR

> **Si solo lees una sección, lee esta.**

### Síntoma

El build de Netlify fallaba al bundlear la Edge Function con:

```
Error: Angular app engine manifest is not set. Please ensure you are using
the '@angular/build:application' builder to build your server application.
   at LU (.../server/chunk-XXXX.mjs)
   at new e (.../server/chunk-XXXX.mjs)   ← new AngularAppEngine()
   at .../server/server.mjs:2:161
```

La página mostraba **"Page not found"**.

### Causa raíz

`AngularAppEngine` necesita que **antes** de instanciarse se llame a `ɵsetAngularAppEngineManifest(manifest)`. Ese manifest se genera como `dist/.../server/angular-app-engine-manifest.mjs`, **pero nadie lo importaba ni lo inicializaba** → el archivo quedaba huérfano y `new AngularAppEngine()` reventaba.

¿Por qué? Porque en `angular.json` **faltaba `"outputMode": "server"`**. Sin esa opción, el builder de Angular toma el camino **viejo** (`isOldBehaviour = true` en `application-code-bundle.js`): bundlea `server.ts` directo como entry point, **sin** envolverlo con la inicialización del manifest.

### El fix

Una sola línea en [`frontend/angular.json`](frontend/angular.json):

```jsonc
"architect": {
  "build": {
    "builder": "@angular/build:application",
    "options": {
      "outputPath": "dist/nombre-proyecto",
      "outputMode": "server",        // ◄◄◄ ESTA LÍNEA
      "browser": "src/main.ts",
      "server": "src/main.server.ts",
      "ssr": { "entry": "src/server.ts" },
      "prerender": false,
      ...
    }
  }
}
```

### Por qué funciona

Con `outputMode: "server"`, Angular usa `createSsrEntryCodeBundleOptions` (en `@angular/build/.../application-code-bundle.js`), que envuelve nuestro `server.ts` con un módulo virtual:

```js
// inyectado automáticamente por Angular ANTES de nuestro código:
import manifest from './angular-app-engine-manifest.mjs';
import { ɵsetAngularAppEngineManifest } from '@angular/ssr';
ɵsetAngularAppEngineManifest(manifest);
// ...luego corre nuestro server.ts → new AngularAppEngine() YA tiene el manifest
```

Se puede verificar en el bundle compilado `dist/nombre-proyecto/server/server.mjs`:

```js
import N from "./angular-app-engine-manifest.mjs";   // ① importa manifest
function R(r){l=r}                                     // ② R = setAngularAppEngineManifest
...
R(N);                                                  // ③ setea el manifest
var _=new f;                                           // ④ new AngularAppEngine() — ya con manifest
export{ ... P as netlifyAppEngineHandler, I as reqHandler };
```

**La estructura de salida no cambia** (`dist/nombre-proyecto/browser` y `dist/nombre-proyecto/server` siguen igual), así que el `publish` de Netlify y el plugin siguen funcionando sin tocar nada más.

---

## 4. Archivos clave del SSR (qué hace cada uno)

### `frontend/angular.json`
Configuración del builder. Lo esencial para SSR:
- `"outputMode": "server"` — **obligatorio** (ver sección 3).
- `"server": "src/main.server.ts"` — entry de bootstrap del servidor.
- `"ssr": { "entry": "src/server.ts" }` — entry del handler HTTP (custom).
- `"prerender": false` — no pre-generamos HTML estático; todo se renderiza on-demand.

### `frontend/src/server.ts`
Handler HTTP que Netlify invoca. **No tocar la firma** — el plugin de Netlify detecta el modo "AppEngine" por el export `netlifyAppEngineHandler`.

```ts
import { AngularAppEngine, createRequestHandler } from '@angular/ssr'
import { getContext } from '@netlify/angular-runtime/app-engine.js'

const angularAppEngine = new AngularAppEngine()

export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const context = getContext()
  const result = await angularAppEngine.handle(request, context)
  return result || new Response('Not found', { status: 404 })
}

export const reqHandler = createRequestHandler(netlifyAppEngineHandler)
```

> Nota: el `new AngularAppEngine()` a nivel de módulo es **seguro** porque `outputMode: server` garantiza que Angular inyecte el `ɵsetAngularAppEngineManifest()` antes de que este código corra. No agregues lazy-init manual ni imports del manifest aquí — Angular lo hace por ti.

### `frontend/src/main.server.ts`
Bootstrap de la app en el servidor.

```ts
import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, config, context);
export default bootstrap;
```

### `frontend/src/app/app.config.server.ts`
Config específica de servidor — registra las rutas SSR.

```ts
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [ provideServerRendering(withRoutes(serverRoutes)) ]
};
export const config = mergeApplicationConfig(appConfig, serverConfig);
```

### `frontend/src/app/app.routes.server.ts`
**El mapa de qué se renderiza dónde.** Cada ruta declara su `RenderMode`:

- `RenderMode.Server` → SSR real (HTML generado por el servidor). Úsalo para **todo lo público con SEO**: home, `noticia/:slug`, `categoria/:slug`, `archivo/:anio/:mes`, etc.
- `RenderMode.Client` → solo cliente, NUNCA SSR. Úsalo para **admin** (`admin-panel`, etc.), páginas que dependen de APIs del browser (`localStorage`, `window`), o componentes browser-only (ej. `@mux/mux-player`).
- `{ path: '**', renderMode: RenderMode.Client }` → fallback seguro: cualquier ruta no listada NO intenta SSR.

> ⚠️ Los patrones deben coincidir **exactamente** con las rutas cliente: `noticia/:slug` (no `noticias/:slug`), `categoria/:slug`, `archivo/:anio/:mes`.

### `frontend/src/app/interceptors/ssr-strip-cookies.interceptor.ts`
Interceptor HTTP que **elimina headers `Cookie`/`Authorization`/`X-Forwarded-For`** en las peticiones que el SSR hace al backend. Sin esto, el entorno Deno/Edge reenvía headers gigantes del visitante → backend (openresty) responde **400 "Request Header Or Cookie Too Large"**. Registrado en `app.config.ts` con `withInterceptors([ssrStripCookiesInterceptor])`.

### `netlify.toml` (raíz del repo)
```toml
[build]
  base    = "frontend"
  command = "npm run build"
  publish = "dist/nombre-proyecto/browser"

[build.environment]
  NODE_VERSION = "22"

[[plugins]]
  package = "@netlify/angular-runtime"

# NO agregar [[redirects]] con "/* /index.html 200" — rompería el SSR.
```

> 🚫 **NUNCA** agregar un fallback SPA (`/* /index.html 200`) ni en `netlify.toml` ni en `public/_redirects`. Interceptaría TODAS las requests antes de la Edge Function y mataría el SSR.

### `.github/workflows/netlify-deploy.yml`
Pipeline de deploy (ver sección 6).

---

## 5. Cómo se genera el preview SEO (meta tags)

El componente [`frontend/src/app/pages/noticias-individuales/noticias-individuales.ts`](frontend/src/app/pages/noticias-individuales/noticias-individuales.ts) es el corazón del SEO. En el `tap()` del stream `noticia$`:

1. **Title + meta** con `Title` y `Meta` de `@angular/platform-browser` (funcionan en SSR y browser).
2. **`og:image`** pasa por `ensureAbsoluteHttpsUrl()` → siempre URL `https://` absoluta (los bots rechazan relativas/http). Fallback a `https://maslatino.com/assets/og.jpg`.
3. **Canonical** — se inserta en SSR **y** browser, sin duplicar (busca `link[rel="canonical"]` existente y lo actualiza).
4. **JSON-LD `NewsArticle`** — `<script type="application/ld+json" data-noticia>`. El atributo `data-noticia` permite deduplicar en navegación client-side.
5. **Description** — strip de HTML + truncado a 300 chars.

Patrón importante para SSR seguro:
- `isPlatformServer()` / `isPlatformBrowser()` guardan todo lo que toca APIs del browser.
- En el `constructor`, las llamadas que solo aplican al cliente (categorías, recientes) van dentro de `if (!isPlatformServer(...))`.

---

## 6. Cómo desplegar

### Por qué NO desde la máquina local
- Node local = 22.16.0 → no cumple el requisito de `@netlify/angular-runtime@4`.
- Los créditos de build de Netlify CI se agotaron en algún punto ("account credit usage exceeded").

### Deploy por GitHub Actions (método actual)

Archivo: [`.github/workflows/netlify-deploy.yml`](.github/workflows/netlify-deploy.yml). Se dispara con cada `push` a `main`:

```yaml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - working-directory: frontend
        run: npm ci
      - working-directory: frontend
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
        run: npx netlify-cli deploy --build --prod --auth $NETLIFY_AUTH_TOKEN --site $NETLIFY_SITE_ID
```

**Secrets necesarios** (GitHub → Settings → Secrets and variables → Actions):
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID` (este sitio: `8ff7c2a2-02b2-4e9a-9056-b00be101c023`)

**Para desplegar:**
```bash
git add -A
git commit -m "tu cambio"
git push origin main
# → GitHub Actions corre, buildea con Node 24, y hace deploy --prod a Netlify (~3-5 min)
```
Ver progreso en `github.com/AaronTheReal/MaslatinoRegular/actions`.

### Build local (solo para verificar, NO deploya)
```bash
cd frontend
npm run build              # genera dist/nombre-proyecto/{browser,server}
npm run serve:ssr:frontend # corre el SSR en Node localmente para probar
```

---

## 7. Cómo agregar una ruta nueva con SSR

1. Crear el componente y su ruta cliente en `app.routes.ts`.
2. Agregar la ruta en [`frontend/src/app/app.routes.server.ts`](frontend/src/app/app.routes.server.ts) con el `RenderMode` correcto:
   - ¿Es pública y necesita SEO/preview social? → `RenderMode.Server`.
   - ¿Es admin, usa `localStorage`/`window`, o librerías browser-only? → `RenderMode.Client`.
3. El patrón debe **coincidir exacto** con la ruta cliente (`:slug`, `:id`, `:anio/:mes`...).
4. Si el componente toca APIs del browser, guárdalo con `isPlatformBrowser()` / `afterNextRender()`.
5. Si setea meta tags, hazlo con `Title`/`Meta` (no manipules `document` directo sin `Renderer2`).

---

## 8. Troubleshooting (errores que ya vivimos y su fix)

| Error | Causa | Fix |
|---|---|---|
| `Angular app engine manifest is not set` | Falta `outputMode: "server"` en `angular.json`; el manifest queda huérfano | Agregar `"outputMode": "server"` (sección 3) |
| `400 Request Header Or Cookie Too Large / openresty` | SSR reenvía cookies/headers gigantes del visitante al backend | `ssr-strip-cookies.interceptor.ts` registrado en `app.config.ts` |
| `Page not found` en todas las rutas | Fallback SPA `/* /index.html 200` interceptando antes de la Edge Function | Quitar redirects SPA de `netlify.toml` y `public/_redirects` |
| Bundle SSR crashea al cargar | `import '@mux/mux-player'` top-level (browser-only) | Mover a `afterNextRender(() => import(...))` con guard `isPlatformBrowser` |
| Crash SSR en home | `window.innerWidth` en `ngOnInit` sin guard (`publicidad.ts`) | Guardar con `isPlatformBrowser()` |
| `localStorage is not defined` en SSR | `admin-auth.guard.ts` usa `localStorage` directo | Guard `isPlatformBrowser()` antes de acceder |
| `TS2305: '@netlify/angular-runtime/app-engine' has no exported member 'netlifyAppEngineHandler'` | `server.ts` importaba un export inexistente | Usar el template correcto: `AngularAppEngine` + export propio `netlifyAppEngineHandler` |
| Deploy local falla por Node version | Node 22.16.0 < requisito de `@netlify/angular-runtime@4` | Deploy por GitHub Actions con Node 24 |
| Netlify CI "account credit usage exceeded" | Créditos de build agotados | Build+deploy desde GitHub Actions (no Netlify CI) |
| Preview social sin imagen | `og:image` relativa o `http://` | `ensureAbsoluteHttpsUrl()` → siempre `https://` absoluta |
| Canonical / JSON-LD duplicados al navegar | Se insertaban sin checar si ya existían | Buscar existente y actualizar; JSON-LD con attr `data-noticia` |

---

## 9. Checklist de verificación post-deploy

Probar sobre la URL de producción / preview de Netlify:

```bash
# Ver el HTML crudo que ven los bots (debe traer los meta tags, NO estar vacío):
curl -s https://maslatino.com/noticia/<un-slug-real> | grep -E 'og:title|og:image|twitter:card|canonical|application/ld\+json|<h1'
```

Debe aparecer:
- [ ] `<meta property="og:title" ...>` con el título real
- [ ] `<meta property="og:image" ...>` con URL `https://` absoluta
- [ ] `<meta name="twitter:card" content="summary_large_image">`
- [ ] `<link rel="canonical" href="https://maslatino.com/noticia/...">`
- [ ] `<script type="application/ld+json" data-noticia>` con `NewsArticle`
- [ ] `<h1>` con el contenido de la noticia

Validadores externos:
- Facebook: https://developers.facebook.com/tools/debug/
- X/Twitter: https://cards-dev.twitter.com/validator
- Google Rich Results: https://search.google.com/test/rich-results

> Las rutas `admin-*` deben seguir siendo SPA (Client) — verificar que NO se rendericen en servidor.

---

## 10. Datos de referencia

- **Repo:** github.com/AaronTheReal/MaslatinoRegular
- **Frontend prod:** https://maslatino.com
- **Backend API:** https://maslatinoregular.onrender.com/aaron/maslatino
- **Netlify Site ID:** `8ff7c2a2-02b2-4e9a-9056-b00be101c023`
- **Auth:** `localStorage` (NO cookies) — `admin_token`, `admin_user`
- **Commit del fix final:** `ec682b42` — "fix: add outputMode=server to enable Angular manifest injection for SSR"
