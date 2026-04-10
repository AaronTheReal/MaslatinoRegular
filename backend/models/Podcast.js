import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;

/* ---------- Subesquemas Mux ---------- */

const MuxPlaybackIdSchema = new Schema({
  id: { type: String, required: true }, // playback_id de Mux
  policy: { type: String, enum: ['public', 'signed'], required: true }
}, { _id: false });

const MuxTextTrackSchema = new Schema({
  id: String,                 // id del track en Mux (opcional)
  language_code: String,      // 'es', 'en', 'es-MX', etc.
  name: String,               // "Español (LatAm)"
  closed_captions: { type: Boolean, default: false },
  type: {
    type: String,
    enum: ['captions', 'subtitles', 'descriptions', 'chapters', 'metadata'],
    default: 'subtitles'
  },
  status: { type: String, enum: ['preparing', 'ready', 'errored'], default: 'ready' },
  passthrough: String
}, { _id: false });

const MuxRenditionsSchema = new Schema({
  has_mp4_highest: { type: Boolean, default: false },   // si solicitaste MP4 estático “highest”
  has_m4a_audio_only: { type: Boolean, default: false } // si solicitaste M4A
}, { _id: false });

/* ---------- Ads (CSAI con IMA) ---------- */

const AdScheduleSchema = new Schema({
  preroll: { type: Boolean, default: true },
  midroll_times: { type: [Number], default: [] }  // segundos desde el inicio
}, { _id: false });

/* ---------- Episodio (unidad publicable) ---------- */

const EpisodeSchema = new Schema({
  // Editorial
  title: { type: String, required: true },
  description: { type: String },
  image: { type: String }, // portada del episodio

  // Tipo de contenido del episodio
  kind: { type: String, enum: ['video', 'audio'], required: true },

  // Localización (opcional por episodio)
  language: {
    type: String,
    enum: [
      'es','es-MX','es-AR','es-BO','es-CL','es-CO','es-CR','es-CU','es-DO','es-EC','es-SV',
      'es-GT','es-HN','es-NI','es-PA','es-PY','es-PE','es-PR','es-UY','es-VE',
      'pt','pt-BR','fr','en-US','en-GB','en-CA'
    ],
    default: 'es'
  },

  /* --------- Mux core por episodio --------- */
  mux: {
    assetId: { type: String },       // videos.assets.id
    uploadId: { type: String },      // videos.uploads.id (si usas Direct Upload)
    status: {
      type: String,
      enum: ['waiting_for_upload','preparing','ready','errored','cancelled_upload'],
      default: 'waiting_for_upload'
    },
    playbackIds: { type: [MuxPlaybackIdSchema], default: [] }, // puedes tener pública y firmada
    duration: { type: Number },       // segundos, lo refleja el asset
    aspect_ratio: { type: String },   // ej. "16:9"
    resolution_tier: { type: String },// ej. "capped-1080p", "audio-only"
    text_tracks: { type: [MuxTextTrackSchema], default: [] },
    static_renditions: { type: MuxRenditionsSchema, default: {} },
    has_storyboard: { type: Boolean, default: false },
    has_gif: { type: Boolean, default: false }
  },

  /* --------- Ads por episodio --------- */
  ads: {
    enabled: { type: Boolean, default: false },
    adTagUrl: { type: String },         // VAST/IMA tag principal
    schedule: { type: AdScheduleSchema, default: () => ({}) },
    fallbackAdTagUrl: { type: String }  // opcional para A/B o respaldo
  },

  /* --------- Seguridad de reproducción --------- */
  defaultPlaybackPolicy: {
    type: String,
    enum: ['public','signed'],
    default: 'public'
  },

  /* --------- Campos legacy opcionales (si hay contenido fuera de Mux) --------- */
  legacy: {
    audioUrl: { type: String },
    videoUrl: { type: String }
  },

  // Fechas editoriales
  releaseDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

/* ---------- Podcast (serie / contenedor de episodios) ---------- */

const PodcastSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  coverImage: { type: String }, // carátula de la serie
  coverImage2: { type: String }, // carátula de la serie

  language: {
    type: String,
    enum: [
      'es','es-MX','es-AR','es-BO','es-CL','es-CO','es-CR','es-CU','es-DO','es-EC','es-SV',
      'es-GT','es-HN','es-NI','es-PA','es-PY','es-PE','es-PR','es-UY','es-VE',
      'pt','pt-BR','fr','en-US','en-GB','en-CA'
    ],
    default: 'es'
  },

  // La serie contiene múltiples episodios (cada uno video o audio)
  episodes: { type: [EpisodeSchema], default: [] },

  // Autoría
  author: { type: Types.ObjectId, ref: 'User' },
  authorName: { type: String },

  // Taxonomía
  categories: [{ type: Schema.Types.ObjectId, ref: 'Category', required: true }],
  tags: [{ type: String, trim: true }],

  // Meta/SEO del contenedor (no del episodio)
  meta: {
    description: { type: String },
    image: { type: String }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

/* ---------- Hooks & Indexes ---------- */

EpisodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

PodcastSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Búsquedas típicas
PodcastSchema.index({ title: 'text', description: 'text', tags: 1 });
PodcastSchema.index({ 'episodes.title': 'text', 'episodes.description': 'text' });
PodcastSchema.index({ 'episodes.releaseDate': -1 });

export default model('Podcast', PodcastSchema);
