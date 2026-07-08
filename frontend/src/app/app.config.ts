import { ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
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
    provideClientHydration()
  ]
};