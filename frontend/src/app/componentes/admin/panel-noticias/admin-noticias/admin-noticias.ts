import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { NoticiasService } from '../../../../services/noticias-service';
import { CategoriaService, CategoriaPayload } from '../../../../services/categorias-service';
import { Noticia, Category } from '../../../../../models/noticia.model';

type StateOpt = 'all'|'draft'|'published'|'pending';
type SortOpt = '-publishAt'|'publishAt'|'title'|'-title'|'createdAt'|'-createdAt';

@Component({
  selector: 'app-admin-noticias',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, DatePipe],
  templateUrl: './admin-noticias.html',
  styleUrls: ['./admin-noticias.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminNoticias {
  private fb = inject(FormBuilder);
  private noticiasSvc = inject(NoticiasService);
  private categoriasSvc = inject(CategoriaService);

  readonly form = this.fb.nonNullable.group({
    q: [''],
    state: ['all' as StateOpt],      // por ahora, visual; no usamos r.state
    categoryIds: [[] as string[]],
    from: [''], // yyyy-MM-dd
    to: [''],   // yyyy-MM-dd
    sort: ['-publishAt' as SortOpt], // publishAt cae a createdAt si no existe
    pageSize: [20],
  });

  page = signal(1);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  // Datos
  allItems = signal<Noticia[]>([]);
  categorias = signal<CategoriaPayload[]>([]);

  constructor() {
    // Cargar categorías (para mapear id -> nombre/color)
    this.categoriasSvc.obtenerCategorias().subscribe({
      next: cats => this.categorias.set(cats || []),
      error: () => {}
    });

    // Cargar todas las noticias
    this.noticiasSvc.getNoticias().subscribe({
      next: items => { this.allItems.set(items || []); this.loading.set(false); },
      error: () => { this.errorMsg.set('No se pudieron cargar las noticias.'); this.loading.set(false); }
    });

    // Reset de página si cambian filtros
    this.form.valueChanges.subscribe(() => this.page.set(1));
  }

  // ---------- Normalización y helpers seguros (evitan $oid/_id en plantilla) ----------
  /** Devuelve IDs de categorías como strings, sin importar si vienen como string, Category, { $oid } o populado */
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

  /** Imagen destacada */
  thumb(n: Noticia): string | undefined {
    return n?.meta?.image;
  }

  /** Autor amigable */
  author(n: Noticia): string {
    return n?.authorName || '—';
  }

  /** Fecha para la tabla: si no hay publishAt, usamos createdAt */
  dateFor(n: Noticia): Date | null {
    // Tu interfaz no define publishAt, usamos createdAt
    if (n?.createdAt) return new Date(n.createdAt);
    return null;
  }

  // ---------- Filtro/orden (frontend) ----------
  filtered = computed(() => {
    const v = this.form.getRawValue();
    const q = (v.q ?? '').trim().toLowerCase();
    const catFilter = v.categoryIds ?? [];
    const from = v.from ? new Date(v.from + 'T00:00:00') : null;
    const to = v.to ? new Date(v.to + 'T23:59:59') : null;

    let rows = this.allItems();

    // Búsqueda básica: título/slug/autor
    if (q) {
      rows = rows.filter(r =>
        (r.title ?? '').toLowerCase().includes(q) ||
        (r.slug ?? '').toLowerCase().includes(q) ||
        this.author(r).toLowerCase().includes(q)
      );
    }

    // Categorías (todas las seleccionadas deben estar presentes)
    if (catFilter.length) {
      rows = rows.filter(r => {
        const ids = this.catIds(r);
        return catFilter.every(id => ids.includes(id));
      });
    }

    // Rango de fechas sobre createdAt (porque publishAt no está en tu interfaz)
    rows = rows.filter(r => {
      const d = this.dateFor(r);
      if (!d && (from || to)) return false;
      if (from && d! < from) return false;
      if (to && d! > to) return false;
      return true;
    });

    // Orden (si no hay publishAt, tratamos publishAt como createdAt)
    const sort = v.sort as SortOpt;
    const byTitle = (a: Noticia, b: Noticia) => (a.title ?? '').localeCompare(b.title ?? '');
    const byCreated = (a: Noticia, b: Noticia) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return da - db;
    };
    const byPublish = byCreated; // mismo criterio por ahora

    const sorted = [...rows];
    switch (sort) {
      case 'title': sorted.sort(byTitle); break;
      case '-title': sorted.sort((a,b)=>-byTitle(a,b)); break;
      case 'createdAt': sorted.sort(byCreated); break;
      case '-createdAt': sorted.sort((a,b)=>-byCreated(a,b)); break;
      case 'publishAt': sorted.sort(byPublish); break;
      case '-publishAt': default: sorted.sort((a,b)=>-byPublish(a,b)); break;
    }

    return sorted;
  });

  total = computed(() => this.filtered().length);
  totalPages = computed(() => {
    const size = this.form.value.pageSize ?? 20;
    return Math.max(1, Math.ceil(this.total() / size));
  });

  pageItems = computed(() => {
    const size = this.form.value.pageSize ?? 20;
    const start = (this.page() - 1) * size;
    return this.filtered().slice(start, start + size);
  });

  // Acciones (solo UI por ahora)
  onApprove(_row: Noticia) { alert('Autorizar: pendiente de backend'); }
  onDelete(_row: Noticia)  { alert('Eliminar: pendiente de backend'); }

  nextPage() { if (this.page() < this.totalPages()) this.page.set(this.page() + 1); }
  prevPage() { if (this.page() > 1) this.page.set(this.page() - 1); }

  trackById = (_: number, r: Noticia) => r._id ?? _;
  badgeClass(_state: string) { return 'badge text-bg-secondary'; } // placeholder
}
