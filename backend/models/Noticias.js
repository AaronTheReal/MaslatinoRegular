import mongoose from 'mongoose';
import { marked } from 'marked';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const { Schema, model, Types } = mongoose;

// Inicializar DOMPurify con JSDOM (JS puro)
const { window } = new JSDOM('');
const DOMPurify = createDOMPurify(window);

// ==== Sub-esquema de bloque de contenido ====
const BlockSchema = new Schema({
  type: { type: String, required: true, enum: ['text', 'image', 'quote', 'link', 'list'] },

  // Texto / HTML
  text: { type: String },   // texto plano opcional
  html: { type: String },   // HTML sanitizado (si vino desde CKEditor/HTML)

  tag: { type: String, enum: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'], default: 'p' },
  style: {
    fontSize: String,
    fontWeight: String,
    fontFamily: String,
    textAlign: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'left',
      set: (v) => {
        // Normaliza: '', null, undefined => undefined (así cae el default)
        if (v === '' || v === null || v === undefined) return undefined;
        const val = String(v).trim();
        return ['left', 'center', 'right'].includes(val) ? val : undefined;
      }
    },
  },

  // Imagen
  url: { type: String },
  alt: { type: String },
  caption: { type: String },
  captionHtml: { type: String },

  // Enlace
  href: { type: String },
  textLink: { type: String },

  // Lista
  items: [{ type: String }],
  ordered: { type: Boolean },

  // Cita
  quote: { type: String },
  authorQuote: { type: String }
}, { _id: false });

// Validaciones según tipo (flexibles)
BlockSchema.pre('validate', function (next) {
  switch (this.type) {
    case 'text':
      if (!this.html && !this.text) return next(new Error('Bloque text requiere html o text.'));
      break;
    case 'image':
      break; // permitir vacío en edición
    case 'link':
      if (!this.href || !this.textLink) return next(new Error('Bloque link requiere href y textLink.'));
      break;
    case 'list':
      if (!Array.isArray(this.items) || this.items.length === 0) return next(new Error('Bloque list requiere items no vacío.'));
      break;
    case 'quote':
      if (!this.quote && !this.html) return next(new Error('Bloque quote requiere quote o html.'));
      break;
  }
  if (this.style) {
    const ta = (this.style.textAlign || '').trim();
    if (!['left', 'center', 'right'].includes(ta)) {
      // fuerza a 'left' si viene vacío o inválido
      this.style.textAlign = 'left';
    }
  }
  next();
});

// Conversión Markdown → HTML sanitizado (solo si html está vacío)
BlockSchema.pre('save', function (next) {
  try {
    if (this.type === 'text') {
      if (!this.html && this.text) {
        const rawHtml = marked(this.text);
        this.html = DOMPurify.sanitize(rawHtml);
      } else if (this.html) {
        this.html = DOMPurify.sanitize(String(this.html));
      }
    }

    if (this.type === 'list') {
      if (!this.html && Array.isArray(this.items)) {
        const mdList = (this.ordered
          ? this.items.map((it, i) => `${i + 1}. ${it}`)
          : this.items.map(it => `- ${it}`)
        ).join('\n');
        const rawHtml = marked(mdList);
        this.html = DOMPurify.sanitize(rawHtml);
      } else if (this.html) {
        this.html = DOMPurify.sanitize(String(this.html));
      }
    }

    if (this.type === 'quote') {
      if (!this.html && this.quote) {
        const rawHtml = marked(`> ${this.quote}`);
        this.html = DOMPurify.sanitize(rawHtml);
      } else if (this.html) {
        this.html = DOMPurify.sanitize(String(this.html));
      }
    }

    if (this.type === 'image') {
      if (this.caption && !this.captionHtml) {
        const rawCaptionHtml = marked(this.caption);
        this.captionHtml = DOMPurify.sanitize(rawCaptionHtml);
      } else if (this.captionHtml) {
        this.captionHtml = DOMPurify.sanitize(String(this.captionHtml));
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

// ==== Esquema principal de Noticia ====
const NoticiaSchema = new Schema({
  title: { type: String, required: true, trim: true },
  slug:  { type: String, required: true, trim: true, unique: true },

  summary: { type: String, trim: true },
  tags:    [{ type: String, trim: true }],

  originalUrl: { type: String, trim: true },

  author:     { type: Types.ObjectId, ref: 'User' },
  authorName: { type: String, trim: true },

  categories: [{ type: Schema.Types.ObjectId, ref: 'Category', required: true }],

  location: {
    country: { type: String, trim: true },
    region:  { type: String, trim: true },
    city:    { type: String, trim: true }
  },

  // HTML original del editor (sanitizado)
  bodyHtml: { type: String },

  // Bloques (fuente de verdad para renderizado estructurado)
  content: { type: [BlockSchema], default: [] },

  meta: {
    description:     { type: String, required: true },
    image:           { type: String, required: true },
    imageAltGlobal:  { type: String, trim: true },
    canonical:       { type: String, trim: true },
    ogTitle:         { type: String, trim: true },
    ogDescription:   { type: String, trim: true },
    twitterCard:     { type: String, trim: true }
  },

  state:     { type: String, enum: ['draft', 'review', 'published'], default: 'draft' },
  publishAt: { type: Date },

  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now },
  autorizada: { type: Boolean, default: false }
});

// Actualiza updatedAt y sanitiza bodyHtml si viene
NoticiaSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.bodyHtml) {
    this.bodyHtml = DOMPurify.sanitize(String(this.bodyHtml));
  }
  next();
});

export default model('Noticia', NoticiaSchema);






//  enum: ['Mundo','Arte','Política','Finanzas','Familia','Deportes','Salud'],



/*
import mongoose from 'mongoose';
import { marked } from 'marked';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const { Schema, model, Types } = mongoose;

// Inicializar DOMPurify con un entorno JSDOM
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// 1. Sub-esquema de bloque de contenido:
const BlockSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['text', 'image', 'quote', 'link', 'list']
  },

  // Markdown puro y HTML sanitizado
  text: { type: String },   // Markdown para bloques text
  html: { type: String },   // HTML generado y sanitizado

  tag: {
    type: String,
    enum: ['p','h1','h2','h3','h4','h5','h6','span'],
    default: 'p'
  },
  style: {
    fontSize:   String,
    fontWeight: String,
    fontFamily: String,
    textAlign: {
      type: String,
      enum: ['left','center','right'],
      default: 'left'
    }
  },

  // Imagen
  url: { type: String },
  alt: { type: String },
  caption: { type: String },
  captionHtml: { type: String },

  // Enlace
  href: { type: String },
  textLink: { type: String },

  // Lista
  items: [{ type: String }],
  ordered: { type: Boolean },

  // Cita
  quote: { type: String },
  authorQuote: { type: String }
});

// Validación de campos según tipo
BlockSchema.pre('validate', function(next) {
  switch (this.type) {
    case 'text':
      if (!this.text) return next(new Error('Bloque text requiere campo text.'));
      break;
    case 'image':
      if (!this.url) return next(new Error('Bloque image requiere campo url.'));
      break;
    case 'link':
      if (!this.href || !this.textLink) return next(new Error('Bloque link requiere href y textLink.'));
      break;
    case 'list':
      if (!Array.isArray(this.items) || this.items.length === 0) return next(new Error('Bloque list requiere items no vacío.'));
      break;
    case 'quote':
      if (!this.quote) return next(new Error('Bloque quote requiere quote.'));
      break;
  }
  next();
});

// Conversión Markdown -> HTML sanitizado antes de guardar
BlockSchema.pre('save', function(next) {
  if (this.type === 'text' && this.text) {
    const rawHtml = marked(this.text);
    this.html = DOMPurify.sanitize(rawHtml);
  }
  if (this.type === 'list' && Array.isArray(this.items)) {
    const mdList = this.items.map(item => `- ${item}`).join('\n');
    const rawHtml = marked(mdList);
    this.html = DOMPurify.sanitize(rawHtml);
  }
  if (this.type === 'quote' && this.quote) {
    const rawHtml = marked(`> ${this.quote}`);
    this.html = DOMPurify.sanitize(rawHtml);
  }
   if (this.type === 'image' && this.caption) {
    const rawCaptionHtml = marked(this.caption);
    this.caption = DOMPurify.sanitize(rawCaptionHtml);
  }
  next();
});

// 2. Esquema principal de Noticia:
const NoticiaSchema = new Schema({
  title: { type: String, required: true, trim: true },
  summary: { type: String, trim: true },
  author: { type: Types.ObjectId, ref: 'User', required: true },
categories: [{
  type: String,
  enum: ['Mundo','Arte','Política','Finanzas','Familia','Deportes','Salud'],
  required: true
}],
  tags: [{ type: String, trim: true }],
  location: {
    country: { type: String, trim: true },
    region:  { type: String, trim: true },
    city:    { type: String, trim: true }
  },
  content: { type: [BlockSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Actualizar updatedAt automáticamente
NoticiaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default model('Noticia', NoticiaSchema);
*/