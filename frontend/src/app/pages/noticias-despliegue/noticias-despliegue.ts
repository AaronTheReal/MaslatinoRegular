import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NoticiasService } from '../../services/noticias-service';
import { Noticia, Category } from '../../../models/noticia.model';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';

@Component({
  selector: 'app-noticias-despliegue',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './noticias-despliegue.html',
  styleUrls: ['./noticias-despliegue.css']
})
export class NoticiasDespliegue implements OnInit {
  noticias$: Observable<Noticia[]> = of([]);
  archivos: { anio: number, mes: number, nombre: string }[] = [];
  categorias: Category[] = [];
  loading = true;
  error: string | null = null;
  filterType: 'archive' | 'category' | null = null;
  filterValue: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private noticiasService: NoticiasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Load archives and categories
    this.loadArchivos();
    this.loadCategorias();

    // Handle route parameters
    this.noticias$ = this.route.paramMap.pipe(
      switchMap(params => {
        this.error = null;
        const anio = params.get('anio');
        const mes = params.get('mes');
        const slug = params.get('slug');

        console.log('Route params:', { anio, mes, slug });

        if (anio && mes) {
          this.filterType = 'archive';
          this.filterValue = `${this.getMonthName(+mes)} ${anio}`;
          return this.noticiasService.getNoticiasByArchive(+anio, +mes).pipe(
            tap(data => console.log('noticias$ archive data:', data)),
            catchError(error => {
              console.error('Archive error:', error);
              return of([]);
            })
          );
        } else if (slug) {
          this.filterType = 'category';
          this.filterValue = slug;
          return this.noticiasService.getNoticiasByCategory(slug).pipe(
            tap(data => console.log('noticias$ category data:', data)),
            catchError(error => {
              console.error('Category error:', error);
              return of([]);
            })
          );
        } else {
          console.error('Invalid route params');
          return of([]);
        }
      }),
      catchError(error => {
        console.error('Pipeline error:', error);
        return of([]);
      }),
      tap(data => {
        console.log('noticias$ pipeline final data:', data);
      })
    );

    // Update loading state and error when noticias$ emits
    this.noticias$.subscribe({
      next: data => {
        console.log('noticias$ subscription data:', data);
        setTimeout(() => {
          this.loading = false;
          this.error = data.length === 0 ? 'No se encontraron noticias para este filtro' : null;
          this.cdr.detectChanges();
        }, 0);
      },
      error: err => {
        console.error('noticias$ subscription error:', err);
        setTimeout(() => {
          this.loading = false;
          this.error = 'Error en la suscripción de noticias';
          this.cdr.detectChanges();
        }, 0);
      }
    });
  }

  loadArchivos() {
    this.noticiasService.getArchivos().subscribe({
      next: archivos => {
        console.log('Archivos loaded:', archivos);
        this.archivos = archivos;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Error loading archivos:', error);
        this.cdr.detectChanges();
      }
    });
  }

  loadCategorias() {
    this.noticiasService.getCategorias().subscribe({
      next: categorias => {
        console.log('Categorias loaded:', categorias);
        this.categorias = categorias;
        if (this.filterType === 'category' && this.filterValue) {
          const category = categorias.find(cat => cat.slug === this.filterValue);
          this.filterValue = category ? category.name : this.filterValue;
          console.log('Updated filterValue:', this.filterValue);
          this.cdr.detectChanges();
        }
      },
      error: error => {
        console.error('Error loading categorias:', error);
        this.cdr.detectChanges();
      }
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByCat(index: number, cat: Category): string {
    return cat._id;
  }

  getMonthName(mes: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[mes - 1] || 'Desconocido';
  }
}