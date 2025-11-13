// src/app/shared/megaphone-player/megaphone-player-global/megaphone-player-global.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MegaphonePlayerComponent } from '../megaphone-player';
import { MegaphonePlayerService } from '../megaphone.service'; // ← tu ruta original
import { NgIf, AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-megaphone-global-player',
  standalone: true,
  imports: [CommonModule, MegaphonePlayerComponent, NgIf, AsyncPipe],
  templateUrl: './megaphone-player-global.html',
  styleUrl: './megaphone-player-global.css',
})
export class MegaphoneGlobalPlayerComponent {

  constructor(public megaphoneService: MegaphonePlayerService) {} // 👈 solo esto

  close() {
    this.megaphoneService.close();
  }
}
