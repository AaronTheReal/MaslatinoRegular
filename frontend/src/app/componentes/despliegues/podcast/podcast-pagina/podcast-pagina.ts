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
  inject,
  Renderer2
} from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
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
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);

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
    const slug = this.route.snapshot.paramMap.get('slug');
    if (id) {
      this.fetchPodcastById(id);
    } else if (slug) {
      this.fetchPodcastBySlug(slug);
    }
  }

  // URL bonita: /podcasts/<slug-del-titulo>. Resuelve el slug contra la lista
  // de podcasts (slugify(title) === slug) y carga por id. Si el "slug" es un
  // ObjectId de Mongo, se trata como id directo.
  private fetchPodcastBySlug(slug: string): void {
    if (/^[0-9a-f]{24}$/i.test(slug)) {
      this.fetchPodcastById(slug);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.api.getPodcasts().subscribe({
      next: (items: Podcast[]) => {
        const match = (items || []).find(p => this.slugify(p.title || '') === slug);
        if (match?._id) {
          this.fetchPodcastById(match._id);
        } else {
          this.error.set('Podcast no encontrado.');
          this.selectedPodcast.set(null);
          this.applySeoNotFound();
          this.loading.set(false);
        }
      },
      error: () => {
        this.error.set('Error al cargar el podcast.');
        this.applySeoNotFound();
        this.loading.set(false);
      }
    });
  }

  private slugify(text: string): string {
    return (text || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quita acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private fetchPodcastById(id: string): void {
    this.loading.set(true);
    this.error.set('');

    this.api.getPodcastById(id).subscribe({
      next: (podcast: Podcast) => {
        this.selectedPodcast.set(podcast);

        if (podcast?._id) {
          this.applySeo(podcast, id);
        } else {
          this.applySeoNotFound();
        }

        if (podcast.episodes?.length > 0) {
          this.playEpisode(podcast.episodes[0]);
        }
      },
      error: (e) => {
        this.error.set(e?.message ?? 'Error al cargar el podcast.');
        this.selectedPodcast.set(null);
        this.applySeoNotFound();
      },
      complete: () => this.loading.set(false)
    });
  }

  // ── SEO: meta tags (OG/Twitter), canonical y JSON-LD ─────────────────────
  // Corre en SSR y en browser (Meta/Title funcionan en ambos). Los bots de
  // LinkedIn/WhatsApp/Facebook leen el HTML del SSR, por eso la ruta
  // podcast-pagina/:id debe estar en RenderMode.Server.
  private applySeo(podcast: Podcast, id: string): void {
    const title = podcast.title || 'Podcast';
    const description = (podcast.description || 'Escucha este podcast en Mas Latino.')
      .replace(/<[^>]*>/g, '')    // strip HTML
      .slice(0, 300);
    const rawImage = this.ensureAbsoluteHttpsUrl(podcast.coverImage2 || podcast.coverImage || '');
    // LinkedIn rechaza imágenes gigantes (las portadas vienen de ~8000px).
    // Netlify Image CDN la sirve redimensionada a 1200×630 (ideal para previews).
    const image = `https://maslatino.com/.netlify/images?url=${encodeURIComponent(rawImage)}&w=1200&h=630&fit=cover&fm=jpg&q=80`;
    // URL bonita como canónica (compartible); fallback al id si el slug queda vacío
    const slug = this.slugify(title);
    const url = slug
      ? `https://maslatino.com/podcasts/${slug}`
      : `https://maslatino.com/podcast-pagina/${encodeURIComponent(id)}`;

    this.title.setTitle(`${title} | Mas Latino Podcast`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'keywords', content: (podcast.tags?.length ? podcast.tags : podcast.categories)?.join(', ') || 'podcast, Mas Latino' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:image:secure_url', content: image });
    this.meta.updateTag({ property: 'og:image:type', content: 'image/jpeg' });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    // Canonical — en SSR y browser, sin duplicar
    const existingCanonical = this.document.querySelector('link[rel="canonical"]');
    if (existingCanonical) {
      this.renderer.setAttribute(existingCanonical, 'href', url);
    } else {
      const link = this.renderer.createElement('link');
      this.renderer.setAttribute(link, 'rel', 'canonical');
      this.renderer.setAttribute(link, 'href', url);
      this.renderer.appendChild(this.document.head, link);
    }

    // JSON-LD PodcastSeries — attr data-podcast para dedup en navegación cliente
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'PodcastSeries',
      name: title,
      description: description,
      image: [image],
      url: url,
      author: {
        '@type': podcast.authorName ? 'Person' : 'Organization',
        name: podcast.authorName || 'Mas Latino'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Mas Latino',
        logo: { '@type': 'ImageObject', url: 'https://maslatino.com/logo.png' }
      },
      keywords: podcast.tags?.join(', ') || '',
      hasPart: (podcast.episodes ?? []).slice(0, 10).map(ep => ({
        '@type': 'PodcastEpisode',
        name: ep.title || 'Episodio',
        url: url,
        datePublished: ep.releaseDate || ep.createdAt || undefined,
        description: (ep.description || '').replace(/<[^>]*>/g, '').slice(0, 200) || undefined
      }))
    };

    try {
      const existingJsonLd = this.document.querySelector('script[type="application/ld+json"][data-podcast]');
      if (existingJsonLd) {
        this.renderer.setProperty(existingJsonLd, 'textContent', JSON.stringify(schema));
      } else {
        const script = this.renderer.createElement('script');
        this.renderer.setAttribute(script, 'type', 'application/ld+json');
        this.renderer.setAttribute(script, 'data-podcast', 'true');
        this.renderer.setProperty(script, 'textContent', JSON.stringify(schema));
        this.renderer.appendChild(this.document.head, script);
      }
    } catch (e) {
      console.warn('Could not set JSON-LD schema:', e);
    }
  }

  private applySeoNotFound(): void {
    this.title.setTitle('Podcast no encontrado | Mas Latino');
    this.meta.updateTag({ name: 'description', content: 'El podcast solicitado no está disponible.' });
    this.meta.updateTag({ property: 'og:title', content: 'Podcast no encontrado' });
    this.meta.updateTag({ property: 'og:description', content: 'El podcast solicitado no está disponible.' });
    this.meta.updateTag({ property: 'og:image', content: 'https://maslatino.com/assets/og.jpg' });
  }

  private ensureAbsoluteHttpsUrl(url: string): string {
    if (!url || url.trim() === '') return 'https://maslatino.com/assets/og.jpg';
    if (url.startsWith('https://')) return url;
    if (url.startsWith('http://')) return url.replace('http://', 'https://');
    // URL relativa — prepend dominio
    return `https://maslatino.com${url.startsWith('/') ? '' : '/'}${url}`;
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