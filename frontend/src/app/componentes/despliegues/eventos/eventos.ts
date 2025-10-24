import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CalendarPCService, CalendarItemPC } from '../../../services/calendario-servicePC';
import { FormsModule } from '@angular/forms';

// Hijos
import { EventoCard } from '../eventos/parts/evento-card/evento-card';
import { EventoRow } from '../eventos/parts/evento-row/evento-row';
import { CategoriaService, CategoriaPayload } from '../../../services/categorias-service';

type TabKey = 'proximos' | 'pasados' | 'destacados';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DatePipe, EventoCard, EventoRow],
  templateUrl: './eventos.html',
  styleUrls: ['./eventos.css']
})
export class Eventos {
  private svc = inject(CalendarPCService);
  private categoriasSvc = inject(CategoriaService);

  // Estado de UI
  tab = signal<TabKey>('proximos');
  layout = signal<'grid' | 'lista'>('grid');
  query = signal<string>('');
  category = signal<string>(''); // nombre/slug seleccionado en UI
  pageSize = signal<number>(12);

  // Data
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  items = signal<CalendarItemPC[]>([]);
  categorias = signal<CategoriaPayload[]>([]); // ← catálogo para mapear ids→slug/name

  constructor() {
    this.load();
    // Carga de categorías para mapear IDs a slug/name
    this.categoriasSvc.obtenerCategorias().subscribe({
      next: (cats) => this.categorias.set(cats ?? []),
      error: () => this.categorias.set([])
    });

    effect(() => {
      // reactividad simple si cambias filtros (no recarga, solo recalcula)
      this.tab(); this.category(); this.query();
    });
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.obtenerItems().subscribe({
      next: (res) => {
        // Ordenar por fecha de inicio ascendente
        const ordered = [...res].sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        );
        this.items.set(ordered);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los eventos. Intenta de nuevo.');
        this.loading.set(false);
      }
    });
  }

  // Filtro lógico (cliente)
  filtered = computed(() => {
    const now = Date.now();
    const q = this.query().toLowerCase().trim();
    const cat = this.category().trim().toLowerCase();
    const tab = this.tab();
    const catIndex = this.categorias();

    return this.items().filter(ev => {
      // Excluir archivados si llegan en el feed
      if (ev.status === 'archived') return false;

      const start = new Date(ev.startAt).getTime();
      const end = ev.endAt ? new Date(ev.endAt).getTime() : start;
      const isFuture = start >= now;
      const isPast = end < now;
      const isFeatured = !!ev.featured;

      // Tabs
      if (tab === 'proximos' && !isFuture) return false;
      if (tab === 'pasados' && !isPast) return false;
      if (tab === 'destacados' && !isFeatured) return false;

      // Búsqueda
      const matchesQuery = !q || [
        ev.title,
        ev.excerpt ?? '',
        ev.location?.name ?? '',
        ev.location?.address ?? '',
        ...(ev.tags ?? [])
      ].some(v => v?.toLowerCase().includes(q));
      if (!matchesQuery) return false;

      // Categoría (acepta id, slug o name en ev.categories)
      if (!cat) return true;

      const evCats = (ev.categories ?? []).map(idOrName => {
        // Si viene un ObjectId string, mapearlo a slug/name
        const found = catIndex.find(c =>
          c._id === idOrName || c.slug === idOrName || c.name === idOrName
        );
        if (found) return (found.slug ?? found.name).toLowerCase();
        // Si ya viene como nombre/slug directo
        return (idOrName || '').toLowerCase();
      });

      return evCats.some(v => v === cat);
    });
  });

  // Paginación simple (cliente)
  visible = computed(() => this.filtered().slice(0, this.pageSize()));

  toggleLayout(next: 'grid' | 'lista') { this.layout.set(next); }
  setTab(t: TabKey) { this.tab.set(t); }
  onShowMore() { this.pageSize.set(this.pageSize() + 12); }

  // UX helpers
  isToday(dateIso: string): boolean {
    const d = new Date(dateIso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear()
        && d.getMonth() === now.getMonth()
        && d.getDate() === now.getDate();
  }

  // trackBy opcional para *ngFor performance
  trackById = (_: number, ev: CalendarItemPC) => ev._id ?? ev.slug ?? _;
}
