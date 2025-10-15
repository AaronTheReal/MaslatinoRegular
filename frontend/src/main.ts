// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig)
  .then(async () => {
    // 👇 solo en browser
    if (typeof window !== 'undefined') {
      const { register } = await import('swiper/element/bundle');
      register();

      // Si usas Mux player en algún lado, también evita importarlo en server:
      // await import('@mux/mux-player');
      // (mejor: haz el import dinámico en el componente que lo usa, dentro del guard de browser)
    }
  })
  .catch(console.error);
