import { Component, signal, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, OnInit, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { PodcastService, Podcast, Episode } from '../../../../services/podcastDespliegue-service';
import '@mux/mux-player';
import { PodcastPaginaEpisodios } from '../podcast-pagina-episodios/podcast-pagina-episodios';
import { PodcastPaginaEscucharaqui } from '../podcast-pagina-escucharaqui/podcast-pagina-escucharaqui';
import { PodcastPaginaSuscribete } from '../podcast-pagina-suscribete/podcast-pagina-suscribete';

@Component({
  selector: 'app-podcast-pagina',
  standalone: true,
  imports: [CommonModule, HttpClientModule, PodcastPaginaEpisodios, PodcastPaginaEscucharaqui, PodcastPaginaSuscribete],
  templateUrl: './podcast-pagina.html',
  styleUrl: './podcast-pagina.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PodcastPagina implements OnInit {
  @ViewChild('muxPlayer', { static: false }) muxPlayerRef!: ElementRef<any>;
  audioPlayerOpen = signal<boolean>(false);
  loading = signal<boolean>(true);
  error = signal<string>('');
  selectedPodcast = signal<Podcast | null>(null);
  selectedEpisode = signal<Episode | null>(null);
  modalVisible = signal<boolean>(true);
  resumeTime = signal<number>(0);
  showModeMenu = signal<boolean>(false);

  // ==================== NUEVAS SEÑALES ====================
  currentPlaybackId = signal<string>('');
  currentPlaybackToken = signal<string | null>(null);
  showMuxPlayer = signal<boolean>(true);        // ← Para forzar remount completo
  playerKey = signal<number>(0);                // ← Ayuda extra al remount

  private preferredMode = signal<'video' | 'audio'>('video');

  currentMode = computed(() => {
    const episode = this.selectedEpisode();
    const pref = this.preferredMode();

    if (episode?.kind === 'audio') return 'audio';
    if (pref === 'video' && episode?.kind === 'video') return 'video';
    return pref;
  });

  canPlayVideo = computed(() => this.selectedEpisode()?.kind === 'video');

  constructor(
    private api: PodcastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.fetchPodcastById(id);
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
    this.audioPlayerOpen.set(false);

    if (episode.progress && episode.duration) {
      this.resumeTime.set((episode.progress / 100) * episode.duration);
    } else {
      this.resumeTime.set(0);
    }

    const playbackIds = episode.mux?.playbackIds || [];
    const publicPlayback = playbackIds.find(p => p.policy === 'public');
    const playback = publicPlayback || playbackIds[0];
    const playbackId = playback?.id;

    if (!playbackId) {
      console.error('❌ No playbackId');
      return;
    }

    this.currentPlaybackId.set(playbackId);

    const policy = playback?.policy;

    const applyToken = (token: string | null) => {
      this.currentPlaybackToken.set(token);
      this.forceRemount();
    };

    if (policy === 'signed') {
      this.api.getSignedToken(playbackId).subscribe({
        next: (res) => applyToken(res.token),
        error: () => applyToken(null)
      });
    } else {
      applyToken(null);
    }
  }

  private forceRemount() {
    this.showMuxPlayer.set(false);
    setTimeout(() => {
      this.showMuxPlayer.set(true);
      this.playerKey.update(k => k + 1);
    }, 50);
  }

  selectMode(mode: 'video' | 'audio') {
    this.showModeMenu.set(false);
    if (mode === 'video' && !this.canPlayVideo()) return;

    this.preferredMode.set(mode);
    this.audioPlayerOpen.set(false);
    this.forceRemount();
  }

  openAudioPlayer() {
    if (this.currentMode() !== 'audio') return;
    this.audioPlayerOpen.set(true);
  }

  closeAudioPlayer() {
    this.audioPlayerOpen.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.audioPlayerOpen()) {
      this.closeAudioPlayer();
      return;
    }

    if (event.key === 'Escape') this.goBack();
  }

  goBack() {
    this.router.navigate(['/podcast-show']);
  }

  toggleModeMenu(event: Event) {
    event.stopPropagation();
    this.showModeMenu.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    this.showModeMenu.set(false);
  }
}