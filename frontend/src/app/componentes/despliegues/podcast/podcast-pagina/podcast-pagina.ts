import { Component, signal, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { PodcastService, Podcast, Episode } from '../../../../services/podcastDespliegue-service';
import '@mux/mux-player';
import {PodcastPaginaEpisodios} from '../podcast-pagina-episodios/podcast-pagina-episodios'
import { PodcastPaginaEscucharaqui} from '../podcast-pagina-escucharaqui/podcast-pagina-escucharaqui'
import {PodcastPaginaSuscribete} from '../podcast-pagina-suscribete/podcast-pagina-suscribete'
@Component({
  selector: 'app-podcast-pagina',
  standalone: true,
  imports: [CommonModule, HttpClientModule,PodcastPaginaEpisodios,PodcastPaginaEscucharaqui,PodcastPaginaSuscribete],
  templateUrl: './podcast-pagina.html',
  styleUrl: './podcast-pagina.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PodcastPagina implements OnInit {
  @ViewChild('muxPlayer', { static: false }) muxPlayerRef!: ElementRef<any>;

  loading = signal<boolean>(true);
  error = signal<string>('');
  selectedPodcast = signal<Podcast | null>(null);
  selectedEpisode = signal<Episode | null>(null);
  modalVisible = signal<boolean>(true);   // se mantiene por compatibilidad con CSS
  resumeTime = signal<number>(0);
  playbackToken = signal<string | null>(null);

  constructor(
    private api: PodcastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.fetchPodcastById(id);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.goBack();
    }
  }

  private fetchPodcastById(id: string) {
    this.loading.set(true);
    this.error.set('');
    this.api.getPodcastById(id).subscribe({
      next: (podcast: Podcast) => {
        this.selectedPodcast.set(podcast);
        if (podcast.episodes?.length > 0) {
          this.playEpisode(podcast.episodes[0]);
        }
      },
      error: (e) => {
        this.error.set(e?.message ?? 'Error al cargar el podcast.');
        this.selectedPodcast.set(null);
      },
      complete: () => this.loading.set(false)
    });
  }

  playEpisode(episode: Episode) {
    this.selectedEpisode.set(episode);

    if (episode.progress && episode.duration) {
      this.resumeTime.set((episode.progress / 100) * episode.duration);
    } else {
      this.resumeTime.set(0);
    }

    const playbackIds = episode.mux?.playbackIds || [];
    const publicPlayback = playbackIds.find(p => p.policy === 'public');
    const playback = publicPlayback || playbackIds[0];
    const playbackId = playback?.id;
    const policy = playback?.policy;

    if (!playbackId) {
      console.error('❌ No playbackId');
      return;
    }

    const applyToPlayer = (token: string | null) => {
      const el = this.muxPlayerRef?.nativeElement;
      if (!el) return;

      el.pause?.();
      el.playbackId = null;
      delete el.playbackToken;

      setTimeout(() => {
        el.playbackId = playbackId;
        if (token) el.playbackToken = token;
        el.streamType = 'on-demand';

        if (typeof el.load === 'function') el.load();
        el.play?.().catch((e: any) => console.warn('Autoplay bloqueado:', e));
      }, 60);
    };

    if (policy === 'signed') {
      this.api.getSignedToken(playbackId).subscribe({
        next: (res) => applyToPlayer(res.token)
      });
    } else {
      applyToPlayer(null);
    }

    // Listener de progreso
    const el = this.muxPlayerRef?.nativeElement;
    if (el) {
      const updateProgress = () => {
        const current = el.currentTime;
        const dur = el.duration;
        if (dur > 0) {
          episode.progress = Math.round((current / dur) * 100);
          console.log('Progreso actualizado:', episode.progress);
        }
      };
      el.addEventListener('timeupdate', updateProgress);
    }
  }

  goBack() {
    this.router.navigate(['/podcast-show']);
  }
}