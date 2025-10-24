// editar-noticias.ts
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  AsyncValidatorFn,
} from '@angular/forms';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NoticiasService } from '../../../../services/noticias-service';
import { VistaPrevia } from '../vista-previa/vista-previa';
import { NgSelectModule } from '@ng-select/ng-select';
import { CategoriaService, CategoriaPayload } from '../../../../services/categorias-service';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';
import { debounceTime, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Noticia } from '../../../../../models/noticia.model';

@Component({
  selector: 'app-editar-noticias',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, VistaPrevia, FormsModule, NgSelectModule],
  templateUrl: './editar-noticias.html',
  styleUrls: ['./editar-noticias.css'],
})
export class EditarNoticias implements OnInit {
  noticiaForm: FormGroup;
  categoriasDisponibles: CategoriaPayload[] = [];
  previewDataObj: any;
  blockOpenState: boolean[] = [];
  wordCount = 0;
  readingTime = 0;
  imageCount = 0;
  headerCount = 0;
  fleschScore = 0;
  titleWarning = '';
  metaDescWarning = '';
  metaImageWarning = '';
  publishAtError = '';
  paragraphWarnings: string[] = [];
  keywordDensityWarnings: string[] = [];
  headerSuggestion = '';
  listSuggestion = '';
  quoteWarning = '';
  localSeoSuggestion = '';
  titleRepetitionWarning = '';
  sourcesSuggestion = '';
  showChecklist = false;
  checklist: any = {};
  publishTooltip = '';
  isSubmitting = false;
  canonicalUrl = '';
  id = '';

  constructor(
    private fb: FormBuilder,
    private noticiasService: NoticiasService,
    private sanitizer: DomSanitizer,
    private categoriasService: CategoriaService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.noticiaForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(60)]],
      slug: [
        '',
        {
          validators: [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)],
          asyncValidators: [this.slugUniqueValidator()],
          updateOn: 'blur',
        },
      ],
      summary: ['', [Validators.minLength(150), Validators.maxLength(160)]],
      tags: this.fb.array([]),
      categories: [[], Validators.required],
      location: this.fb.group({
        country: [''],
        region: [''],
        city: [''],
      }),
      meta: this.fb.group({
        description: ['', [Validators.required, Validators.minLength(150), Validators.maxLength(160)]],
        image: ['', [Validators.required, Validators.pattern(/^https:\/\/.*\.(jpg|png|webp)$/i)]],
        canonical: ['', Validators.pattern(/^https?:\/\/.+/)],
        ogTitle: [''],
        ogDescription: [''],
        imageAltGlobal: [''],
        twitterCard: ['summary_large_image'], // ahora guardado en backend
      }),
      state: ['draft'], // ahora guardado en backend
      publishAt: [null], // ahora guardado en backend
      content: this.fb.array([], [this.noH1Validator(), this.contentMinValidator()]),
    });

    // Auto-slug + avisos
    this.noticiaForm.get('title')?.valueChanges.subscribe((title) => {
      if (title) {
        const slug = this.generateSlug(title);
        this.noticiaForm.get('slug')?.setValue(slug, { emitEvent: false });
      }
      this.updateTitleWarning();
      this.updateTitleRepetition();
    });

    this.noticiaForm.get('slug')?.valueChanges.subscribe((slug) => {
      this.canonicalUrl = `https://yourdomain.com/${slug}`;
    });

    this.noticiaForm.get('meta.description')?.valueChanges.subscribe(() => this.updateMetaDescWarning());
    this.noticiaForm.get('meta.image')?.valueChanges.subscribe(() => (this.metaImageWarning = ''));
    this.noticiaForm.get('publishAt')?.valueChanges.subscribe(() => this.validatePublishAt());
    this.noticiaForm.get('location.city')?.valueChanges.subscribe(() => this.updateLocalSeoSuggestion());
    this.noticiaForm.get('state')?.valueChanges.subscribe((state) => {
      this.showChecklist = state === 'published';
      this.updatePublishTooltip();
    });
  }

  ngOnInit(): void {
    this.previewDataObj = this.buildPreviewData();
    this.noticiaForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      this.previewDataObj = this.buildPreviewData();
      this.updateMetrics();
      this.updateSoftValidators();
      this.updateChecklist();
      this.updatePublishTooltip();
    });

    this.loadCategories();

    this.route.params.subscribe((params) => {
      this.id = params['id'];
      if (this.id) {
        this.loadNoticia();
      }
    });
  }

  private loadNoticia() {
    this.noticiasService.getNoticiaById(this.id).subscribe((noticia) => {
      if (noticia) {
        this.patchForm(noticia);
      } else {
        console.error('Noticia no encontrada');
      }
    });
  }

  private patchForm(noticia: Noticia) {
    const noticiaExtended = noticia as Noticia & {
      location?: { country?: string; region?: string; city?: string };
      state?: string;
      publishAt?: string | Date | null;
      meta?: any;
    };

    this.noticiaForm.patchValue({
      title: noticia.title,
      slug: noticia.slug,
      summary: noticia.summary || '',
      categories: (noticia.categories as any) || [],
      location: noticiaExtended.location ?? { country: '', region: '', city: '' },
      meta: {
        description: noticiaExtended.meta?.description || '',
        image: noticiaExtended.meta?.image || '',
        canonical: noticiaExtended.meta?.canonical || '',
        ogTitle: noticiaExtended.meta?.ogTitle || noticia.title || '',
        ogDescription: noticiaExtended.meta?.ogDescription || noticiaExtended.meta?.description || '',
        imageAltGlobal: noticiaExtended.meta?.imageAltGlobal || '',
        twitterCard: noticiaExtended.meta?.twitterCard || 'summary_large_image',
      },
      state: noticiaExtended.state ?? 'draft',
      publishAt: this.formatDateForInput(noticiaExtended.publishAt ?? null),
    });

    // Tags
    this.tags.clear();
    if (Array.isArray(noticia.tags)) {
      noticia.tags.forEach((tag) => this.tags.push(this.fb.control(tag, Validators.required)));
    }

    // Bloques
    this.content.clear();
    this.blockOpenState = [];
    (noticia.content || []).forEach((block: any) => {
      const blockGroup = this.createBlockGroup(block.type);
      // Ajuste: permitir h2/h3/h4... pero no h1
      if (block.tag === 'h1') block.tag = 'p';

      blockGroup.patchValue(block);

      if (block.type === 'list' && Array.isArray(block.items)) {
        const items = blockGroup.get('items') as FormArray;
        while (items.length) items.removeAt(0);
        block.items.forEach((item: string) => items.push(this.fb.control(item, Validators.required)));
      }

      this.content.push(blockGroup);
      this.blockOpenState.push(true);
    });

    this.updateMetrics();
    this.previewDataObj = this.buildPreviewData();
  }

  private formatDateForInput(date: string | Date | null): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 16);
  }

  private generateSlug(title: string): string {
    const normalized = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
    return normalized;
  }

  private noH1Validator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const content = control as FormArray;
      const h1Count = content.controls.filter((g) => g.get('tag')?.value === 'h1').length;
      return h1Count > 0 ? { multipleH1: true } : null;
    };
  }

  private contentMinValidator(): ValidatorFn {
    return (_control: AbstractControl): ValidationErrors | null => {
      if (this.noticiaForm?.get('state')?.value !== 'published') return null;
      const errors: any = {};
      if (this.headerCount < 1 && this.wordCount > 400) errors.minHeaders = true;
      return Object.keys(errors).length ? errors : null;
    };
  }

  private slugUniqueValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) return of(null);
      return this.noticiasService.getNoticiaBySlug(control.value).pipe(
        map((n: Noticia | null) => (n && (n as any)._id !== this.id ? { slugUnique: true } : null)),
        catchError(() => of(null))
      );
    };
  }

  private buildPreviewData() {
    const raw = this.noticiaForm.value;
    const meta = raw.meta;
    return {
      ...raw,
      content: raw.content.map((block: any) => {
        const base = { ...block, style: { ...(block.style || {}) } };
        switch (block.type) {
          case 'text':
            return {
              ...base,
              html: this.sanitizer.bypassSecurityTrustHtml(marked.parse(block.text || '') as string),
            };
          case 'list':
            return {
              ...base,
              itemsHtml: (block.items || []).map((item: string) =>
                this.sanitizer.bypassSecurityTrustHtml(marked.parse(item) as string)
              ),
            };
          case 'quote': {
            const quoteHtml = marked.parse(`> ${block.quote || ''}`) as string;
            return {
              ...base,
              html: this.sanitizer.bypassSecurityTrustHtml(quoteHtml),
              style: { ...base.style, textAlign: 'center' },
            };
          }
          case 'image': {
            const captionHtml = block.caption ? (marked.parse(block.caption) as string) : '';
            return { ...base, captionHtml: this.sanitizer.bypassSecurityTrustHtml(captionHtml) };
          }
          case 'credit':
            return {
              ...base,
              html: this.sanitizer.bypassSecurityTrustHtml(marked.parse(block.creditText || '') as string),
            };
          default:
            return base;
        }
      }),
      meta: {
        ...meta,
        ogTitle: meta.ogTitle || raw.title,
        ogDescription: meta.ogDescription || meta.description,
        canonical: meta.canonical || `https://yourdomain.com/${raw.slug}`,
        twitterCard: meta.twitterCard || 'summary_large_image',
      },
    };
  }

  // Getters
  get content(): FormArray {
    return this.noticiaForm.get('content') as FormArray;
  }
  get tags(): FormArray {
    return this.noticiaForm.get('tags') as FormArray;
  }

  // Tags
  addTag() {
    this.tags.push(this.fb.control('', Validators.required));
  }
  removeTag(index: number) {
    this.tags.removeAt(index);
  }

  // Bloques
  getListItems(blockIndex: number): FormArray {
    const blockGroup = this.content.at(blockIndex) as FormGroup;
    const itemsControl = blockGroup.get('items');
    return itemsControl instanceof FormArray ? itemsControl : this.fb.array([]);
  }
  getBlock(i: number): FormGroup {
    return this.content.at(i) as FormGroup;
  }

  private createBlockGroup(type: string): FormGroup {
    switch (type) {
      case 'text':
        return this.fb.group({
          type: ['text'],
          text: ['', Validators.required],
          tag: ['p'],
          style: this.fb.group({
            fontSize: [''],
            fontWeight: [''],
            fontFamily: [''],
            textAlign: ['left'],
          }),
        });
      case 'image':
        return this.fb.group({
          type: ['image'],
          url: ['', [Validators.required, Validators.pattern(/^https:\/\/.*\.(jpg|png|webp)$/i)]],
          alt: ['', [Validators.required, Validators.minLength(8)]],
          caption: [''],
        });
      case 'list':
        return this.fb.group({
          type: ['list'],
          ordered: [false],
          items: this.fb.array([this.fb.control('', Validators.required)]),
        });
      case 'quote':
        return this.fb.group({
          type: ['quote'],
          quote: ['', Validators.required],
          authorQuote: [''],
          style: this.fb.group({
            fontFamily: ['Arial, sans-serif'],
            fontStyle: ['italic'],
            textAlign: ['center'],
          }),
        });
      case 'link':
        return this.fb.group({
          type: ['link'],
          href: ['', [Validators.required, Validators.pattern(/^https:\/\/.+/)]],
          textLink: ['', [Validators.required, this.noGenericAnchorValidator()]],
        });
      case 'credit':
        return this.fb.group({
          type: ['credit'],
          creditText: ['', Validators.required],
        });
      default:
        return this.fb.group({ type: [type], data: [''] });
    }
  }

  private noGenericAnchorValidator(): ValidatorFn {
    const generics = ['clic aquí', 'aquí', 'leer más', 'click here', 'here', 'read more'];
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value || '').toLowerCase();
      return generics.some((g) => value.includes(g)) ? { genericAnchor: true } : null;
    };
  }

  addBlock(type: string) {
    const blockGroup = this.createBlockGroup(type);
    this.content.push(blockGroup);
    this.blockOpenState.push(true);
    this.content.updateValueAndValidity();
  }

  removeBlock(i: number) {
    this.content.removeAt(i);
    this.blockOpenState.splice(i, 1);
    this.content.updateValueAndValidity();
  }

  toggleBlock(i: number) {
    this.blockOpenState[i] = !this.blockOpenState[i];
  }

  addListItem(blockIndex: number) {
    const items = this.getListItems(blockIndex);
    if (items.length < 7) items.push(this.fb.control('', Validators.required));
  }

  removeListItem(blockIndex: number, itemIndex: number) {
    const items = this.getListItems(blockIndex);
    if (items.length > 1) items.removeAt(itemIndex);
  }

  cleanUtm(blockIndex: number) {
    const hrefCtrl = this.getBlock(blockIndex).get('href');
    if (!hrefCtrl) return;
    const url = hrefCtrl.value;
    if (url) {
      try {
        const urlObj = new URL(url);
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((p) =>
          urlObj.searchParams.delete(p)
        );
        hrefCtrl.setValue(urlObj.toString());
      } catch {}
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain');
    document.execCommand('insertText', false, text || '');
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

  loadCategories() {
    this.categoriasService.obtenerCategorias().subscribe((categories) => {
      this.categoriasDisponibles = categories;
    });
  }

  private updateMetrics() {
    let totalWords = 0;
    let paras: string[] = [];
    this.imageCount = 0;
    this.headerCount = 0;
    let syllables = 0;
    let sentences = 0;

    this.content.controls.forEach((group) => {
      const type = group.get('type')?.value;
      if (type === 'text') {
        const text = group.get('text')?.value || '';
        const tag = group.get('tag')?.value;
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        totalWords += words;
        if (tag === 'p') paras.push(text);
        else if (['h2', 'h3'].includes(tag)) this.headerCount++;
        syllables += text.match(/[aeiouáéíóúü]/gi)?.length || 0;
        sentences += text.match(/[.!?]/g)?.length || 1;
      } else if (type === 'image') {
        if (group.get('alt')?.value) this.imageCount++;
      } else if (type === 'list') {
        const items = group.get('items') as FormArray;
        items.controls.forEach((item) => {
          const t = (item.value || '') as string;
          totalWords += t.trim().split(/\s+/).filter(Boolean).length;
          syllables += t.match(/[aeiouáéíóúü]/gi)?.length || 0;
          sentences += t.match(/[.!?]/g)?.length || 1;
        });
      } else if (type === 'quote') {
        const quote = group.get('quote')?.value || '';
        totalWords += quote.trim().split(/\s+/).filter(Boolean).length;
        syllables += quote.match(/[aeiouáéíóúü]/gi)?.length || 0;
        sentences += quote.match(/[.!?]/g)?.length || 1;
        this.quoteWarning = quote.length > 280 ? 'Si >280 chars, considera convertir en párrafo + atribución.' : '';
      }
    });

    this.wordCount = totalWords;
    this.readingTime = Math.ceil(totalWords / 200);
    this.fleschScore = totalWords
      ? Math.round(206.835 - 1.015 * (totalWords / Math.max(1, sentences)) - 84.6 * (syllables / totalWords))
      : 0;

    this.paragraphWarnings = [];
    let shortParaStreak = 0;
    paras.forEach((p, i) => {
      const words = p.trim().split(/\s+/).filter(Boolean).length;
      if (words > 120) this.paragraphWarnings.push(`Párrafo ${i + 1} tiene ${words} palabras. Divide en 2–3.`);
      if (words < 20) {
        shortParaStreak++;
        if (shortParaStreak > 3) this.paragraphWarnings.push('Más de 3 párrafos cortos seguidos. Considera unir algunos.');
      } else shortParaStreak = 0;
    });
    const avgParaWords = paras.length ? totalWords / paras.length : 0;
    if (avgParaWords < 40 || avgParaWords > 80) {
      this.paragraphWarnings.push(`Media de palabras por párrafo: ${Math.round(avgParaWords)}. Objetivo 40-80.`);
    }

    if (this.wordCount > 400 && this.headerCount < 1) {
      this.headerSuggestion = 'Artículo >400 palabras: requiere al menos un H2.';
    } else if (
      this.headerCount > 0 &&
      this.content.controls.some((g) => g.get('type')?.value === 'list' && (g.get('items') as FormArray).length > 5)
    ) {
      this.headerSuggestion = 'Listas largas: sugiere H3 bajo un H2.';
    } else {
      this.headerSuggestion = '';
    }

    this.content.updateValueAndValidity();
  }

  private updateSoftValidators() {
    this.keywordDensityWarnings = [];
    if (this.wordCount > 0) {
      this.tags.controls.forEach((tagCtrl) => {
        const tag = (tagCtrl.value || '').toLowerCase();
        if (tag) {
          const count = this.getFullText().toLowerCase().split(tag).length - 1;
          const density = (count / this.wordCount) * 100;
          if (density > 3) {
            this.keywordDensityWarnings.push(`Tag "${tag}" aparece al ${density.toFixed(1)}% - posible sobre-optimización.`);
          }
        }
      });
    }

    this.updateTitleRepetition();

    const fullText = this.getFullText().toLowerCase();
    if (fullText.includes('fuentes:') || fullText.includes('sources:')) {
      const hasListWithHttps = this.content.controls.some(
        (g) => g.get('type')?.value === 'list' && (g.get('items') as FormArray)?.value?.some((it: string) => /^https:\/\/.+/.test(it))
      );
      this.sourcesSuggestion = hasListWithHttps ? '' : 'Si hay “Fuentes:”, exige lista de enlaces https con nombres claros.';
    }

    const hasOrdered = this.content.controls.some((g) => g.get('type')?.value === 'list' && g.get('ordered')?.value);
    const hasUnordered = this.content.controls.some((g) => g.get('type')?.value === 'list' && !g.get('ordered')?.value);
    this.listSuggestion = hasOrdered && hasUnordered ? 'Mezcla listas ordenadas/no ordenadas: sugiere separarlas.' : '';
  }

  private getFullText(): string {
    let text = '';
    this.content.controls.forEach((group) => {
      const type = group.get('type')?.value;
      if (type === 'text' || type === 'quote') {
        text += (group.get('text')?.value || group.get('quote')?.value || '') + ' ';
      } else if (type === 'list') {
        const items = group.get('items') as FormArray;
        items.controls.forEach((item) => (text += (item.value || '') + ' '));
      }
    });
    return text.trim();
  }

  private updateTitleWarning() {
    const len = this.noticiaForm.get('title')?.value?.length || 0;
    if ((len < 50 && len > 45) || (len > 60 && len < 65)) {
      this.titleWarning = `Tu título tiene ${len} caracteres. Objetivo 50–60.`;
    } else this.titleWarning = '';
  }

  private updateMetaDescWarning() {
    const len = this.noticiaForm.get('meta.description')?.value?.length || 0;
    if (len < 150 && len > 140) this.metaDescWarning = `La descripción tiene ${len} caracteres. Sube a 150–160.`;
    else if (len > 160 && len < 170) this.metaDescWarning = 'La descripción supera 160 caracteres. Acórtala.';
    else this.metaDescWarning = '';
  }

  private validatePublishAt() {
    if (this.noticiaForm.get('state')?.value !== 'published') return;
    const publishAtRaw = this.noticiaForm.get('publishAt')?.value;
    const publishAt = publishAtRaw ? new Date(publishAtRaw) : null;
    if (!publishAt) {
      this.publishAtError = 'Fecha de publicación requerida para publicar.';
      return;
    }
    const now = new Date();
    const futureLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    this.publishAtError =
      publishAt > futureLimit ? 'Fecha no puede ser más de 24h en el futuro (usa "programada").' : '';
  }

  private updateLocalSeoSuggestion() {
    const city = this.noticiaForm.get('location.city')?.value;
    this.localSeoSuggestion =
      city && !this.getFullText().includes((city || '').toString())
        ? `Sugiere añadir mención a "${city}" en el primer 30% del texto para local SEO.`
        : '';
  }

  private updateTitleRepetition() {
    const title = (this.noticiaForm.get('title')?.value || '').toLowerCase();
    const firstPara =
      this.content.controls.find((g) => g.get('type')?.value === 'text' && g.get('tag')?.value === 'p')?.get('text')
        ?.value?.toLowerCase() || '';
    this.titleRepetitionWarning = title && firstPara.startsWith(title) ? 'La primera frase repite el título.' : '';
  }

  private updateChecklist() {
    this.checklist = {
      title: this.noticiaForm.get('title')?.valid,
      description: this.noticiaForm.get('meta.description')?.valid,
      slug: this.noticiaForm.get('slug')?.valid,
      headers: this.headerCount >= 1 || this.wordCount <= 400,
      links: this.content.controls.every((g) => g.get('type')?.value !== 'link' || g.valid),
      publishAt: !this.publishAtError,
      noUtm: true,
      sources: !this.sourcesSuggestion,
    };
  }

  private updatePublishTooltip() {
    if (this.noticiaForm.get('state')?.value !== 'published') {
      this.publishTooltip = '';
      return;
    }
    const fails = [];
    if (!this.checklist.title) fails.push('Título 50-60 chars');
    if (!this.checklist.description) fails.push('Description 150-160 chars');
    if (!this.checklist.slug) fails.push('Slug válido/único');
    if (!this.checklist.headers) fails.push('Al menos 1 H2');
    if (!this.checklist.links) fails.push('Enlaces https/descriptivos');
    if (!this.checklist.publishAt) fails.push('publishAt correcto');
    if (!this.checklist.sources) fails.push('Fuentes claras');
    this.publishTooltip = fails.length ? 'Pendientes: ' + fails.join(', ') : '';
  }

  onSubmit() {
    this.isSubmitting = true;
    this.markAllTouched();
    this.showChecklist = true;

    if (
      this.noticiaForm.invalid ||
      (this.noticiaForm.get('state')?.value === 'published' && Object.values(this.checklist).some((v) => !v))
    ) {
      alert('Por favor, completa los campos requeridos y pasa el checklist SEO.');
      this.isSubmitting = false;
      return;
    }

    const data = this.prepareSubmitData();
    this.noticiasService.updateNoticia(this.id, data as any).subscribe({
      next: (res: Noticia) => {
        console.log('Noticia actualizada:', res);
        alert('Noticia actualizada exitosamente.');
        this.isSubmitting = false;
      },
      error: (err: any) => {
        console.error('Error updating noticia:', err);
        alert('Error al actualizar la noticia: ' + (err.message || 'Unknown error'));
        this.isSubmitting = false;
      },
    });
  }

  onDelete() {
    if (!confirm('¿Estás seguro de que quieres eliminar esta noticia? Esta acción no se puede deshacer.')) return;
    this.isSubmitting = true;
    this.noticiasService.deleteNoticia(this.id).subscribe({
      next: () => {
        console.log('Noticia eliminada:', this.id);
        alert('Noticia eliminada exitosamente.');
        this.isSubmitting = false;
        this.router.navigate(['/noticias']);
      },
      error: (err: any) => {
        console.error('Error deleting noticia:', err);
        alert('Error al eliminar la noticia: ' + (err.message || 'Unknown error'));
        this.isSubmitting = false;
      },
    });
  }

  private markAllTouched() {
    this.noticiaForm.markAllAsTouched();
    this.content.controls.forEach((group, i) => {
      if (group.get('type')?.value === 'list') {
        this.getListItems(i).markAllAsTouched();
      } else {
        Object.values((group as FormGroup).controls).forEach((ctrl) => (ctrl as any).markAsTouched?.());
      }
    });
    this.tags.markAllAsTouched();
  }

  private prepareSubmitData() {
    const raw = this.noticiaForm.value;
    const categories: string[] = raw.categories;

    // Enviar exactamente lo que backend espera (incluye meta extendido, state, publishAt y bloques, incluido credit)
    const submitData = {
      title: raw.title,
      slug: raw.slug,
      summary: raw.summary || '',
      tags: raw.tags || [],
      categories,
      location: raw.location || { country: '', region: '', city: '' },
      state: raw.state,
      publishAt: raw.publishAt ? new Date(raw.publishAt).toISOString() : null,
      content: raw.content,
      meta: {
        description: raw.meta.description,
        image: raw.meta.image,
        canonical: raw.meta.canonical || `https://yourdomain.com/${raw.slug}`,
        ogTitle: raw.meta.ogTitle || raw.title,
        ogDescription: raw.meta.ogDescription || raw.meta.description,
        imageAltGlobal: raw.meta.imageAltGlobal || '',
        twitterCard: raw.meta.twitterCard || 'summary_large_image',
      },
    };

    console.log('Submit Data (edit):', JSON.stringify(submitData, null, 2));
    return submitData;
  }

  get previewData() {
    return this.previewDataObj;
  }
}
