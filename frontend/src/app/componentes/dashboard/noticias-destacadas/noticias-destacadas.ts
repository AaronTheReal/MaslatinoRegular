import { Component, ChangeDetectionStrategy, inject, Renderer2 } from '@angular/core';
import { CommonModule, isPlatformServer } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';
import { NoticiasService } from '../../../services/noticias-service';
import { Observable, tap } from 'rxjs';
import { Noticia } from '../../../../models/noticia.model';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-noticias-destacadas',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './noticias-destacadas.html',
  styleUrl: './noticias-destacadas.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoticiasDestacadas {
  private readonly noticiasService = inject(NoticiasService);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);

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
