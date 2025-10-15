import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Archivos estáticos de /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Micro-caché para la portada (SSR):
 *  - Cache CDN/proxy 5 minutos
 *  - stale-while-revalidate 60 minutos
 * Nota: La invalidación “real” la haces purgando "/" en tu CDN al publicar.
 */
app.use((req, res, next) => {
  // Solo GET a la home exacta
  if (req.method === 'GET' && (req.path === '/' || req.path === '')) {
    // Para CDNs/proxies (s-maxage) y SWR
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    // Buena práctica: indicar que el HTML puede variar por compresión/cookies si las usas
    res.setHeader('Vary', 'Accept-Encoding, Cookie');
  }
  next();
});

/**
 * SSR para el resto de las rutas
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Arranque del servidor si es el entry principal.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Handler para Angular CLI / funciones (cuando aplica)
 */
export const reqHandler = createNodeRequestHandler(app);
