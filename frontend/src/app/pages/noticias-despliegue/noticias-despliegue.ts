import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterModule } from '@angular/router';
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
  archivos: { anio: number; mes: number | string; nombre: string }[];
  categorias: Category[];
  recientes: Noticia[];
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
  private readonly noticiasService = inject(NoticiasService);

  busqueda = '';

  /** Sidebar streams (memoized) */
  private archivos$ = this.noticiasService.getArchivos().pipe(shareReplay(1));
  private categorias$ = this.noticiasService.getCategorias().pipe(shareReplay(1));
  private recientes$  = this.noticiasService.getNoticiasRecientes(5).pipe(
    map(res => (res ?? []).filter(n => !!n?.slug)),
    shareReplay(1)
  );

  /** Query stream a partir de params */
  private query$ = this.route.paramMap.pipe(
    map(params => {
      const anio = params.get('anio');
      const mes  = params.get('mes');
      const slug = params.get('slug');
      return { anio, mes, slug };
    }),
    // Evita rehacer la misma petición si no cambian efectivamente los params
    distinctUntilChanged((a, b) => a.anio === b.anio && a.mes === b.mes && a.slug === b.slug),
    shareReplay(1)
  );

  /** Datos de listado según filtro + estado */
  private listado$ = this.query$.pipe(
    switchMap(({ anio, mes, slug }) => {
      if (anio && mes) {
        const year = +anio, month = +mes;
        return this.noticiasService.getNoticiasByArchive(year, month).pipe(
          map(items => ({
            items,
            filterType: 'archive' as const,
            filterValue: `${this.getMonthName(month)} ${year}`,
          }))
        );
      }
      if (slug) {
        return this.noticiasService.getNoticiasByCategory(slug).pipe(
          map(items => ({
            items,
            filterType: 'category' as const,
            filterValue: slug,
          }))
        );
      }
      return of({ items: [] as Noticia[], filterType: null, filterValue: null });
    }),
    // Estado de carga / error
    map(x => ({ status: 'success' as const, data: x })),
    startWith({ status: 'loading' as const }),
    catchError(() => of({ status: 'error' as const }))
  );

  /** View-model para plantilla */
  vm$: Observable<Vm> = combineLatest([this.listado$, this.archivos$, this.categorias$, this.recientes$]).pipe(
    map(([state, archivos, categorias, recientes]) => {
      if (state['status'] === 'loading') {
        return {
          items: [],
          loading: true,
          error: null,
          filterType: null,
          filterValue: null,
          archivos, categorias, recientes
        } as Vm;
      }
      if (state['status'] === 'error') {
        return {
          items: [],
          loading: false,
          error: 'Ocurrió un error al cargar las noticias.',
          filterType: null,
          filterValue: null,
          archivos, categorias, recientes
        } as Vm;
      }
      const { items, filterType, filterValue } = (state as any).data as {
        items: Noticia[]; filterType: Vm['filterType']; filterValue: Vm['filterValue'];
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
        archivos, categorias, recientes
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
}
