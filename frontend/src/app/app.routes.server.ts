import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // ── Home ─────────────────────────────────────────────────────────────────
  // Server (no Prerender) porque el contenido cambia frecuentemente
  { path: '', renderMode: RenderMode.Server },
  { path: 'noticias-recientes', renderMode: RenderMode.Server },

  // ── Noticias (SEO crítico) ────────────────────────────────────────────────
  // Usar ':slug' exacto para que coincida con la ruta cliente 'noticia/:slug'
  { path: 'noticia/:slug', renderMode: RenderMode.Server },

  // ── Admin: solo cliente, NUNCA SSR ───────────────────────────────────────
  { path: 'admin-login',              renderMode: RenderMode.Client },
  { path: 'admin-panel',              renderMode: RenderMode.Client },
  { path: 'usuarios-panel',           renderMode: RenderMode.Client },
  { path: 'calendario-panel',         renderMode: RenderMode.Client },
  { path: 'calendario-panel-pc',      renderMode: RenderMode.Client },
  { path: 'multimedia-panel',         renderMode: RenderMode.Client },
  { path: 'noticias-panel',           renderMode: RenderMode.Client },
  { path: 'podcast-panel',            renderMode: RenderMode.Client },
  { path: 'radio-panel',              renderMode: RenderMode.Client },
  { path: 'categorias-panel',         renderMode: RenderMode.Client },
  { path: 'admin-noticias',           renderMode: RenderMode.Client },
  { path: 'correos-panel',            renderMode: RenderMode.Client },
  { path: 'admin/noticiaseditar/:id', renderMode: RenderMode.Client },

  // ── Contenido público con SEO ─────────────────────────────────────────────
  // ':anio/:mes' exacto para coincidir con la ruta cliente 'archivo/:anio/:mes'
  { path: 'archivo/:anio/:mes',   renderMode: RenderMode.Server },
  // ':slug' exacto para coincidir con 'categoria/:slug'
  { path: 'categoria/:slug',      renderMode: RenderMode.Server },
  { path: 'eventos-show',         renderMode: RenderMode.Server },
  { path: 'recomendadas-show',    renderMode: RenderMode.Server },
  { path: 'podcast-show',         renderMode: RenderMode.Server },
  { path: 'podcast-show/:id',     renderMode: RenderMode.Server },

  // podcast-pagina: SSR para SEO/previews al compartir (og:image, etc.).
  // @mux/mux-player se importa solo en browser y el preload de imágenes
  // está guardado con isPlatformBrowser — seguro en servidor.
  { path: 'podcast-pagina/:id',   renderMode: RenderMode.Server },

  // Link corto / vanity URL → Client (redirige a podcast-pagina en el cliente)
  { path: 'podcasts/mass250',     renderMode: RenderMode.Client },

  // URL bonita de podcasts → SSR (los bots ven los meta tags al compartir)
  { path: 'podcasts/:slug',       renderMode: RenderMode.Server },

  // ── Páginas estáticas: Prerender (HTML generado en build) ────────────────
  // Se sirven como archivos estáticos desde el CDN SIN pasar por la Edge
  // Function (quedan en su excludedPath) → primera visita instantánea.
  // Con Client, cada visita invocaba la función (cold start ~3s medido).
  { path: 'descarga-la-app',      renderMode: RenderMode.Prerender },
  { path: 'nosotros-pagina',      renderMode: RenderMode.Prerender },
  { path: 'contactanos',          renderMode: RenderMode.Prerender },
  { path: 'privacy-policy',       renderMode: RenderMode.Prerender },
  { path: 'terminos-condiciones', renderMode: RenderMode.Prerender },

  // noticias-todas carga sus datos en el cliente; su shell se cachea en CDN
  // (ver server.ts). prueba-component es interno, sin tráfico real.
  { path: 'noticias-todas',       renderMode: RenderMode.Client },
  { path: 'prueba-component',     renderMode: RenderMode.Client },

  // ── Fallback: Client para evitar SSR inesperado en rutas no listadas ─────
  { path: '**', renderMode: RenderMode.Client },
];
