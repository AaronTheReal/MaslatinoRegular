import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, HostListener, inject, afterNextRender } from '@angular/core';
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

  constructor() {
    // @mux/mux-player es browser-only — importar de forma dinámica para no crashear SSR
    afterNextRender(() => {
      import('@mux/mux-player');
    });
  }



  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.audioPlayer.isOpen()) {
      this.closePlayer();
    }
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