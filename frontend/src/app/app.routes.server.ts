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
  {
    path: 'noticia/*',
    renderMode: RenderMode.Server
  },

  
];