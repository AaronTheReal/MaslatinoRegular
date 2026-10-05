import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsUs from '@angular/common/locales/es-US';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { routes } from './app.routes';
import { ssrStripCookiesInterceptor } from './interceptors/ssr-strip-cookies.interceptor';
import { ssrTimeoutInterceptor } from './interceptors/ssr-timeout.interceptor';

// Español de EE. UU.: fechas en español ("21 de septiembre de 2026") con
// números al estilo estadounidense (1,234.5). Sin esto el pipe `date` usaba
// en-US y el sitio mostraba "September 21, 2026". Corre igual en el servidor
// y en el navegador (app.config.server.ts extiende este), así que el HTML del
// SSR y el de la hidratación coinciden.
registerLocaleData(localeEsUs);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-US' },
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