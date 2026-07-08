import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { timeout } from 'rxjs';

/**
 * Limite de espera para llamadas HTTP durante el render SSR.
 * El backend en Render (plan gratis) se duerme tras ~15 min de inactividad
 * y tarda 30-60s en despertar; sin este limite, Angular no responde el HTML
 * hasta que TODAS las llamadas del home terminan → pagina en blanco ~1 min.
 * Con el limite, el SSR entrega el shell (las secciones se rellenan en el
 * cliente al re-intentar, porque el TransferState queda vacio en timeout).
 * Solo aplica en servidor; en el navegador no se corta nada.
 */
export const SSR_HTTP_TIMEOUT_MS = 5000;

export const ssrTimeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformServer(platformId)) {
    return next(req);
  }
  return next(req).pipe(timeout(SSR_HTTP_TIMEOUT_MS));
};
