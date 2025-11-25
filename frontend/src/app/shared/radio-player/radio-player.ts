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

  constructor(private player: RadioPlayerService) {
    this.isPlaying$ = this.player.isPlaying$;
    this.volume$ = this.player.volume$;
  }

  togglePlay() {
    this.player.toggle();
  }

  onVolumeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    this.player.setVolume(value);
  }
}
