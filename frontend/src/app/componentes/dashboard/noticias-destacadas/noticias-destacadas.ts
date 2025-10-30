import { Component, ChangeDetectionStrategy, inject, Renderer2, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformServer, DatePipe, DOCUMENT } from '@angular/common';
import { NoticiasService } from '../../../services/noticias-service';
import { Noticia } from '../../../../models/noticia.model';
import { Observable, tap } from 'rxjs';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-noticias-destacadas',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule],
  templateUrl: './noticias-destacadas.html',
  styleUrl: './noticias-destacadas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticiasDestacadas {
  private readonly noticiasService = inject(NoticiasService);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  readonly noticias$: Observable<Noticia[]> = this.noticiasService.getNoticiasRecientes(5).pipe(
    tap(noticias => {
      // Inserta JSON-LD ItemList SOLO en SSR (se serializa en HTML y Google lo ve)
      if (isPlatformServer(this.platformId) && noticias?.length) {
        const itemList = {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          'itemListElement': noticias.slice(0, 5).map((n, idx) => ({
            '@type': 'ListItem',
            'position': idx + 1,
            'url': `https://maslatino.com/noticia/${n.slug || ''}`,
            'name': n.title || ''
          }))
        };
        const script = this.renderer.createElement('script');
        this.renderer.setAttribute(script, 'type', 'application/ld+json');
        this.renderer.setProperty(script, 'textContent', JSON.stringify(itemList));
        this.renderer.appendChild(this.document.head, script);
      }
    })
  );
}