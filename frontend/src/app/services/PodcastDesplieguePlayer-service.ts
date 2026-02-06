import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PlayerSource {
  type: 'Episodio';
  id: string;
  playbackId: string; // Para Mux
  title: string;
  image?: string;
  kind: 'video' | 'audio';
  isLive: boolean;
  podcastTitle?: string;
}

export interface PlayerState {
  source: PlayerSource | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number; // 0-100
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private _state$ = new BehaviorSubject<PlayerState>({
    source: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    volume: 100,
  });

  readonly state$ = this._state$.asObservable();

  private playerRef: any; // Ref al componente MuxPlayer (seteado desde el componente)

  setPlayerRef(ref: any) {
    this.playerRef = ref;
    if (ref) {
      ref.addEventListener('timeupdate', () => this._patch({ position: ref.currentTime }));
      ref.addEventListener('durationchange', () => this._patch({ duration: ref.duration }));
      ref.addEventListener('play', () => this._patch({ isPlaying: true }));
      ref.addEventListener('pause', () => this._patch({ isPlaying: false }));
      ref.addEventListener('volumechange', () => this._patch({ volume: ref.volume * 100 }));
    }
  }

  play(source: PlayerSource) {
    this._patch({ source, isPlaying: true });
    if (this.playerRef) {
      this.playerRef.playbackId = source.playbackId;
      this.playerRef.play();
    }
  }

  pause() {
    this._patch({ isPlaying: false });
    if (this.playerRef) this.playerRef.pause();
  }

  toggle() {
    if (this._state$.value.isPlaying) {
      this.pause();
    } else {
      this.play(this._state$.value.source!);
    }
  }

  seek(position: number) {
    this._patch({ position });
    if (this.playerRef) this.playerRef.currentTime = position;
  }

  setVolume(volume: number) {
    const vol = volume / 100;
    this._patch({ volume });
    if (this.playerRef) this.playerRef.volume = vol;
  }

  clear() {
    this._patch({ source: null, isPlaying: false, position: 0 });
    if (this.playerRef) {
      this.playerRef.pause();
      this.playerRef.playbackId = null;
    }
  }

  private _patch(update: Partial<PlayerState>) {
    this._state$.next({ ...this._state$.value, ...update });
  }
}