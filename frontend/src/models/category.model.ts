export interface Category {
  _id?: string;                 // MongoDB ObjectId
  name: string;                 // "Arte", "Finanzas"
  slug: string;                 // "arte", "finanzas"

  // Contenido / visual
  description?: string;         // Descripción general
  image?: string;               // Para og:image
  color?: string;               // UI
  order?: number;

  // 🔥 SEO
  metaTitle?: string;           // <title> específico
  metaDescription?: string;     // <meta name="description">
  seoIndexable?: boolean;       // true = index, false = noindex

  // Auditoría
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  tipo?: string;
}
