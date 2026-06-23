import {
  Component,
  signal,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  OnInit,
  HostListener,
  computed,
  PLATFORM_ID,
  inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { PodcastService, Podcast, Episode } from '../../../../services/podcastDespliegue-service';
import { AudioPlayerService, AudioPlayerTrack } from '../../../../services/audio-player.service';
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

  loading = signal<boolean>(true);
  error = signal<string>('');
  selectedPodcast = signal<Podcast | null>(null);
  selectedEpisode = signal<Episode | null>(null);
  modalVisible = signal<boolean>(true);
  resumeTime = signal<number>(0);
  showModeMenu = signal<boolean>(false);

  currentPlaybackId = signal<string>('');
  currentPlaybackToken = signal<string | null>(null);
  showMuxPlayer = signal<boolean>(true);
  playerKey = signal<number>(0);

  private preferredMode = signal<'video' | 'audio'>('video');

  currentMode = computed(() => {
    const episode = this.selectedEpisode();
    const pref = this.preferredMode();

    if (episode?.kind === 'audio') return 'audio';
    if (pref === 'video' && episode?.kind === 'video') return 'video';
    return pref;
  });

  canPlayVideo = computed(() => this.selectedEpisode()?.kind === 'video');

  private readonly platformId = inject(PLATFORM_ID);

  constructor(
    private api: PodcastService,
    private audioPlayer: AudioPlayerService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // @mux/mux-player es browser-only; importar dinámicamente para no crashear SSR
    if (isPlatformBrowser(this.platformId)) {
      import('@mux/mux-player');
    }
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.fetchPodcastById(id);
  }

  private fetchPodcastById(id: string): void {
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

  private buildQueue(podcast: Podcast): AudioPlayerTrack[] {
    return (podcast.episodes ?? [])
      .map((ep) => {
        const playbackIds = ep.mux?.playbackIds || [];
        const publicPlayback = playbackIds.find(p => p.policy === 'public') || playbackIds[0];

        if (!publicPlayback?.id) return null;

        return {
          episodeId: ep._id,
          playbackId: publicPlayback.id,
          playbackToken: null,
          title: ep.title,
          podcastTitle: podcast.title,
          image: ep.image ?? podcast.coverImage2 ?? podcast.coverImage ?? null,
          resumeTime: ep.progress && ep.duration ? (ep.progress / 100) * ep.duration : 0
        } as AudioPlayerTrack;
      })
      .filter(Boolean) as AudioPlayerTrack[];
  }

  playEpisode(episode: Episode): void {
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

  private forceRemount(): void {
    this.showMuxPlayer.set(false);
    setTimeout(() => {
      this.showMuxPlayer.set(true);
      this.playerKey.update(k => k + 1);
    }, 50);
  }

  selectMode(mode: 'video' | 'audio'): void {
    this.showModeMenu.set(false);
    if (mode === 'video' && !this.canPlayVideo()) return;

    this.preferredMode.set(mode);
    this.forceRemount();
  }

  openAudioPlayer(): void {
    if (this.currentMode() !== 'audio') return;

    const podcast = this.selectedPodcast();
    const currentEpisode = this.selectedEpisode();

    if (!podcast || !currentEpisode) return;

    const queue = this.buildQueue(podcast);

    if (queue.length > 0) {
      const startIndex = Math.max(
        0,
        queue.findIndex(track => track.episodeId === currentEpisode._id)
      );

      this.audioPlayer.openQueue(queue, startIndex >= 0 ? startIndex : 0);
      return;
    }

    if (!this.currentPlaybackId()) return;

    this.audioPlayer.open({
      playbackId: this.currentPlaybackId(),
      playbackToken: this.currentPlaybackToken(),
      title: currentEpisode.title || '',
      podcastTitle: podcast.title || '',
      image: currentEpisode.image || podcast.coverImage2 || podcast.coverImage || null,
      resumeTime: this.resumeTime()
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.goBack();
    }
  }

  goBack(): void {
    this.router.navigate(['/podcast-show']);
  }

  toggleModeMenu(event: Event): void {
    event.stopPropagation();
    this.showModeMenu.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.showModeMenu.set(false);
  }
}