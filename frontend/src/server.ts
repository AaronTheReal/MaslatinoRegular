import { AngularAppEngine, createRequestHandler } from '@angular/ssr'
import { getContext } from '@netlify/angular-runtime/app-engine.js'

const angularAppEngine = new AngularAppEngine()

// Paginas publicas cuyo HTML puede servirse desde el CDN de Netlify. La Edge
// Function se despliega con cache: "manual", asi que el CDN respeta estas
// cabeceras. Sin cache, cada primera visita paga el cold start de la funcion
// (~3s medido) mas, en rutas SSR, las llamadas al backend de Render. El
// contenido no varia por usuario (auth va en localStorage y el interceptor
// SSR ya quita cookies). Netlify purga el cache en cada deploy.

// SSR con datos: 5 min fresco, hasta 1 dia sirviendo stale mientras regenera.
const SSR_CACHE_EXACT = new Set(['/', '/noticias-recientes', '/eventos-show', '/recomendadas-show', '/podcast-show', '/cities'])
const SSR_CACHE_PREFIXES = ['/noticia/', '/categoria/', '/archivo/', '/podcasts/', '/podcast-pagina/', '/podcast-show/', '/cities/']
const SSR_CDN_CACHE = 'public, s-maxage=300, stale-while-revalidate=86400, durable'

/**
 * Lo unico del query string que cambia lo que se renderiza es `page`, la
 * paginacion de /categoria y /archivo (noticias-despliegue.ts).
 *
 * El resto —fbclid, utm_*, gclid...— lo pega Facebook, WhatsApp o el boletin
 * al compartir. Por defecto el CDN mete el query string en la clave de cache,
 * asi que cada clic llegaba con un fbclid distinto, era un MISS y pagaba su
 * propia invocacion de la Edge Function. Con `Netlify-Vary` todos esos clics
 * comparten una sola copia.
 */
const CACHE_VARY = 'query=page'

/**
 * Un 404 tambien se cachea un rato: los escaneos de bots (/wp-login.php,
 * /.env) y los enlaces roros repiten la misma URL en rafagas, y cada intento
 * renderizaba Angular entero para devolver "no existe". Cinco minutos cortan
 * la rafaga sin retrasar mucho una nota que se acabe de publicar con un slug
 * que alguien ya habia pedido.
 */
const NOT_FOUND_CDN_CACHE = 'public, s-maxage=300, stale-while-revalidate=3600, durable'

// Shells client-only (HTML identico, datos cargan en el navegador):
// solo cambian con un deploy, que ya purga el cache → TTL largo.
const SHELL_CACHE_EXACT = new Set(['/noticias-todas'])
const SHELL_CDN_CACHE = 'public, s-maxage=86400, stale-while-revalidate=604800, durable'
const NOINDEX_EXACT = new Set([
  '/admin-login',
  '/admin-panel',
  '/usuarios-panel',
  '/calendario-panel',
  '/calendario-panel-pc',
  '/multimedia-panel',
  '/noticias-panel',
  '/podcast-panel',
  '/radio-panel',
  '/categorias-panel',
  '/admin-noticias',
  '/correos-panel',
  '/prueba-component',
])
const NOINDEX_PREFIXES = ['/admin/']

function cdnCacheFor(pathname: string): string | null {
  if (SSR_CACHE_EXACT.has(pathname)) return SSR_CDN_CACHE
  if (SSR_CACHE_PREFIXES.some((p) => pathname.startsWith(p))) return SSR_CDN_CACHE
  if (SHELL_CACHE_EXACT.has(pathname)) return SHELL_CDN_CACHE
  return null
}

function mustNotBeIndexed(pathname: string): boolean {
  return NOINDEX_EXACT.has(pathname)
    || NOINDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function withCdnCache(response: Response, cdnCache: string | null): Response {
  if (!cdnCache) return response

  const headers = new Headers(response.headers)
  // Navegador: revalida siempre (la revalidacion al edge es rapida).
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  headers.set('Netlify-CDN-Cache-Control', cdnCache)
  headers.set('Netlify-Vary', CACHE_VARY)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const context = getContext()
  const result = await angularAppEngine.handle(request, context)
  const isGet = request.method === 'GET'

  if (!result) {
    return withCdnCache(
      new Response('Not found', { status: 404 }),
      isGet ? NOT_FOUND_CDN_CACHE : null
    )
  }

  const url = new URL(request.url)
  if (mustNotBeIndexed(url.pathname)) {
    const headers = new Headers(result.headers)
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    headers.set('Cache-Control', 'private, no-store')
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers
    })
  }

  // El 404 que renderiza Angular (una nota borrada) se cachea igual que el de
  // arriba. Un 5xx NUNCA: son fallos pasajeros del backend de Render y
  // quedarian servidos en frio durante minutos.
  const cdnCache = !isGet
    ? null
    : result.status === 404
      ? NOT_FOUND_CDN_CACHE
      : result.ok
        ? cdnCacheFor(url.pathname)
        : null

  return withCdnCache(result, cdnCache)
}

export const reqHandler = createRequestHandler(netlifyAppEngineHandler)
