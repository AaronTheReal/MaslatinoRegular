import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-vista-previa',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './vista-previa.html',
  styleUrls: ['./vista-previa.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VistaPrevia {
  @Input() data!: {
    title: string;
    slug: string;
    summary: string;
    extracto?: string;
    tags: string[];
    categories: string[];
    location: { city: string; region: string; country: string };
    meta: {
      description: string;
      image: string;
      canonical?: string;             // ahora opcional, la usas como fuente de imagen
      ogTitle?: string;
      ogDescription?: string;
      imageAltGlobal?: string;
      imageCaptionHtml?: string;      // NUEVO: pie de foto global (HTML seguro)
    };
    state: string;
    publishAt: string | null;
    bodyHtml?: SafeHtml;
    content?: Array<{
      type: string;
      html?: SafeHtml;
      style?: {
        fontSize?: string;
        fontWeight?: string;
        fontFamily?: string;
        textAlign?: 'left' | 'center' | 'right';
      };
      text?: string;
      tag?: string;
      url?: string;
      alt?: string;
      caption?: string;
      captionHtml?: SafeHtml;
      quote?: string;
      authorQuote?: string;
      ordered?: boolean;
      items?: string[];
      itemsHtml?: SafeHtml[];
      href?: string;
      textLink?: string;
      creditText?: string;
      provider?: string;

    }>;
  };

  private readonly baseDomain = 'maslatino.com';
  private readonly baseUrl = `https://${this.baseDomain}`;

  constructor(private sanitizer: DomSanitizer) {}

  /** Aplica target/rel a <a> y devuelve SafeHtml */
  formatHtml(rawHtml: string = ''): SafeHtml {
    const withTargets = rawHtml.replace(
      /<a\s+/g,
      `<a target="_blank" rel="noopener noreferrer" `
    );
    return this.sanitizer.bypassSecurityTrustHtml(withTargets);
  }

  /** Artículo final (para compartir en redes, etc.) */
  getArticleUrl(): string {
    if (!this.data?.slug) return this.baseUrl;
    return `${this.baseUrl}/${this.data.slug}`;
  }

    /** Construye el src del iframe según el provider */
  getEmbedSrc(block: any): SafeResourceUrl {
    const url = (block?.url || '').trim();
    const provider = (block?.provider || 'generic') as string;

    // Si por cualquier razón viene vacío, devolvemos algo inocuo.
    if (!url) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    }

    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '').toLowerCase();

      // === YouTube: convertir a /embed/ ===
      if (provider === 'youtube') {
        let videoId = '';

        if (host === 'youtu.be') {
          // https://youtu.be/VIDEOID
          videoId = u.pathname.slice(1);
        } else if (host.includes('youtube.com')) {
          // https://www.youtube.com/watch?v=VIDEOID
          videoId = u.searchParams.get('v') || '';
        }

        if (videoId) {
          const embedUrl = `https://www.youtube.com/embed/${videoId}`;
          return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
        }

        // Si no pudimos extraer id, usamos la URL directa
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
      }

      // === Twitter / X: iframe directo al URL (aunque a veces dé problemas) ===
      if (provider === 'twitter') {
        // Antes podías usar twitframe.com, pero ahora quieres directo:
        // aunque falle, es "lo que hay" y vemos qué plataformas dejan.
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
      }

      // === Facebook, Instagram, TikTok, generic ===
      // Vamos a intentar iframe directo al URL original.
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } catch {
      // Si la URL es inválida, evitamos romper la vista
      return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    }
  }

  /** Dominio human-readable a partir de una URL */
  getDomain(url?: string): string {
    if (!url) return this.baseDomain;
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  /** Título que usarán Facebook/Twitter (OG) */
  getOgTitle(): string {
    return (
      this.data?.meta?.ogTitle ||
      this.data?.title ||
      ''
    );
  }

  /** Descripción que usarán Facebook/Twitter (OG) */
  getOgDescription(): string {
    return (
      this.data?.meta?.ogDescription ||
      this.data?.meta?.description ||
      this.data?.summary ||
      this.data?.extracto ||
      ''
    );
  }

  /** Checa si hay H1 en el body (no deberías tener ninguno) */
  hasMultipleH1(): boolean {
    try {
      const tmp = document.createElement('div');
      tmp.innerHTML = String(this.data?.bodyHtml || '');
      return tmp.querySelectorAll('h1').length > 0;
    } catch {
      return false;
    }
  }

  getCharCount(field: string | undefined): number {
    return field ? field.length : 0;
  }

  getSeoStatus(field: string | undefined, min: number, max: number): string {
    const length = this.getCharCount(field);
    if (!length) return 'text-danger';
    if (length < min) return 'text-warning';
    if (length > max) return 'text-danger';
    return 'text-success';
  }

  isGenericAnchor(text: string): boolean {
    const generics = ['clic aquí', 'aquí', 'leer más', 'click here', 'here', 'read more'];
    return !!text && generics.some(g => text.toLowerCase().includes(g));
  }

  handleImageError(): void {
    console.warn('Error loading image in preview');
  }
}
