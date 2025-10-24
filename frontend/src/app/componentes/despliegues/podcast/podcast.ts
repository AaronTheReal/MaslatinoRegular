// src/app/pages/podcast/podcast.ts
import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { PodcastPCService, PodcastDesktopPayload } from '../../../services/podcast-servicePC';

type Lang =
  | 'es'|'es-MX'|'es-AR'|'es-BO'|'es-CL'|'es-CO'|'es-CR'|'es-CU'|'es-DO'
  | 'es-EC'|'es-SV'|'es-GT'|'es-HN'|'es-NI'|'es-PA'|'es-PY'|'es-PE'|'es-PR'
  | 'es-UY'|'es-VE'|'pt'|'pt-BR'|'fr'|'en-US'|'en-GB'|'en-CA';

interface Episode {
  title: string;
  description?: string;
  audioUrl: string;
  image?: string;
  duration?: number;         // seconds
  releaseDate?: string;
  createdAt?: string;
}

interface CategoryChip {
  _id: string;   // usamos el propio nombre como id
  name: string;
  color?: string;
}

// 🔧 Tipo “normalizado” en el front (opcional)
interface PodcastDoc {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  coverImage?: string;
  bannerImage?: string;
  featured?: boolean;
  language: Lang | string;
  episodes: Episode[];
  authorName?: string;
  categories: string[];      // vienen como string[]
  tags?: string[];
  meta?: {
    description?: string;
    image?: string;
    keywords?: string[];
  };
  order?: number;
  layout?: 'classic'|'grid'|'carousel';
  createdAt?: string;
  updatedAt?: string;
}

type SortKey = 'newest'|'az'|'episodes';
type LayoutKey = 'frame'|'list';

@Component({
  selector: 'app-podcast',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './podcast.html',
  styleUrls: ['./podcast.css']
})
export class Podcast {
  // ====== Estado UI / Filtros ======
  search = signal<string>('');
  selectedLang = signal<Lang | ''>('');
  selectedCats = signal<string[]>([]);
  sort = signal<SortKey>('newest');
  layout = signal<LayoutKey>('frame');

  // Paginación (cliente)
  page = signal<number>(1);
  pageSize = 12;

  // Datos
  loading = signal<boolean>(true);
  loadingMore = signal<boolean>(false); // reservado por si luego haces “infinite scroll”
  podcastsAll = signal<PodcastDoc[]>([]);  // todo el dataset
  error = signal<string>('');

  // Chips de categorías (derivadas)
  categories = signal<CategoryChip[]>([]);

  // Diccionario de idiomas
  readonly langLabels: Record<string, string> = {
    'es': 'Español', 'es-MX': 'Español (MX)', 'es-AR': 'Español (AR)', 'es-BO': 'Español (BO)',
    'es-CL': 'Español (CL)', 'es-CO': 'Español (CO)', 'es-CR': 'Español (CR)', 'es-CU': 'Español (CU)',
    'es-DO': 'Español (DO)', 'es-EC': 'Español (EC)', 'es-SV': 'Español (SV)', 'es-GT': 'Español (GT)',
    'es-HN': 'Español (HN)', 'es-NI': 'Español (NI)', 'es-PA': 'Español (PA)', 'es-PY': 'Español (PY)',
    'es-PE': 'Español (PE)', 'es-PR': 'Español (PR)', 'es-UY': 'Español (UY)', 'es-VE': 'Español (VE)',
    'pt': 'Português', 'pt-BR': 'Português (BR)', 'fr': 'Français',
    'en-US': 'English (US)', 'en-GB': 'English (UK)', 'en-CA': 'English (CA)'
  };

  constructor(private api: PodcastPCService) {
    this.fetchAll();

    // Si cambian filtros (excepto page), regresamos a página 1
    effect(() => {
      // lee señales para registrar dependencia
      this.search();
      this.selectedLang();
      this.selectedCats();
      this.sort();
      // reset
      this.page.set(1);
    });
  }

  /** Carga todos los podcasts desde tu API (una vez). */
  private fetchAll() {
    this.loading.set(true);
    this.error.set('');
    this.api.obtenerPodcasts().subscribe({
      next: (items: PodcastDesktopPayload[]) => {
        // Normaliza a PodcastDoc
        const mapped: PodcastDoc[] = (items || []).map(p => ({
          _id: p._id!, title: p.title, subtitle: p.subtitle, description: p.description,
          coverImage: p.coverImage, bannerImage: p.bannerImage, featured: p.featured,
          language: (p.language as Lang) ?? 'es',
          episodes: (p.episodes as any) || [],
          authorName: p.authorName,
          categories: p.categories || [],
          tags: p.tags, meta: p.meta, order: p.order, layout: p.layout,
          createdAt: p.createdAt, updatedAt: p.updatedAt
        }));
        this.podcastsAll.set(mapped);
        // Derivar chips de categorías
        this.categories.set(this.buildCategoryChips(mapped));
      },
      error: (e) => {
        this.error.set(e?.message ?? 'Error al cargar podcasts.');
        this.podcastsAll.set([]);
      },
      complete: () => this.loading.set(false)
    });
  }

  /** Construye chips únicas de categorías a partir de todo el dataset. */
  private buildCategoryChips(all: PodcastDoc[]): CategoryChip[] {
    const set = new Set<string>();
    for (const p of all) {
      for (const c of (p.categories || [])) set.add(c);
    }
    // Puedes inyectar colores si ya tienes una paleta por nombre
    return Array.from(set).map(name => ({ _id: name, name, color: '#8e4ef6' }));
  }

  // ====== Computeds para filtrar, ordenar y paginar en cliente ======
  private filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const lang = this.selectedLang();
    const cats = new Set(this.selectedCats());

    return this.podcastsAll().filter(p => {
      // search por título, subtítulo y descripción
      const hit = !q || [p.title, p.subtitle, p.description].some(v => (v || '').toLowerCase().includes(q));
      // idioma (si se selecciona)
      const okLang = !lang || (String(p.language) === lang);
      // categorías (todas las seleccionadas deben estar contenidas)
      const okCat = !cats.size || (p.categories || []).some(c => cats.has(c));
      return hit && okLang && okCat;
    });
  });

  private sorted = computed(() => {
    const data = [...this.filtered()];
    const sort = this.sort();

    if (sort === 'az') {
      data.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
    } else if (sort === 'episodes') {
      data.sort((a, b) => (b.episodes?.length || 0) - (a.episodes?.length || 0));
    } else {
      // newest: por última fecha de episodio o updatedAt
      const latest = (p: PodcastDoc) => {
        const dates = (p.episodes || [])
          .map(e => e.releaseDate || e.createdAt)
          .filter(Boolean)
          .map(d => new Date(d as string).getTime());
        const epMax = dates.length ? Math.max(...dates) : 0;
        const upd = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
        return Math.max(epMax, upd);
      };
      data.sort((a, b) => latest(b) - latest(a));
    }
    return data;
  });

  // Visibles según página
  podcasts = computed(() => {
    const size = this.pageSize;
    const page = this.page();
    return this.sorted().slice(0, page * size);
  });

  hasMore = computed(() => this.sorted().length > this.podcasts().length);

  // ====== Acciones UI ======
  onSearchInput(value: string) {
    this.search.set(value ?? '');
  }
  onSelectLang(value: string) {
    this.selectedLang.set((value || '') as Lang | '');
  }
  onToggleCat(catId: string) {
    const set = new Set(this.selectedCats());
    set.has(catId) ? set.delete(catId) : set.add(catId);
    this.selectedCats.set([...set]);
  }
  onSortChange(v: string) {
    this.sort.set((v as SortKey) || 'newest');
  }
  onLayoutChange(v: LayoutKey) {
    this.layout.set(v);
  }
  clearFilters() {
    this.search.set('');
    this.selectedLang.set('');
    this.selectedCats.set([]);
    this.sort.set('newest');
  }
  loadMore() {
    if (!this.hasMore()) return;
    this.page.update(p => p + 1);
  }

  // Utils presentación
  trackById(_i: number, p: PodcastDoc) { return p._id; }
  episodesCount(p: PodcastDoc) { return p.episodes?.length ?? 0; }
  latestDate(p: PodcastDoc) {
    const dates = p.episodes?.map(e => e.releaseDate || e.createdAt).filter(Boolean) as string[];
    const latest = dates?.length ? new Date(Math.max(...dates.map(d => new Date(d).getTime()))) : (p.updatedAt ? new Date(p.updatedAt) : null);
    return latest ? latest.toLocaleDateString() : '';
  }
  langLabel(code: string) { return this.langLabels[code] ?? code; }
}
