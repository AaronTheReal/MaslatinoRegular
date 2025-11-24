// src/app/models/noticia.model.ts

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface BlockStyle {
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface BlockVariants {
  sm?: string;
  md?: string;
  lg?: string;
}

export interface Block {
  // 🔥 Tipos de bloque (incluimos embed)
  type: 'text' | 'image' | 'quote' | 'link' | 'list' | 'embed';

  // Etiqueta HTML sugerida
  tag?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span';

  // Texto / HTML
  text?: string;

  // HTML ya sanitizado desde el backend
  html?: string;

  style?: BlockStyle;

  // LISTA
  items?: string[];
  ordered?: boolean;

  // HTML por <li> (preserva <a> dentro de la lista)
  itemsHtml?: string[];

  // ENLACE
  href?: string;
  textLink?: string;

  // CITA
  quote?: string;
  authorQuote?: string;

  // IMAGEN (y también se usa url para EMBED)
  url?: string;
  alt?: string;
  caption?: string;
  captionHtml?: string;

  // Datos extendidos de imagen (CDN, variantes, etc.)
  cdnKey?: string;
  width?: number;
  height?: number;
  mime?: string;
  bytes?: number;
  credit?: string;
  sourceUrl?: string;
  variants?: BlockVariants;
  focalPoint?: {
    x?: number;
    y?: number;
  };

  // 🔥 EMBED social (tweet, post, video, etc.)
  provider?: 'twitter' | 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'generic';
}

export interface NoticiaMeta {
  description?: string;
  image?: string;

  // Pie de foto global / alt global
  imageAltGlobal?: string;
  imageCaptionHtml?: string;

  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;

  // Campos extra que vienen del backend
  imageKey?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageType?: string;
}

export interface NoticiaLocation {
  country?: string;
  region?: string;
  city?: string;
}

export interface Noticia {
  _id: string;
  title: string;

  // SEO / contenido
  focusKeyphrase?: string;
  summary?: string;
  extracto?: string;

  // HTML original del editor (si alguna vista lo usa)
  bodyHtml?: string;

  // Bloques estructurados
  content: Block[];

  // Categorías ya resueltas a objetos Category
  categories: Category[];

  tags?: string[];
  meta?: NoticiaMeta;

  // Autor
  author?: string;       // id opcional
  authorName?: string;

  // URL original (por si viene migrado de WordPress u otro origen)
  originalUrl?: string;

  location?: NoticiaLocation;

  // Estado de publicación
  state?: 'draft' | 'review' | 'published';
  publishAt?: string;

  createdAt?: string;
  updatedAt?: string;
  slug?: string;
  autorizada?: boolean;
}
