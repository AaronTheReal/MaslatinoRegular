import { Component, ChangeDetectionStrategy, inject, Renderer2, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformServer, DatePipe } from '@angular/common';
import { NoticiasService } from '../../../services/noticias-service';
import { Noticia } from '../../../../models/noticia.model';
import { Observable, tap } from 'rxjs';

@Component({
  selector: 'app-recomendadas',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './recomendadas.html',
  styleUrl: './recomendadas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Recomendadas {
  private readonly noticiasService = inject(NoticiasService);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);

  // Trae exactamente 3 recomendadas
  readonly noticias$: Observable<Noticia[]> = this.noticiasService.getNoticiasRecomendadas(3).pipe(
    tap(noticias => {
      // Inyecta JSON-LD solo en SSR para que salga en el HTML prerender/SSR
      if (isPlatformServer(this.platformId) && Array.isArray(noticias) && noticias.length) {
        const itemList = {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          'itemListElement': noticias.slice(0, 3).map((n, idx) => ({
            '@type': 'ListItem',
            'position': idx + 1,
            'url': `https://maslatino.com/noticia/${n._id || n.slug || ''}`,
            'name': n.title || ''
          }))
        };
        const script = this.renderer.createElement('script');
        this.renderer.setAttribute(script, 'type', 'application/ld+json');
        this.renderer.setProperty(script, 'textContent', JSON.stringify(itemList));
        this.renderer.appendChild(document.head, script);
      }
    })
  );
}
