import { Injectable, signal } from '@angular/core';

export interface AudioPlayerTrack {
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
  private readonly _playbackId = signal('');
  private readonly _playbackToken = signal<string | null>(null);
  private readonly _title = signal('');
  private readonly _podcastTitle = signal('');
  private readonly _image = signal<string | null>(null);
  private readonly _resumeTime = signal(0);

  readonly isOpen = this._isOpen.asReadonly();
  readonly playbackId = this._playbackId.asReadonly();
  readonly playbackToken = this._playbackToken.asReadonly();
  readonly title = this._title.asReadonly();
  readonly podcastTitle = this._podcastTitle.asReadonly();
  readonly image = this._image.asReadonly();
  readonly resumeTime = this._resumeTime.asReadonly();

  open(track: AudioPlayerTrack): void {
    this._playbackId.set(track.playbackId);
    this._playbackToken.set(track.playbackToken ?? null);
    this._title.set(track.title ?? '');
    this._podcastTitle.set(track.podcastTitle ?? '');
    this._image.set(track.image ?? null);
    this._resumeTime.set(track.resumeTime ?? 0);
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
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
  }

  clear(): void {
    this._isOpen.set(false);
    this._playbackId.set('');
    this._playbackToken.set(null);
    this._title.set('');
    this._podcastTitle.set('');
    this._image.set(null);
    this._resumeTime.set(0);
  }
}