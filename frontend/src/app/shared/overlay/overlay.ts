import {
  Component, ElementRef, EventEmitter, HostListener, Input,
  OnChanges, OnDestroy, OnInit, Output, ViewChild, Inject, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Fuse from 'fuse.js';
import { forkJoin } from 'rxjs';

// Servicios reales
import { NoticiasService } from '../../services/noticias-service';
import { PodcastService, PodcastPayload } from '../../services/podcast-service'; // <= ruta corregida
import { CategoriaService, CategoriaPayload } from '../../services/categorias-service';

interface SearchItem {
  id: string;
  title: string;
  type: 'noticia' | 'podcast';
  image?: string;
  route: string;
  categories?: string[];                        // ids de categorías
  category?: { name: string; color?: string };  // 1a categoría para badge
}

@Component({
  selector: 'app-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './overlay.html',
  styleUrls: ['./overlay.css']
})
export class Overlay implements OnInit, OnChanges, OnDestroy {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() selected = new EventEmitter<{ title: string; route?: string }>();
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('panel') panelRef!: ElementRef<HTMLDivElement>;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private noticiasService: NoticiasService,
    private podcastService: PodcastService,
    private categoriaService: CategoriaService
  ) {}

  // UI / estado
  query = '';
  filtered: SearchItem[] = [];
  original: SearchItem[] = [];
  fuse!: Fuse<SearchItem>;
  loading = true;
  highlightedIndex = -1;
  isFilterOpen = false;

  // Filtros
  filters = { noticias: true, podcasts: true };
  selectedCats: string[] = []; // ids reales seleccionados

  // Catálogo real
  categorias: CategoriaPayload[] = [];
  private catMap = new Map<string, CategoriaPayload>();

  // Fuente dependiente de filtros (para re-indexar Fuse)
  private lastFuseSource: SearchItem[] = [];

  // ===== Ciclo de vida =====
  ngOnInit() {
    this.loadDataReal();
  }

  ngOnChanges() {
    if (this.open) this.afterOpen();
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.remove('no-scroll');
    }
  }

  // ===== Carga real desde backend =====
  private loadDataReal() {
    this.loading = true;

    forkJoin({
      categorias: this.categoriaService.obtenerCategorias(),
      noticias: this.noticiasService.getNoticias(),
      podcasts: this.podcastService.obtenerPodcasts()
    }).subscribe({
      next: ({ categorias, noticias, podcasts }) => {
        // 1) mapa de categorías
        this.categorias = (categorias || []).filter(c => !!c?._id);
        this.catMap.clear();
        for (const c of this.categorias) {
          if (c._id) this.catMap.set(c._id, c);
        }

        // 2) Noticias -> SearchItem
        const newsItems: SearchItem[] = (noticias || []).map((n: any) => {
          const id = n?._id || n?.id || '';
          const slug = n?.slug || n?.meta?.slug;
          const title = n?.title || n?.meta?.title || 'Sin título';
          const image = n?.meta?.image || n?.image || n?.imagen || undefined;

          const catIds: string[] = Array.isArray(n?.categories)
            ? n.categories
                .map((c: any) => typeof c === 'string' ? c : (c?._id || c?.id || ''))
                .filter((v: string) => !!v)
            : [];

          const firstCat = this.pickFirstCat(catIds);

          return {
            id,
            title,
            type: 'noticia',
            image,
            route: this.buildNoticiaRoute(slug, id),
            categories: catIds,
            category: firstCat
          };
        });

        // 3) Podcasts -> SearchItem
        const podcastItems: SearchItem[] = (podcasts || []).map((p: PodcastPayload | any) => {
          const id = p?._id || p?.id || '';
          const title = p?.title || p?.name || 'Sin título';
          const image = p?.coverImage || p?.image || p?.images?.[0]?.url || undefined;

          const catIds: string[] = Array.isArray(p?.categories)
            ? p.categories
                .map((c: any) => typeof c === 'string' ? c : (c?._id || c?.id || ''))
                .filter((v: string) => !!v)
            : [];

          const firstCat = this.pickFirstCat(catIds);

          return {
            id,
            title,
            type: 'podcast',
            image,
            route: this.buildPodcastRoute(id),
            categories: catIds,
            category: firstCat
          };
        });

        // 4) Consolidado
        this.original = [...newsItems, ...podcastItems];

        // 5) Fuse inicial
        this.lastFuseSource = [...this.original];
        this.fuse = new Fuse(this.lastFuseSource, {
          keys: ['title'],
          ignoreLocation: true,
          threshold: 0.3,
          distance: 100
        });

        this.filtered = this.lastFuseSource.slice(0, 20);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando datos del overlay:', err);
        this.original = [];
        this.filtered = [];
        this.loading = false;
      }
    });
  }

  // ===== Helpers rutas / categorías =====
  private buildNoticiaRoute(slug?: string, id?: string) {
    if (slug) return `/noticia/${encodeURIComponent(slug)}`;
    if (id)   return `/noticia/${id}`;
    return '/noticias';
  }

  private buildPodcastRoute(id?: string) {
    if (id) return `/podcast/${id}`;
    return '/podcasts';
  }

  private pickFirstCat(catIds?: string[]): { name: string; color?: string } | undefined {
    if (!catIds?.length) return undefined;
    const found = this.catMap.get(catIds[0]);
    if (!found) return undefined;
    return { name: found.name, color: found.color };
  }

  // ===== Búsqueda / Filtros =====
  onQueryChange() {
    this.highlightedIndex = -1;
    this.applyFilters();
  }

  applyFilters() {
    let base = [...this.original];

    if (!this.filters.noticias) base = base.filter(i => i.type !== 'noticia');
    if (!this.filters.podcasts) base = base.filter(i => i.type !== 'podcast');

    if (this.selectedCats.length > 0) {
      base = base.filter(i => (i.categories || []).some(cid => this.selectedCats.includes(cid)));
    }

    // Re-indexar Fuse con la fuente filtrada
    this.lastFuseSource = base;
    this.fuse = new Fuse(this.lastFuseSource, {
      keys: ['title'],
      ignoreLocation: true,
      threshold: 0.3,
      distance: 100
    });

    if (this.query.trim()) {
      const result = this.fuse.search(this.query.trim());
      base = result.map(r => r.item);
    }

    this.filtered = base.slice(0, 20);
  }

  // ===== Selección / Navegación =====
  pick(item: SearchItem) {
    this.selected.emit({ title: item.title, route: item.route });
    if (!item?.route) return;
    this.router.navigate([item.route]);
    this.close();
  }

  // ===== Modal filtros =====
  openFilterModal() { this.isFilterOpen = true; }
  closeFilterModal() { this.isFilterOpen = false; }

  toggleCat(id: string | undefined) {
    if (!id) return;
    const i = this.selectedCats.indexOf(id);
    if (i > -1) this.selectedCats.splice(i, 1);
    else this.selectedCats.push(id);
    this.applyFilters();
  }

  resetFilters() {
    this.filters = { noticias: true, podcasts: true };
    this.selectedCats = [];
    this.applyFilters();
  }

  // ===== Teclado / UX =====
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (!this.open) return;
    if (e.key === 'Escape') this.close();
    if (this.filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filtered.length - 1);
      this.scrollToHighlight();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
      this.scrollToHighlight();
    }
    if (e.key === 'Enter' && this.highlightedIndex >= 0) {
      e.preventDefault();
      this.pick(this.filtered[this.highlightedIndex]);
    }
  }

  private scrollToHighlight() {
    if (isPlatformBrowser(this.platformId)) {
      const el = document.getElementById(`result-${this.highlightedIndex}`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }

  close() {
    this.open = false;
    this.closed.emit();
    if (isPlatformBrowser(this.platformId)) document.body.classList.remove('no-scroll');
  }

  private afterOpen() {
    if (isPlatformBrowser(this.platformId)) document.body.classList.add('no-scroll');
    setTimeout(() => this.searchInput?.nativeElement.focus(), 60);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.open) return;
    const panel = this.panelRef?.nativeElement;
    if (panel && !panel.contains(e.target as Node)) this.close();
  }

  // ===== trackBy para categorías =====
  trackByCatId = (_: number, cat: CategoriaPayload) => cat._id ?? _;
}
