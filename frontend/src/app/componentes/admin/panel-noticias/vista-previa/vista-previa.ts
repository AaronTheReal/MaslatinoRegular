import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
// Importa DomSanitizer y SafeHtml
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-vista-previa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vista-previa.html',
  styleUrls: ['./vista-previa.css'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class VistaPrevia {
  @Input() data!: {
    title: string;
    summary: string;
    location: { city: string; region: string; country: string; };
    publishAt: string | null;
    content: Array<{
      type: string;
      // para bloques de texto:
      html?: string;
      style?: {
        fontSize?: string;
        fontWeight?: string;
        fontFamily?: string;
        /** Alineación: 'left' | 'center' | 'right' */
        textAlign?: 'left' | 'center' | 'right';
      };      // los demás campos que ya tenías…
      text?: string;
      url?: string;
      alt?: string;
      caption?: string;
      quote?: string;
      authorQuote?: string;
      /** para listas */
      ordered?: boolean;
      items?: string[];
      /** elementos de lista convertidos a HTML */
      itemsHtml?: string[];
      /** para enlaces simples */
      href?: string;
      textLink?: string;
      captionHtml?: string;

    }>;
  };
  // ...


  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Inyecta target y rel en cada <a> y devuelve SafeHtml.
   */
  formatHtml(rawHtml: string = ''): SafeHtml {
    // Añade atributos a cada <a
    const withTargets = rawHtml.replace(
      /<a\s+/g,
      `<a target="_blank" rel="noopener noreferrer" `
    );
    // Marca como seguro para Angular
    return this.sanitizer.bypassSecurityTrustHtml(withTargets);
  }
}
