import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
    tags: string[];
    categories: string[];
    location: { city: string; region: string; country: string };
    meta: {
      description: string;
      image: string;
      canonical: string;
      ogTitle: string;
      ogDescription: string;
      imageAltGlobal: string;
    };
    state: string;
    publishAt: string | null;
    bodyHtml?: SafeHtml;
    content?: Array<{
      type: string;
      html?: SafeHtml;
      style?: { fontSize?: string; fontWeight?: string; fontFamily?: string; textAlign?: 'left'|'center'|'right' };
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
    }>;
  };

  constructor(private sanitizer: DomSanitizer) {}

  formatHtml(rawHtml: string = ''): SafeHtml {
    const withTargets = rawHtml.replace(/<a\s+/g, `<a target="_blank" rel="noopener noreferrer" `);
    return this.sanitizer.bypassSecurityTrustHtml(withTargets);
  }

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
    if (length < min) return 'text-warning';
    if (length > max) return 'text-danger';
    return 'text-dark';
  }

  isGenericAnchor(text: string): boolean {
    const generics = ['clic aquí', 'aquí', 'leer más', 'click here', 'here', 'read more'];
    return !!text && generics.some(g => text.toLowerCase().includes(g));
  }

  handleImageError(): void {
    console.warn('Error loading image in preview');
  }
}
