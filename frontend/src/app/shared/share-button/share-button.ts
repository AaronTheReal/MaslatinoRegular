import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

/** Cuánto se queda en pantalla el aviso de «Enlace copiado». */
const COPIED_NOTICE_MS = 2500;

/**
 * Botón de compartir.
 *
 * En móvil abre la hoja de compartir del sistema (`navigator.share`), que es
 * la que deja mandar la nota a WhatsApp, Telegram, Notas o donde sea con un
 * toque. Donde no existe —Firefox de escritorio, webviews raras— quedan los
 * enlaces directos de siempre y el «copiar enlace».
 *
 * Lo que se comparte es la URL canónica de la nota, no `window.location.href`:
 * así no se arrastran parámetros de campaña que romperían la caché de la
 * preview en WhatsApp.
 */
@Component({
  selector: 'app-share-button',
  standalone: true,
  templateUrl: './share-button.html',
  styleUrl: './share-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareButton {
  readonly url = input.required<string>();
  readonly title = input<string>('');
  readonly text = input<string>('');

  /**
   * `compacto` = un botón solo, para ponerlo junto a la firma.
   * `completo` = la barra con todas las redes al pie de la nota.
   */
  readonly variant = input<'compacto' | 'completo'>('completo');

  /**
   * Arranca apagado y se enciende solo después de hidratar. El servidor no
   * tiene `navigator`, y con `provideClientHydration` cambiar el DOM mientras
   * Angular empareja el HTML del servidor rompe la hidratación;
   * `afterNextRender` corre ya en el navegador, cuando tocar la vista es
   * seguro.
   */
  protected readonly nativeSupported = signal(false);
  protected readonly copiado = signal(false);

  protected readonly shareText = computed(() =>
    [this.title(), this.text()].map((v) => (v ?? '').trim()).filter(Boolean).join(' — ')
  );

  protected readonly whatsappUrl = computed(
    () => `https://wa.me/?text=${encodeURIComponent(`${this.title()} ${this.url()}`.trim())}`
  );

  protected readonly facebookUrl = computed(
    () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.url())}`
  );

  protected readonly xUrl = computed(
    () =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        this.title()
      )}&url=${encodeURIComponent(this.url())}`
  );

  private copiadoTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    afterNextRender(() => this.nativeSupported.set(this.canShareNative()));

    inject(DestroyRef).onDestroy(() => {
      if (this.copiadoTimer) clearTimeout(this.copiadoTimer);
    });
  }

  /**
   * `navigator.share` se llama sin ningún `await` por delante: el permiso que
   * da el toque del usuario caduca en cuanto se cede el turno, y el navegador
   * responde `NotAllowedError`.
   */
  compartir(): void {
    if (!this.nativeSupported()) {
      this.copiarEnlace();
      return;
    }

    this.nativeShare({
      title: this.title() || undefined,
      text: this.text() || undefined,
      url: this.url(),
    }).catch((err: unknown) => {
      // AbortError = cerró la hoja de compartir. No pasó nada malo.
      if ((err as DOMException)?.name === 'AbortError') return;
      this.copiarEnlace();
    });
  }

  copiarEnlace(): void {
    this.writeClipboard(this.url())
      .then(() => this.avisarCopiado())
      .catch(() => {
        // Sin portapapeles (contexto no seguro, permiso denegado) quedan los
        // enlaces directos, que son <a href> y funcionan sin JavaScript.
      });
  }

  private avisarCopiado(): void {
    this.copiado.set(true);
    if (this.copiadoTimer) clearTimeout(this.copiadoTimer);
    this.copiadoTimer = setTimeout(() => this.copiado.set(false), COPIED_NOTICE_MS);
  }

  /** Aislados para poder simularlos en las pruebas sin navegador real. */
  protected canShareNative(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }

  protected nativeShare(data: ShareData): Promise<void> {
    return navigator.share(data);
  }

  protected writeClipboard(text: string): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return Promise.reject(new Error('Sin portapapeles disponible'));
    }
    return navigator.clipboard.writeText(text);
  }
}
