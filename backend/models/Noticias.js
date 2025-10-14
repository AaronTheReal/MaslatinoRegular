import mongoose from 'mongoose';
import { marked } from 'marked';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const { Schema, model, Types } = mongoose;

// Inicializar DOMPurify con JSDOM
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
  text: { type: String },
  html: { type: String },

  tag: {
    type: String,
    enum: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'],
    default: 'p'
  },
  style: {
    fontSize: String,
    fontWeight: String,
    fontFamily: String,
    textAlign: {
      type: String,
      enum: ['left', 'center', 'right'],
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

// Validaciones según tipo
BlockSchema.pre('validate', function (next) {
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
      if (!Array.isArray(this.items) || this.items.length === 0)
        return next(new Error('Bloque list requiere items no vacío.'));
      break;
    case 'quote':
      if (!this.quote) return next(new Error('Bloque quote requiere quote.'));
      break;
  }
  next();
});

// Conversión Markdown → HTML sanitizado
BlockSchema.pre('save', function (next) {
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
    this.captionHtml = DOMPurify.sanitize(rawCaptionHtml);
  }
  next();
});

// 2. Esquema principal de Noticia:
const NoticiaSchema = new Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, unique: true },
  summary: { type: String, trim: true },
  originalUrl: { type: String, trim: true },

  // Permite usar autor por ID (en plataforma) o por nombre si viene de WordPress
  author: { type: Types.ObjectId, ref: 'User' },
  authorName: { type: String, trim: true },

  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }],


  location: {
    country: { type: String, trim: true },
    region: { type: String, trim: true },
    city: { type: String, trim: true }
  },

  content: { type: [BlockSchema], default: [] },

  meta: {
    description: { type: String },
    image: { type: String }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Actualiza updatedAt automáticamente
NoticiaSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
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