import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Observable, of, combineLatest } from 'rxjs';
import {
  switchMap,
  catchError,
  map,
  distinctUntilChanged,
  shareReplay,
  startWith,
} from 'rxjs/operators';

import { Meta, Title } from '@angular/platform-browser';

import { NoticiasService } from '../../services/noticias-service';
import { CategoriaService } from '../../services/categorias-service'; // Asegúrate de que la ruta sea correcta
import { Noticia, Category } from '../../../models/noticia.model';

type Vm = {
  items: Noticia[];
  loading: boolean;
  error: string | null;
  filterType: 'archive' | 'category' | null;
  filterValue: string | null;
  archivos: { anio: number; mes: number; nombre: string }[];
  categorias: Category[];
  recientes: Noticia[];
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

@Component({
  selector: 'app-noticias-despliegue',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, FormsModule],
  templateUrl: './noticias-despliegue.html',
  styleUrls: ['./noticias-despliegue.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticiasDespliegue {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly noticiasService = inject(NoticiasService);
  private readonly categoriaService = inject(CategoriaService);

  // 🔹 SEO
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);

  busqueda = '';

  /** Sidebar streams */
  private archivos$ = this.noticiasService.getArchivos(1, 10).pipe(
    map(page => page.items),
    shareReplay(1)
  );

  private categorias$ = this.noticiasService
    .getCategorias()
    .pipe(shareReplay(1));

  private recientes$ = this.noticiasService.getNoticiasRecientes(5).pipe(
    map(res => (res ?? []).filter(n => !!n?.slug)),
    shareReplay(1)
  );

  /** Params + query params */
  private query$ = combineLatest([
    this.route.paramMap,
    this.route.queryParamMap,
  ]).pipe(
    map(([params, query]) => {
      const anio = params.get('anio');
      const mes = params.get('mes');
      const slug = params.get('slug');
      const page = +(query.get('page') || '1');
      return { anio, mes, slug, page };
    }),
    distinctUntilChanged(
      (a, b) =>
        a.anio === b.anio &&
        a.mes === b.mes &&
        a.slug === b.slug &&
        a.page === b.page
    ),
    shareReplay(1)
  );

  private category$ = this.query$.pipe(
    switchMap(({ slug }) => slug ? this.categoriaService.obtenerCategoriaPorSlug(slug).pipe(
      catchError(() => of(null))
    ) : of(null)),
    shareReplay(1)
  );

  /** Listado principal */
  private listado$ = this.query$.pipe(
    switchMap(({ anio, mes, slug, page }) => {
      if (anio && mes) {
        const year = +anio;
        const month = +mes;
        const currentPage = page > 0 ? page : 1;

        return this.noticiasService
          .getNoticiasByArchive(year, month, currentPage, 10)
          .pipe(
            map(pageData => ({
              items: pageData.items,
              filterType: 'archive' as const,
              filterValue: `${this.getMonthName(month)} ${year}`,
              page: pageData.page,
              totalPages: pageData.totalPages,
              hasNextPage: pageData.hasNextPage,
              hasPrevPage: pageData.hasPrevPage,
            }))
          );
      }

      if (slug) {
        const currentPage = page > 0 ? page : 1;

        return this.noticiasService
          .getNoticiasByCategory(slug, currentPage, 10)
          .pipe(
            map(pageData => ({
              items: pageData.items,
              filterType: 'category' as const,
              filterValue: slug,
              page: pageData.page,
              totalPages: pageData.totalPages,
              hasNextPage: pageData.hasNextPage,
              hasPrevPage: pageData.hasPrevPage,
            }))
          );
      }

      return of({
        items: [],
        filterType: null,
        filterValue: null,
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    }),
    map(x => ({ status: 'success' as const, data: x })),
    startWith({ status: 'loading' as const }),
    catchError(() => of({ status: 'error' as const }))
  );

  /** VM */
  vm$: Observable<Vm> = combineLatest([
    this.listado$,
    this.archivos$,
    this.categorias$,
    this.recientes$,
    this.category$,
    this.query$,
  ]).pipe(
    map(([state, archivos, categorias, recientes, category, query]) => {
      if (state['status'] === 'loading') {
        return {
          items: [],
          loading: true,
          error: null,
          filterType: null,
          filterValue: null,
          archivos,
          categorias,
          recientes,
          page: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        } as Vm;
      }

      if (state['status'] === 'error') {
        return {
          items: [],
          loading: false,
          error: 'Ocurrió un error al cargar las noticias.',
          filterType: null,
          filterValue: null,
          archivos,
          categorias,
          recientes,
          page: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        } as Vm;
      }

      const {
        items,
        filterType,
        filterValue,
        page,
        totalPages,
        hasNextPage,
        hasPrevPage,
      } = (state as any).data;

      let friendlyFilterValue = filterValue;

      if (filterType === 'category' && filterValue) {
        if (category) {
          friendlyFilterValue = category.name;

          // 🔥 SEO categoría
          const indexable = query.page === 1 && (category.seoIndexable ?? true);
          this.setSeo({
            title: category.metaTitle || `Noticias de ${category.name} | MasLatino`,
            description: category.metaDescription || `Últimas noticias de ${category.name} en MasLatino.`,
            indexable,
            canonical: `https://maslatino.com/categoria/${category.slug}`,
          });
        } else {
          // Fallback usando lista de categorías si category fetch falló
          const found = categorias.find(c => c.slug === filterValue);
          if (found?.name) {
            friendlyFilterValue = found.name;
            // SEO default sin metas específicas
            const indexable = query.page === 1; // Asumir indexable true por default
            this.setSeo({
              title: `Noticias de ${found.name} | MasLatino`,
              description: `Últimas noticias de ${found.name} en MasLatino.`,
              indexable,
              canonical: `https://maslatino.com/categoria/${found.slug}`,
            });
          }
        }
      }

      if (filterType === 'archive' && filterValue) {
        const indexable = query.page === 1;
        const monthName = this.getMonthName(+(query.mes ?? '1'));
        this.setSeo({
          title: `Archivo ${monthName} ${query.anio} | MasLatino`,
          description: `Noticias publicadas en ${monthName} ${query.anio} en MasLatino.`,
          indexable,
          canonical: `https://maslatino.com/archivo/${query.anio}/${query.mes}`,
        });
      }

      return {
        items,
        loading: false,
        error: items.length === 0 ? 'No se encontraron noticias para este filtro' : null,
        filterType,
        filterValue: friendlyFilterValue,
        archivos,
        categorias,
        recientes,
        page,
        totalPages,
        hasNextPage,
        hasPrevPage,
      } as Vm;
    }),
    shareReplay(1)
  );

  private setCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    );

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', url);
  }
  private setSeo(config: {
    title: string;
    description: string;
    indexable?: boolean;
    canonical: string;
  }) {
    this.title.setTitle(config.title);

    this.meta.updateTag({
      name: 'description',
      content: config.description,
    });

    this.meta.updateTag({
      name: 'robots',
      content:
        config.indexable === false
          ? 'noindex,follow'
          : 'index,follow,max-image-preview:large',
    });

    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({
      property: 'og:description',
      content: config.description,
    });
    this.meta.updateTag({
      property: 'og:url',
      content: config.canonical,
    });

    // ✅ CANONICAL REAL (SSR-safe)
    this.setCanonical(config.canonical);
  }

  trackBySlug = (_: number, item: Noticia) => item?.slug ?? _;
  trackById = (_: number, cat: Category) => cat?._id ?? _;
  trackByIndex = (i: number) => i;

  getMonthName(mes: number): string {
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return months[mes - 1] || 'Desconocido';
  }

  buscarNoticia() {
    const q = this.busqueda?.trim();
    if (!q) return;
    console.log('Buscar:', q);
  }

  goToPage(p: number) {
    if (!p || p < 1) return;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: p },
      queryParamsHandling: 'merge',
    });
  }
}