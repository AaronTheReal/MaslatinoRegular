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
const SSR_CACHE_EXACT = new Set(['/', '/noticias-recientes', '/eventos-show', '/recomendadas-show', '/podcast-show'])
const SSR_CACHE_PREFIXES = ['/noticia/', '/categoria/', '/archivo/', '/podcasts/', '/podcast-pagina/', '/podcast-show/']
const SSR_CDN_CACHE = 'public, s-maxage=300, stale-while-revalidate=86400, durable'

// Shells client-only (HTML identico, datos cargan en el navegador):
// solo cambian con un deploy, que ya purga el cache → TTL largo.
const SHELL_CACHE_EXACT = new Set(['/noticias-todas'])
const SHELL_CDN_CACHE = 'public, s-maxage=86400, stale-while-revalidate=604800, durable'

function cdnCacheFor(pathname: string): string | null {
  if (SSR_CACHE_EXACT.has(pathname)) return SSR_CDN_CACHE
  if (SSR_CACHE_PREFIXES.some((p) => pathname.startsWith(p))) return SSR_CDN_CACHE
  if (SHELL_CACHE_EXACT.has(pathname)) return SHELL_CDN_CACHE
  return null
}

export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const context = getContext()
  const result = await angularAppEngine.handle(request, context)
  if (!result) {
    return new Response('Not found', { status: 404 })
  }

  const { pathname } = new URL(request.url)
  const cdnCache = request.method === 'GET' && result.ok ? cdnCacheFor(pathname) : null
  if (cdnCache) {
    const headers = new Headers(result.headers)
    // Navegador: revalida siempre (la revalidacion al edge es rapida).
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
    headers.set('Netlify-CDN-Cache-Control', cdnCache)
    return new Response(result.body, { status: result.status, statusText: result.statusText, headers })
  }

  return result
}

export const reqHandler = createRequestHandler(netlifyAppEngineHandler)
