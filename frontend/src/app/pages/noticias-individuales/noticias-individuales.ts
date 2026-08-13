import {
  Component,
  ChangeDetectionStrategy,
  inject,
  Renderer2,
  PLATFORM_ID,
  RESPONSE_INIT
} from '@angular/core';
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
import { CdnImagePipe } from '../../pipes/cdn-image.pipe';
declare const twttr: any;

@Component({
  selector: 'app-noticias-individuales',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, FormsModule,AdsComponent, CdnImagePipe],
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
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });


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
        this.setNotFoundMetadata();
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
            this.setResponseStatus(200);
            const title = noticia.title || 'Noticia';
            const socialTitle = noticia.meta?.ogTitle || title;
            const description = (noticia.meta?.description || noticia.summary || 'Descripción no disponible')
              .replace(/<[^>]*>/g, '')    // strip HTML
              .slice(0, 160);
            const socialDescription = (noticia.meta?.ogDescription || description)
              .replace(/<[^>]*>/g, '')
              .slice(0, 300);
            const rawImage = noticia.meta?.image || '';
            const image = this.ensureAbsoluteHttpsUrl(rawImage);
            const url = `https://maslatino.com/noticia/${encodeURIComponent(noticia.slug ?? '')}`;

            // ── Meta tags ─────────────────────────────────────────────────
            this.title.setTitle(`${title} | Mas Latino`);
            this.meta.updateTag({ name: 'description', content: description });
            this.meta.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large' });
            this.meta.updateTag({ name: 'keywords', content: noticia.tags?.join(', ') || 'noticias, Mas Latino' });
            this.meta.updateTag({ property: 'og:type', content: 'article' });
            this.meta.updateTag({ property: 'og:title', content: socialTitle });
            this.meta.updateTag({ property: 'og:description', content: socialDescription });
            this.meta.updateTag({ property: 'og:url', content: url });
            this.meta.updateTag({ property: 'og:image', content: image });
            this.meta.updateTag({ property: 'og:image:secure_url', content: image });
            if (noticia.meta?.imageWidth) {
              this.meta.updateTag({ property: 'og:image:width', content: String(noticia.meta.imageWidth) });
            } else {
              this.meta.removeTag('property="og:image:width"');
            }
            if (noticia.meta?.imageHeight) {
              this.meta.updateTag({ property: 'og:image:height', content: String(noticia.meta.imageHeight) });
            } else {
              this.meta.removeTag('property="og:image:height"');
            }
            if (noticia.meta?.imageType) {
              this.meta.updateTag({ property: 'og:image:type', content: noticia.meta.imageType });
            } else {
              this.meta.removeTag('property="og:image:type"');
            }
            this.meta.updateTag({ name: 'twitter:card', content: noticia.meta?.twitterCard || 'summary_large_image' });
            this.meta.updateTag({ name: 'twitter:title', content: socialTitle });
            this.meta.updateTag({ name: 'twitter:description', content: socialDescription });
            this.meta.updateTag({ name: 'twitter:image', content: image });

            // ── Canonical — en SSR Y en browser, sin duplicar ─────────────
            // (bots de redes sociales ven el HTML de SSR, necesitan el canonical)
            const existingCanonical = this.document.querySelector('link[rel="canonical"]');
            if (existingCanonical) {
              this.renderer.setAttribute(existingCanonical, 'href', url);
            } else {
              const link = this.renderer.createElement('link');
              this.renderer.setAttribute(link, 'rel', 'canonical');
              this.renderer.setAttribute(link, 'href', url);
              this.renderer.appendChild(this.document.head, link);
            }

            // ── JSON-LD NewsArticle — en SSR Y en browser, sin duplicar ──
            // SSR: se serializa en el HTML → los bots lo ven.
            // Browser (navegación client-side): actualiza el script existente.
            const publishedDate = (noticia as any).publishAt ?? noticia.createdAt;
            const modifiedDate = noticia.contentUpdatedAt ?? noticia.updatedAt ?? publishedDate;
            const authorName = noticia.authorName?.trim() || 'Redacción Mas Latino';
            const author = noticia.authorName?.trim()
              ? { '@type': 'Person', name: authorName }
              : {
                  '@type': 'Organization',
                  name: authorName,
                  url: 'https://maslatino.com'
                };

            const schema = {
              '@context': 'https://schema.org',
              '@type': 'NewsArticle',
              headline: title,
              description: description,
              image: [image],
              datePublished: this.toIsoDate(publishedDate),
              dateModified: this.toIsoDate(modifiedDate),
              author,
              publisher: {
                '@type': 'Organization',
                name: 'Mas Latino',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://maslatino.com/assets/iconosnavbar/maslatinologo.png'
                }
              },
              mainEntityOfPage: { '@type': 'WebPage', '@id': url },
              keywords: noticia.tags?.join(', ') || '',
              articleSection: this.getCategoryNames(noticia.categories as Category[])
            };

            try {
              const existingJsonLd = this.document.querySelector('script[type="application/ld+json"][data-noticia]');
              if (existingJsonLd) {
                this.renderer.setProperty(existingJsonLd, 'textContent', JSON.stringify(schema));
              } else {
                const script = this.renderer.createElement('script');
                this.renderer.setAttribute(script, 'type', 'application/ld+json');
                this.renderer.setAttribute(script, 'data-noticia', 'true');
                this.renderer.setProperty(script, 'textContent', JSON.stringify(schema));
                this.renderer.appendChild(this.document.head, script);
              }
            } catch (e) {
              console.warn('Could not set JSON-LD schema:', e);
            }

            // Load Twitter widgets only in browser
            this.loadTwitterWidgetsIfNeeded(noticia);

          } else {
            this.setNotFoundMetadata();
          }

        }),
        catchError(error => {
          if (error?.status === 404) {
            this.setNotFoundMetadata();
          } else {
            console.error('Error fetching noticia (slug):', error);
            this.setServiceErrorMetadata();
          }
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

  private ensureAbsoluteHttpsUrl(url: string): string {
    if (!url || url.trim() === '') {
      return 'https://maslatino.com/assets/iconosnavbar/maslatinologo.png';
    }
    if (url.startsWith('https://')) return url;
    if (url.startsWith('http://')) return url.replace('http://', 'https://');
    // URL relativa — prepend dominio
    return `https://maslatino.com${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private toIsoDate(value: string | Date | undefined): string {
    const date = value ? new Date(value) : new Date(0);
    return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
  }

  private setNotFoundMetadata(): void {
    this.setResponseStatus(404);
    this.title.setTitle('Noticia no encontrada | Mas Latino');
    this.meta.updateTag({ name: 'description', content: 'La noticia solicitada no está disponible.' });
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    this.meta.updateTag({ property: 'og:title', content: 'Noticia no encontrada' });
    this.meta.updateTag({ property: 'og:description', content: 'La noticia solicitada no está disponible.' });
    this.meta.updateTag({ name: 'twitter:title', content: 'Noticia no encontrada' });
    this.meta.updateTag({ name: 'twitter:description', content: 'La noticia solicitada no está disponible.' });
    this.clearArticleOnlyMetadata();
  }

  private setServiceErrorMetadata(): void {
    this.setResponseStatus(503);
    this.title.setTitle('Servicio temporalmente no disponible | Mas Latino');
    this.meta.updateTag({ name: 'description', content: 'No fue posible cargar la noticia en este momento.' });
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    this.meta.updateTag({ property: 'og:title', content: 'Servicio temporalmente no disponible' });
    this.meta.updateTag({
      property: 'og:description',
      content: 'No fue posible cargar la noticia en este momento.'
    });
    this.meta.updateTag({ name: 'twitter:title', content: 'Servicio temporalmente no disponible' });
    this.meta.updateTag({
      name: 'twitter:description',
      content: 'No fue posible cargar la noticia en este momento.'
    });
    this.clearArticleOnlyMetadata();
  }

  private setResponseStatus(status: number): void {
    if (!this.responseInit) return;

    this.responseInit.status = status;
    if (status >= 400) {
      const headers = new Headers(this.responseInit.headers);
      headers.set('Cache-Control', 'private, no-store');
      this.responseInit.headers = headers;
    }
  }

  private clearArticleOnlyMetadata(): void {
    this.meta.removeTag('property="og:image"');
    this.meta.removeTag('property="og:image:secure_url"');
    this.meta.removeTag('property="og:image:width"');
    this.meta.removeTag('property="og:image:height"');
    this.meta.removeTag('property="og:image:type"');
    this.meta.removeTag('property="og:url"');
    this.meta.removeTag('name="twitter:image"');

    const canonical = this.document.querySelector('link[rel="canonical"]');
    if (canonical?.parentNode) {
      this.renderer.removeChild(canonical.parentNode, canonical);
    }

    const existingJsonLd = this.document.querySelector(
      'script[type="application/ld+json"][data-noticia]'
    );
    if (existingJsonLd?.parentNode) {
      this.renderer.removeChild(existingJsonLd.parentNode, existingJsonLd);
    }
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
