import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable, of, combineLatest } from 'rxjs';
import { switchMap, catchError, map, distinctUntilChanged, shareReplay, startWith } from 'rxjs/operators';

import { NoticiasService } from '../../services/noticias-service';
import { Noticia, Category } from '../../../models/noticia.model';

type Vm = {
  items: Noticia[];
  loading: boolean;
  error: string | null;
  filterType: 'archive' | 'category' | null;
  filterValue: string | null;
  archivos: { anio: number; mes: number; nombre: string }[]; // 👈 aquí
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

  busqueda = '';

  /** Sidebar streams (memoized) */
  private archivos$ = this.noticiasService.getArchivos(1, 10).pipe(
    map(page => page.items),   // 👈 nos quedamos solo con los meses
    shareReplay(1)
  );
  private categorias$ = this.noticiasService.getCategorias().pipe(shareReplay(1));
  private recientes$  = this.noticiasService.getNoticiasRecientes(5).pipe(
    map(res => (res ?? []).filter(n => !!n?.slug)),
    shareReplay(1)
  );

  /** Query stream a partir de params */
  /** Query stream a partir de params + query params (page) */
  private query$ = combineLatest([
    this.route.paramMap,
    this.route.queryParamMap,
  ]).pipe(
    map(([params, query]) => {
      const anio = params.get('anio');
      const mes  = params.get('mes');
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


  /** Datos de listado según filtro + estado */
private listado$ = this.query$.pipe(
  switchMap(({ anio, mes, slug, page }) => {
    if (anio && mes) {
      const year = +anio;
      const month = +mes;
      const currentPage = page && page > 0 ? page : 1;
      const limit = 10; // 👈 10 noticias por página para archivos

      return this.noticiasService.getNoticiasByArchive(year, month, currentPage, limit).pipe(
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
      const currentPage = page && page > 0 ? page : 1;
      const limit = 10; // noticias por página

      return this.noticiasService.getNoticiasByCategory(slug, currentPage, limit).pipe(
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

    // Sin filtro...
    return of({
      items: [] as Noticia[],
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


  /** View-model para plantilla */
  vm$: Observable<Vm> = combineLatest([
    this.listado$, this.archivos$, this.categorias$, this.recientes$
  ]).pipe(
    map(([state, archivos, categorias, recientes]) => {
        if (state['status'] === 'loading') {
          return {
            items: [],
            loading: true,
            error: null,
            filterType: null,
            filterValue: null,
            archivos, categorias, recientes,
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
          archivos, categorias, recientes,
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
    } = (state as any).data as {
      items: Noticia[];
      filterType: Vm['filterType'];
      filterValue: Vm['filterValue'];
      page: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };

      // Reemplaza label de categoría por nombre humano si coincide el slug
      let friendlyFilterValue = filterValue;
      if (filterType === 'category' && filterValue) {
        const found = categorias.find(c => c.slug === filterValue);
        if (found?.name) friendlyFilterValue = found.name;
      }

    return {
      items,
      loading: false,
      error: items.length === 0 ? 'No se encontraron noticias para este filtro' : null,
      filterType,
      filterValue: friendlyFilterValue,
      archivos, categorias, recientes,
      page,
      totalPages,
      hasNextPage,
      hasPrevPage,
    } as Vm;

    }),
    shareReplay(1)
  );

  trackBySlug = (_: number, item: Noticia) => item?.slug ?? _;
  trackById = (_: number, cat: Category) => cat?._id ?? _;
  trackByIndex = (i: number) => i;

  getMonthName(mes: number): string {
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return months[mes - 1] || 'Desconocido';
  }

  buscarNoticia() {
    const q = this.busqueda?.trim();
    if (!q) return;
    // TODO: navegar a tu ruta de búsqueda cuando esté lista
    console.log('Buscar:', q);
  }

  goToPage(p: number) {
    if (!p || p < 1) return;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: p },
      queryParamsHandling: 'merge', // mantiene otros query params si los hubiera
    });
  }

}
