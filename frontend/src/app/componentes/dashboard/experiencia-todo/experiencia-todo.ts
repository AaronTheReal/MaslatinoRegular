import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-experiencia-todo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './experiencia-todo.html',
  styleUrls: ['./experiencia-todo.css']
})
export class ExperienciaTodo {

  // Acción botón "PLAY WITH" Facebook
  onPlayFacebook(): void {
    console.log('▶️ Play con Facebook Live / Radio');
    // Aquí puedes hacer:
    // window.open('https://facebook.com/tu-stream', '_blank');
    // o routerLink a tu página interna de player
  }

  // Acción botón "PLAY WITH" YouTube
  onPlayYouTube(): void {
    console.log('▶️ Play con YouTube Live');
    // Ejemplo:
    // window.open('https://youtube.com/@maslatino/live', '_blank');
  }

}
