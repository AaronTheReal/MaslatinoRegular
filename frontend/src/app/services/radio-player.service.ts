import { Injectable, NgZone, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RadioPlayerService {
  private audio: HTMLAudioElement | null = null;
  private readonly streamUrl = 'https://stream.radio.co/s9cb5ee0f7/listen';

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  isPlaying$ = new BehaviorSubject<boolean>(false);
  volume$ = new BehaviorSubject<number>(1);

  constructor(private ngZone: NgZone) {
    if (this.isBrowser) {
      this.audio = new Audio();
      this.audio.src = this.streamUrl;
      this.audio.preload = 'none';
      this.audio.crossOrigin = 'anonymous';

      this.audio.addEventListener('playing', () => {
        this.ngZone.run(() => this.isPlaying$.next(true));
      });

      this.audio.addEventListener('pause', () => {
        this.ngZone.run(() => this.isPlaying$.next(false));
      });

      this.audio.addEventListener('volumechange', () => {
        if (!this.audio) return;
        this.ngZone.run(() => this.volume$.next(this.audio!.volume));
      });

      this.audio.addEventListener('error', (e) => {
        console.error('Error de reproducción de radio:', e);
      });
    }
  }

  play() {
    if (!this.isBrowser || !this.audio) return;

    this.audio.play().catch(err => console.error('No se pudo reproducir:', err));
  }

  pause() {
    if (!this.isBrowser || !this.audio) return;
    this.audio.pause();
  }

  toggle() {
    if (!this.isBrowser || !this.audio) return;

    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  setVolume(value: number) {
    if (!this.isBrowser || !this.audio) return;
    this.audio.volume = value;
    this.volume$.next(this.audio.volume);
  }
  
}
