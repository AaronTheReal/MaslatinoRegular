import { Component, ChangeDetectionStrategy, inject, Renderer2, PLATFORM_ID } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NoticiasService } from '../../services/noticias-service';
import { CategoriaService, CategoriaPayload } from '../../services/categorias-service';
import { Noticia, Category, Block } from '../../../models/noticia.model';
import { Meta, Title } from '@angular/platform-browser';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';

@Component({
  selector: 'app-noticias-individuales',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, FormsModule],
  templateUrl: './noticias-individuales.html',
  styleUrls: ['./noticias-individuales.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoticiasIndividuales {
  private readonly route = inject(ActivatedRoute);
  private readonly noticiasService = inject(NoticiasService);
  private readonly categoriasService = inject(CategoriaService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);

  busqueda = '';
  categorias: CategoriaPayload[] = [];
  recientes: Noticia[] = [];
  archivos: { anio: number; mes: string; nombre: string }[] = [];

  trackByIndex = (i: number) => i;
  trackBySlug = (_: number, item: Noticia) => item?.slug ?? _;
  trackByCat = (_: number, item: CategoriaPayload) => item?.slug ?? _;

  readonly noticia$: Observable<Noticia | null> = this.route.paramMap.pipe(
    switchMap(params => {
      const id = params.get('id');
      if (!id) {
        console.log('No ID provided');
        return of(null);
      }
      return this.noticiasService.getNoticiaById(id).pipe(
        switchMap(noticia => {
          if (!noticia) {
            return of(null);
          }
          const categoryIds = noticia.categories
            .map(cat => (typeof cat === 'string' ? cat : cat._id))
            .filter((id): id is string => !!id);
          if (categoryIds.length === 0) {
            noticia.categories = [];
            return of(noticia);
          }
          return this.categoriasService.getCategoriasByIds(categoryIds).pipe(
            catchError(() => of(categoryIds.map(id => ({ _id: id, name: 'Sin categoría', slug: '', color: '' })))),
            tap(categories => {
              noticia.categories = categories; // Assign CategoriaPayload[] to categories
            }),
            switchMap(() => of(noticia))
          );
        }),
        tap(noticia => {
          if (noticia) {
            const title = noticia.title || 'Noticia';
            const description = noticia.meta?.description || noticia.summary || 'Descripción no disponible';
            const image = noticia.meta?.image || '/assets/og.jpg';
            const url = noticia.originalUrl || `https://maslatino.com/noticia/${encodeURIComponent(noticia._id)}`;

            this.title.setTitle(`${title} | Mas Latino`);
            this.meta.updateTag({ name: 'description', content: description });
            this.meta.updateTag({ name: 'keywords', content: noticia.tags?.join(', ') || 'noticias, Mas Latino' });
            this.meta.updateTag({ property: 'og:type', content: 'article' });
            this.meta.updateTag({ property: 'og:title', content: title });
            this.meta.updateTag({ property: 'og:description', content: description });
            this.meta.updateTag({ property: 'og:url', content: url });
            this.meta.updateTag({ property: 'og:image', content: image });
            this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
            this.meta.updateTag({ name: 'twitter:title', content: title });
            this.meta.updateTag({ name: 'twitter:description', content: description });
            this.meta.updateTag({ name: 'twitter:image', content: image });

            if (isPlatformBrowser(this.platformId)) {
              const link = this.renderer.createElement('link');
              this.renderer.setAttribute(link, 'rel', 'canonical');
              this.renderer.setAttribute(link, 'href', url);
              this.renderer.appendChild(document.head, link);

              const schema = {
                '@context': 'https://schema.org',
                '@type': 'NewsArticle',
                headline: title,
                description: description,
                image: [image],
                datePublished: noticia.createdAt || new Date().toISOString(),
                dateModified: noticia.updatedAt || noticia.createdAt || new Date().toISOString(),
                author: { '@type': 'Person', name: noticia.authorName || 'Anónimo' },
                publisher: {
                  '@type': 'Organization',
                  name: 'Mas Latino',
                  logo: { '@type': 'ImageObject', url: 'https://maslatino.com/logo.png' }
                },
                mainEntityOfPage: { '@type': 'WebPage', '@id': url },
                keywords: noticia.tags?.join(', ') || '',
                articleSection: this.getCategoryNames(noticia.categories as Category[])
              };
              const script = this.renderer.createElement('script');
              this.renderer.setAttribute(script, 'type', 'application/ld+json');
              this.renderer.setProperty(script, 'textContent', JSON.stringify(schema));
              this.renderer.appendChild(document.head, script);
            }
          } else {
            this.title.setTitle('Noticia no encontrada | Mas Latino');
            this.meta.updateTag({ name: 'description', content: 'La noticia solicitada no está disponible.' });
            this.meta.updateTag({ property: 'og:title', content: 'Noticia no encontrada' });
            this.meta.updateTag({ property: 'og:description', content: 'La noticia solicitada no está disponible.' });
            this.meta.updateTag({ property: 'og:image', content: '/assets/og.jpg' });
          }
        }),
        catchError(error => {
          console.error('Error fetching noticia:', error);
          this.title.setTitle('Error | Mas Latino');
          this.meta.updateTag({ name: 'description', content: 'Error al cargar la noticia.' });
          return of(null);
        })
      );
    })
  );

  constructor() {
    if (!isPlatformServer(this.platformId)) {
      this.obtenerCategorias();
      this.obtenerNoticiasRecientes();
      this.generarMesesDesde2025();
    }
  }

  getCategoryNames(categories: Array<string | Category> | undefined): string {
    const names = (categories ?? [])
      .map(c => this.isCategory(c) ? (c.name || 'Sin categoría') : '')
      .filter(Boolean);
    return names.length ? names.join(', ') : 'Sin categorías';
  }
  buscarNoticia() {
    if (this.busqueda.trim()) {
      console.log('Buscando:', this.busqueda);
      // Implement navigation or search logic here
    }
  }

  private obtenerCategorias() {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (res: CategoriaPayload[]) => {
        this.categorias = (res ?? []).filter((c: CategoriaPayload) => c && c.slug && c.name);
      },
      error: (e: unknown) => console.error('Error al cargar categorías:', e)
    });
  }

  private obtenerNoticiasRecientes() {
    this.noticiasService.getNoticiasRecientes(5).subscribe({
      next: (res: Noticia[]) => {
        this.recientes = (res ?? []).filter(
          (n: Noticia) => n && typeof n.slug === 'string' && n.slug.trim().length > 0
        );
      },
      error: (e: unknown) => console.error('Error al cargar noticias recientes:', e)
    });
  }

  private generarMesesDesde2025() {
    const mesesNombres = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const ahora = new Date();
    const anioActual = ahora.getFullYear();
    const mesActual = ahora.getMonth();

    const tmp: { anio: number; mes: string; nombre: string }[] = [];
    for (let anio = 2025; anio <= anioActual; anio++) {
      const hastaMes = anio === anioActual ? mesActual : 11;
      for (let mes = 0; mes <= hastaMes; mes++) {
        tmp.push({
          anio,
          mes: (mes + 1).toString().padStart(2, '0'),
          nombre: `${mesesNombres[mes]} ${anio}`
        });
      }
    }
    this.archivos = tmp.reverse();
  }
    private isCategory(x: unknown): x is Category {
    return !!x && typeof x === 'object' && 'name' in (x as any);
  }
}



/*
import { Component, ChangeDetectionStrategy, inject, Renderer2 } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NoticiasService } from '../../services/noticias-service';
import { Noticia, Category } from '../../../models/noticia.model';
import { Meta, Title } from '@angular/platform-browser';
import { switchMap, tap, catchError } from 'rxjs/operators';
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
  private readonly renderer = inject(Renderer2);

  readonly noticia$: Observable<Noticia | null> = this.route.paramMap.pipe(
    switchMap(params => {
      const id = params.get('id');
      console.log('si llega', id);
      if (!id) {
        console.log('No ID provided');
        return of(null);
      }
      return this.noticiasService.getNoticiaById(id).pipe(
        tap(noticia => {
          console.log('que llega?', noticia);
          if (noticia) {
            // SEO: Set title and meta tags
            this.title.setTitle(noticia.title || 'Noticia');
            this.meta.updateTag({ name: 'description', content: noticia.meta?.description || noticia.summary || 'Descripción no disponible' });
            this.meta.updateTag({ property: 'og:title', content: noticia.title || 'Noticia' });
            this.meta.updateTag({ property: 'og:description', content: noticia.meta?.description || noticia.summary || 'Descripción no disponible' });
            this.meta.updateTag({ property: 'og:image', content: noticia.meta?.image || '' });

            // Add schema.org Article structured data
            const schema = {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: noticia.title || 'Noticia',
              description: noticia.meta?.description || noticia.summary || 'Descripción no disponible',
              image: noticia.meta?.image || '',
              author: { '@type': 'Person', name: noticia.authorName || 'Anónimo' },
              datePublished: noticia.createdAt || '',
              dateModified: noticia.updatedAt || '',
              publisher: {
                '@type': 'Organization',
                name: 'Mas Latino',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://maslatino.com/logo.png' // Replace with your site’s logo URL
                }
              },
              mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': `https://maslatino.com/noticia/${noticia._id}` // Replace with your production URL
              }
            };
            const script = this.renderer.createElement('script');
            this.renderer.setAttribute(script, 'type', 'application/ld+json');
            this.renderer.setProperty(script, 'textContent', JSON.stringify(schema));
            this.renderer.appendChild(document.head, script);
          }
        }),
        catchError(error => {
          console.error('Error fetching noticia:', error);
          return of(null);
        })
      );
    })
  );

  getCategoryNames(categories: Category[] | undefined): string {
    return categories?.map(cat => cat.name).join(', ') || 'Sin categorías';
  }
}
*/





/*
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

*/