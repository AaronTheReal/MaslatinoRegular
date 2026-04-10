import { Component, Input, CUSTOM_ELEMENTS_SCHEMA, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Podcast } from '../../../../services/podcastDespliegue-service';

@Component({
  selector: 'app-podcast-pagina-episodios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './podcast-pagina-episodios.html',
  styleUrl: './podcast-pagina-episodios.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PodcastPaginaEpisodios implements OnChanges {

  @Input() podcast: Podcast | null = null;

  constructor() {}

  // Se ejecuta cada vez que cambia el Input 'podcast'
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['podcast'] && this.podcast) {
      console.log('🎙️ Podcast recibido en PodcastPaginaEpisodios:', this.podcast);
      
      // Opcional: ver más detalle (episodios, etc.)
      console.log('📌 Título del podcast:', this.podcast.title);
      console.log('📌 Cantidad de episodios:', this.podcast.episodes?.length || 0);
      console.log('📌 Episodios:', this.podcast.episodes);
    }
  }

}