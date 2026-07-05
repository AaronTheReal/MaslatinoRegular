import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CdnImagePipe } from '../../../pipes/cdn-image.pipe';

@Component({
  selector: 'app-conectar-raices',
  standalone: true,
  imports: [CommonModule, RouterModule, CdnImagePipe],
  templateUrl: './conectar-raices.html',
  styleUrls: ['./conectar-raices.css']
})
export class ConectarRaices {

  // Esta función la puedes conectar al CTA.
  // Ejemplos:
  // - Abrir modal de QR
  // - Redirigir a /descargar-app
  // - window.open(App Store / Play Store)
  onDescargarApp(): void {

    // ejemplo mínimo:
    // this.router.navigate(['/descargar-app']);
    // ó window.open('https://play.google.com/lo-que-sea', '_blank');
  }

}
