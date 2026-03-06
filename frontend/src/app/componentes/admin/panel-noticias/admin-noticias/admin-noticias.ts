import { Component, ChangeDetectionStrategy, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { NoticiasService } from '../../../../services/noticias-service';
import { CategoriaService, CategoriaPayload } from '../../../../services/categorias-service';
import { Noticia, Category } from '../../../../../models/noticia.model';
import { CategorySearchPipe } from '../../../pipe/category-search.pipe';

type AdminRole = 'Periodista' | 'Escritor' | 'Administrador' | 'Tecnico';
type StateOpt = 'all' | 'draft' | 'review' | 'published';
type SortOpt = '-updatedAt' | 'updatedAt' | '-createdAt' | 'createdAt' | 'title' | '-title';
type PressOpt = 'all' | 'true' | 'false';
@Component({
  selector: 'app-admin-noticias',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, DatePipe, CategorySearchPipe],
  templateUrl: './admin-noticias.html',
  styleUrls: ['./admin-noticias.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminNoticias {
  private fb = inject(FormBuilder);
  private noticiasSvc = inject(NoticiasService);
  private categoriasSvc = inject(CategoriaService);
  private elRef = inject(ElementRef);

  userRole: AdminRole | null = null;

  // Signals para datos del servidor
  page = signal(1);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  items = signal<Noticia[]>([]);        // solo la página actual (ligera)
  total = signal(0);
  totalPages = signal(1);

  categorias = signal<CategoriaPayload[]>([]);

  readonly form = this.fb.nonNullable.group({
    q: [''],
    state: ['all' as StateOpt],
    categoryIds: [[] as string[]],
    from: [''],
    to: [''],
    sort: ['-updatedAt' as SortOpt],
    pageSize: [20],
    press: ['all' as PressOpt]
  });

  // UI dropdown categorías
  catOpen = signal(false);
  catQuery = '';

  constructor() {
    // Cargar categorías (una sola vez)
    this.categoriasSvc.obtenerCategorias().subscribe({
      next: cats => this.categorias.set(cats || []),
      error: () => {}
    });

    // Carga inicial
    this.loadData();

    // Cualquier cambio de filtro → resetear página y recargar desde backend
    this.form.valueChanges.subscribe(() => {
      this.page.set(1);
      this.loadData();
    });
  }

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('admin_user');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          this.userRole = parsed?.role as AdminRole;
        } catch (e) {
          console.error('Error parsing admin_user', e);
        }
      }
    }
  }

  canAuthorize(): boolean {
    return this.userRole === 'Administrador' || this.userRole === 'Periodista';
  }

  // ==================== CARGA DESDE BACKEND (OPTIMIZADA) ====================
  private loadData() {
    this.loading.set(true);
    this.errorMsg.set(null);

    const f = this.form.getRawValue();

    // Solo enviamos al backend el primer categoryId (para que filtre algo)
    // El resto de categorías y el rango de fechas se aplican client-side sobre la página
    const serverCategoryId = f.categoryIds.length > 0 ? f.categoryIds[0] : undefined;

    this.noticiasSvc.getAdminNoticiasPaginadas(
      this.page(),
      f.pageSize,
      f.q,
      f.state,
      serverCategoryId,
      f.sort,
      f.press   // ← nuevo parámetro
    ).subscribe({
      next: (res: any) => {
        this.items.set(res.items || []);
        this.total.set(res.total || 0);
        this.totalPages.set(res.totalPages || 1);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudieron cargar las noticias.');
        this.loading.set(false);
      }
    });
  }

  // ==================== FILTROS ADICIONALES CLIENT-SIDE (sobre la página actual) ====================
  pageItems = computed(() => {
    let rows = [...this.items()];

    const v = this.form.getRawValue();
    const catFilter = v.categoryIds ?? [];
    const from = v.from ? new Date(v.from + 'T00:00:00') : null;
    const to = v.to ? new Date(v.to + 'T23:59:59') : null;

    // Filtro extra de categorías (si el usuario seleccionó más de una)
    if (catFilter.length > 0) {
      rows = rows.filter(r => {
        const ids = this.catIds(r);
        return catFilter.every(id => ids.includes(id));
      });
    }

    // Filtro de rango de fechas
    if (from || to) {
      rows = rows.filter(r => {
        const d = this.dateFor(r);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    return rows;
  });

  // ==================== UI DROPDOWN CATEGORÍAS ====================
  @HostListener('document:click', ['$event'])
  closeOnClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInside = this.elRef.nativeElement.contains(target);
    if (!clickedInside && this.catOpen()) {
      this.catOpen.set(false);
    }
  }

  toggleCatDropdown(event: Event) {
    event.stopPropagation();
    this.catOpen.set(!this.catOpen());
  }

  closeCatDropdown() {
    this.catOpen.set(false);
  }

  // ==================== HELPERS ====================
  catIds(n: Noticia): string[] {
    const raw = Array.isArray(n?.categories) ? n.categories : [];
    return raw.map((c: any) => {
      if (typeof c === 'string') return c;
      if (c?._id) return c._id as string;
      if (c?.$oid) return c.$oid as string;
      return '';
    }).filter(Boolean);
  }

  catNameById(id: string): string {
    return this.categorias().find(x => x._id === id)?.name ?? id;
  }

  catColorById(id: string): string | undefined {
    return this.categorias().find(x => x._id === id)?.color;
  }

  thumb(n: Noticia): string | undefined {
    return n?.meta?.image;
  }

  author(n: Noticia): string {
    return n?.authorName || '—';
  }

  dateFor(n: Noticia): Date | null {
    return n?.createdAt ? new Date(n.createdAt) : null;
  }
  isPress(n: Noticia): boolean {
      return n?.press === true;
    }
  // ==================== SELECTOR MULTI-CATEGORÍA ====================
  isCatSelected(id?: string): boolean {
    if (!id) return false;
    return (this.form.controls.categoryIds.value ?? []).includes(id);
  }

  toggleCat(id?: string, checked?: boolean) {
    if (!id) return;
    const ctrl = this.form.controls.categoryIds;
    const set = new Set(ctrl.value ?? []);
    if (checked) set.add(id); else set.delete(id);
    ctrl.setValue([...set]);
  }

  removeCat(id?: string) {
    if (!id) return;
    const ctrl = this.form.controls.categoryIds;
    ctrl.setValue((ctrl.value ?? []).filter(x => x !== id));
  }

  clearCategories() {
    this.form.controls.categoryIds.setValue([]);
  }

  selectedCats = computed(() =>
    (this.form.controls.categoryIds.value ?? [])
      .map(id => this.categorias().find(c => c._id === id))
      .filter(Boolean) as CategoriaPayload[]
  );

  clearFilters() {
    this.form.reset({
      q: '',
      state: 'all',
      categoryIds: [],
      from: '',
      to: '',
      sort: '-updatedAt',
      pageSize: 20
    });
    this.page.set(1);
    this.loadData();
  }

  // ==================== ACCIONES ====================
  onApprove(row: Noticia) {
    const isAuthorized = row.autorizada ?? false;
    const action = isAuthorized ? 'desautorizar' : 'autorizar';
    if (!confirm(`¿Estás seguro de que quieres ${action} la noticia "${row.title}"?`)) return;

    this.loading.set(true);
    this.noticiasSvc.toggleAutorizarNoticia(row._id!, !isAuthorized).subscribe({
      next: updatedNoticia => {
        this.items.set(
          this.items().map(item =>
            item._id === row._id ? { ...item, autorizada: updatedNoticia.autorizada } : item
          )
        );
        alert(`Noticia ${action}da exitosamente.`);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error(err);
        alert('Error al actualizar autorización');
        this.loading.set(false);
      }
    });
  }

  onDelete(row: Noticia) {
    if (!confirm(`¿Estás seguro de que quieres eliminar la noticia "${row.title}"?`)) return;

    this.loading.set(true);
    this.noticiasSvc.deleteNoticia(row._id!).subscribe({
      next: () => {
        this.items.set(this.items().filter(item => item._id !== row._id));
        alert('Noticia eliminada exitosamente.');
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error(err);
        alert('Error al eliminar la noticia');
        this.loading.set(false);
      }
    });
  }

  canEdit(row: Noticia): boolean {
    if (this.userRole === 'Escritor' && row.autorizada) return false;
    return true;
  }

  canDelete(row: Noticia): boolean {
    if (this.userRole === 'Escritor' && row.autorizada) return false;
    return true;
  }

  // ==================== PAGINACIÓN ====================
  nextPage() {
    if (this.page() < this.totalPages()) {
      this.page.update(p => p + 1);
      this.loadData();
    }
  }

  prevPage() {
    if (this.page() > 1) {
      this.page.update(p => p - 1);
      this.loadData();
    }
  }

  trackById = (_: number, r: Noticia) => r._id ?? _;

  badgeClass(_state: string) {
    return 'badge text-bg-secondary';
  }
}