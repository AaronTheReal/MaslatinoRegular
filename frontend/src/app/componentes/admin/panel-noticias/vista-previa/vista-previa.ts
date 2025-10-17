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
    title: string; // Required, validated in form
    slug: string; // Required, validated in form
    summary: string; // Optional, but validated for length
    tags: string[]; // Required, validated as array
    meta: {
      description: string; // Required, validated in form
      image: string; // Required, validated in form
    };
    location: { city: string; region: string; country: string };
    publishAt: string | null;
    content: Array<{
      type: string;
      html?: string;
      style?: {
        fontSize?: string;
        fontWeight?: string;
        fontFamily?: string;
        textAlign?: 'left' | 'center' | 'right';
      };
      text?: string;
      url?: string;
      alt?: string;
      caption?: string;
      captionHtml?: string;
      quote?: string;
      authorQuote?: string;
      ordered?: boolean;
      items?: string[]; // Ensure items is defined for lists
      itemsHtml?: string[];
      href?: string;
      textLink?: string;
      tag?: string;
    }>;
  };

  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Sanitizes HTML and adds target/rel attributes to links.
   */
  formatHtml(rawHtml: string = ''): SafeHtml {
    const withTargets = rawHtml.replace(
      /<a\s+/g,
      `<a target="_blank" rel="noopener noreferrer" `
    );
    return this.sanitizer.bypassSecurityTrustHtml(withTargets);
  }

  /**
   * Check if there is more than one H1 in content blocks.
   */
  hasMultipleH1(): boolean {
    return this.data.content.filter(block => block.tag === 'h1').length > 1;
  }

  /**
   * Get character count for a field.
   */
  getCharCount(field: string): number {
    return field.length;
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
}