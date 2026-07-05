import { AngularAppEngine, createRequestHandler } from '@angular/ssr'
import { getContext } from '@netlify/angular-runtime/app-engine.js'

const angularAppEngine = new AngularAppEngine()

// Rutas SSR cuyo HTML puede servirse desde el CDN de Netlify. La Edge Function
// se despliega con cache: "manual", asi que el CDN respeta estas cabeceras.
// Sin cache, cada primera visita paga cold start de la funcion + las llamadas
// al backend de Render (30-60s si esta dormido). El contenido no varia por
// usuario (auth va en localStorage y el interceptor SSR ya quita cookies).
const CDN_CACHEABLE_PATHS = new Set(['/'])

export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const context = getContext()
  const result = await angularAppEngine.handle(request, context)
  if (!result) {
    return new Response('Not found', { status: 404 })
  }

  const { pathname } = new URL(request.url)
  if (request.method === 'GET' && result.ok && CDN_CACHEABLE_PATHS.has(pathname)) {
    const headers = new Headers(result.headers)
    // Navegador: revalida siempre (la revalidacion al edge es rapida).
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
    // CDN: 5 min fresco; hasta 1 dia sirve stale al instante mientras
    // regenera en segundo plano. Netlify purga solo en cada deploy.
    headers.set('Netlify-CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400, durable')
    return new Response(result.body, { status: result.status, statusText: result.statusText, headers })
  }

  return result
}

export const reqHandler = createRequestHandler(netlifyAppEngineHandler)
