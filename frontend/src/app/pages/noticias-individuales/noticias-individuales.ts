import { Component, ChangeDetectionStrategy, inject, Renderer2, PLATFORM_ID } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser, isPlatformServer, DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NoticiasService } from '../../services/noticias-service';
import { CategoriaService, CategoriaPayload } from '../../services/categorias-service';
import { Noticia, Category } from '../../../models/noticia.model';
import { Meta, Title, DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import {AdsComponent} from '../../componentes/ads/ads'
declare const twttr: any;

@Component({
  selector: 'app-noticias-individuales',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, FormsModule,AdsComponent],
  templateUrl: './noticias-individuales.html',
  styleUrls: ['./noticias-individuales.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoticiasIndividuales {
  private readonly route = inject(ActivatedRoute);
  private readonly noticiasService = inject(NoticiasService);
  private readonly categoriasService = inject(CategoriaService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);


  busqueda = '';
  categorias: CategoriaPayload[] = [];
  recientes: Noticia[] = [];
  archivos: { anio: number; mes: string; nombre: string }[] = [];

  trackByIndex = (i: number) => i;
  trackBySlug = (_: number, item: Noticia) => item?.slug ?? _;
  trackByCat = (_: number, item: CategoriaPayload) => item?.slug ?? _;

  readonly noticia$: Observable<Noticia | null> = this.route.paramMap.pipe(
    switchMap(params => {
      const slug = params.get('slug');
      if (!slug) {
        console.log('No slug provided');
        return of(null);
      }
      return this.noticiasService.getNoticiaBySlug(slug).pipe(
        switchMap(noticia => {
          if (!noticia) return of(null);

          const categoryIds = (noticia.categories ?? [])
            .map(cat => (typeof cat === 'string' ? cat : (cat as any)._id))
            .filter((id): id is string => !!id);

          if (categoryIds.length === 0) {
            noticia.categories = [];
            return of(noticia);

          }
          console.log("antes",noticia);

          return this.categoriasService.getCategoriasByIds(categoryIds).pipe(
            catchError(() =>
              of(categoryIds.map(id => ({ _id: id, name: 'Sin categoría', slug: '', color: '' })))
            ),
            tap(categories => {
              noticia.categories = categories as unknown as Category[];
            }),
            switchMap(() => of(noticia))
          );
        }),
        tap(noticia => {
          if (noticia) {
            const title = noticia.title || 'Noticia';
            const description = noticia.meta?.description || noticia.summary || 'Descripción no disponible';
            const image = noticia.meta?.image || '/assets/og.jpg';
            const url = noticia.originalUrl || `https://maslatino.com/noticia/${encodeURIComponent(noticia.slug ?? '')}`;

            // Basic meta tags
            this.title.setTitle(`${title} | Mas Latino`);
            this.meta.updateTag({ name: 'description', content: description });
            this.meta.updateTag({ name: 'keywords', content: noticia.tags?.join(', ') || 'noticias, Mas Latino' });
            this.meta.updateTag({ property: 'og:type', content: 'article' });
            this.meta.updateTag({ property: 'og:title', content: title });
            this.meta.updateTag({ property: 'og:description', content: description });
            this.meta.updateTag({ property: 'og:url', content: url });
            this.meta.updateTag({ property: 'og:image', content: image });
            this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
            this.meta.updateTag({ name: 'twitter:title', content: title });
            this.meta.updateTag({ name: 'twitter:description', content: description });
            this.meta.updateTag({ name: 'twitter:image', content: image });

            // canonical link — keep browser-only to avoid duplicate link handling issues
            if (isPlatformBrowser(this.platformId)) {
              const link = this.renderer.createElement('link');
              this.renderer.setAttribute(link, 'rel', 'canonical');
              this.renderer.setAttribute(link, 'href', url);
              this.renderer.appendChild(this.document.head, link);
            }

            // Build JSON-LD schema (INJECT ON SERVER & BROWSER)
            const publishedDate = (noticia as any).publishAt ?? noticia.createdAt ?? new Date().toISOString();
            const modifiedDate = noticia.updatedAt ?? (noticia as any).publishAt ?? noticia.createdAt ?? new Date().toISOString();

            const schema = {
              '@context': 'https://schema.org',
              '@type': 'NewsArticle',
              headline: title,
              description: description,
              image: [image],
              datePublished: (new Date(publishedDate)).toISOString(),
              dateModified: (new Date(modifiedDate)).toISOString(),
              author: {
                '@type': 'Organization',
                name: 'Redacción Mas Latino',
                url: 'https://maslatino.com'
              },
              publisher: {
                '@type': 'Organization',
                name: 'Mas Latino',
                logo: { '@type': 'ImageObject', url: 'https://maslatino.com/logo.png' }
              },
              mainEntityOfPage: { '@type': 'WebPage', '@id': url },
              keywords: noticia.tags?.join(', ') || '',
              articleSection: this.getCategoryNames(noticia.categories as Category[])
            };

            try {
              if (isPlatformServer(this.platformId)) {
                const script = this.renderer.createElement('script');
                this.renderer.setAttribute(script, 'type', 'application/ld+json');
                this.renderer.setProperty(script, 'textContent', JSON.stringify(schema));
                this.renderer.appendChild(this.document.head, script);
              }
            } catch (e) {
              // Fallback: log but don't break rendering
              console.warn('Could not append JSON-LD schema to head:', e);
            }

            // Load Twitter widgets only in browser
            this.loadTwitterWidgetsIfNeeded(noticia);

          } else {
            this.title.setTitle('Noticia no encontrada | Mas Latino');
            this.meta.updateTag({ name: 'description', content: 'La noticia solicitada no está disponible.' });
            this.meta.updateTag({ property: 'og:title', content: 'Noticia no encontrada' });
            this.meta.updateTag({ property: 'og:description', content: 'La noticia solicitada no está disponible.' });
            this.meta.updateTag({ property: 'og:image', content: '/assets/og.jpg' });
          }

        }),
        catchError(error => {
          console.error('Error fetching noticia (slug):', error);
          this.title.setTitle('Error | Mas Latino');
          this.meta.updateTag({ name: 'description', content: 'Error al cargar la noticia.' });
          return of(null);
        })
      );
    })
  );

  constructor() {
    if (!isPlatformServer(this.platformId)) {
      this.obtenerCategorias();
      this.obtenerNoticiasRecientes();
      this.generarMesesDesde2025();
    }
  }


  getCategoryNames(categories: Array<string | Category> | undefined): string {
    const names = (categories ?? [])
      .map(c => this.isCategory(c) ? (c.name || 'Sin categoría') : '')
      .filter(Boolean);
    return names.length ? names.join(', ') : 'Sin categorías';
  }

  buscarNoticia() {
    if (this.busqueda.trim()) {
      console.log('Buscando:', this.busqueda);
    }
  }

  private obtenerCategorias() {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (res: CategoriaPayload[]) => {
        this.categorias = (res ?? []).filter((c: CategoriaPayload) => c && c.slug && c.name);
      },
      error: (e: unknown) => console.error('Error al cargar categorías:', e)
    });
  }

  private obtenerNoticiasRecientes() {
    this.noticiasService.getNoticiasRecientes(5).subscribe({
      next: (res: Noticia[]) => {
        this.recientes = (res ?? []).filter(
          (n: Noticia) => n && typeof n.slug === 'string' && n.slug.trim().length > 0
        );
      },
      error: (e: unknown) => console.error('Error al cargar noticias recientes:', e)
    });
  }

  private generarMesesDesde2025() {
    const mesesNombres = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const ahora = new Date();
    const anioActual = ahora.getFullYear();
    const mesActual = ahora.getMonth();

    const tmp: { anio: number; mes: string; nombre: string }[] = [];
    for (let anio = 2025; anio <= anioActual; anio++) {
      const hastaMes = anio === anioActual ? mesActual : 11;
      for (let mes = 0; mes <= hastaMes; mes++) {
        tmp.push({
          anio,
          mes: (mes + 1).toString().padStart(2, '0'),
          nombre: `${mesesNombres[mes]} ${anio}`
        });
      }
    }
    this.archivos = tmp.reverse();
  }

  private isCategory(x: unknown): x is Category {
    return !!x && typeof x === 'object' && 'name' in (x as any);
  }

  // ====== EMBEDS ======
  getEmbedHtml(block: any): SafeHtml {
    if (!block) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    // Si el backend ya mandó HTML embebido directamente
    if (typeof block.html === 'string' && block.html.trim()) {
      return this.sanitizer.bypassSecurityTrustHtml(block.html);
    }

    const url: string = (block.url || '').toString().trim();
    if (!url) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    // Provider en minúsculas
    let provider = (block.provider || '').toString().toLowerCase();

    // Detectar provider por URL si viniera 'generic' o vacío
    try {
      const u = new URL(url);
      const host = (u.hostname || '').toLowerCase();

      if (!provider || provider === 'generic') {
        if (host.includes('youtube.com') || host.includes('youtu.be')) {
          provider = 'youtube';
        } else if (host.includes('twitter.com') || host.includes('x.com')) {
          provider = 'twitter';
        }
      }
    } catch {
      // si falla el parseo no pasa nada, seguimos con provider
    }

    // ---- YouTube (por si luego lo usas) ----
    if (provider === 'youtube') {
      const embedUrl = this.buildYoutubeEmbedUrl(url);
      const html = `
        <div class="embed-responsive embed-responsive-16by9">
          <iframe
            src="${embedUrl}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            loading="lazy">
          </iframe>
        </div>
      `;
      return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    // ---- Twitter / X ----
    if (provider === 'twitter') {
      const html = `
        <blockquote class="twitter-tweet">
          <a href="${url}"></a>
        </blockquote>
      `;
      return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    // ---- Fallback genérico: solo link ----
    const safeHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">Ver contenido incrustado</a>`;
    return this.sanitizer.bypassSecurityTrustHtml(safeHtml);
  }


  private buildYoutubeEmbedUrl(raw: string): string {
    try {
      const u = new URL(raw);
      let id = u.searchParams.get('v') || '';

      if (!id && u.pathname) {
        const parts = u.pathname.split('/');
        id = parts.pop() || '';
      }

      if (!id) return raw;
      return `https://www.youtube.com/embed/${id}`;
    } catch {
      return raw;
    }
  }

  private loadTwitterWidgets() {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => this.loadTwitterWidgets(), 0);

    // Evitar duplicados
    const already = document.querySelector('script[data-twitter-wjs="true"]');
    if (already) {
      // Si ya existe, pedir que reprocese los embeds
      (window as any).twttr?.widgets?.load();
      return;
    }

    const script = this.renderer.createElement('script');
    this.renderer.setAttribute(script, 'src', 'https://platform.twitter.com/widgets.js');
    this.renderer.setAttribute(script, 'async', '');
    this.renderer.setAttribute(script, 'charset', 'utf-8');
    this.renderer.setAttribute(script, 'data-twitter-wjs', 'true');
    this.renderer.appendChild(document.body, script);
  }

  normalizeTwitterUrl(raw: string): string {
    if (!raw) return '';
    try {
      const u = new URL(raw);
      if (u.hostname === 'x.com' || u.hostname === 'www.x.com') {
        u.hostname = 'twitter.com';
        return u.toString();
      }
      return u.toString();
    } catch {
      return raw;
    }
  }
  private loadTwitterWidgetsIfNeeded(noticia: Noticia | null) {
    if (!noticia || !Array.isArray(noticia.content)) return;
    const hasTwitterEmbed = noticia.content.some(
      (b: any) => b?.type === 'embed' && b?.provider === 'twitter'
    );
    if (!hasTwitterEmbed) return;

    if (isPlatformBrowser(this.platformId)) {
      try {
        // Pequeño retraso para dejar que Angular pinte el DOM
        setTimeout(() => {
          const w: any = window as any;
          if (w.twttr && w.twttr.widgets && typeof w.twttr.widgets.load === 'function') {
            w.twttr.widgets.load();
          }
        }, 0);
      } catch (e) {
        console.warn('No se pudo cargar widgets de Twitter:', e);
      }
    }
  }

}
