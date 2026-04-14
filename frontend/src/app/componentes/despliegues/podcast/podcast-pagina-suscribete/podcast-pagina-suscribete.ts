import { Component } from '@angular/core';
import { CorreoService } from '../../../../services/correo-service'; // ← ajusta la ruta según tu estructura

@Component({
  selector: 'app-podcast-pagina-suscribete',
  imports: [],
  templateUrl: './podcast-pagina-suscribete.html',
  styleUrl: './podcast-pagina-suscribete.css',
  standalone:true
})
export class PodcastPaginaSuscribete {

  constructor(private correoService: CorreoService) {}

  // ─────────────────────────────
  // Función para suscribirse
  // ─────────────────────────────
  suscribirse(email: string) {
    if (!email) return;

    this.correoService.suscribir(email).subscribe({
      next: (res) => {
        alert('¡Suscripción exitosa! Gracias por unirte al boletín.');
        // Aquí puedes limpiar el input si lo manejas desde el HTML
      },
      error: (err) => {
        if (err.status === 409) {
          alert('Este correo ya está suscrito.');
        } else {
          alert('Hubo un error al suscribirse. Inténtalo de nuevo.');
        }
      }
    });
  }

}