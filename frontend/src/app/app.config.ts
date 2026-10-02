import { ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { routes } from './app.routes';
import { ssrStripCookiesInterceptor } from './interceptors/ssr-strip-cookies.interceptor';
import { ssrTimeoutInterceptor } from './interceptors/ssr-timeout.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      })
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([ssrStripCookiesInterceptor, ssrTimeoutInterceptor])
    ),
    // /noticias/recientes no entra en la caché HTTP de hidratación: el
    // NoticiasService ya guarda su propia copia en TransferState, así que
    // esa respuesta (con el cuerpo completo de cada nota) viajaba dos veces
    // dentro del HTML. El resto de peticiones se cachean igual que antes.
    provideClientHydration(
      withHttpTransferCacheOptions({
        filter: (req) => !req.url.includes('/noticias/recientes'),
      })
    )
  ]
};