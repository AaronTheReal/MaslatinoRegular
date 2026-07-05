import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CdnImagePipe } from '../../../pipes/cdn-image.pipe';

@Component({
  selector: 'app-experiencia-todo',
  standalone: true,
  imports: [CommonModule, RouterModule, CdnImagePipe],
  templateUrl: './experiencia-todo.html',
  styleUrls: ['./experiencia-todo.css']
})
export class ExperienciaTodo {

  // Acción botón "PLAY WITH" Facebook
  onPlayFacebook(): void {
    console.log('▶️ Play con Facebook Live / Radio');

   window.open('https://www.facebook.com/maslatino99.9fm/', '_blank');
    // o routerLink a tu página interna de player
  }

  // Acción botón "PLAY WITH" YouTube
  onPlayYouTube(): void {
    console.log('▶️ Play con YouTube Live');
    // Ejemplo:
    window.open('https://www.youtube.com/@Mas.Latino', '_blank');
  }

}
