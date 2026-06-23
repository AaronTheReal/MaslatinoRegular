import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';

/**
 * Elimina cookies y headers de autenticación de las peticiones HTTP
 * que Angular SSR hace al backend (Render/OnRender).
 *
 * Sin este interceptor, algunos entornos SSR (Deno / Netlify Edge)
 * pueden heredar headers del request entrante del visitante y
 * reenviarlos al backend, causando el error:
 *   400 Bad Request — Request Header Or Cookie Too Large — openresty
 *
 * Las páginas públicas de noticias no necesitan cookies de sesión.
 */
export const ssrStripCookiesInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformServer(platformId)) {
    return next(req);
  }

  const cleanReq = req.clone({
    headers: req.headers
      .delete('cookie')
      .delete('Cookie')
      .delete('authorization')
      .delete('Authorization')
      .delete('x-forwarded-for')
      .delete('X-Forwarded-For'),
  });

  return next(cleanReq);
};
