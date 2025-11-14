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
  _id: string;
  name: string;
  color?: string;
}

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
  categories: string[];
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
  loadingMore = signal<boolean>(false);
  podcastsAll = signal<PodcastDoc[]>([]);
  error = signal<string>('');

  // Chips de categorías
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

  // ====== LINKS A APP (Play Store / App Store) ======
  private readonly ANDROID_PACKAGE = 'com.maslatino.app';
  private readonly IOS_APP_ID      = '6698865116';

  // Si luego tienes deep link (ej: 'maslatino://'), lo pones aquí.
  private readonly CUSTOM_SCHEME   = '';

  private get androidStoreUrl() {
    return `https://play.google.com/store/apps/details?id=${this.ANDROID_PACKAGE}&hl=es_MX`;
  }

  private get iosStoreUrl() {
    return `https://apps.apple.com/us/app/mas-latino/id${this.IOS_APP_ID}`;
  }

  private get androidIntentUrl() {
    const fallback = encodeURIComponent(this.androidStoreUrl);
    const pkg = this.ANDROID_PACKAGE;
    const scheme = (this.CUSTOM_SCHEME || '').split('://')[0] || 'https';
    return `intent://open#Intent;scheme=${scheme};package=${pkg};S.browser_fallback_url=${fallback};end`;
  }

  constructor(private api: PodcastPCService) {
    this.fetchAll();

    // Reset de página al cambiar filtros
    effect(() => {
      this.search();
      this.selectedLang();
      this.selectedCats();
      this.sort();
      this.page.set(1);
    });
  }

  /** Carga todos los podcasts desde tu API (una vez). */
  private fetchAll() {
    this.loading.set(true);
    this.error.set('');
    this.api.obtenerPodcasts().subscribe({
      next: (items: PodcastDesktopPayload[]) => {
        const mapped: PodcastDoc[] = (items || []).map(p => ({
          _id: p._id!,
          title: p.title,
          subtitle: p.subtitle,
          description: p.description,
          coverImage: p.coverImage,
          bannerImage: p.bannerImage,
          featured: p.featured,
          language: (p.language as Lang) ?? 'es',
          episodes: (p.episodes as any) || [],
          authorName: p.authorName,
          categories: p.categories || [],
          tags: p.tags,
          meta: p.meta,
          order: p.order,
          layout: p.layout,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        }));
        this.podcastsAll.set(mapped);
        this.categories.set(this.buildCategoryChips(mapped));
      },
      error: (e) => {
        this.error.set(e?.message ?? 'Error al cargar podcasts.');
        this.podcastsAll.set([]);
      },
      complete: () => this.loading.set(false)
    });
  }

  /** Construye chips únicas de categorías. */
  private buildCategoryChips(all: PodcastDoc[]): CategoryChip[] {
    const set = new Set<string>();
    for (const p of all) {
      for (const c of (p.categories || [])) set.add(c);
    }
    return Array.from(set).map(name => ({ _id: name, name, color: '#8e4ef6' }));
  }

  // ====== Computeds para filtrar, ordenar y paginar ======
  private filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const lang = this.selectedLang();
    const cats = new Set(this.selectedCats());

    return this.podcastsAll().filter(p => {
      const hit = !q || [p.title, p.subtitle, p.description].some(v => (v || '').toLowerCase().includes(q));
      const okLang = !lang || (String(p.language) === lang);
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
    const latest = dates?.length
      ? new Date(Math.max(...dates.map(d => new Date(d).getTime())))
      : (p.updatedAt ? new Date(p.updatedAt) : null);
    return latest ? latest.toLocaleDateString() : '';
  }
  langLabel(code: string) { return this.langLabels[code] ?? code; }

  // ====== APERTURA APP / TIENDAS ======
  openAndroid(evt: Event) {
    evt.preventDefault();
    const hasScheme = !!this.CUSTOM_SCHEME;

    if (hasScheme && /Android/i.test(navigator.userAgent)) {
      window.location.href = this.androidIntentUrl;
      return;
    }

    if (hasScheme) {
      this.tryOpen(this.CUSTOM_SCHEME, this.androidStoreUrl);
    } else {
      window.open(this.androidStoreUrl, '_blank', 'noopener');
    }
  }

  openIOS(evt: Event) {
    evt.preventDefault();
    const hasScheme = !!this.CUSTOM_SCHEME;

    if (hasScheme && /iPad|iPhone|iPod/i.test(navigator.userAgent)) {
      const iosNativeStore = `itms-apps://apps.apple.com/app/id${this.IOS_APP_ID}`;
      this.tryOpen(this.CUSTOM_SCHEME, iosNativeStore);
    } else if (hasScheme) {
      this.tryOpen(this.CUSTOM_SCHEME, this.iosStoreUrl);
    } else {
      window.open(this.iosStoreUrl, '_blank', 'noopener');
    }
  }

  private tryOpen(deepLink: string, fallbackUrl: string) {
    const t = Date.now();
    window.location.assign(deepLink);
    setTimeout(() => {
      const hidden = document.hidden || (document as any).webkitHidden;
      if (!hidden && Date.now() - t < 2000) {
        window.location.href = fallbackUrl;
      }
    }, 800);
  }
}
