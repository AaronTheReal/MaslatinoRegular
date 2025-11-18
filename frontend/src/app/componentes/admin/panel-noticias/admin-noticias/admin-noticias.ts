
import { Component, ChangeDetectionStrategy, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { NoticiasService } from '../../../../services/noticias-service';
import { CategoriaService, CategoriaPayload } from '../../../../services/categorias-service';
import { Noticia, Category } from '../../../../../models/noticia.model';
import { CategorySearchPipe } from '../../../pipe/category-search.pipe';
type AdminRole = 'Periodista' | 'Escritor' | 'Administrador' | 'Tecnico';

type StateOpt = 'all' | 'draft' | 'published' | 'pending';
type SortOpt = '-publishAt' | 'publishAt' | 'title' | '-title' | 'createdAt' | '-createdAt';

type Filters = {
  q: string;
  state: StateOpt;
  categoryIds: string[];
  from: string;
  to: string;
  sort: SortOpt;
  pageSize: number;
};

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

  readonly form = this.fb.nonNullable.group({
    q: [''],
    state: ['all' as StateOpt],
    categoryIds: [[] as string[]],
    from: [''],
    to: [''],
    sort: ['-publishAt' as SortOpt],
    pageSize: [20],
  });

  page = signal(1);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  allItems = signal<Noticia[]>([]);
  categorias = signal<CategoriaPayload[]>([]);

  private filtersSig = signal<Filters>(this.form.getRawValue());

  // UI estado del dropdown de categorías
  catOpen = signal(false);
  catQuery = '';

  constructor() {
    // Cargar categorías
    this.categoriasSvc.obtenerCategorias().subscribe({
      next: cats => this.categorias.set(cats || []),
      error: () => {}
    });

    // Cargar noticias
    this.loadNoticias();
    
    // Reaccionar a cambios de filtros
    this.form.valueChanges.subscribe(() => {
      this.page.set(1);
      this.filtersSig.set(this.form.getRawValue());
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
  private loadNoticias() {
    this.loading.set(true);
    this.noticiasSvc.getNoticias().subscribe({
      next: items => {
        this.allItems.set(items || []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudieron cargar las noticias.');
        this.loading.set(false);
      }
    });
  }

  // Cerrar dropdown al click fuera
  @HostListener('document:click', ['$event'])
  closeOnClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInside = this.elRef.nativeElement.contains(target);
    if (!clickedInside && this.catOpen()) {
      console.log('Closing dropdown due to outside click');
      this.catOpen.set(false);
    }
  }

  toggleCatDropdown(event: Event) {
    this.catOpen.set(!this.catOpen());
    console.log('Dropdown toggled, catOpen:', this.catOpen());
    event.stopPropagation();
  }

  closeCatDropdown() {
    this.catOpen.set(false);
    console.log('Dropdown closed, catOpen:', this.catOpen());
  }

  // ---------- Normalización ----------
  catIds(n: Noticia): string[] {
    const raw = Array.isArray(n?.categories) ? n.categories : [];
    return raw.map((c: string | Category | any) => {
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
    return this.categorias().find(x => x._id === id)?.color || undefined;
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

  // ---------- Selector de categorías ----------
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
    ctrl.updateValueAndValidity();
    this.filtersSig.set(this.form.getRawValue());
  }

  removeCat(id?: string) {
    if (!id) return;
    const ctrl = this.form.controls.categoryIds;
    ctrl.setValue((ctrl.value ?? []).filter(x => x !== id));
    ctrl.updateValueAndValidity();
    this.filtersSig.set(this.form.getRawValue());
  }

  clearCategories() {
    const ctrl = this.form.controls.categoryIds;
    ctrl.setValue([]);
    ctrl.updateValueAndValidity();
    this.filtersSig.set(this.form.getRawValue());
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
      sort: '-publishAt',
      pageSize: 20
    });
    this.page.set(1);
    this.filtersSig.set(this.form.getRawValue());
  }

  // ---------- Filtro/orden/paginación ----------
  filtered = computed(() => {
    const v = this.filtersSig();
    const q = (v.q ?? '').trim().toLowerCase();
    const catFilter = v.categoryIds ?? [];
    const from = v.from ? new Date(v.from + 'T00:00:00') : null;
    const to = v.to ? new Date(v.to + 'T23:59:59') : null;

    let rows = this.allItems();

    if (q) {
      rows = rows.filter(r =>
        (r.title ?? '').toLowerCase().includes(q) ||
        (r.slug ?? '').toLowerCase().includes(q) ||
        this.author(r).toLowerCase().includes(q)
      );
    }

    if (catFilter.length) {
      rows = rows.filter(r => {
        const ids = this.catIds(r);
        return catFilter.every(id => ids.includes(id));
      });
    }

    rows = rows.filter(r => {
      const d = this.dateFor(r);
      if (!d && (from || to)) return false;
      if (from && d! < from) return false;
      if (to && d! > to) return false;
      return true;
    });

    const sort = v.sort as SortOpt;
    const byTitle = (a: Noticia, b: Noticia) => (a.title ?? '').localeCompare(b.title ?? '');
    const byCreated = (a: Noticia, b: Noticia) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return da - db;
    };
    const byPublish = byCreated;

    const sorted = [...rows];
    switch (sort) {
      case 'title':
        sorted.sort(byTitle);
        break;
      case '-title':
        sorted.sort((a, b) => -byTitle(a, b));
        break;
      case 'createdAt':
        sorted.sort(byCreated);
        break;
      case '-createdAt':
        sorted.sort((a, b) => -byCreated(a, b));
        break;
      case 'publishAt':
        sorted.sort(byPublish);
        break;
      case '-publishAt':
      default:
        sorted.sort((a, b) => -byPublish(a, b));
        break;
    }
    return sorted;
  });

  total = computed(() => this.filtered().length);
  totalPages = computed(() => {
    const size = this.filtersSig().pageSize ?? 20;
    return Math.max(1, Math.ceil(this.total() / size));
  });

  pageItems = computed(() => {
    const size = this.filtersSig().pageSize ?? 20;
    const start = (this.page() - 1) * size;
    return this.filtered().slice(start, start + size);
  });

  // Acciones
  onApprove(row: Noticia) {
    const isAuthorized = row.autorizada ?? false;
    const action = isAuthorized ? 'desautorizar' : 'autorizar';
    if (!confirm(`¿Estás seguro de que quieres ${action} la noticia "${row.title}"?`)) {
      return;
    }

    this.loading.set(true);
    this.noticiasSvc.toggleAutorizarNoticia(row._id!, !isAuthorized).subscribe({
      next: updatedNoticia => {
        this.allItems.set(
          this.allItems().map(item =>
            item._id === row._id ? { ...item, autorizada: updatedNoticia.autorizada } : item
          )
        );
        alert(`Noticia ${action}da exitosamente.`);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error al actualizar autorización:', err);
        alert('Error al actualizar la autorización: ' + (err.message || 'Unknown error'));
        this.loading.set(false);
      }
    });
  }
  onDelete(row: Noticia) {
    if (!confirm(`¿Estás seguro de que quieres eliminar la noticia "${row.title}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.loading.set(true);
    this.noticiasSvc.deleteNoticia(row._id!).subscribe({
      next: () => {
        this.allItems.set(this.allItems().filter(item => item._id !== row._id));
        alert('Noticia eliminada exitosamente.');
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error deleting noticia:', err);
        alert('Error al eliminar la noticia: ' + (err.message || 'Unknown error'));
        this.loading.set(false);
      }
    });
  }
  // --- Permisos visuales para acciones por noticia ---

  canEdit(row: Noticia): boolean {
    // Escritor NO puede editar si la noticia ya está autorizada
    if (this.userRole === 'Escritor' && row.autorizada) {
      return false;
    }
    return true; // los demás roles sí pueden
  }

  canDelete(row: Noticia): boolean {
    // Escritor NO puede eliminar si la noticia ya está autorizada
    if (this.userRole === 'Escritor' && row.autorizada) {
      return false;
    }
    return true; // los demás roles sí pueden
  }

  nextPage() {
    if (this.page() < this.totalPages()) this.page.set(this.page() + 1);
  }

  prevPage() {
    if (this.page() > 1) this.page.set(this.page() - 1);
  }

  trackById = (_: number, r: Noticia) => r._id ?? _;
  badgeClass(_state: string) {
    return 'badge text-bg-secondary';
  }
}
