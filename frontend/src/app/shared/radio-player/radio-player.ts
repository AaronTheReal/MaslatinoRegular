import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioPlayerService } from '../../services/radio-player.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-radio-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './radio-player.html',
  styleUrls: ['./radio-player.css']
})
export class RadioPlayerComponent {
  isPlaying$: Observable<boolean>;
  volume$: Observable<number>;

  isMuted = false;
  private lastVolume = 1;

  isHidden = false; // Nuevo para esconder

  constructor(private player: RadioPlayerService) {
    this.isPlaying$ = this.player.isPlaying$;
    this.volume$ = this.player.volume$;
  }

  togglePlay() {
    this.player.toggle();
  }

  toggleMute() {
    if (this.isMuted) {
      const targetVolume = this.lastVolume > 0 ? this.lastVolume : 0.7;
      this.player.setVolume(targetVolume);
      this.isMuted = false;
    } else {
      this.player.setVolume(0);
      this.isMuted = true;
    }
  }

  async share() {
    const url =
      typeof window !== 'undefined'
        ? window.location.origin
        : '';

    const shareData = {
      title: 'MásLatino Radio',
      text: 'Escucha la radio en vivo de MásLatino.',
      url
    };

    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share(shareData);
      } else if (typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(url);
        console.log('URL copiada al portapapeles');
      } else {
        console.log('Compartir no soportado en este navegador');
      }
    } catch (err) {
      console.error('Error al compartir:', err);
    }
  }

  onVolumeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    this.player.setVolume(value);
    this.lastVolume = value;
    this.isMuted = value === 0;

    this.updateSliderVisual(input, value);
  }

  // NUEVO:
  private updateSliderVisual(input: HTMLInputElement, value: number) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 1);
    const percent = ((value - min) / (max - min)) * 100;

    // guardamos el porcentaje en una CSS variable
    input.style.setProperty('--volume-percent', `${percent}%`);
  }

  // Nueva función para esconder/restaurar
  toggleHide() {
    this.isHidden = !this.isHidden;
    if (this.isHidden) {
      this.player.pause(); // Pausa al esconder (opcional, pero útil)
    }
  }
}