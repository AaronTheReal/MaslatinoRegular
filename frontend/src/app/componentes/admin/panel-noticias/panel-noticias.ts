import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import {
  FormBuilder, FormGroup, FormArray, Validators, ValidatorFn,
  AbstractControl, ValidationErrors, AsyncValidatorFn
} from '@angular/forms';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';

import { NoticiasService } from '../../../services/noticias-service';
import { VistaPrevia } from '../../admin/panel-noticias/vista-previa/vista-previa';
import { NgSelectModule } from '@ng-select/ng-select';
import { CategoriaService, CategoriaPayload } from '../../../services/categorias-service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { debounceTime, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-panel-noticias',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, VistaPrevia, FormsModule, NgSelectModule, CKEditorModule],
  templateUrl: './panel-noticias.html',
  styleUrls: ['./panel-noticias.css']
})
export class PanelNoticias implements OnInit {
  noticiaForm: FormGroup;
  categoriasDisponibles: CategoriaPayload[] = [];
  previewDataObj: any;

  // Métricas
  wordCount = 0;
  readingTime = 0;
  imageCount = 0;
  headerCount = 0;
  fleschScore = 0;

  // Avisos
  titleWarning = '';
  metaDescWarning = '';
  metaImageWarning = '';
  publishAtError = '';
  paragraphWarnings: string[] = [];
  keywordDensityWarnings: string[] = [];
  keyphraseWarnings: string[] = [];
  headerSuggestion = '';
  listSuggestion = '';
  quoteWarning = '';
  localSeoSuggestion = '';
  titleRepetitionWarning = '';
  sourcesSuggestion = '';

  // Checklist / UI
  showChecklist = false;
  checklist: any = {};
  publishTooltip = '';
  isSubmitting = false;
  canonicalUrl = '';

  // SSR guardas
  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  public Editor: any = null;

  // Dominio para distinguir enlaces internos
  private domain = 'yourdomain.com'; // TODO: cambia por tu dominio

  // CKEditor config
  public editorConfig: any = {
    toolbar: ['heading','bold','italic','link','bulletedList','numberedList','blockQuote','undo','redo','insertTable'],
    heading: {
      options: [
        { model:'paragraph', title:'Párrafo' },
        { model:'heading2', view:'h2', title:'H2' },
        { model:'heading3', view:'h3', title:'H3' }
      ]
    }
    // No ofrecemos H1 en la toolbar
  };

  constructor(
    private fb: FormBuilder,
    private noticiasService: NoticiasService,
    private sanitizer: DomSanitizer,
    private categoriasService: CategoriaService
  ) {
    this.noticiaForm = this.fb.group({
      focusKeyphrase: ['', [Validators.required, Validators.maxLength(50)]],
      title: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(60),
                   this.titleContainsKeyphraseValidator(), this.titleCaseValidator(), this.noSpecialCharsValidator()]],
      slug: ['', {
        validators: [Validators.required, Validators.pattern(/^[a-z0-9-]+$/), this.slugLengthValidator(),
                     this.slugContainsKeyphraseValidator(), this.noStopWordsValidator(), this.noDatesValidator(),
                     this.noAccentsSymbolsValidator()],
        asyncValidators: [this.slugUniqueValidator()],
        updateOn: 'blur'
      }],
      extracto: ['', [Validators.required, Validators.minLength(150), Validators.maxLength(300),
                      this.keyphraseOnceValidator(), this.noDoubleQuotesValidator(), this.naturalLanguageValidator()]],
      summary: ['', [Validators.minLength(150), Validators.maxLength(160)]],
      tags: this.fb.array([], [Validators.minLength(1), Validators.maxLength(5)]),
      categories: [[], Validators.required],

      location: this.fb.group({
        country: [''],
        region: [''],
        city: ['']
      }),

      meta: this.fb.group({
        description: ['', [Validators.required, Validators.minLength(120), Validators.maxLength(160),
                           this.keyphraseOnceValidator(), this.noDoubleQuotesValidator(), this.naturalLanguageValidator()]],
        image: ['', [Validators.required, Validators.pattern(/^https:\/\/.*\.(jpg|png|webp)$/i), this.imageFilenameValidator()]],
        imageAltGlobal: ['', [Validators.required, Validators.minLength(8), this.altKeyphraseHyphenValidator()]],
        canonical: ['', Validators.pattern(/^https?:\/\/.+/)],
        ogTitle: [''],
        ogDescription: ['', [Validators.maxLength(300)]],
      }),

      state: ['draft'],
      publishAt: [null],

      // Body WYSIWYG
      body: ['', [this.bodySeoValidator()]]
    });

    // Listeners
    this.noticiaForm.get('title')?.valueChanges.subscribe(title => {
      if (title) {
        const slug = this.generateSlug(title);
        this.noticiaForm.get('slug')?.setValue(slug, { emitEvent: false });
      }
      this.updateTitleWarning();
      this.updateTitleRepetition();
    });

    this.noticiaForm.get('slug')?.valueChanges.subscribe(slug => {
      this.canonicalUrl = `https://${this.domain}/${slug}`;
    });

    this.noticiaForm.get('meta.description')?.valueChanges.subscribe(() => this.updateMetaDescWarning());
    this.noticiaForm.get('meta.image')?.valueChanges.subscribe(() => this.metaImageWarning = '');
    this.noticiaForm.get('publishAt')?.valueChanges.subscribe(() => this.validatePublishAt());
    this.noticiaForm.get('location.city')?.valueChanges.subscribe(() => this.updateLocalSeoSuggestion());
    this.noticiaForm.get('state')?.valueChanges.subscribe(state => {
      this.showChecklist = state === 'review';
      this.updatePublishTooltip();
      this.noticiaForm.get('body')?.updateValueAndValidity(); // el body exige fuerte en review
    });

    this.noticiaForm.get('focusKeyphrase')?.valueChanges.subscribe(() => {
      this.noticiaForm.get('title')?.updateValueAndValidity();
      this.noticiaForm.get('slug')?.updateValueAndValidity();
      this.noticiaForm.get('meta.description')?.updateValueAndValidity();
      this.noticiaForm.get('extracto')?.updateValueAndValidity();
      this.noticiaForm.get('meta.imageAltGlobal')?.updateValueAndValidity();
      this.noticiaForm.get('body')?.updateValueAndValidity();
      this.updateSoftValidators();
    });
  }

  ngOnInit(): void {
    // Carga diferida del editor solo en navegador
    if (this.isBrowser) {
      import('@ckeditor/ckeditor5-build-classic').then(m => {
        this.Editor = m.default;
      });
    }

    // Vista previa reactiva
    this.previewDataObj = this.buildPreviewData();
    this.noticiaForm.valueChanges.pipe(debounceTime(200)).subscribe(() => {
      this.previewDataObj = this.buildPreviewData();
      this.updateMetricsFromHTML();
      this.updateSoftValidators();
      this.updateChecklist();
      this.updatePublishTooltip();
    });

    this.loadCategories();
  }

  // ===== Getters =====
  get tags(): FormArray {
    return this.noticiaForm.get('tags') as FormArray;
  }

  // ===== Tags =====
  addTag() {
    if (this.tags.length < 5) this.tags.push(this.fb.control('', Validators.required));
  }
  removeTag(i: number) {
    if (this.tags.length > 0) this.tags.removeAt(i);
  }

  // =============== VALIDADORES ===============
  private titleContainsKeyphraseValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const title = (control.value || '').toLowerCase();
      const focus = control.parent?.get('focusKeyphrase')?.value?.toLowerCase() || '';
      if (focus && title) {
        const startWords = title.split(/\s+/).slice(0, 5).join(' ');
        if (!startWords.includes(focus)) return { titleContainsKeyphrase: true };
      }
      return null;
    };
  }
  private titleCaseValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const title = (control.value || '') as string;
      const words = title.split(/\s+/);
      const majorWords = words.filter(w => w.length > 3);
      const isTitleCase = majorWords.every(w => /^[A-ZÁÉÍÓÚÑ]/.test(w));
      return isTitleCase ? null : { titleCase: true };
    };
  }
  private noSpecialCharsValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const t = (control.value || '') as string;
      return /[!¡/?]/.test(t) ? { noSpecialChars: true } : null;
    };
  }

  // Slug
  private slugLengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const slug = (control.value || '') as string;
      const parts = slug.split('-').filter(Boolean);
      return parts.length >= 3 && parts.length <= 6 ? null : { slugLength: true };
    };
  }
  private slugContainsKeyphraseValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const slug = (control.value || '').toLowerCase();
      const focus = control.parent?.get('focusKeyphrase')?.value?.toLowerCase() || '';
      if (focus) {
        const keySlug = focus.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
        if (!slug.includes(keySlug)) return { slugContainsKeyphrase: true };
      }
      return null;
    };
  }
  private noStopWordsValidator(): ValidatorFn {
    const stop = ['el','la','de','por','con','a','en','y','o','un','una','los','las'];
    return (control: AbstractControl): ValidationErrors | null => {
      const slug = (control.value || '') as string;
      return slug.split('-').some(p => stop.includes(p)) ? { noStopWords: true } : null;
    };
  }
  private noDatesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const slug = (control.value || '') as string;
      return /\d{4}|\b\d{2}\b/.test(slug) ? { noDates: true } : null;
    };
  }
  private noAccentsSymbolsValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const slug = (control.value || '') as string;
      return /[^a-z0-9-]/.test(slug) ? { noAccentsSymbols: true } : null;
    };
  }

  // Meta / Extracto
  private keyphraseOnceValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const text = (control.value || '').toLowerCase();
      const focus =
        control.parent?.parent?.get('focusKeyphrase')?.value?.toLowerCase() ||
        control.root.get('focusKeyphrase')?.value?.toLowerCase() || '';
      if (focus) {
        const rx = new RegExp(focus.replace(/\s+/g, '\\s+'), 'g');
        const count = (text.match(rx) || []).length;
        if (count !== 1) return { keyphraseOnce: true };
      }
      return null;
    };
  }
  private noDoubleQuotesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return /"/.test(control.value || '') ? { noDoubleQuotes: true } : null;
    };
  }
  private naturalLanguageValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const text = (control.value || '') as string;
      const focus =
        control.parent?.parent?.get('focusKeyphrase')?.value ||
        control.root.get('focusKeyphrase')?.value || '';
      if (!text) return null;
      if (focus && text.split(String(focus)).length - 1 > 1) return { naturalLanguage: true };
      if (/\b(keywords?|seo|optimiza(do)?)\b/i.test(text)) return { naturalLanguage: true };
      return null;
    };
  }

  // Imagen
  private imageFilenameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const url = control.value || '';
      try {
        const filename = new URL(url).pathname.split('/').pop() || '';
        return /^[a-z0-9-]+(\.jpg|\.png|\.webp)$/i.test(filename) ? null : { imageFilename: true };
      } catch { return null; }
    };
  }
  private altKeyphraseHyphenValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const alt = String(control.value || '').toLowerCase();
      const key =
        control.parent?.parent?.get('focusKeyphrase')?.value ||
        control.root.get('focusKeyphrase')?.value || '';
      const focus = key.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if (!focus) return null;
      const hyphenKey = focus.trim().replace(/\s+/g,'-');
      return alt.includes(hyphenKey) ? null : { altKeyphraseHyphen: true };
    };
  }

  // Body SEO (activo en “review”)
  private bodySeoValidator(): ValidatorFn {
    return (_: AbstractControl): ValidationErrors | null => {
      if (this.noticiaForm?.get('state')?.value !== 'review') return null;

      const html = (this.noticiaForm.get('body')?.value || '').toString();
      if (!this.isBrowser) return null; // no validar en SSR

      const doc = new DOMParser().parseFromString(html, 'text/html');

      const text = doc.body.textContent?.trim() || '';
      const words = text.split(/\s+/).filter(Boolean);
      const wordCount = words.length;

      const focus = (this.noticiaForm.get('focusKeyphrase')?.value || '').toLowerCase();
      const fullLower = text.toLowerCase();
      const keyCount = focus ? (fullLower.split(focus).length - 1) : 0;
      const density = wordCount ? (keyCount / wordCount) * 100 : 0;

      const h2s = Array.from(doc.querySelectorAll('h2')).map(h => (h.textContent || '').toLowerCase());
      const paragraphs = Array.from(doc.querySelectorAll('p')).map(p => (p.textContent || '').toLowerCase());

      const links = Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[];
      const totalLinks = links.length;
      const internal = links.filter(a => a.href.includes(this.domain)).length;
      const external = totalLinks - internal;

      const images = Array.from(doc.querySelectorAll('img')) as HTMLImageElement[];
      const srcs = images.map(i => i.src).filter(Boolean);
      const uniqueImages = (new Set(srcs)).size === srcs.length;

      const hyphenKey = focus.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,'-');
      const altOk = !focus || images.every(img => (img.alt || '').toLowerCase().includes(hyphenKey));

      const errors: any = {};
      if (wordCount < 300) errors.minWords = true;
      if (wordCount > 400 && h2s.length < 1) errors.minHeaders = true;

      if (focus) {
        const firstTwo = (paragraphs[0] || '').split(/[.!?]/).slice(0,2).join('.');
        if (!firstTwo.includes(focus)) errors.keyphraseFirstPara = true;
        if (!h2s.some(t => t.includes(focus))) errors.keyphraseH2 = true;
        const lastPara = paragraphs[paragraphs.length - 1] || '';
        if (lastPara && !lastPara.includes(focus)) errors.keyphraseConclusion = true;
        if (density < 0.5 || density > 2) errors.keyphraseDensity = true;
        if (!altOk) errors.altKeyphraseHyphen = true;
      }

      if (external < 1 || external > 3 || internal < 2 || internal > 3 || totalLinks > 7) errors.links = true;
      if (!uniqueImages) errors.uniqueImages = true;

      return Object.keys(errors).length ? errors : null;
    };
  }

  // Async validator slug único
  private slugUniqueValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const value = (control.value || '').trim();
      if (!value) return of(null);
      return this.noticiasService.getNoticiaBySlug(value).pipe(
        map(noticia => (noticia ? { slugUnique: true } : null)),
        catchError(() => of(null))
      );
    };
  }

  // =============== HELPERS / MÉTRICAS ===============
  onBodyChange() {
    // CKEditor dispara (change), Textarea dispara (input)
    this.updateMetricsFromHTML();
    // refresca preview inmediatamente
    this.previewDataObj = this.buildPreviewData();
  }

  private updateMetricsFromHTML() {
    const html = (this.noticiaForm.get('body')?.value || '').toString();
    if (!this.isBrowser) return;

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const text = doc.body.textContent || '';
    const words = text.split(/\s+/).filter(Boolean);
    this.wordCount = words.length;
    this.readingTime = Math.ceil(this.wordCount / 200);

    this.headerCount = doc.querySelectorAll('h2, h3').length;
    this.imageCount = doc.querySelectorAll('img[alt]').length;

    const vowels = (text.match(/[aeiouáéíóúü]/gi) || []).length;
    const sentences = (text.match(/[.!?]/g) || []).length || 1;
    this.fleschScore = this.wordCount
      ? Math.round(206.835 - 1.015 * (this.wordCount / sentences) - 84.6 * (vowels / this.wordCount))
      : 0;

    this.paragraphWarnings = [];
    const paras = Array.from(doc.querySelectorAll('p')).map(p => p.textContent || '');
    let shortStreak = 0;
    paras.forEach((p, i) => {
      const wc = (p.trim().split(/\s+/).filter(Boolean)).length;
      if (wc > 120 || wc < 40) this.paragraphWarnings.push(`Párrafo ${i+1}: ${wc} palabras (objetivo 40–80).`);
      if (wc < 20) {
        shortStreak++;
        if (shortStreak > 3) this.paragraphWarnings.push('Más de 3 párrafos muy cortos seguidos: considera unir.');
      } else shortStreak = 0;
    });
    const avg = paras.length ? Math.round(this.wordCount / paras.length) : 0;
    if (avg && (avg < 40 || avg > 80)) this.paragraphWarnings.push(`Media por párrafo: ${avg} (objetivo 40–80).`);

    if (this.wordCount > 400 && this.headerCount < 1) this.headerSuggestion = 'Artículo >400 palabras requiere ≥1 H2.';
    else this.headerSuggestion = '';

    this.updateTitleRepetition();

    const bodyLower = text.toLowerCase();
    if (bodyLower.includes('fuentes:') || bodyLower.includes('sources:')) {
      const hasLinks = Array.from(doc.querySelectorAll('a[href^="https://"]')).length > 0;
      this.sourcesSuggestion = hasLinks ? '' : 'Si hay “Fuentes:”, exige lista de enlaces https con textos claros.';
    } else this.sourcesSuggestion = '';
  }

  private updateSoftValidators() {
    this.keywordDensityWarnings = [];
    this.keyphraseWarnings = [];

    const html = (this.noticiaForm.get('body')?.value || '').toString();
    if (!this.isBrowser) return;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = (doc.body.textContent || '').toLowerCase();
    const wc = text.split(/\s+/).filter(Boolean).length;

    const keyphrase = (this.noticiaForm.get('focusKeyphrase')?.value || '').toLowerCase();
    if (keyphrase && wc > 0) {
      const count = text.split(keyphrase).length - 1;
      const density = (count / wc) * 100;
      if (density > 2) this.keyphraseWarnings.push(`La palabra clave aparece al ${density.toFixed(1)}% - posible sobreoptimización (máx. 2%).`);
      if (density < 0.5 && count > 0) this.keyphraseWarnings.push(`La palabra clave aparece al ${density.toFixed(1)}% - sugiere aumentar su uso (mín. 0.5%).`);
    }

    const firstPara = (doc.querySelector('p')?.textContent || '').toLowerCase();
    const metaDesc = (this.noticiaForm.get('meta.description')?.value || '').toLowerCase();
    if (keyphrase) {
      if (!metaDesc.includes(keyphrase)) this.keyphraseWarnings.push(`La palabra clave "${keyphrase}" no está en la meta descripción.`);
      if (!firstPara.includes(keyphrase)) this.keyphraseWarnings.push(`Sugiere incluir "${keyphrase}" en el primer párrafo.`);
    }
  }

  private generateSlug(title: string): string {
    return title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
  }

  /** Convierte el HTML del body en bloques para Vista Previa */
   private parseHtmlToBlocks(html: string) {
    if (!this.isBrowser) return [];
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const out: any[] = [];

    const walk = (node: ChildNode) => {
      if (!(node as HTMLElement).tagName) return;

      const el = node as HTMLElement;
      const tag = (el.tagName || '').toLowerCase();
      const style = { textAlign: (el.style?.textAlign || '') as 'left'|'center'|'right' };

      if (tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' || tag === 'p' || tag === 'span') {
        out.push({
          type: 'text',
          tag,
          html: this.sanitizer.bypassSecurityTrustHtml(el.innerHTML),
          text: el.textContent || '',
          style
        });
      } else if (tag === 'blockquote') {
        out.push({
          type: 'quote',
          html: this.sanitizer.bypassSecurityTrustHtml(el.innerHTML),
          quote: el.textContent || '',
          style
        });
      } else if (tag === 'img') {
        out.push({
          type: 'image',
          url: el.getAttribute('src') || '',
          alt: el.getAttribute('alt') || '',
          captionHtml: null
        });
      } else if (tag === 'figure') {
        const img = el.querySelector('img');
        const figcap = el.querySelector('figcaption');
        out.push({
          type: 'image',
          url: img?.getAttribute('src') || '',
          alt: img?.getAttribute('alt') || '',
          captionHtml: figcap ? this.sanitizer.bypassSecurityTrustHtml(figcap.innerHTML) : null
        });
      } else if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(el.querySelectorAll(':scope > li'));
        out.push({
          type: 'list',
          ordered: tag === 'ol',
          items: items.map(li => (li.textContent || '').trim()),
          itemsHtml: items.map(li => this.sanitizer.bypassSecurityTrustHtml(li.innerHTML)),
          style
        });
      } else if (tag === 'a') {
        out.push({
          type: 'link',
          href: el.getAttribute('href') || '',
          textLink: el.textContent || ''
        });
      }
    };

    Array.from(doc.body.children).forEach(walk);
    return out;
  }

 private parseHtmlToBlocksForSave(html: string) {
    if (!this.isBrowser) return [];
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const out: any[] = [];

    const walk = (node: ChildNode) => {
      if (!(node as HTMLElement).tagName) return;

      const el = node as HTMLElement;
      const tag = (el.tagName || '').toLowerCase();
      const style = { textAlign: (el.style?.textAlign || '') as 'left'|'center'|'right' };

      if (tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' || tag === 'p' || tag === 'span') {
        out.push({
          type: 'text',
          tag,
          html: el.innerHTML || '',      // <-- string plano
          text: el.textContent || '',
          style
        });
      } else if (tag === 'blockquote') {
        out.push({
          type: 'quote',
          html: el.innerHTML || '',      // <-- string plano
          quote: el.textContent || '',
          style
        });
      } else if (tag === 'img') {
        out.push({
          type: 'image',
          url: el.getAttribute('src') || '',
          alt: el.getAttribute('alt') || '',
          captionHtml: null              // string o null
        });
      } else if (tag === 'figure') {
        const img = el.querySelector('img');
        const figcap = el.querySelector('figcaption');
        out.push({
          type: 'image',
          url: img?.getAttribute('src') || '',
          alt: img?.getAttribute('alt') || '',
          captionHtml: figcap ? (figcap.innerHTML || '') : null // <-- string plano
        });
      } else if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(el.querySelectorAll(':scope > li'));
        out.push({
          type: 'list',
          ordered: tag === 'ol',
          items: items.map(li => (li.textContent || '').trim()),
          style
        });
      } else if (tag === 'a') {
        out.push({
          type: 'link',
          href: el.getAttribute('href') || '',
          textLink: el.textContent || ''
        });
      }
    };

    Array.from(doc.body.children).forEach(walk);
    return out;
  }
  private buildPreviewData() {
    const raw = this.noticiaForm.value;
    const meta = raw.meta;
    const html = String(raw.body || '');
    const bodyHtml: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(html);
    const contentBlocks = this.parseHtmlToBlocks(html);

    return {
      ...raw,
      bodyHtml,
      content: contentBlocks, // para VistaPrevia por bloques
      meta: {
        ...meta,
        ogTitle: meta.ogTitle || raw.title,
        ogDescription: meta.ogDescription || (raw.extracto || meta.description),
        canonical: meta.canonical || `https://${this.domain}/${raw.slug}`
      }
    };
  }

  get previewData() { return this.previewDataObj; }

  private updateTitleWarning() {
    const len = this.noticiaForm.get('title')?.value?.length || 0;
    if ((len < 50 && len > 45) || (len > 60 && len < 65))
      this.titleWarning = `Tu título tiene ${len} caracteres. Ideal: 50–60.`;
    else this.titleWarning = '';
  }
  private updateMetaDescWarning() {
    const len = this.noticiaForm.get('meta.description')?.value?.length || 0;
    if (len < 120 && len > 110) this.metaDescWarning = `Meta description con ${len} chars. Objetivo: 120–160.`;
    else if (len > 160 && len < 170) this.metaDescWarning = 'Supera 160 chars. Acórtala.';
    else this.metaDescWarning = '';
  }
  private validatePublishAt() {
    if (this.noticiaForm.get('state')?.value !== 'review') return;
    const raw = this.noticiaForm.get('publishAt')?.value;
    const publishAt = raw ? new Date(raw) : null;
    if (!publishAt) { this.publishAtError = 'Fecha de publicación requerida para revisión.'; return; }
    const now = new Date();
    const futureLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    this.publishAtError = publishAt > futureLimit ? 'Fecha no puede ser más de 24h en el futuro.' : '';
  }
  private updateLocalSeoSuggestion() {
    const city = this.noticiaForm.get('location.city')?.value;
    const html = (this.noticiaForm.get('body')?.value || '').toString();
    if (!this.isBrowser) return;
    const text = new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
    this.localSeoSuggestion = (city && !text.includes(city)) ? `Sugiere añadir mención a "${city}" en el primer 30% del texto.` : '';
  }
  private updateTitleRepetition() {
    const title = (this.noticiaForm.get('title')?.value || '').toLowerCase();
    const html = (this.noticiaForm.get('body')?.value || '').toString();
    if (!this.isBrowser) return;
    const firstPara = (new DOMParser().parseFromString(html, 'text/html').querySelector('p')?.textContent || '').toLowerCase();
    this.titleRepetitionWarning = (title && firstPara.startsWith(title)) ? 'La primera frase repite el título: varíala para mejorar CTR.' : '';
  }

  private updateChecklist() {
    this.checklist = {
      title: this.noticiaForm.get('title')?.valid,
      description: this.noticiaForm.get('meta.description')?.valid,
      slug: this.noticiaForm.get('slug')?.valid,
      headers: this.headerCount >= 1 || this.wordCount <= 400,
      links: true,
      image: this.noticiaForm.get('meta.image')?.valid,
      publishAt: !this.publishAtError,
      noUtm: true,
      sources: !this.sourcesSuggestion,
      focusKeyphrase: this.noticiaForm.get('focusKeyphrase')?.valid && this.noticiaForm.get('title')?.valid,
      imageAltGlobal: this.noticiaForm.get('meta.imageAltGlobal')?.valid,
      wordCount: this.wordCount >= 300,
      extracto: this.noticiaForm.get('extracto')?.valid,
      categories: this.noticiaForm.get('categories')?.valid,
      tags: this.tags?.valid
    };
  }
  private updatePublishTooltip() {
    if (this.noticiaForm.get('state')?.value !== 'review') { this.publishTooltip = ''; return; }
    const fails: string[] = [];
    if (!this.checklist.title) fails.push('Título 50–60 + keyword');
    if (!this.checklist.description) fails.push('Meta 120–160 + keyword');
    if (!this.checklist.slug) fails.push('Slug válido/único');
    if (!this.checklist.headers) fails.push('≥1 H2 si >400');
    if (!this.checklist.image) fails.push('Imagen destacada OK');
    if (!this.checklist.publishAt) fails.push('Fecha publicación válida');
    if (!this.checklist.sources) fails.push('Fuentes claras');
    if (!this.checklist.focusKeyphrase) fails.push('Keyword optimizada');
    if (!this.checklist.imageAltGlobal) fails.push('Alt global con keyword-guiones');
    if (!this.checklist.wordCount) fails.push('≥300 palabras');
    if (!this.checklist.extracto) fails.push('Extracto 150–300 con keyword');
    if (!this.checklist.categories) fails.push('≥1 categoría');
    if (!this.checklist.tags) fails.push('1–5 etiquetas');
    this.publishTooltip = fails.length ? 'Pendientes: ' + fails.join(', ') : '';
  }

  // ===== Servicios / Submit =====
  loadCategories() {
    this.categoriasService.obtenerCategorias().subscribe(categories => {
      this.categoriasDisponibles = categories;
    });
  }

  onMetaImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const ratio = width / height;
    if (width < 1200 || height < 630 || Math.abs(ratio - 1.91) > 0.1) {
      this.metaImageWarning = `Imagen recomendada: ≥1200x630, ratio ~1.91:1. Actual: ${width}x${height}`;
    }
  }
onSubmit() {
  this.isSubmitting = true;
  this.noticiaForm.markAllAsTouched();
  this.noticiaForm.get('body')?.updateValueAndValidity();

  // ——— Mostrar avisos si hay errores, pero NO bloquear ———
  if (this.noticiaForm.invalid || (this.noticiaForm.get('state')?.value === 'review' && Object.values(this.checklist).some((v: any) => !v))) {
    const errors: string[] = [];
    if (this.noticiaForm.get('focusKeyphrase')?.invalid) errors.push('Keyword principal obligatoria.');
    if (this.noticiaForm.get('title')?.invalid) errors.push('Título inválido.');
    if (this.noticiaForm.get('slug')?.invalid) errors.push('Slug inválido/duplicado.');
    if (this.noticiaForm.get('extracto')?.invalid) errors.push('Extracto redes 150–300 con keyword 1 vez.');
    if (this.noticiaForm.get('meta.description')?.invalid) errors.push('Meta desc 120–160 con keyword 1 vez.');
    if (this.noticiaForm.get('meta.image')?.invalid) errors.push('Imagen destacada inválida.');
    if (this.noticiaForm.get('meta.imageAltGlobal')?.invalid) errors.push('Alt global debe incluir keyword-con-guiones.');
    if (this.noticiaForm.get('categories')?.invalid) errors.push('Al menos una categoría.');
    if (this.noticiaForm.get('state')?.value === 'review' && Object.values(this.checklist).some((v: any) => !v)) {
      errors.push('Checklist SEO pendiente(s).');
    }

    // Importante: solo informamos; NO frenamos el submit
    alert('Se guardará aunque haya pendientes:\n- ' + errors.join('\n- '));
  }

  const data = this.prepareSubmitData();

  this.noticiasService.createNoticia(data).subscribe({
    next: _ => {
      this.resetForm();
      alert('Noticia creada (aunque hubiera avisos).');
      this.isSubmitting = false;
    },
    error: err => {
      // Si el backend rechaza por campos realmente obligatorios del server,
      // verás aquí el motivo.
      alert('Error al crear la noticia: ' + err.message);
      this.isSubmitting = false;
    }
  });
}


  private resetForm() {
    this.noticiaForm.reset({ state: 'draft', publishAt: null, focusKeyphrase: '', body: '' });
    this.wordCount = this.readingTime = this.imageCount = this.headerCount = this.fleschScore = 0;
    this.titleWarning = this.metaDescWarning = this.metaImageWarning = this.publishAtError = '';
    this.paragraphWarnings = this.keywordDensityWarnings = this.keyphraseWarnings = [];
    this.headerSuggestion = this.listSuggestion = this.quoteWarning = this.localSeoSuggestion = '';
    this.titleRepetitionWarning = this.sourcesSuggestion = '';
    this.showChecklist = false;
    this.checklist = {};
    this.publishTooltip = '';
    this.canonicalUrl = '';
    this.previewDataObj = this.buildPreviewData();
  }

 private prepareSubmitData() {
    const raw = this.noticiaForm.value;
    const categories: string[] = raw.categories;
    const authorId = 'a94f23c8bd7e4ad1f6c30ae5';

    // NUEVO: construimos los bloques "planos" y el HTML para guardar
    const html = String(raw.body || '');
    const contentForSave = this.parseHtmlToBlocksForSave(html);

    // Si quieres forzar "draft" cuando hay errores, descomenta:
    // const state = (this.noticiaForm.invalid || Object.values(this.checklist).some(v => !v)) ? 'draft' : raw.state;

    return {
      ...raw,
      categories,
      author: authorId,
      bodyHtml: html,                // <-- GUARDAR el HTML tal cual
      content: contentForSave,       // <-- GUARDAR bloques serializables
      meta: {
        ...raw.meta,
        ogTitle: raw.meta.ogTitle || raw.title,
        ogDescription: raw.meta.ogDescription || (raw.extracto || raw.meta.description),
        canonical: raw.meta.canonical || `https://${this.domain}/${raw.slug}`,
        twitterCard: 'summary_large_image'
      }
      // state                         // si descomentaste la lógica de "draft", agrega aquí: state
    };
  }
}
