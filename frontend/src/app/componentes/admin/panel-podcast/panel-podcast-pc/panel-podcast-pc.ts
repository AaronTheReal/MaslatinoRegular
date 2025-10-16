
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  PodcastPCService,
  PodcastDesktopPayload,
  EpisodePayload
} from './../../../../services/podcast-servicePC';
import {
  CategoriaService,
  CategoriaPayload
} from '../../../../services/categorias-service';

// Angular Material (los mismos que ya usas)
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-panel-podcast-pc',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatCheckboxModule,
    RouterModule
  ],
  templateUrl: './panel-podcast-pc.html',
  styleUrls: ['./panel-podcast-pc.css']
})



export class PanelPodcastPc implements OnInit {
  selectedTab: string = 'agregar-podcast-pc';

  podcasts: PodcastDesktopPayload[] = [];
  categorias: CategoriaPayload[] = [];

  // Estados
  selectedPodcast: PodcastDesktopPayload | null = null;
  editingPodcast = false;

  showingEpisodeForm = false;
  editingEpisode = false;
  selectedEpisode: EpisodePayload | null = null;

  successMessage: string | null = null;
  errorMessage: string | null = null;

  // === FORMULARIO PODCAST PC ===
  podcastForm = new FormGroup({
    title: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    subtitle: new FormControl<string>(''),
    description: new FormControl<string>(''),
    authorName: new FormControl<string>(''),
    language: new FormControl<string>('es'),
    coverImage: new FormControl<string>(''),
    bannerImage: new FormControl<string>(''),
    order: new FormControl<number>(0),
    featured: new FormControl<boolean>(false),
    categories: new FormControl<string[]>([], { nonNullable: true, validators: [Validators.required] }),
    tags: new FormControl<string>(''),
    relatedLinks: new FormControl<string>(''), // CSV
    layout: new FormControl<'classic' | 'grid' | 'carousel'>('classic'),
    metaDescription: new FormControl<string>(''),
    metaImage: new FormControl<string>(''),
    metaKeywords: new FormControl<string>('') // CSV
  });

  // === FORMULARIO EPISODIO ===
  episodeForm = new FormGroup({
    title: new FormControl<string | null>('', Validators.required),
    description: new FormControl<string | null>(''),
    audioUrl: new FormControl<string | null>('', Validators.required),
    image: new FormControl<string | null>(''),
    duration: new FormControl<number | null>(null),
    releaseDate: new FormControl<string | null>('')
  });

  constructor(
    private podcastServicePC: PodcastPCService,
    private categoriasService: CategoriaService
  ) {}

  ngOnInit(): void {
    this.loadPodcasts();
    this.loadCategories();
  }

  // ====== LOADERS ======
  loadPodcasts(): void {
    this.podcastServicePC.obtenerPodcasts().subscribe({
      next: (podcasts) => {
        this.podcasts = podcasts.map(p => ({
          ...p,
          episodes: p.episodes || []
        }));
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Error al cargar podcasts PC';
      }
    });
  }

  loadCategories(): void {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (categories) => (this.categorias = categories),
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Error al cargar categorías';
      }
    });
  }

  // ====== HELPERS ======
  getCategoryNameById(id: string): string {
    const cat = this.categorias.find(c => c._id === id);
    return cat ? cat.name : id;
  }

  selectTab(tab: string): void {
    this.selectedTab = tab;
    this.resetForms();
  }

  // ====== SUBMIT PODCAST ======
  onSubmitPodcast(): void {
    if (this.podcastForm.invalid) return;

    const payload: PodcastDesktopPayload = {
      title: this.podcastForm.value.title!,
      subtitle: this.podcastForm.value.subtitle || '',
      description: this.podcastForm.value.description || '',
      authorName: this.podcastForm.value.authorName || '',
      language: this.podcastForm.value.language || 'es',
      coverImage: this.podcastForm.value.coverImage || '',
      bannerImage: this.podcastForm.value.bannerImage || '',
      order: this.podcastForm.value.order ?? 0,
      featured: !!this.podcastForm.value.featured,
      categories: this.podcastForm.value.categories || [],
      tags: this.parseCsv(this.podcastForm.value.tags),
      relatedLinks: this.parseCsv(this.podcastForm.value.relatedLinks),
      layout: (this.podcastForm.value.layout as any) || 'classic',
      meta: {
        description: this.podcastForm.value.metaDescription || '',
        image: this.podcastForm.value.metaImage || '',
        keywords: this.parseCsv(this.podcastForm.value.metaKeywords)
      }
    };

    if (this.editingPodcast && this.selectedPodcast?._id) {
      this.podcastServicePC.actualizarPodcast(this.selectedPodcast._id, payload).subscribe({
        next: () => {
          this.successMessage = '✅ Podcast actualizado correctamente';
          this.loadPodcasts();
          this.resetForms();
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = '❌ Error al actualizar el podcast';
        }
      });
    } else {
      this.podcastServicePC.crearPodcast(payload).subscribe({
        next: () => {
          this.successMessage = '🎉 Podcast PC creado correctamente';
          this.loadPodcasts();
          this.resetForms();
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = '❌ Error al crear el podcast PC';
        }
      });
    }
  }

  // ====== PODCAST ACTIONS ======
  editarPodcast(podcast: PodcastDesktopPayload): void {
    this.podcastForm.patchValue({
      title: podcast.title,
      subtitle: podcast.subtitle || '',
      description: podcast.description || '',
      authorName: podcast.authorName || '',
      language: podcast.language || 'es',
      coverImage: podcast.coverImage || '',
      bannerImage: podcast.bannerImage || '',
      order: podcast.order ?? 0,
      featured: !!podcast.featured,
      categories: podcast.categories || [],
      tags: (podcast.tags || []).join(', '),
      relatedLinks: (podcast.relatedLinks || []).join(', '),
      layout: (podcast.layout as any) || 'classic',
      metaDescription: podcast.meta?.description || '',
      metaImage: podcast.meta?.image || '',
      metaKeywords: (podcast.meta?.keywords || []).join(', ')
    });

    this.editingPodcast = true;
    this.selectedPodcast = podcast;
    this.selectedTab = 'agregar-podcast-pc';
  }

  eliminarPodcast(id: string): void {
    this.podcastServicePC.eliminarPodcast(id).subscribe({
      next: () => {
        this.successMessage = '🗑️ Podcast PC eliminado correctamente';
        this.loadPodcasts();
        if (this.selectedPodcast?._id === id) {
          this.selectedPodcast = null;
        }
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = '❌ Error al eliminar el podcast PC';
      }
    });
  }

  // ====== EPISODES ======
  gestionarEpisodios(podcast: PodcastDesktopPayload): void {
    this.selectedPodcast = podcast;
    this.resetEpisodeForm();
  }

  mostrarFormularioEpisodio(): void {
    this.showingEpisodeForm = true;
    this.editingEpisode = false;
    this.selectedEpisode = null;
    this.episodeForm.reset();
  }

  editarEpisodio(episode: EpisodePayload): void {
    this.episodeForm.patchValue({
      ...episode,
      duration: episode.duration ?? null
    });
    this.showingEpisodeForm = true;
    this.editingEpisode = true;
    this.selectedEpisode = episode;
  }

  onSubmitEpisodio(): void {
    if (!this.selectedPodcast || this.episodeForm.invalid) return;

    const episodeData = this.episodeForm.value as EpisodePayload;

    if (this.editingEpisode && this.selectedEpisode && this.selectedEpisode._id) {
      this.podcastServicePC
        .editarEpisodio(this.selectedPodcast._id!, this.selectedEpisode._id!, episodeData)
        .subscribe({
          next: () => {
            this.successMessage = '✅ Episodio actualizado';
            this.loadPodcasts();
            this.resetEpisodeForm();
          },
          error: (err) => {
            console.error(err);
            this.errorMessage = '❌ Error al actualizar el episodio';
          }
        });
    } else {
      this.podcastServicePC.agregarEpisodio(this.selectedPodcast._id!, episodeData).subscribe({
        next: () => {
          this.successMessage = '🎉 Episodio agregado';
          this.loadPodcasts();
          this.resetEpisodeForm();
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = '❌ Error al agregar episodio';
        }
      });
    }
  }

  eliminarEpisodio(podcastId: string, episodeId: string): void {
    this.podcastServicePC.eliminarEpisodio(podcastId, episodeId).subscribe({
      next: () => {
        this.successMessage = '🗑️ Episodio eliminado correctamente';
        this.loadPodcasts();
        if (this.selectedPodcast && this.selectedPodcast._id === podcastId) {
          const episodes = this.selectedPodcast.episodes || [];
          this.selectedPodcast.episodes = episodes.filter(ep => ep._id !== episodeId);
        }
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = '❌ Error al eliminar episodio';
      }
    });
  }

  cancelarEpisodio(): void {
    this.resetEpisodeForm();
  }

  // ====== UTIL ======
  getAllEpisodes(): { podcastId: string; podcastTitle: string; episode: EpisodePayload }[] {
    return this.podcasts.flatMap(podcast =>
      (podcast.episodes || []).map(episode => ({
        podcastId: podcast._id!,
        podcastTitle: podcast.title,
        episode
      }))
    );
  }

  private parseCsv(value?: string | null): string[] {
    return value
      ? value
          .split(',')
          .map(v => v.trim())
          .filter(v => !!v)
      : [];
  }

  private resetForms(): void {
    this.podcastForm.reset({
      language: 'es',
      layout: 'classic',
      order: 0,
      featured: false
    });
    this.editingPodcast = false;
    this.selectedPodcast = null;
    this.resetEpisodeForm();
    this.successMessage = null;
    this.errorMessage = null;
  }

  private resetEpisodeForm(): void {
    this.episodeForm.reset();
    this.showingEpisodeForm = false;
    this.editingEpisode = false;
    this.selectedEpisode = null;
  }
}
