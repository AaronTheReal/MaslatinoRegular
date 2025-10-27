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

export interface Block {
  type: 'text' | 'list' | 'link' | 'quote' | 'image';
  tag?: 'h2' | 'p';
  text?: string;

  // NUEVO: para respetar enlaces/markup dentro del texto (viene del backend ya sanitizado)
  html?: string;

  style?: {
    fontSize?: string;
    fontWeight?: string;
    fontFamily?: string;
    textAlign?: string;
  };

  // LISTA
  items?: string[];
  ordered?: boolean;

  // NUEVO: HTML por <li> (preserva <a> dentro de la lista)
  itemsHtml?: string[];

  // ENLACE
  href?: string;
  textLink?: string;

  // CITA
  quote?: string;
  authorQuote?: string;

  // IMAGEN
  url?: string;
  alt?: string;
  caption?: string;
  captionHtml?: string;
}

export interface NoticiaMeta {
  description?: string;
  image?: string;

  // NUEVO: usados por tu template
  imageAltGlobal?: string;
  imageCaption?: string;
  imageCaptionUrl?: string;

  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;
}

export interface Noticia {
  _id: string;
  title: string;
  summary?: string;

  // NUEVO: si alguna vista quiere usar el HTML original
  bodyHtml?: string;

  content: Block[];

  // Dejamos Category[] como ya lo pusiste
  categories: Category[];

  tags?: string[];
  meta?: NoticiaMeta;

  authorName?: string;
  originalUrl?: string;

  createdAt?: string;
  updatedAt?: string;
  slug?: string;
  autorizada?: boolean;
}
