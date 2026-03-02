import { ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';   // ← modificado
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, 
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',   // ← siempre arriba al cambiar de página
        anchorScrolling: 'enabled'          // opcional pero recomendado
      })
    ),
    provideHttpClient(withFetch()),
    provideClientHydration()
  ]
};