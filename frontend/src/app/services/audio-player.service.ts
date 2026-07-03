import { Injectable, computed, signal } from '@angular/core';

export interface AudioPlayerTrack {
  episodeId?: string;
  playbackId: string;
  playbackToken?: string | null;
  title?: string;
  podcastTitle?: string;
  image?: string | null;
  resumeTime?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AudioPlayerService {
  private readonly _isOpen = signal(false);
  private readonly _minimized = signal(false);
  private readonly _queue = signal<AudioPlayerTrack[]>([]);
  private readonly _currentIndex = signal(0);

  private readonly _playbackId = signal('');
  private readonly _playbackToken = signal<string | null>(null);
  private readonly _title = signal('');
  private readonly _podcastTitle = signal('');
  private readonly _image = signal<string | null>(null);
  private readonly _resumeTime = signal(0);

  readonly isOpen = this._isOpen.asReadonly();
  // Minimizado vive aquí (no en el componente) para que otros players
  // (ej. radio) puedan reaccionar y acomodarse
  readonly minimized = this._minimized.asReadonly();
  readonly queue = this._queue.asReadonly();
  readonly currentIndex = this._currentIndex.asReadonly();

  readonly playbackId = this._playbackId.asReadonly();
  readonly playbackToken = this._playbackToken.asReadonly();
  readonly title = this._title.asReadonly();
  readonly podcastTitle = this._podcastTitle.asReadonly();
  readonly image = this._image.asReadonly();
  readonly resumeTime = this._resumeTime.asReadonly();

  readonly currentTrack = computed(() => this._queue()[this._currentIndex()] ?? null);
  readonly hasNext = computed(() => this._currentIndex() < this._queue().length - 1);
  readonly hasPrevious = computed(() => this._currentIndex() > 0);
  readonly nextTrack = computed(() =>
    this.hasNext() ? this._queue()[this._currentIndex() + 1] : null
  );
  readonly previousTrack = computed(() =>
    this.hasPrevious() ? this._queue()[this._currentIndex() - 1] : null
  );

  open(track: AudioPlayerTrack): void {
    this.openQueue([track], 0);
  }

  openQueue(queue: AudioPlayerTrack[], startIndex = 0): void {
    if (!queue.length) {
      this.clear();
      return;
    }

    const safeIndex = Math.max(0, Math.min(startIndex, queue.length - 1));
    this._queue.set(queue);
    this._currentIndex.set(safeIndex);
    this.applyTrack(queue[safeIndex]);
    this._isOpen.set(true);
  }

  next(): void {
    if (!this.hasNext()) return;
    this.playIndex(this._currentIndex() + 1);
  }

  previous(): void {
    if (!this.hasPrevious()) return;
    this.playIndex(this._currentIndex() - 1);
  }

  playIndex(index: number): void {
    const track = this._queue()[index];
    if (!track) return;

    this._currentIndex.set(index);
    this.applyTrack(track);
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
    this._minimized.set(false);
  }

  toggleMinimize(): void {
    this._minimized.update(v => !v);
  }

  toggle(): void {
    this._isOpen.update(value => !value);
  }

  setResumeTime(time: number): void {
    this._resumeTime.set(time);
  }

  updateTrack(partial: Partial<AudioPlayerTrack>): void {
    if (partial.playbackId !== undefined) this._playbackId.set(partial.playbackId);
    if (partial.playbackToken !== undefined) this._playbackToken.set(partial.playbackToken ?? null);
    if (partial.title !== undefined) this._title.set(partial.title);
    if (partial.podcastTitle !== undefined) this._podcastTitle.set(partial.podcastTitle);
    if (partial.image !== undefined) this._image.set(partial.image ?? null);
    if (partial.resumeTime !== undefined) this._resumeTime.set(partial.resumeTime);

    const queue = [...this._queue()];
    const current = queue[this._currentIndex()];
    if (current) {
      queue[this._currentIndex()] = { ...current, ...partial };
      this._queue.set(queue);
    }
  }

  clear(): void {
    this._isOpen.set(false);
    this._minimized.set(false);
    this._queue.set([]);
    this._currentIndex.set(0);
    this._playbackId.set('');
    this._playbackToken.set(null);
    this._title.set('');
    this._podcastTitle.set('');
    this._image.set(null);
    this._resumeTime.set(0);
  }

  private applyTrack(track: AudioPlayerTrack): void {
    this._playbackId.set(track.playbackId);
    this._playbackToken.set(track.playbackToken ?? null);
    this._title.set(track.title ?? '');
    this._podcastTitle.set(track.podcastTitle ?? '');
    this._image.set(track.image ?? null);
    this._resumeTime.set(track.resumeTime ?? 0);
  }
}