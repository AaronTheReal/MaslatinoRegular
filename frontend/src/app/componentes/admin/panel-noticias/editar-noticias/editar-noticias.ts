// editar-noticias.ts
import {
  Component,
  OnInit,
  inject,
  PLATFORM_ID,
  HostListener,
  ChangeDetectorRef
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  AsyncValidatorFn
} from '@angular/forms';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { ActivatedRoute, Router } from '@angular/router';

import { NoticiasService } from '../../../../services/noticias-service';
import { VistaPrevia } from '../vista-previa/vista-previa';
import { NgSelectModule } from '@ng-select/ng-select';
import { CategoriaService, CategoriaPayload } from '../../../../services/categorias-service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { debounceTime, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Noticia } from '../../../../../models/noticia.model';
import { S3UploadAdapterPlugin } from './../../../../../utils/ckeditor-s3-adapter';

@Component({
  selector: 'app-editar-noticias',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, VistaPrevia, FormsModule, NgSelectModule, CKEditorModule],
  templateUrl: './editar-noticias.html',
  styleUrls: ['./editar-noticias.css']
})
export class EditarNoticias implements OnInit {
  noticiaForm: FormGroup;
  categoriasDisponibles: CategoriaPayload[] = [];
  previewDataObj: any;

  // Métricas
  wordCount = 0;
  readingTime = 0;
  imageCount = 0;
  headerCount = 0;
  fleschScore = 0;
  density = 0;  // % densidad keyword
  linkCount = 0;
  internalLinks = 0;
  externalLinks = 0;
  captionPlainCount = 0;

  // Avisos
  titleWarning = '';
  metaDescWarning = '';
  metaImageWarning = '';
  publishAtError = '';
  paragraphWarnings: string[] = [];
  keywordDensityWarnings: string[] = [];
  keyphraseWarnings: string[] = [];
  headerSuggestion = '';
  listSuggestion: string[] = [];
  quoteWarning = '';
  localSeoSuggestion = '';
  titleRepetitionWarning = '';
  sourcesSuggestion = '';
  linkSuggestion = '';

  // Checklist / UI
  showChecklist = false;
  checklist: any = {};
  publishTooltip = '';
  isSubmitting = false;
  canonicalUrl = '';

  // SSR
  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  public Editor: any = null;

  // Dominio para enlaces internos
  private domain = 'maslatino.com';

  // Routing / estado
  private id = '';
  private cdr = inject(ChangeDetectorRef);
  private loadedNoticiaCats: CategoriaPayload[] = [];
  private loadedNoticiaCatIds: string[] = [];

  constructor(
    private fb: FormBuilder,
    private noticiasService: NoticiasService,
    private sanitizer: DomSanitizer,
    private categoriasService: CategoriaService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.noticiaForm = this.fb.group({
      focusKeyphrase: ['', [Validators.required, Validators.maxLength(50)]],
      title: [
        '',
        [
          Validators.required,
          Validators.minLength(50),
          Validators.maxLength(60),
          this.noTrailingDotValidator(),
          this.titleContainsKeyphraseValidator(),
          this.titleCaseValidator(),
          this.noSpecialCharsValidator()
        ]
      ],
      slug: [
        '',
        {
          validators: [
            Validators.required,
            Validators.pattern(/^[a-z0-9-]+$/),
            this.slugLengthValidator(),
            this.slugContainsKeyphraseValidator(),
            this.noStopWordsValidator(),
            this.noDatesValidator(),
            this.noAccentsSymbolsValidator()
          ],
          asyncValidators: [this.slugUniqueValidator()],
          updateOn: 'blur'
        }
      ],
      extracto: [
        '',
        [
          Validators.required,
          Validators.minLength(150),
          Validators.maxLength(300),
          this.noTrailingDotValidator(),
          this.keyphraseOnceValidator(),
          this.noDoubleQuotesValidator(),
          this.naturalLanguageValidator()
        ]
      ],
      summary: ['', [Validators.minLength(150), Validators.maxLength(160)]],
      tags: this.fb.array([], [Validators.minLength(1), Validators.maxLength(5)]),

      categories: [[], Validators.required],

      location: this.fb.group({
        country: [''],
        region: [''],
        city: ['']
      }),

      meta: this.fb.group({
        description: [
          '',
          [
            Validators.required,
            Validators.minLength(120),
            Validators.maxLength(160),
            this.keyphraseOnceValidator(),
            this.noDoubleQuotesValidator(),
            this.naturalLanguageValidator()
          ]
        ],
        image: [
          '',
          [
            Validators.required,
            Validators.pattern(/^https:\/\/.*\.(jpg|png|webp)$/i),
            this.imageFilenameValidator()
          ]
        ],
        imageAltGlobal: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            this.altKeyphraseHyphenValidator()
          ]
        ],
        canonical: ['', Validators.pattern(/^https?:\/\/.+/)],
        ogTitle: [''],
        ogDescription: ['', [Validators.maxLength(300)]],
        imageCaptionHtml: [
          '',
          [this.captionHtmlValidator(140)]
        ],
      }),

      state: ['draft'],
      publishAt: [null],

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

    this.noticiaForm.get('meta.description')?.valueChanges
      .subscribe(() => this.updateMetaDescWarning());
    this.noticiaForm.get('meta.image')?.valueChanges
      .subscribe(() => this.metaImageWarning = '');
    this.noticiaForm.get('publishAt')?.valueChanges
      .subscribe(() => this.validatePublishAt());
    this.noticiaForm.get('location.city')?.valueChanges
      .subscribe(() => this.updateLocalSeoSuggestion());

    this.noticiaForm.get('state')?.valueChanges.subscribe(state => {
      // Igual que crear: checklist sólo en revisión (puedes cambiar a === 'review' || state === 'published' si quieres)
      this.showChecklist = state === 'review';
      this.updatePublishTooltip();
      this.noticiaForm.get('body')?.updateValueAndValidity();
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

  // CKEditor config (igual que crear noticias)
  public editorConfig: any = {
    licenseKey: 'GPL',
    toolbar: [
      'heading', 'bold', 'italic', 'link',
      'bulletedList', 'numberedList', 'blockQuote',
      'insertTable', 'imageUpload', 'mediaEmbed', 'undo', 'redo',
    ],
    image: {
      toolbar: [
        'imageTextAlternative',
        'toggleImageCaption',
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side'
      ]
    },
    extraPlugins: [S3UploadAdapterPlugin],
    htmlSupport: {
      allow: [
        {
          name: 'iframe',
          attributes: true,
          classes: true,
          styles: true
        },
        {
          name: 'oembed',
          attributes: ['url']
        },
        {
          name: 'figure',
          classes: ['media'] // <figure class="media">
        }
      ]
    },
    mediaEmbed: {
      previewsInData: true
    }
  };

  // Estado de UI del estudio
  dockMode: 'hidden' | 'right' | 'bottom' = 'right';
  seoEssentialsOpen = true;
  inspectorOpen = false;
  splitRatio = 0.52;
  private resizing = false;

  ngOnInit(): void {
    if (this.isBrowser) {
      import('@ckeditor/ckeditor5-build-classic').then(m => {
        this.Editor = m.default;
        const names = (this.Editor as any).builtinPlugins?.map((p: any) => p.pluginName);
        console.log('CKEditor plugins:', names);
      });
    }

    this.previewDataObj = this.buildPreviewData();
    this.noticiaForm.valueChanges.pipe(debounceTime(200)).subscribe(() => {
      this.previewDataObj = this.buildPreviewData();
      this.updateMetricsFromHTML();
      this.updateSoftValidators();
      this.updateChecklist();
      this.updatePublishTooltip();
    });

    this.loadCategories();

    this.route.params.subscribe(params => {
      this.id = params['id'];
      if (this.id) this.loadNoticia();
    });
  }

  // ======== GETTERS ========
  get tags(): FormArray {
    return this.noticiaForm.get('tags') as FormArray;
  }

  // Tags
  addTag() {
    if (this.tags.length < 5) this.tags.push(this.fb.control('', Validators.required));
  }

  removeTag(i: number) {
    if (this.tags.length > 0) this.tags.removeAt(i);
  }

  // ======== HELPERS / UTILS ========
  private escapeRegex(s: string): string {
    return (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private generateSlug(title: string): string {
    return title
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
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

  private captionHtmlValidator(maxPlain: number): ValidatorFn {
    const allowed = ['a', 'strong', 'em', 'b', 'i'];
    const disallowedRx = /<\s*(script|style|iframe|img|video|audio|svg|object|embed)\b/i;
    const anchorRx = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/ig;

    const stripHtml = (html: string) =>
      (html || '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    return (control: AbstractControl): ValidationErrors | null => {
      const html = String(control.value || '');

      if (!html) return null;
      if (disallowedRx.test(html)) return { disallowedTags: true };

      const tagNames = Array.from(html.matchAll(/<\s*\/?\s*([a-z0-9-]+)/ig))
        .map(m => (m[1] || '').toLowerCase());
      const bad = tagNames.filter(t => !allowed.includes(t) && !t.startsWith('/'));
      if (bad.length) return { disallowedTags: true };

      let m: RegExpExecArray | null;
      while ((m = anchorRx.exec(html)) !== null) {
        const href = m[1];
        if (!/^https?:\/\//i.test(href)) return { invalidHref: true };
      }

      const plain = stripHtml(html);
      if (plain.length > maxPlain) return { maxlengthText: true };

      return null;
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
    const stop = ['el', 'la', 'de', 'por', 'con', 'a', 'en', 'y', 'o', 'un', 'una', 'los', 'las'];
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
        const safe = this.escapeRegex(focus).replace(/\s+/g, '\\s+');
        const rx = new RegExp(safe, 'g');
        const count = (text.match(rx) || []).length;
        if (count !== 1) return { keyphraseOnce: true };
      }
      return null;
    };
  }

  private noDoubleQuotesValidator(): ValidatorFn {
    return (_: AbstractControl): ValidationErrors | null => {
      return /"/.test(_.value || '') ? { noDoubleQuotes: true } : null;
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
        return /^[a-z0-9-]+(\.jpg|\.png|\.webp)$/i.test(filename)
          ? null
          : { imageFilename: true };
      } catch {
        return null;
      }
    };
  }

  private altKeyphraseHyphenValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const alt = String(control.value || '').toLowerCase();
      const key =
        control.parent?.parent?.get('focusKeyphrase')?.value ||
        control.root.get('focusKeyphrase')?.value || '';
      const focus = key.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (!focus) return null;
      const hyphenKey = focus.trim().replace(/\s+/g, '-');
      return alt.includes(hyphenKey) ? null : { altKeyphraseHyphen: true };
    };
  }

  // Body SEO
  private bodySeoValidator(): ValidatorFn {
    return (_: AbstractControl): ValidationErrors | null => {
      if (this.noticiaForm?.get('state')?.value !== 'review') return null;

      const html = (this.noticiaForm.get('body')?.value || '').toString();
      if (!this.isBrowser) return null;

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

      const hyphenKey = focus.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '-');
      const altOk = !focus || images.every(img => (img.alt || '').toLowerCase().includes(hyphenKey));

      const lists = doc.querySelectorAll('ul, ol');
      const maxListItems = Array.from(lists)
        .reduce((max, list) => Math.max(max, list.querySelectorAll(':scope > li').length), 0);

      const errors: any = {};
      if (wordCount < 300) errors.minWords = true;
      if (wordCount > 400 && h2s.length < 1) errors.minHeaders = true;

      if (focus) {
        const firstTwo = (paragraphs[0] || '').split(/[.!?]/).slice(0, 2).join('.');
        if (!firstTwo.includes(focus)) errors.keyphraseFirstPara = true;
        if (!h2s.some(t => t.includes(focus))) errors.keyphraseH2 = true;
        const lastPara = paragraphs[paragraphs.length - 1] || '';
        if (lastPara && !lastPara.includes(focus)) errors.keyphraseConclusion = true;
        if (density < 0.5 || density > 2) errors.keyphraseDensity = true;
        if (!altOk) errors.altKeyphraseHyphen = true;
      }

      if (external < 1 || external > 3 || internal < 2 || internal > 3 || totalLinks > 7) errors.links = true;
      if (!uniqueImages) errors.uniqueImages = true;
      if (maxListItems > 7) errors.maxListItems = true;

      return Object.keys(errors).length ? errors : null;
    };
  }

  // Async validator slug único (respetando el id actual)
  private slugUniqueValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const value = (control.value || '').trim();
      if (!value) return of(null);

      return this.noticiasService.getNoticiaBySlug(value).pipe(
        map((noticia: any) => {
          if (!noticia) return null;

          const foundId =
            noticia._id?.toString?.() ??
            noticia.id ??
            '';

          if (foundId && this.id && foundId === this.id) {
            return null;
          }

          return { slugUnique: true };
        }),
        catchError(() => of(null))
      );
    };
  }

  // =============== MÉTRICAS / HELPERS ===============
  onBodyChange() {
    this.updateMetricsFromHTML();
    this.previewDataObj = this.buildPreviewData();
  }

  private updateMetricsFromHTML() {
    const html = (this.noticiaForm.get('body')?.value || '').toString();
    if (!this.isBrowser) return;

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const text = doc.body.textContent?.trim() || '';
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

    const focus = (this.noticiaForm.get('focusKeyphrase')?.value || '').toLowerCase().trim();
    this.density = 0;
    if (focus && this.wordCount > 0) {
      const safe = this.escapeRegex(focus).replace(/\s+/g, '\\s+');
      const rx = new RegExp(safe, 'g');
      const keyCount = (text.toLowerCase().match(rx) || []).length;
      this.density = (keyCount / this.wordCount) * 100;
    }

    const links = Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[];
    this.linkCount = links.length;
    this.internalLinks = links.filter(a => a.href.includes(this.domain)).length;
    this.externalLinks = this.linkCount - this.internalLinks;

    this.paragraphWarnings = [];
    const paras = Array.from(doc.querySelectorAll('p')).map(p => p.textContent || '');
    let shortStreak = 0;
    paras.forEach((p, i) => {
      const wc = (p.trim().split(/\s+/).filter(Boolean)).length;
      if (wc > 120 || wc < 40) this.paragraphWarnings.push(`Párrafo ${i + 1}: ${wc} palabras (objetivo 40–80).`);
      if (wc < 20) {
        shortStreak++;
        if (shortStreak > 3) this.paragraphWarnings.push('Más de 3 párrafos muy cortos seguidos: considera unir.');
      } else shortStreak = 0;
    });
    const avg = paras.length ? Math.round(this.wordCount / paras.length) : 0;
    if (avg && (avg < 40 || avg > 80))
      this.paragraphWarnings.push(`Media por párrafo: ${avg} (objetivo 40–80).`);

    if (this.wordCount > 400 && this.headerCount < 1)
      this.headerSuggestion = 'Artículo >400 palabras requiere ≥1 H2.';
    else this.headerSuggestion = '';

    this.updateTitleRepetition();

    const bodyLower = text.toLowerCase();
    if (bodyLower.includes('fuentes:') || bodyLower.includes('sources:')) {
      const hasLinks = Array.from(doc.querySelectorAll('a[href^="https://"]')).length > 0;
      this.sourcesSuggestion = hasLinks
        ? ''
        : 'Si hay “Fuentes:”, exige lista de enlaces https con textos claros.';
    } else this.sourcesSuggestion = '';

    this.linkSuggestion =
      (this.externalLinks < 1 || this.externalLinks > 3 ||
        this.internalLinks < 2 || this.internalLinks > 3 ||
        this.linkCount > 7)
        ? 'Enlaces: recomienda 1–3 externos, 2–3 internos, total ≤7.'
        : '';

    const lists = doc.querySelectorAll('ul, ol');
    this.listSuggestion = [];
    Array.from(lists).forEach((list, i) => {
      const itemCount = list.querySelectorAll(':scope > li').length;
      if (itemCount > 7) {
        this.listSuggestion.push(`Lista ${i + 1} tiene ${itemCount} items (máximo 7 recomendados).`);
      }
    });
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
      if (this.density > 2) {
        this.keywordDensityWarnings
          .push(`La palabra clave aparece al ${this.density.toFixed(1)}% - posible sobreoptimización (máx. 2%).`);
      }
      if (this.density < 0.5 && this.density > 0) {
        this.keywordDensityWarnings
          .push(`La palabra clave aparece al ${this.density.toFixed(1)}% - sugiere aumentar su uso (mín. 0.5%).`);
      }
    }

    const firstPara = (doc.querySelector('p')?.textContent || '').toLowerCase();
    const metaDesc = (this.noticiaForm.get('meta.description')?.value || '').toLowerCase();
    if (keyphrase) {
      if (!metaDesc.includes(keyphrase))
        this.keyphraseWarnings.push(`La palabra clave "${keyphrase}" no está en la meta descripción.`);
      if (!firstPara.includes(keyphrase))
        this.keyphraseWarnings.push(`Sugiere incluir "${keyphrase}" en el primer párrafo.`);
    }
  }

  // ===== Embeds / parseo de HTML =====

  // Detecta embeds a partir de un párrafo con solo un enlace
  private detectEmbedBlock(el: HTMLElement) {
    const text = (el.textContent || '').trim();

    if (!/^\s*https?:\/\/\S+\s*$/.test(text)) {
      const anchorOnly = el.querySelector('a[href]') as HTMLAnchorElement | null;
      if (!anchorOnly) return null;

      const anchorText = (anchorOnly.textContent || '').trim();
      const rest = text.replace(anchorText, '').trim();
      if (!/^\s*https?:\/\/\S+\s*$/.test(anchorText) || rest.length > 0) return null;
    }

    const anchor = el.querySelector('a[href]') as HTMLAnchorElement | null;
    const candidate = anchor?.getAttribute('href') || text;
    if (!candidate || !/^https?:\/\//i.test(candidate)) return null;

    let provider: 'twitter' | 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'generic' = 'generic';

    try {
      const u = new URL(candidate);
      const host = u.hostname.replace(/^www\./, '').toLowerCase();

      if (host.includes('twitter.com') || host === 'x.com') {
        provider = 'twitter';
      } else if (host.includes('facebook.com') || host === 'fb.watch') {
        provider = 'facebook';
      } else if (host.includes('instagram.com')) {
        provider = 'instagram';
      } else if (host.includes('youtube.com') || host === 'youtu.be') {
        provider = 'youtube';
      } else if (host.includes('tiktok.com')) {
        provider = 'tiktok';
      }
    } catch {
      // ignore
    }

    return {
      type: 'embed',
      provider,
      url: candidate
    };
  }

  /** Convierte el HTML del body en bloques para la Vista Previa */
  private parseHtmlToBlocks(html: string) {
    if (!this.isBrowser) return [];
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const out: any[] = [];

    const walk = (node: ChildNode) => {
      if (!(node as HTMLElement).tagName) return;

      const el = node as HTMLElement;
      const tag = (el.tagName || '').toLowerCase();
      const style = {
        textAlign: (el.style?.textAlign || '') as 'left' | 'center' | 'right'
      };

      // === DETECCIÓN DE EMBEDS DENTRO DE <figure><oembed> ===
      if (tag === 'figure') {
        const oembed = el.querySelector('oembed[url]') as HTMLElement | null;
        if (oembed) {
          const url = oembed.getAttribute('url') || '';
          if (url) {
            let provider: 'twitter' | 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'generic' = 'generic';
            try {
              const u = new URL(url);
              const host = u.hostname.replace(/^www\./, '').toLowerCase();
              if (host.includes('twitter.com') || host === 'x.com') {
                provider = 'twitter';
              } else if (host.includes('facebook.com') || host.includes('fb.watch')) {
                provider = 'facebook';
              } else if (host.includes('instagram.com')) {
                provider = 'instagram';
              } else if (host.includes('youtube.com') || host === 'youtu.be') {
                provider = 'youtube';
              } else if (host.includes('tiktok.com')) {
                provider = 'tiktok';
              }
            } catch {
              // ignorar
            }

            out.push({
              type: 'embed',
              provider,
              url
            });
            return; // no seguir procesando como imagen
          }
        }
      }
      // === FIN DETECCIÓN EMBED figure/oembed ===

      if (tag === 'p' || tag === 'div') {
        const embed = this.detectEmbedBlock(el);
        if (embed) {
          out.push(embed);
          return;
        }
      }

      if (tag === 'iframe') {
        out.push({
          type: 'iframe',
          html: this.sanitizer.bypassSecurityTrustHtml(el.outerHTML)
        });
        return;
      }

      if (
        tag === 'h2' || tag === 'h3' || tag === 'h4' ||
        tag === 'h5' || tag === 'h6' || tag === 'p' || tag === 'span'
      ) {
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
        // solo si no fue <figure><oembed>
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

  /** Convierte HTML a bloques para guardar en Mongo */
  private parseHtmlToBlocksForSave(html: string) {
    if (!this.isBrowser) return [];
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const out: any[] = [];

    const walk = (node: ChildNode) => {
      if (!(node as HTMLElement).tagName) return;

      const el = node as HTMLElement;
      const tag = (el.tagName || '').toLowerCase();
      const style = {
        textAlign: (el.style?.textAlign || '') as 'left' | 'center' | 'right'
      };

      // === DETECCIÓN DE EMBEDS DENTRO DE <figure><oembed> ===
      if (tag === 'figure') {
        const oembed = el.querySelector('oembed[url]') as HTMLElement | null;
        if (oembed) {
          const url = oembed.getAttribute('url') || '';
          if (url) {
            let provider: 'twitter' | 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'generic' = 'generic';
            try {
              const u = new URL(url);
              const host = u.hostname.replace(/^www\./, '').toLowerCase();
              if (host.includes('twitter.com') || host === 'x.com') {
                provider = 'twitter';
              } else if (host.includes('facebook.com') || host.includes('fb.watch')) {
                provider = 'facebook';
              } else if (host.includes('instagram.com')) {
                provider = 'instagram';
              } else if (host.includes('youtube.com') || host === 'youtu.be') {
                provider = 'youtube';
              } else if (host.includes('tiktok.com')) {
                provider = 'tiktok';
              }
            } catch {
              // ignorar
            }

            out.push({
              type: 'embed',
              provider,
              url
            });
            return; // importante
          }
        }
      }
      // === FIN DETECCIÓN EMBED figure/oembed ===

      if (tag === 'p' || tag === 'div') {
        const rawText = (el.textContent || '').trim();

        // IFRAME ESCRITO COMO TEXTO (&lt;iframe...&lt;/iframe&gt;)
        if (/^&lt;iframe[\s\S]+&lt;\/iframe&gt;$/i.test(rawText)) {
          const textarea = document.createElement('textarea');
          textarea.innerHTML = rawText;
          const decoded = textarea.value; // <iframe ...></iframe>

          out.push({
            type: 'iframe',
            html: decoded
          });

          return;
        }

        const embed = this.detectEmbedBlock(el);
        if (embed) {
          out.push(embed);
          return;
        }
      }

      if (tag === 'iframe') {
        const iframeHtml = el.outerHTML;
        out.push({
          type: 'iframe',
          html: iframeHtml
        });
        return;
      }

      if (
        tag === 'h2' || tag === 'h3' || tag === 'h4' ||
        tag === 'h5' || tag === 'h6' || tag === 'p' || tag === 'span'
      ) {
        out.push({
          type: 'text',
          tag,
          html: el.innerHTML || '',
          text: el.textContent || '',
          style
        });
      } else if (tag === 'blockquote') {
        out.push({
          type: 'quote',
          html: el.innerHTML || '',
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
        // si no era oembed
        const img = el.querySelector('img');
        const figcap = el.querySelector('figcaption');
        out.push({
          type: 'image',
          url: img?.getAttribute('src') || '',
          alt: img?.getAttribute('alt') || '',
          captionHtml: figcap ? (figcap.innerHTML || '') : null
        });
      } else if (tag === 'a') {
        out.push({
          type: 'link',
          href: el.getAttribute('href') || '',
          textLink: el.textContent || ''
        });
      } else if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(el.querySelectorAll(':scope > li'));
        out.push({
          type: 'list',
          ordered: tag === 'ol',
          items: items.map(li => (li.textContent || '').trim()),
          itemsHtml: items.map(li => li.innerHTML || ''),
          style
        });
      }
    };

    Array.from(doc.body.children).forEach(walk);
    return out;
  }

  private buildPreviewData() {
    const raw = this.noticiaForm.value as any;
    const meta = raw.meta || {};
    const html = String(raw.body || '');
    const bodyHtml: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(html);
    const contentBlocks = this.parseHtmlToBlocks(html);

    return {
      ...raw,
      bodyHtml,
      content: contentBlocks,
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
    if (len < 120 && len > 110)
      this.metaDescWarning = `Meta description con ${len} chars. Objetivo: 120–160.`;
    else if (len > 160 && len < 170)
      this.metaDescWarning = 'Supera 160 chars. Acórtala.';
    else this.metaDescWarning = '';
  }

  private validatePublishAt() {
    if (this.noticiaForm.get('state')?.value !== 'review') return;
    const raw = this.noticiaForm.get('publishAt')?.value;
    const publishAt = raw ? new Date(raw) : null;
    if (!publishAt) {
      this.publishAtError = 'Fecha de publicación requerida para revisión.';
      return;
    }
    const now = new Date();
    const futureLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    this.publishAtError = publishAt > futureLimit ? 'Fecha no puede ser más de 24h en el futuro.' : '';
  }

  private updateLocalSeoSuggestion() {
    const city = this.noticiaForm.get('location.city')?.value;
    const html = (this.noticiaForm.get('body')?.value || '').toString();
    if (!this.isBrowser) return;
    const text = new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
    this.localSeoSuggestion =
      (city && !text.includes(city))
        ? `Sugiere añadir mención a "${city}" en el primer 30% del texto. (Opcional)`
        : '';
  }

  private updateTitleRepetition() {
    const title = (this.noticiaForm.get('title')?.value || '').toLowerCase();
    const html = (this.noticiaForm.get('body')?.value || '').toString();
    if (!this.isBrowser) return;
    const firstPara = (new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector('p')?.textContent || '').toLowerCase();
    this.titleRepetitionWarning =
      (title && firstPara.startsWith(title))
        ? 'La primera frase repite el título: varíala para mejorar CTR.'
        : '';
  }

  private updateChecklist() {
    this.checklist = {
      title: this.noticiaForm.get('title')?.valid,
      description: this.noticiaForm.get('meta.description')?.valid,
      slug: this.noticiaForm.get('slug')?.valid,
      headers: this.headerCount >= 1 || this.wordCount <= 400,
      links: this.noticiaForm.get('state')?.value !== 'review' ||
        !this.noticiaForm.get('body')?.errors?.['links'],
      image: this.noticiaForm.get('meta.image')?.valid,
      publishAt: !this.publishAtError,
      noUtm: true,
      sources: !this.sourcesSuggestion,
      focusKeyphrase: this.noticiaForm.get('focusKeyphrase')?.valid &&
        this.noticiaForm.get('title')?.valid,
      imageAltGlobal: this.noticiaForm.get('meta.imageAltGlobal')?.valid,
      wordCount: this.wordCount >= 300,
      extracto: this.noticiaForm.get('extracto')?.valid,
      categories: this.noticiaForm.get('categories')?.valid,
      tags: this.tags?.valid
    };
  }

  private updatePublishTooltip() {
    if (this.noticiaForm.get('state')?.value !== 'review') {
      this.publishTooltip = '';
      return;
    }
    const fails: string[] = [];
    if (!this.checklist.title) fails.push('Título 50–60 + keyword');
    if (!this.checklist.description) fails.push('Meta 120–160 + keyword');
    if (!this.checklist.slug) fails.push('Slug válido/único');
    if (!this.checklist.headers) fails.push('≥1 H2 si >400');
    if (!this.checklist.links) fails.push('Enlaces óptimos');
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

  // ===== Servicios / carga =====
  loadCategories() {
    this.categoriasService.obtenerCategorias().subscribe(categories => {
      this.categoriasDisponibles = categories;
      this.ensureSelectedCatsAreInItems();
    });
  }
private loadNoticia() {
  this.noticiasService.getNoticiaById(this.id).subscribe((noticia: Noticia | any) => {
    if (!noticia) return;

    const catsRaw: any[] = Array.isArray(noticia.categories) ? (noticia.categories as any[]) : [];
    this.loadedNoticiaCats = catsRaw
      .filter(c => c && (c._id || c.id || c.slug || c.name))
      .map(c => ({
        _id: String(c._id || ''),
        name: String(c.name || ''),
        slug: String(c.slug || ''),
        color: c.color || undefined,
      })) as CategoriaPayload[];

    this.loadedNoticiaCatIds = catsRaw
      .map(c => (typeof c === 'string' ? c : (c._id || c.id)))
      .filter(Boolean)
      .map(String);

    const meta = (noticia as any).meta || {};
    const location = (noticia as any).location || { country: '', region: '', city: '' };

    // 👇 NUEVO: priorizar content sobre bodyHtml
    const blocks = (noticia as any).content || [];
    let bodyHtml: string;
    if (Array.isArray(blocks) && blocks.length > 0) {
      bodyHtml = this.blocksToHtml(blocks);
    } else {
      bodyHtml = (noticia as any).bodyHtml || '';
    }

    const focusFromMeta =
      (meta as any).focusKeyphrase ??
      (noticia as any).focusKeyphrase ??
      '';

    this.noticiaForm.patchValue({
      focusKeyphrase: focusFromMeta,
      title: noticia.title,
      slug: noticia.slug,
      extracto: (noticia as any).extracto || '',
      summary: noticia.summary || '',
      categories: this.loadedNoticiaCatIds,
      location,
      meta: {
        description: meta.description || '',
        image: meta.image || '',
        canonical: meta.canonical || '',
        ogTitle: meta.ogTitle || noticia.title || '',
        ogDescription: meta.ogDescription || meta.description || '',
        imageAltGlobal: meta.imageAltGlobal || '',
        imageCaptionHtml: meta.imageCaptionHtml || ''
      },
      state: (noticia as any).state || 'draft',
      publishAt: this.formatDateForInput((noticia as any).publishAt || null),
      body: bodyHtml
    });

    // tags
    this.tags.clear();
    if (Array.isArray(noticia.tags)) {
      noticia.tags.forEach((tag: any) => this.tags.push(this.fb.control(tag, Validators.required)));
    }

    this.ensureSelectedCatsAreInItems();
    this.cdr.detectChanges();
    this.noticiaForm.get('categories')?.updateValueAndValidity();
    this.updateMetricsFromHTML();
    this.previewDataObj = this.buildPreviewData();
  });
}

  private ensureSelectedCatsAreInItems() {
    this.cdr.detectChanges();
    if (!this.loadedNoticiaCatIds?.length) return;

    const existentes = new Set((this.categoriasDisponibles || []).map(c => String(c._id)));
    const faltantesIds = this.loadedNoticiaCatIds.filter(id => !existentes.has(String(id)));

    if (faltantesIds.length === 0) return;

    const desdePopulate = this.loadedNoticiaCats.filter(c => c?._id && faltantesIds.includes(String(c._id)));
    const idsQueSiguenFaltando = faltantesIds.filter(id => !desdePopulate.some(c => c._id === id));

    if (desdePopulate.length) {
      this.categoriasDisponibles = [...this.categoriasDisponibles, ...desdePopulate];
    }

    if (idsQueSiguenFaltando.length) {
      if ((this.categoriasService as any).getCategoriasByIds) {
        this.categoriasService.getCategoriasByIds(idsQueSiguenFaltando).subscribe((rows: any[]) => {
          if (Array.isArray(rows) && rows.length) {
            const nuevos = rows.filter(r => r && r._id && !existentes.has(String(r._id)));
            if (nuevos.length) {
              this.categoriasDisponibles = [...this.categoriasDisponibles, ...nuevos];
            }
          }
        });
      }
    }
  }

  // convierte bloques a html básico (por si no hay bodyHtml en BD)
  private blocksToHtml(blocks: any[]): string {
    if (!Array.isArray(blocks)) return '';
    const to = blocks.map(b => {
      switch (b.type) {
        case 'text': {
          const tag = b.tag || 'p';
          return `<${tag}>${(b.html || b.text || '')}</${tag}>`;
        }
        case 'image':
          return `<figure><img src="${b.url || ''}" alt="${b.alt || ''}"/>${b.captionHtml ? `<figcaption>${b.captionHtml}</figcaption>` : ''}</figure>`;
        case 'quote':
          return `<blockquote>${b.html || b.quote || ''}</blockquote>`;
        case 'list': {
          const tag = b.ordered ? 'ol' : 'ul';
          const items = (b.itemsHtml || b.items || []).map((it: any) => `<li>${it || ''}</li>`).join('');
          return `<${tag}>${items}</${tag}>`;
        }
        case 'link':
          return `<p><a href="${b.href}" rel="noopener">${b.textLink || b.href}</a></p>`;
        case 'iframe':
          return typeof b.html === 'string' ? b.html : '';
        case 'embed':
          return `<figure class="media"><oembed url="${b.url}"></oembed></figure>`;
        default:
          return '';
      }
    }).join('\n');
    return to;
  }

  private formatDateForInput(date: string | Date | null): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 16);
  }

  // ===== Imagen meta =====
  onMetaImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const ratio = width / height;
    if (width < 1200 || height < 630 || Math.abs(ratio - 1.91) > 0.1) {
      this.metaImageWarning = `Imagen recomendada: ≥1200x630, ratio ~1.91:1. Actual: ${width}x${height}`;
    }
  }

  async onPickHero(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    const sign = await fetch('https://maslatinoregular.onrender.com/aaron/maslatino/sign-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        approxSize: file.size
      })
    });
    if (!sign.ok) { alert('No se pudo firmar la subida.'); return; }
    const { uploadUrl, publicUrl } = await sign.json();

    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    if (!put.ok) { alert('Fallo al subir a S3'); return; }

    this.noticiaForm.patchValue({
      meta: {
        ...this.noticiaForm.get('meta')?.value,
        image: publicUrl,
      }
    });

    this.noticiaForm.get('meta.image')?.updateValueAndValidity();
    setTimeout(() => this.metaImageWarning = '', 0);
  }

  // ===== Submit (update) =====
  onSubmit() {
    this.isSubmitting = true;
    this.noticiaForm.markAllAsTouched();
    this.noticiaForm.get('body')?.updateValueAndValidity();

    if (this.noticiaForm.invalid ||
      (this.noticiaForm.get('state')?.value === 'review' &&
        Object.values(this.checklist).some((v: any) => !v))) {
      const errors: string[] = [];
      if (this.noticiaForm.get('focusKeyphrase')?.invalid) errors.push('Keyword principal obligatoria.');
      if (this.noticiaForm.get('title')?.invalid) errors.push('Título inválido.');
      if (this.noticiaForm.get('slug')?.invalid) errors.push('Slug inválido/duplicado.');
      if (this.noticiaForm.get('extracto')?.invalid) errors.push('Extracto redes 150–300 con keyword 1 vez.');
      if (this.noticiaForm.get('meta.description')?.invalid) errors.push('Meta desc 120–160 con keyword 1 vez.');
      if (this.noticiaForm.get('meta.image')?.invalid) errors.push('Imagen destacada inválida.');
      if (this.noticiaForm.get('meta.imageAltGlobal')?.invalid)
        errors.push('Alt global debe incluir keyword-con-guiones.');
      if (this.noticiaForm.get('categories')?.invalid) errors.push('Al menos una categoría.');
      if (this.noticiaForm.get('state')?.value === 'review' &&
        Object.values(this.checklist).some((v: any) => !v)) {
        errors.push('Checklist SEO pendiente(s).');
      }
      alert('Se guardará aunque haya pendientes:\n- ' + errors.join('\n- '));
    }

    const data = this.prepareSubmitData();

    this.noticiasService.updateNoticia(this.id, data).subscribe({
      next: _ => {
        alert('Noticia actualizada (aunque hubiera avisos).');
        this.isSubmitting = false;
      },
      error: err => {
        alert('Error al actualizar la noticia: ' + err.message);
        this.isSubmitting = false;
      }
    });
  }

  private prepareSubmitData() {
    const raw = this.noticiaForm.value as any;
    const categories: string[] = raw.categories;
    const authorId = 'a94f23c8bd7e4ad1f6c30ae5'; // TODO: autor real

    const html = String(raw.body || '');
    const contentForSave = this.parseHtmlToBlocksForSave(html);

    const hardenCaptionLinks = (captionHtml: string) => {
      if (!captionHtml) return captionHtml;
      return captionHtml
        .replace(/<a\b(?![^>]*\btarget=)[^>]*>/ig, m => m.replace('<a', '<a target="_blank"'))
        .replace(/<a\b(?![^>]*\brel=)[^>]*>/ig, m => m.replace('<a', '<a rel="nofollow noopener"'));
    };

    const {
      imageCaption,
      imageCaptionUrl,
      imageCaptionHtml = ''
    } = raw.meta || {};

    const metaOut = {
      ...raw.meta,
      focusKeyphrase: raw.focusKeyphrase,
      ogTitle: raw.meta?.ogTitle || raw.title,
      ogDescription: raw.meta?.ogDescription || (raw.extracto || raw.meta?.description),
      canonical: raw.meta?.canonical || `https://${this.domain}/${raw.slug}`,
      twitterCard: 'summary_large_image',
      imageCaptionHtml: hardenCaptionLinks(imageCaptionHtml)
    };

    delete (metaOut as any).imageCaption;
    delete (metaOut as any).imageCaptionUrl;

    return {
      ...raw,
      categories,
      author: authorId,
      bodyHtml: html,
      content: contentForSave,
      meta: metaOut
    };
  }

  // ======== Atajos y split ========
  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.key.toLowerCase() === 'p') { e.preventDefault(); this.cycleDock(); }
    if (e.key.toLowerCase() === 'b') { e.preventDefault(); this.inspectorOpen = !this.inspectorOpen; }
    if (e.key === ';') { e.preventDefault(); this.seoEssentialsOpen = !this.seoEssentialsOpen; }
  }

  cycleDock() {
    this.dockMode = this.dockMode === 'hidden'
      ? 'right'
      : this.dockMode === 'right'
        ? 'bottom'
        : 'hidden';
  }

  onGutterDown(_: MouseEvent) {
    if (this.dockMode !== 'right') return;
    this.resizing = true;
    document.body.classList.add('resizing');
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.resizing = false;
    document.body.classList.remove('resizing');
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    if (!this.resizing || this.dockMode !== 'right') return;
    const wrap = document.querySelector('.studio-wrap') as HTMLElement;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    this.splitRatio = Math.min(0.8, Math.max(0.3, x / rect.width));
  }

  // Helpers categorías
  getCategoryNameById(id: string): string {
    const match = this.categoriasDisponibles.find(c => c._id === id);
    return match ? match.name : '—';
  }

  removeCategory(id: string): void {
    const current = this.noticiaForm.get('categories')?.value || [];
    const next = current.filter((catId: string) => catId !== id);
    this.noticiaForm.patchValue({ categories: next });
    this.noticiaForm.get('categories')?.markAsTouched();
    this.updateChecklist();
    this.updatePublishTooltip();
  }

  onEditorReady(editor: any) {
    const available = new Set<string>(Array.from(editor.ui.componentFactory.names()));
    if (Array.isArray(this.editorConfig.toolbar)) {
      this.editorConfig.toolbar = this.editorConfig.toolbar.filter((t: string) => available.has(t));
    }
    if (this.editorConfig.image?.toolbar?.length) {
      this.editorConfig.image.toolbar =
        this.editorConfig.image.toolbar.filter((t: string) => available.has(t));
    }
  }

  private noTrailingDotValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = (control.value || '').toString().trim();
      return /\.\s*$/.test(v) ? { noTrailingDot: true } : null;
    };
  }

  // ==== Caption helpers ====
  wrapSelection(textarea: HTMLTextAreaElement, before: string, after: string) {
    const ctrl = this.noticiaForm.get('meta.imageCaptionHtml');
    const value = String(ctrl?.value || '');
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const sel = value.slice(start, end) || 'texto';

    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    ctrl?.setValue(next);
    ctrl?.markAsDirty();
    const newPos = start + before.length + sel.length + after.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
      ctrl?.updateValueAndValidity();
    });
  }

  wrapSelectionAsLink(textarea: HTMLTextAreaElement) {
    const url = (window.prompt('Pega la URL (debe iniciar con http:// o https://)') || '').trim();
    if (!/^https?:\/\/.+/i.test(url)) {
      if (url) alert('URL inválida. Debe iniciar con http:// o https://');
      return;
    }
    this.wrapSelection(textarea, `<a href="${url}">`, `</a>`);
  }

  private sanitizeCaptionHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const allowed = new Set(['A', 'STRONG', 'EM', 'B', 'I']);
    const walker = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (!allowed.has(el.tagName)) {
          const span = doc.createTextNode(el.textContent || '');
          el.replaceWith(span);
          return;
        }
        for (const attr of Array.from(el.attributes)) {
          if (el.tagName === 'A' && attr.name.toLowerCase() === 'href') continue;
          el.removeAttribute(attr.name);
        }
        if (el.tagName === 'A') {
          const href = el.getAttribute('href') || '';
          if (!/^https?:\/\//i.test(href)) {
            el.replaceWith(doc.createTextNode(el.textContent || ''));
            return;
          }
        }
      }
      for (const child of Array.from(node.childNodes)) walker(child);
    };
    walker(doc.body);

    return (doc.body.innerHTML || '')
      .replace(/<(div|p)>(.*?)<\/\1>/gi, '$2')
      .trim();
  }

  private getPlainTextLenFromHtml(html: string): number {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || '').replace(/\s+/g, ' ').trim().length;
  }

  onCaptionInput(ev: Event) {
    const el = ev.target as HTMLElement;
    const clean = this.sanitizeCaptionHtml(el.innerHTML);
    if (clean !== el.innerHTML) el.innerHTML = clean;

    this.captionPlainCount = this.getPlainTextLenFromHtml(clean);
    this.noticiaForm.get('meta.imageCaptionHtml')?.setValue(clean, { emitEvent: true });
    this.noticiaForm.get('meta.imageCaptionHtml')?.updateValueAndValidity();
  }

  onCaptionPaste(ev: ClipboardEvent) {
    ev.preventDefault();
    const text = (ev.clipboardData?.getData('text/plain') || '').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  }

  syncCaptionToForm() {
    const ctrl = this.noticiaForm.get('meta.imageCaptionHtml');
    const editor = document.querySelector('.caption-editor') as HTMLElement | null;
    if (ctrl && editor) {
      const clean = this.sanitizeCaptionHtml(editor.innerHTML);
      ctrl.setValue(clean, { emitEvent: true });
      ctrl.updateValueAndValidity();
      this.captionPlainCount = this.getPlainTextLenFromHtml(clean);
      if (clean !== editor.innerHTML) editor.innerHTML = clean;
    }
  }

  capBold(editor: HTMLElement) {
    editor.focus();
    document.execCommand('bold');
    this.syncCaptionToForm();
  }

  capItalic(editor: HTMLElement) {
    editor.focus();
    document.execCommand('italic');
    this.syncCaptionToForm();
  }

  private isSelectionInside(editor: HTMLElement): boolean {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    return editor.contains(container.nodeType === Node.ELEMENT_NODE
      ? (container as Node)
      : container.parentNode);
  }

  onFormEnter(event: Event) {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const tag = target.tagName.toLowerCase();
    const isTextArea = tag === 'textarea';

    const isContentEditable =
      (target as HTMLElement).isContentEditable ||
      !!target.closest('[contenteditable="true"]');

    if (!isTextArea && !isContentEditable) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  capLink(editor: HTMLElement) {
    editor.focus();

    const url = (prompt('Pega la URL (debe iniciar con http:// o https://)') || '').trim();
    if (!/^https?:\/\//i.test(url)) {
      if (url) alert('URL inválida. Debe iniciar con http:// o https://');
      return;
    }

    const sel = window.getSelection();
    const hasSel = !!sel && sel.rangeCount > 0 && !sel.isCollapsed && this.isSelectionInside(editor);

    if (hasSel) {
      document.execCommand('createLink', false, url);
    } else {
      const display = (prompt('Texto a mostrar para el enlace:') || '').trim();
      if (!display) return;

      const a = document.createElement('a');
      a.href = url;
      a.textContent = display;

      if (sel && sel.rangeCount > 0 && this.isSelectionInside(editor)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(a);
        range.setStartAfter(a);
        range.setEndAfter(a);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        editor.appendChild(a);
        editor.appendChild(document.createTextNode(' '));
      }
    }

    this.syncCaptionToForm();
  }

  // ===== Eliminar noticia =====
  onDelete() {
    if (!confirm('¿Eliminar esta noticia? Esta acción no se puede deshacer.')) return;
    this.isSubmitting = true;
    this.noticiasService.deleteNoticia(this.id).subscribe({
      next: () => {
        alert('Noticia eliminada exitosamente.');
        this.isSubmitting = false;
        this.router.navigate(['/noticias']);
      },
      error: (err: any) => {
        alert('Error al eliminar la noticia: ' + (err.message || 'Unknown error'));
        this.isSubmitting = false;
      },
    });
  }
}
