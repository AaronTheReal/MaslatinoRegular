import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NoticiasService } from '../../services/noticias-service';
import { Noticia, Category } from '../../../models/noticia.model';
import { Meta, Title } from '@angular/platform-browser';
import { switchMap, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-noticias-individuales',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './noticias-individuales.html',
  styleUrls: ['./noticias-individuales.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoticiasIndividuales {
  private readonly route = inject(ActivatedRoute);
  private readonly noticiasService = inject(NoticiasService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly noticia$: Observable<Noticia | null> = this.route.paramMap.pipe(
    switchMap(params => {
      const id = params.get('id');
      console.log("si llega");
      if (!id) {
        return of(null);
      }
      return this.noticiasService.getNoticiaById(id).pipe(
        tap(noticia => {
                  console.log("que llega?",noticia);

          if (noticia) {
            // SEO: Set title and meta tags
            this.title.setTitle(noticia.title || 'Noticia');
            this.meta.updateTag({ name: 'description', content: noticia.meta?.description || noticia.summary || 'Descripción no disponible' });
            this.meta.updateTag({ property: 'og:title', content: noticia.title || 'Noticia' });
            this.meta.updateTag({ property: 'og:description', content: noticia.meta?.description || noticia.summary || 'Descripción no disponible' });
            this.meta.updateTag({ property: 'og:image', content: noticia.meta?.image || '' });
          }
        })
      );
    })
  );

  getCategoryNames(categories: Category[] | undefined): string {
    return categories?.map(cat => cat.name).join(', ') || 'Sin categorías';
  }
}