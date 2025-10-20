
export interface Category {
  _id?: string;
  name: string;
  slug?: string;
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
  style?: {
    fontSize?: string;
    fontWeight?: string;
    fontFamily?: string;
    textAlign?: string;
  };
  items?: string[];
  ordered?: boolean;
  href?: string;
  textLink?: string;
  quote?: string;
  authorQuote?: string;
  url?: string;
  alt?: string;
  caption?: string;
  captionHtml?: string;
}

export interface Noticia {
  _id: string;
  title: string;
  summary?: string;
  content: Block[];
  categories: (string | Category)[];
  tags?: string[];
  meta?: {
    description?: string;
    image?: string;
  };
  authorName?: string;
  originalUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  slug?: string;
  autorizada?: boolean; // Asegúrate de que esté aquí
}
