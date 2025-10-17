import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';

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
    content: Array<{
      type: string;
      html?: SafeHtml; // Already sanitized in panel-noticias
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
      captionHtml?: SafeHtml; // Already sanitized
      quote?: string;
      authorQuote?: string;
      ordered?: boolean;
      items?: string[];
      itemsHtml?: SafeHtml[]; // Already sanitized
      href?: string;
      textLink?: string;
      creditText?: string;
    }>;
  };

  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Sanitizes raw HTML strings and adds target/rel attributes to links.
   * Only used for unsanitized string inputs.
   */
  formatHtml(rawHtml: string = ''): SafeHtml {
    const withTargets = rawHtml.replace(
      /<a\s+/g,
      `<a target="_blank" rel="noopener noreferrer" `
    );
    return this.sanitizer.bypassSecurityTrustHtml(withTargets);
  }

  /**
   * Check if there is any H1 in content blocks (prohibited per maxOneH1Validator).
   */
  hasMultipleH1(): boolean {
    return this.data.content.some(block => block.tag === 'h1');
  }

  /**
   * Get character count for a field.
   */
  getCharCount(field: string): number {
    return field ? field.length : 0;
  }

  /**
   * Get SEO status for a field (title, summary, meta.description).
   */
  getSeoStatus(field: string, min: number, max: number): string {
    const length = this.getCharCount(field);
    if (length < min) return 'text-warning';
    if (length > max) return 'text-danger';
    return 'text-dark';
  }

  /**
   * Check if link text is generic.
   */
  isGenericAnchor(text: string): boolean {
    const generics = ['clic aquí', 'aquí', 'leer más', 'click here', 'here', 'read more'];
    return generics.some(g => text.toLowerCase().includes(g));
  }

  /**
   * Handle image load errors.
   */
  handleImageError(): void {
    console.warn('Error loading image in preview');
  }
}