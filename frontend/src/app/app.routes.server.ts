import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'noticias-recientes',
    renderMode: RenderMode.Prerender
  },
  { path: 'sobre-nosotros',
    renderMode: RenderMode.Prerender
  },
  /*
  {
    path: 'noticia/*',
    renderMode: RenderMode.Server
  },
  */
  {
    path: ':slug',
    renderMode: RenderMode.Server
  },

  // Admin: solo cliente (sin SSR/SEO)
  { path: 'admin-panel', renderMode: RenderMode.Client },
  { path: 'usuarios-panel', renderMode: RenderMode.Client },
  { path: 'calendario-panel', renderMode: RenderMode.Client },
  { path: 'calendario-panel-pc', renderMode: RenderMode.Client },
  { path: 'multimedia-panel', renderMode: RenderMode.Client },
  { path: 'noticias-panel', renderMode: RenderMode.Client },
  { path: 'podcast-panel', renderMode: RenderMode.Client },
  { path: 'radio-panel', renderMode: RenderMode.Client },
  { path: 'categorias-panel', renderMode: RenderMode.Client },
  { path: 'admin-noticias', renderMode: RenderMode.Client },
    { path: 'admin-login',renderMode: RenderMode.Client },

{ path: 'admin/noticiaseditar/*', renderMode: RenderMode.Client },

  { path: 'archivo/:anio/*',  renderMode: RenderMode.Server },
  { path: 'categoria/*',  renderMode:  RenderMode.Server },
  { path: 'eventos-show', renderMode: RenderMode.Server },
  { path: 'recomendadas-show', renderMode: RenderMode.Server },
  { path: 'podcast-show', renderMode: RenderMode.Server },
  {path: 'descarga-la-app', renderMode: RenderMode.Client},
  {path: 'nosotros-pagina', renderMode: RenderMode.Client},
  {path: 'noticias-todas', renderMode: RenderMode.Client},
    {path: 'prueba-component', renderMode: RenderMode.Client},
        {path: 'contactanos', renderMode: RenderMode.Client},

  
              
      
  
];