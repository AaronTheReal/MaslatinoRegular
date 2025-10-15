import { Component, ChangeDetectionStrategy, inject, Renderer2 } from '@angular/core';
import { CommonModule, isPlatformServer, DOCUMENT } from '@angular/common'; // ← añade DOCUMENT
import { Meta, Title } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-sobre-nosotros',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sobre-nosotros.html',
  styleUrl: './sobre-nosotros.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SobreNosotros {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc = inject(DOCUMENT); // ← inyecta el documento SSR-safe

  constructor() {
    // Metas básicas
    this.title.setTitle('Sobre nosotros | Más Latino Network');
    this.meta.updateTag({
      name: 'description',
      content: 'Conoce la plataforma de medios latinos: propósito, comunidad y las 7 esferas que influyen en nuestra vida.',
    });
    this.meta.updateTag({ property: 'og:title', content: 'Sobre nosotros | Más Latino Network' });
    this.meta.updateTag({
      property: 'og:description',
      content: 'Informamos, inspiramos y representamos a una audiencia latina vibrante y en crecimiento.',
    });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: 'https://maslatino.com/sobre-nosotros' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    if (isPlatformServer(this.platformId)) {
      // Canonical (usa this.doc en lugar de document)
      const link = this.renderer.createElement('link');
      this.renderer.setAttribute(link, 'rel', 'canonical');
      this.renderer.setAttribute(link, 'href', 'https://maslatino.com/sobre-nosotros');
      this.renderer.appendChild(this.doc.head, link); // ← usa this.doc.head

      // JSON-LD
      const schema = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'AboutPage',
            '@id': 'https://maslatino.com/sobre-nosotros',
            'name': 'Sobre nosotros | Más Latino Network',
            'url': 'https://maslatino.com/sobre-nosotros',
            'isPartOf': { '@id': 'https://maslatino.com/#website' },
          },
          {
            '@type': 'WebSite',
            '@id': 'https://maslatino.com/#website',
            'name': 'Más Latino Network',
            'url': 'https://maslatino.com/',
            'publisher': { '@id': 'https://maslatino.com/#org' },
          },
          {
            '@type': 'Organization',
            '@id': 'https://maslatino.com/#org',
            'name': 'Más Latino Network',
            'url': 'https://maslatino.com/',
            'logo': { '@type': 'ImageObject', 'url': 'https://maslatino.com/assets/logo.png' },
          },
        ],
      };

      const script = this.renderer.createElement('script');
      this.renderer.setAttribute(script, 'type', 'application/ld+json');
      this.renderer.setProperty(script, 'textContent', JSON.stringify(schema));
      this.renderer.appendChild(this.doc.head, script); // ← usa this.doc.head
    }
  }
}
