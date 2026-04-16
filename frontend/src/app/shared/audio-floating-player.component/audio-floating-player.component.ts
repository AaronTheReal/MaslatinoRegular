import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, HostListener, inject } from '@angular/core';
import { AudioPlayerService } from './../../services/audio-player.service'; // ajusta la ruta si hace falta
import '@mux/mux-player';

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

  closePlayer(): void {
    this.audioPlayer.close();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.audioPlayer.isOpen()) {
      this.closePlayer();
    }
  }
}