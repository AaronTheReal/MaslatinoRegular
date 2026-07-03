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

  // podcast-pagina usa @mux/mux-player (browser-only) → Client hasta que se migre
  { path: 'podcast-pagina/:id',   renderMode: RenderMode.Client },

  // Link corto / vanity URL → Client (redirige a podcast-pagina en el cliente)
  { path: 'podcasts/mass250',     renderMode: RenderMode.Client },

  // ── Páginas estáticas sin SEO crítico ────────────────────────────────────
  { path: 'descarga-la-app',      renderMode: RenderMode.Client },
  { path: 'nosotros-pagina',      renderMode: RenderMode.Client },
  { path: 'noticias-todas',       renderMode: RenderMode.Client },
  { path: 'prueba-component',     renderMode: RenderMode.Client },
  { path: 'contactanos',          renderMode: RenderMode.Client },
  { path: 'privacy-policy',       renderMode: RenderMode.Client },
  { path: 'terminos-condiciones', renderMode: RenderMode.Client },

  // ── Fallback: Client para evitar SSR inesperado en rutas no listadas ─────
  { path: '**', renderMode: RenderMode.Client },
];
