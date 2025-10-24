import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ValidatorFn, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NoticiasService } from '../../../services/noticias-service';
import { VistaPrevia } from '../../admin/panel-noticias/vista-previa/vista-previa';
import { NgSelectModule } from '@ng-select/ng-select';
import { CategoriaService, CategoriaPayload } from '../../../services/categorias-service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { debounceTime, distinctUntilChanged, switchMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-panel-noticias',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, VistaPrevia, FormsModule, NgSelectModule],
  templateUrl: './panel-noticias.html',
  styleUrls: ['./panel-noticias.css']
})
export class PanelNoticias implements OnInit {
  noticiaForm: FormGroup;
  categoriasDisponibles: CategoriaPayload[] = [];
  previewDataObj: any;
  blockOpenState: boolean[] = [];
  wordCount: number = 0;
  readingTime: number = 0;
  imageCount: number = 0;
  headerCount: number = 0;
  fleschScore: number = 0;
  titleWarning: string = '';
  metaDescWarning: string = '';
  metaImageWarning: string = '';
  publishAtError: string = '';
  paragraphWarnings: string[] = [];
  keywordDensityWarnings: string[] = [];
  keyphraseWarnings: string[] = [];
  headerSuggestion: string = '';
  listSuggestion: string = '';
  quoteWarning: string = '';
  localSeoSuggestion: string = '';
  titleRepetitionWarning: string = '';
  sourcesSuggestion: string = '';
  showChecklist: boolean = false;
  checklist: any = {};
  publishTooltip: string = '';
  isSubmitting: boolean = false;
  canonicalUrl: string = '';

  constructor(
    private fb: FormBuilder,
    private noticiasService: NoticiasService,
    private sanitizer: DomSanitizer,
    private categoriasService: CategoriaService
  ) {
    this.noticiaForm = this.fb.group({
      focusKeyphrase: ['', [Validators.required, Validators.maxLength(50)]],
      title: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(60), this.titleContainsKeyphraseValidator()]],
      slug: ['', {
        validators: [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)],
        asyncValidators: [this.slugUniqueValidator()],
        updateOn: 'blur'
      }],
      summary: ['', [Validators.minLength(150), Validators.maxLength(160)]],
      tags: this.fb.array([]),
      categories: [[], Validators.required],
      location: this.fb.group({
        country: [''],
        region: [''],
        city: ['']
      }),
      meta: this.fb.group({
        description: ['', [Validators.required, Validators.minLength(150), Validators.maxLength(160)]],
        image: ['', [Validators.required, Validators.pattern(/^https:\/\/.*\.(jpg|png|webp)$/i)]],
        canonical: ['', Validators.pattern(/^https?:\/\/.+/)],
        ogTitle: [''],
        ogDescription: [''],
        imageAltGlobal: ['']
      }),
      state: ['draft'],
      publishAt: [null],
      content: this.fb.array([], [this.maxOneH1Validator(), this.contentMinValidator()])
    });

    this.noticiaForm.get('title')?.valueChanges.subscribe(title => {
      if (title) {
        const slug = this.generateSlug(title);
        this.noticiaForm.get('slug')?.setValue(slug, { emitEvent: false });
      }
      this.updateTitleWarning();
      this.updateTitleRepetition();
    });

    this.noticiaForm.get('slug')?.valueChanges.subscribe(slug => {
      this.canonicalUrl = `https://yourdomain.com/${slug}`;
    });

    this.noticiaForm.get('meta.description')?.valueChanges.subscribe(() => this.updateMetaDescWarning());
    this.noticiaForm.get('meta.image')?.valueChanges.subscribe(() => this.metaImageWarning = '');
    this.noticiaForm.get('publishAt')?.valueChanges.subscribe(() => this.validatePublishAt());
    this.noticiaForm.get('location.city')?.valueChanges.subscribe(() => this.updateLocalSeoSuggestion());
    this.noticiaForm.get('state')?.valueChanges.subscribe(state => {
      this.showChecklist = state === 'published';
      this.updatePublishTooltip();
    });
    this.noticiaForm.get('focusKeyphrase')?.valueChanges.subscribe(() => {
      this.noticiaForm.get('title')?.updateValueAndValidity();
      this.updateSoftValidators();
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
    console.log('PanelNoticias inicializado');
  }

  private titleContainsKeyphraseValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const title = control.value?.toLowerCase() || '';
      const focusKeyphrase = control.parent?.get('focusKeyphrase')?.value?.toLowerCase() || '';
      if (focusKeyphrase && title && !title.includes(focusKeyphrase)) {
        return { titleContainsKeyphrase: true };
      }
      return null;
    };
  }

  private generateSlug(title: string): string {
    const normalized = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
    return normalized;
  }

  private maxOneH1Validator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const content = control as FormArray;
      const h1Count = content.controls.filter(group => group.get('tag')?.value === 'h1').length;
      return h1Count > 0 ? { multipleH1: true } : null;
    };
  }

  private contentMinValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
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
        map(noticia => noticia ? { slugUnique: true } : null),
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
            return { ...base, html: this.sanitizer.bypassSecurityTrustHtml(marked.parse(block.text || '') as string) };
          case 'list':
            return { ...base, itemsHtml: block.items.map((item: string) => this.sanitizer.bypassSecurityTrustHtml(marked.parse(item) as string)) };
          case 'quote':
            const quoteHtml = marked.parse(`> ${block.quote || ''}`) as string;
            return { ...base, html: this.sanitizer.bypassSecurityTrustHtml(quoteHtml), style: { ...base.style, textAlign: 'center' } };
          case 'image':
            const captionHtml = block.caption ? marked.parse(block.caption) as string : '';
            return { ...base, captionHtml: this.sanitizer.bypassSecurityTrustHtml(captionHtml) };
          case 'credit':
            return { ...base, html: this.sanitizer.bypassSecurityTrustHtml(marked.parse(block.creditText || '') as string) };
          default:
            return base;
        }
      }),
      meta: {
        ...meta,
        ogTitle: meta.ogTitle || raw.title,
        ogDescription: meta.ogDescription || meta.description,
        canonical: meta.canonical || `https://yourdomain.com/${raw.slug}`
      }
    };
  }

  get content(): FormArray {
    return this.noticiaForm.get('content') as FormArray;
  }

  get tags(): FormArray {
    return this.noticiaForm.get('tags') as FormArray;
  }

  addTag() {
    this.tags.push(this.fb.control('', Validators.required));
  }

  removeTag(index: number) {
    this.tags.removeAt(index);
  }

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
            fontFamily: ['']
          })
        });
      case 'image':
        return this.fb.group({
          type: ['image'],
          url: ['', [Validators.required, Validators.pattern(/^https:\/\/.*\.(jpg|png|webp)$/i)]],
          alt: ['', [Validators.required, Validators.minLength(8)]],
          caption: ['']
        });
      case 'list':
        return this.fb.group({
          type: ['list'],
          ordered: [false],
          items: this.fb.array([this.fb.control('', Validators.required)])
        });
      case 'quote':
        return this.fb.group({
          type: ['quote'],
          quote: ['', Validators.required],
          authorQuote: [''],
          style: this.fb.group({
            fontFamily: ['Arial, sans-serif'],
            fontStyle: ['italic'],
            textAlign: ['center']
          })
        });
      case 'link':
        return this.fb.group({
          type: ['link'],
          href: ['', [Validators.required, Validators.pattern(/^https:\/\/.+/) ]],
          textLink: ['', [Validators.required, this.noGenericAnchorValidator()]]
        });
      case 'credit':
        return this.fb.group({
          type: ['credit'],
          creditText: ['', Validators.required]
        });
      default:
        return this.fb.group({ type: [type], data: [''] });
    }
  }

  private noGenericAnchorValidator(): ValidatorFn {
    const generics = ['clic aquí', 'aquí', 'leer más', 'click here', 'here', 'read more'];
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value?.toLowerCase();
      return generics.some(g => value.includes(g)) ? { genericAnchor: true } : null;
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
    if (items.length < 7) {
      items.push(this.fb.control('', Validators.required));
    }
  }

  removeListItem(blockIndex: number, itemIndex: number) {
    const items = this.getListItems(blockIndex);
    if (items.length > 1) items.removeAt(itemIndex);
  }

  cleanUtm(blockIndex: number) {
    const hrefCtrl = this.getBlock(blockIndex).get('href');
    if (!hrefCtrl) return;
    let url = hrefCtrl.value;
    if (url) {
      try {
        const urlObj = new URL(url);
        urlObj.searchParams.delete('utm_source');
        urlObj.searchParams.delete('utm_medium');
        urlObj.searchParams.delete('utm_campaign');
        urlObj.searchParams.delete('utm_term');
        urlObj.searchParams.delete('utm_content');
        hrefCtrl.setValue(urlObj.toString());
      } catch {}
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain');
    document.execCommand('insertText', false, text);
  }

  onMetaImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const ratio = width / height;
    if (width < 1200 || height < 630 || Math.abs(ratio - 1.91) > 0.1) {
      this.metaImageWarning = 'Imagen recomendada: ≥1200x630, ratio ~1.91:1. Actual: ' + width + 'x' + height;
    }
  }

  loadCategories() {
    this.categoriasService.obtenerCategorias().subscribe(categories => {
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

    this.content.controls.forEach(group => {
      const type = group.get('type')?.value;
      if (type === 'text') {
        const text = group.get('text')?.value || '';
        const tag = group.get('tag')?.value;
        const words = text.trim().split(/\s+/).length;
        totalWords += words;
        if (tag === 'p') {
          paras.push(text);
        } else if (['h2', 'h3'].includes(tag)) {
          this.headerCount++;
        }
        syllables += text.match(/[aeiouáéíóúü]/gi)?.length || 0;
        sentences += text.match(/[.!?]/g)?.length || 1;
      } else if (type === 'image') {
        if (group.get('alt')?.value) this.imageCount++;
      } else if (type === 'list') {
        const items = group.get('items') as FormArray;
        items.controls.forEach(item => {
          const text = item.value || '';
          totalWords += text.trim().split(/\s+/).length;
          syllables += text.match(/[aeiouáéíóúü]/gi)?.length || 0;
          sentences += text.match(/[.!?]/g)?.length || 1;
        });
      } else if (type === 'quote') {
        const quote = group.get('quote')?.value || '';
        totalWords += quote.trim().split(/\s+/).length;
        syllables += quote.match(/[aeiouáéíóúü]/gi)?.length || 0;
        sentences += quote.match(/[.!?]/g)?.length || 1;
        if (quote.length > 280) this.quoteWarning = 'Si >280 chars, considera convertir en párrafo + atribución.';
        else this.quoteWarning = '';
      }
    });

    this.wordCount = totalWords;
    this.readingTime = Math.ceil(totalWords / 200);
    this.fleschScore = Math.round(206.835 - 1.015 * (totalWords / sentences) - 84.6 * (syllables / totalWords));

    this.paragraphWarnings = [];
    let shortParaStreak = 0;
    paras.forEach((p, i) => {
      const words = p.trim().split(/\s+/).length;
      if (words > 120) {
        this.paragraphWarnings.push(`Párrafo ${i+1} tiene ${words} palabras. Divide en 2–3 para mejorar lectura.`);
      }
      if (words < 20) {
        shortParaStreak++;
        if (shortParaStreak > 3) {
          this.paragraphWarnings.push(`Más de 3 párrafos cortos seguidos. Considera unir algunos.`);
        }
      } else {
        shortParaStreak = 0;
      }
    });
    const avgParaWords = paras.length ? totalWords / paras.length : 0;
    if (avgParaWords < 40 || avgParaWords > 80) {
      this.paragraphWarnings.push(`Media de palabras por párrafo: ${Math.round(avgParaWords)}. Objetivo 40-80.`);
    }

    if (this.wordCount > 400 && this.headerCount < 1) {
      this.headerSuggestion = 'Artículo >400 palabras: requiere al menos un H2.';
    } else if (this.headerCount > 0 && this.content.controls.some(g => g.get('type')?.value === 'list' && (g.get('items') as FormArray).length > 5)) {
      this.headerSuggestion = 'Listas largas: sugiere H3 bajo un H2.';
    } else {
      this.headerSuggestion = '';
    }

    this.content.updateValueAndValidity();
  }

  private updateSoftValidators() {
    this.keywordDensityWarnings = [];
    this.keyphraseWarnings = [];
    if (this.wordCount > 0) {
      this.tags.controls.forEach(tagCtrl => {
        const tag = tagCtrl.value?.toLowerCase();
        if (tag) {
          const count = this.getFullText().toLowerCase().split(tag).length - 1;
          const density = (count / this.wordCount) * 100;
          if (density > 3) {
            this.keywordDensityWarnings.push(`Tag "${tag}" aparece al ${density.toFixed(1)}% - posible sobre-optimización.`);
          }
        }
      });

      const keyphrase = this.noticiaForm.get('focusKeyphrase')?.value?.toLowerCase();
      if (keyphrase) {
        const metaDesc = this.noticiaForm.get('meta.description')?.value?.toLowerCase() || '';
        const firstPara = this.content.controls.find(g => g.get('type')?.value === 'text' && g.get('tag')?.value === 'p')?.get('text')?.value?.toLowerCase() || '';
        const fullText = this.getFullText().toLowerCase();
        const count = fullText.split(keyphrase).length - 1;
        const density = this.wordCount > 0 ? (count / this.wordCount) * 100 : 0;

        if (!metaDesc.includes(keyphrase)) {
          this.keyphraseWarnings.push(`La palabra clave "${keyphrase}" no está en la meta descripción.`);
        }
        if (!firstPara.includes(keyphrase)) {
          this.keyphraseWarnings.push(`Sugiere incluir "${keyphrase}" en el primer párrafo para mejor SEO.`);
        }
        if (density > 2) {
          this.keyphraseWarnings.push(`La palabra clave "${keyphrase}" aparece al ${density.toFixed(1)}% - posible sobreoptimización (máx. 2%).`);
        }
        if (density < 0.5 && count > 0) {
          this.keyphraseWarnings.push(`La palabra clave "${keyphrase}" aparece al ${density.toFixed(1)}% - sugiere aumentar su uso (mín. 0.5%).`);
        }
      }
    }

    this.updateTitleRepetition();

    const fullText = this.getFullText().toLowerCase();
    if (fullText.includes('fuentes:') || fullText.includes('sources:')) {
      if (!this.content.controls.some(g => g.get('type')?.value === 'list' && g.get('items')?.value.some((item: string) => item.match(/^https:\/\/.+/)))) {
        this.sourcesSuggestion = 'Si hay “Fuentes:”, exige lista de enlaces https con nombres claros (sin naked-URLs).';
      } else {
        this.sourcesSuggestion = '';
      }
    }

    this.listSuggestion = '';
    const hasOrdered = this.content.controls.some(g => g.get('type')?.value === 'list' && g.get('ordered')?.value);
    const hasUnordered = this.content.controls.some(g => g.get('type')?.value === 'list' && !g.get('ordered')?.value);
    if (hasOrdered && hasUnordered) {
      this.listSuggestion = 'Mezcla listas ordenadas/no ordenadas: sugiere separarlas.';
    }
  }

  private getFullText(): string {
    let text = '';
    this.content.controls.forEach(group => {
      const type = group.get('type')?.value;
      if (type === 'text' || type === 'quote') {
        text += (group.get('text')?.value || group.get('quote')?.value || '') + ' ';
      } else if (type === 'list') {
        const items = group.get('items') as FormArray;
        items.controls.forEach(item => text += item.value + ' ');
      }
    });
    return text.trim();
  }

  private updateTitleWarning() {
    const len = this.noticiaForm.get('title')?.value?.length || 0;
    if (len < 50 && len > 45) this.titleWarning = 'Tu título tiene ' + len + ' caracteres. Para aparecer completo en Google, apunta a 50–60.';
    else if (len > 60 && len < 65) this.titleWarning = 'Tu título tiene ' + len + ' caracteres. Para aparecer completo en Google, apunta a 50–60.';
    else this.titleWarning = '';
  }

  private updateMetaDescWarning() {
    const len = this.noticiaForm.get('meta.description')?.value?.length || 0;
    if (len < 150 && len > 140) this.metaDescWarning = 'La descripción tiene ' + len + ' caracteres. Acórtala para evitar cortes en los resultados.';
    else if (len > 160 && len < 170) this.metaDescWarning = 'La descripción supera 160 caracteres. Acórtala para evitar cortes en los resultados.';
    else this.metaDescWarning = '';
  }

  private validatePublishAt() {
    if (this.noticiaForm.get('state')?.value !== 'published') return;
    const publishAt = new Date(this.noticiaForm.get('publishAt')?.value);
    if (!publishAt) {
      this.publishAtError = 'Fecha de publicación requerida para publicar.';
      return;
    }
    const now = new Date();
    const futureLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (publishAt > futureLimit) {
      this.publishAtError = 'Fecha no puede ser más de 24h en el futuro (usa "programada" si aplica).';
    } else {
      this.publishAtError = '';
    }
  }

  private updateLocalSeoSuggestion() {
    const city = this.noticiaForm.get('location.city')?.value;
    if (city && !this.getFullText().includes(city)) {
      this.localSeoSuggestion = `Sugiere añadir mención a "${city}" en el primer 30% del texto para local SEO.`;
    } else {
      this.localSeoSuggestion = '';
    }
  }

  private updateTitleRepetition() {
    const title = this.noticiaForm.get('title')?.value?.toLowerCase();
    const firstPara = this.content.controls.find(g => g.get('type')?.value === 'text' && g.get('tag')?.value === 'p')?.get('text')?.value?.toLowerCase() || '';
    if (title && firstPara.startsWith(title)) {
      this.titleRepetitionWarning = 'La primera frase repite el título - resta CTR, varíala.';
    } else {
      this.titleRepetitionWarning = '';
    }
  }

  private updateChecklist() {
    this.checklist = {
      title: this.noticiaForm.get('title')?.valid,
      description: this.noticiaForm.get('meta.description')?.valid,
      slug: this.noticiaForm.get('slug')?.valid,
      headers: this.headerCount >= 1 || this.wordCount <= 400,
      links: this.content.controls.every(g => g.get('type')?.value !== 'link' || g.valid),
      publishAt: !this.publishAtError,
      noUtm: true,
      sources: !this.sourcesSuggestion,
      focusKeyphrase: this.noticiaForm.get('focusKeyphrase')?.valid && this.noticiaForm.get('title')?.valid
    };
  }

  private updatePublishTooltip() {
    if (this.noticiaForm.get('state')?.value !== 'published') {
      this.publishTooltip = '';
      return;
    }
    const fails = [];
    if (!this.checklist.title) fails.push('Título 50-60 chars y debe incluir la palabra clave');
    if (!this.checklist.description) fails.push('Description 150-160 chars');
    if (!this.checklist.slug) fails.push('Slug válido/único');
    if (!this.checklist.headers) fails.push('Al menos 1 H2');
    if (!this.checklist.links) fails.push('Enlaces https/descriptivos');
    if (!this.checklist.publishAt) fails.push('publishAt correcto');
    if (!this.checklist.noUtm) fails.push('Sin UTM innecesarias');
    if (!this.checklist.sources) fails.push('Fuentes claras');
    if (!this.checklist.focusKeyphrase) fails.push('Palabra clave optimizada y en título');
    this.publishTooltip = fails.length ? 'Pendientes: ' + fails.join(', ') : '';
  }

  onSubmit() {
    this.isSubmitting = true;
    this.markAllTouched();
    this.showChecklist = true;
    if (this.noticiaForm.invalid || (this.noticiaForm.get('state')?.value === 'published' && Object.values(this.checklist).some(v => !v))) {
      const errors = [];
      if (this.noticiaForm.get('focusKeyphrase')?.invalid) errors.push('Palabra clave principal es obligatoria y debe cumplir con las validaciones.');
      if (this.noticiaForm.get('title')?.invalid) {
        if (this.noticiaForm.get('title')?.errors?.['required']) errors.push('Título es obligatorio.');
        if (this.noticiaForm.get('title')?.errors?.['minlength']) errors.push('Título debe tener mínimo 50 caracteres.');
        if (this.noticiaForm.get('title')?.errors?.['maxlength']) errors.push('Título debe tener máximo 60 caracteres.');
        if (this.noticiaForm.get('title')?.errors?.['titleContainsKeyphrase']) errors.push('El título debe incluir la palabra clave principal.');
      }
      if (this.noticiaForm.get('slug')?.invalid) errors.push('Slug es obligatorio y debe ser único.');
      if (this.noticiaForm.get('meta.description')?.invalid) errors.push('Meta descripción es obligatoria (150-160 caracteres).');
      if (this.noticiaForm.get('meta.image')?.invalid) errors.push('Imagen destacada es obligatoria.');
      if (this.noticiaForm.get('categories')?.invalid) errors.push('Al menos una categoría es obligatoria.');
      if (this.noticiaForm.get('state')?.value === 'published' && Object.values(this.checklist).some(v => !v)) {
        errors.push('Pasa todas las validaciones del checklist SEO.');
      }
      alert('Por favor, corrige los siguientes errores:\n- ' + errors.join('\n- '));
      this.isSubmitting = false;
      return;
    }
    const data = this.prepareSubmitData();
    this.noticiasService.createNoticia(data).subscribe({
      next: res => {
        console.log('Noticia creada:', res);
        this.resetForm();
        alert('Noticia creada exitosamente.');
        this.isSubmitting = false;
      },
      error: err => {
        console.error('Error creating noticia:', err);
        alert('Error al crear la noticia: ' + err.message);
        this.isSubmitting = false;
      }
    });
  }

  private markAllTouched() {
    this.noticiaForm.markAllAsTouched();
    this.content.controls.forEach((group, i) => {
      if (group.get('type')?.value === 'list') {
        this.getListItems(i).markAllAsTouched();
      } else {
        Object.values((group as FormGroup).controls).forEach(ctrl => ctrl.markAsTouched());
      }
    });
    this.tags.markAllAsTouched();
  }

  private resetForm() {
    this.noticiaForm.reset({ state: 'draft', publishAt: null, focusKeyphrase: '' });
    while (this.content.length) this.content.removeAt(0);
    while (this.tags.length) this.tags.removeAt(0);
    this.blockOpenState = [];
    this.wordCount = 0;
    this.readingTime = 0;
    this.imageCount = 0;
    this.headerCount = 0;
    this.fleschScore = 0;
    this.titleWarning = '';
    this.metaDescWarning = '';
    this.metaImageWarning = '';
    this.publishAtError = '';
    this.paragraphWarnings = [];
    this.keywordDensityWarnings = [];
    this.keyphraseWarnings = [];
    this.headerSuggestion = '';
    this.listSuggestion = '';
    this.quoteWarning = '';
    this.localSeoSuggestion = '';
    this.titleRepetitionWarning = '';
    this.sourcesSuggestion = '';
    this.showChecklist = false;
    this.checklist = {};
    this.publishTooltip = '';
    this.canonicalUrl = '';
  }

  private prepareSubmitData() {
    const raw = this.noticiaForm.value;
    const categories: string[] = raw.categories;
    const authorId = 'a94f23c8bd7e4ad1f6c30ae5';
    const submitData = {
      ...raw,
      categories,
      author: authorId,
      meta: {
        ...raw.meta,
        ogTitle: raw.meta.ogTitle || raw.title,
        ogDescription: raw.meta.ogDescription || raw.meta.description,
        canonical: raw.meta.canonical || `https://yourdomain.com/${raw.slug}`,
        twitterCard: 'summary_large_image'
      }
    };
    console.log('Submit Data:', JSON.stringify(submitData, null, 2));
    return submitData;
  }

  get previewData() {
    return this.previewDataObj;
  }
}