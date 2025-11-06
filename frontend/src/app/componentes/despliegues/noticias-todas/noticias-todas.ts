import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Noticia, Category } from '../../../../models/noticia.model';
import { NoticiasService } from '../../../services/noticias-service';
import { CategoriaService, CategoriaPayload } from '../../../services/categorias-service';

type CatLike = string | { _id?: string; $oid?: string; slug?: string; name?: string } | Category;

@Component({
  selector: 'app-noticias',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './noticias-todas.html',
  styleUrls: ['./noticias-todas.css'],
})
export class NoticiasTodas implements OnInit {
  private noticiasService = inject(NoticiasService);
  private categoriasService = inject(CategoriaService);

  // Estado UI
  activeCategory: string = 'All';
  searchQuery = '';

  // Datos
  noticias: Noticia[] = [];

  // Botones de filtro
  categories: string[] = ['All'];

  // Catálogo (resuelto desde el servicio)
  private categoriaById = new Map<string, CategoriaPayload>();
  private categoriaBySlug = new Map<string, CategoriaPayload>();
  private categoriaByNameLower = new Map<string, CategoriaPayload>();

  // Fallbacks de color si el catálogo no trae color
  private categoryColorFallback: Record<string, string> = {
    'negocios': '#8F50F8',
    'deportes': '#00CB7E',
    'política': '#FAAF3E',
    'entretenimiento': '#FE3824',
    'arte': '#8F50F8',
    'mundo': '#111111',
    'general': '#111111',
    'all': '#000000',
  };

  ngOnInit(): void {
    // 1) Cargar categorías
    this.categoriasService.obtenerCategorias().subscribe({
      next: (res: CategoriaPayload[]) => {
        const limpias = (res ?? []).filter(c => !!c && !!c.name && !!c.slug);

        for (const c of limpias) {
          const id = (c._id ?? '').trim();
          const slug = (c.slug ?? '').trim();
          const name = (c.name ?? '').trim();

          if (id) this.categoriaById.set(id, c);
          if (slug) this.categoriaBySlug.set(slug.toLowerCase(), c);
          if (name) this.categoriaByNameLower.set(name.toLowerCase(), c);
        }

        const ordenadas = limpias
          .slice()
          .sort((a, b) => a.name!.localeCompare(b.name!))
          .map(c => c.name!);

        this.categories = ['All', ...ordenadas];
      },
      error: (e) => console.error('Error al cargar categorías:', e)
    });

    // 2) Cargar noticias
    this.noticiasService.getNoticiasRecientes(0).subscribe({
      next: (data) => {
        this.noticias = Array.isArray(data) ? data : [];
      },
      error: (err) => {
        console.error('Error cargando noticias recientes', err);
      }
    });
  }

  // =========================
  //     Helpers de catálogo
  // =========================

  private extractId(x: unknown): string | undefined {
    if (!x) return undefined;
    if (typeof x === 'string') return x;
    if (typeof x === 'object') {
      const asAny = x as any;
      if (typeof asAny._id === 'string') return asAny._id;
      if (asAny._id && typeof asAny._id === 'object' && typeof asAny._id.$oid === 'string') return asAny._id.$oid;
      if (typeof asAny.$oid === 'string') return asAny.$oid;
    }
    return undefined;
  }

  private resolveCategoria(anyCat: CatLike): CategoriaPayload | undefined {
    if (!anyCat) return undefined;

    if (typeof anyCat === 'object' && (anyCat as Category).name && (anyCat as Category).slug) {
      const nameLower = (anyCat as Category).name.toLowerCase();
      const slugLower = (anyCat as Category).slug.toLowerCase();
      return this.categoriaByNameLower.get(nameLower) || this.categoriaBySlug.get(slugLower);
    }

    const id = this.extractId(anyCat);
    if (id) {
      const byId = this.categoriaById.get(id);
      if (byId) return byId;
    }

    if (typeof anyCat === 'string') {
      const s = anyCat.trim().toLowerCase();
      return this.categoriaBySlug.get(s) || this.categoriaByNameLower.get(s);
    }

    if (typeof anyCat === 'object') {
      const o: any = anyCat;
      if (typeof o.slug === 'string') {
        const bySlug = this.categoriaBySlug.get(o.slug.toLowerCase());
        if (bySlug) return bySlug;
      }
      if (typeof o.name === 'string') {
        const byName = this.categoriaByNameLower.get(o.name.toLowerCase());
        if (byName) return byName;
      }
    }

    return undefined;
  }

  private extraerNombresCategorias(n: Noticia): string[] {
    if (!n?.categories || n.categories.length === 0) return ['General'];

    const displayNames = new Set<string>();

    for (const raw of n.categories as unknown as CatLike[]) {
      const cat = this.resolveCategoria(raw);

      if (cat?.name) {
        displayNames.add(cat.name);
      } else if (typeof raw === 'object' && (raw as any).name) {
        displayNames.add((raw as any).name);
      } else if (typeof raw === 'string') {
        const asName = this.categoriaByNameLower.get(raw.toLowerCase());
        displayNames.add(asName?.name ?? 'General');
      } else {
        displayNames.add('General');
      }
    }

    return displayNames.size ? Array.from(displayNames) : ['General'];
  }

  getCategoryColor(categoryDisplayName: string): string {
    const c = this.categoriaByNameLower.get((categoryDisplayName ?? '').toLowerCase());
    if (c?.color && c.color.trim()) return c.color.trim();
    return this.categoryColorFallback[(categoryDisplayName ?? '').toLowerCase()] || '#000';
  }

  // =========================
  //         UI actions
  // =========================

  setActiveCategory(category: string): void {
    this.activeCategory = category;
    this.currentPage = 1;
  }

  onSearchInput(value: string | undefined) {
    this.searchQuery = value ?? '';
    this.currentPage = 1;
  }

  // =========================
  //    Derivados de render
  // =========================

  getPrimaryCategory(n: Noticia): string {
    const names = this.extraerNombresCategorias(n);
    return names[0] || 'General';
  }

  getCardImage(n: Noticia): string {
    return n?.meta?.image?.trim()
      || 'assets/images/news-fallback.jpg';
  }

  get filteredNoticias(): Noticia[] {
    const q = this.searchQuery.trim().toLowerCase();
    const active = (this.activeCategory ?? 'All').toLowerCase();

    return this.noticias.filter(n => {
      const names = this.extraerNombresCategorias(n).map(x => x.toLowerCase());
      const inCategory = (active === 'all') ? true : names.includes(active);
      const inSearch = q ? (n.title?.toLowerCase().includes(q)) : true;
      return inCategory && inSearch;
    });
  }

  // =========================
  //     PAGINACIÓN SIMPLE
  // =========================

  pageSize = 5;
  currentPage = 1;

  get totalPages(): number {
    return Math.ceil(this.filteredNoticias.length / this.pageSize);
  }

  get paginatedNoticias(): Noticia[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredNoticias.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1);
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const range = 2;

    let start = Math.max(1, current - range);
    let end = Math.min(total, current + range);

    if (end - start < 4) {
      if (start === 1) end = Math.min(5, total);
      else if (end === total) start = Math.max(1, total - 4);
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  trackByNoticia = (_: number, n: Noticia) => n._id;
}
