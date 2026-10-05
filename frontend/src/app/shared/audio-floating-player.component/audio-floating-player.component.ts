import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  HostListener,
  PLATFORM_ID,
  inject,
  effect,
  untracked,
  signal,
  computed,
} from '@angular/core';
import { AudioPlayerService } from './../../services/audio-player.service';

@Component({
  selector: 'app-audio-floating-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-floating-player.component.html',
  styleUrl: './audio-floating-player.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AudioFloatingPlayerComponent {
  readonly audioPlayer = inject(AudioPlayerService);
  readonly fallbackImage = 'https://via.placeholder.com/220x220';

  // ── Estado para los controles personalizados (reflejan al <mux-player>) ──
  readonly isPlaying = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly volume = signal(1);
  readonly muted = signal(false);

  // Ventana: minimizado / expandido — vive en el servicio para que el
  // radio-player pueda reaccionar y subirse cuando este player esté abierto
  readonly minimized = this.audioPlayer.minimized;

  toggleMinimize(): void {
    this.audioPlayer.toggleMinimize();
  }

  readonly progressPercent = computed(() => {
    const d = this.duration();
    return d > 0 ? Math.min(100, (this.currentTime() / d) * 100) : 0;
  });
  readonly volumePercent = computed(() =>
    this.muted() ? 0 : Math.round(this.volume() * 100)
  );

  // El reproductor se pinta solo cuando @mux/mux-player ya está cargado.
  readonly muxListo = signal(false);

  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    // Este componente vive en todas las páginas (app.html). Antes importaba
    // @mux/mux-player tras el primer render, así que cada visita nueva
    // descargaba ~275 KB comprimidos (1 MB de JavaScript) aunque nadie fuera a
    // escuchar nada. Ahora se pide al abrir el reproductor.
    effect(() => {
      if (this.audioPlayer.isOpen()) untracked(() => this.cargarMux());
    });
  }

  private cargarMux(): void {
    if (this.muxListo() || !isPlatformBrowser(this.platformId)) return;

    // Lo normal es que ya esté cargado: la página del podcast, que es desde
    // donde se abre este reproductor, lo importa al entrar. En ese caso se
    // pinta en el mismo ciclo que antes, sin meter ninguna espera entre el
    // toque y el arranque del audio (el navegador del celular solo deja sonar
    // audio que arranca cerca de un toque).
    if (this.muxYaCargado()) {
      this.muxListo.set(true);
      return;
    }

    this.importarMux().then(() => this.muxListo.set(true));
  }

  protected muxYaCargado(): boolean {
    return !!customElements.get('mux-player');
  }

  protected importarMux(): Promise<unknown> {
    return import('@mux/mux-player');
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.audioPlayer.isOpen()) {
      this.closePlayer();
    }
  }

  // ── Eventos que emite el <mux-player> (solo browser) ──────────────────────
  onTimeUpdate(event: Event): void {
    const el = event.target as any;
    this.currentTime.set(el?.currentTime ?? 0);
    if (el?.duration && !isNaN(el.duration)) this.duration.set(el.duration);
  }

  onLoaded(event: Event): void {
    const el = event.target as any;
    if (el?.duration && !isNaN(el.duration)) this.duration.set(el.duration);
    this.volume.set(el?.volume ?? 1);
    this.muted.set(!!el?.muted);
  }

  onPlay(): void {
    this.isPlaying.set(true);
  }

  onPause(): void {
    this.isPlaying.set(false);
  }

  onVolumeChange(event: Event): void {
    const el = event.target as any;
    this.volume.set(el?.volume ?? 1);
    this.muted.set(!!el?.muted);
  }

  // ── Controles personalizados (manejan al <mux-player>) ────────────────────
  togglePlay(el: any): void {
    if (!el) return;
    if (el.paused) {
      el.play?.();
    } else {
      el.pause?.();
    }
  }

  seek(event: MouseEvent, el: any): void {
    if (!el || !el.duration || isNaN(el.duration)) return;
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    el.currentTime = ratio * el.duration;
    this.currentTime.set(el.currentTime);
  }

  setVolume(event: MouseEvent, el: any): void {
    if (!el) return;
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    el.volume = ratio;
    el.muted = ratio === 0;
    this.volume.set(ratio);
    this.muted.set(ratio === 0);
  }

  toggleMute(el: any): void {
    if (!el) return;
    el.muted = !el.muted;
    this.muted.set(!!el.muted);
  }

  togglePip(el: any): void {
    try {
      if ((document as any).pictureInPictureElement) {
        (document as any).exitPictureInPicture?.();
      } else {
        const media = el?.media ?? el;
        media?.requestPictureInPicture?.();
      }
    } catch {
      /* PiP no disponible para audio en algunos navegadores */
    }
  }

  toggleFullscreen(el: any): void {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else {
        el?.requestFullscreen?.();
      }
    } catch {
      /* fullscreen no disponible */
    }
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / 3600);
    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  closePlayer(): void {
    this.audioPlayer.close();
  }

  nextEpisode(): void {
    this.audioPlayer.next();
  }

  previousEpisode(): void {
    this.audioPlayer.previous();
  }
}
