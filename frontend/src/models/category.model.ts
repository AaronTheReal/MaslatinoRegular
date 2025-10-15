
export interface Category {
  _id?: string; // Matches $oid from MongoDB
  name: string; // Required, e.g., "Arte", "Finanzas"
  slug: string; // Required, e.g., "arte", "finanzas"
  description?: string; // Optional description for meta tags
  image?: string; // Optional image URL for og:image
  color?: string; // Optional, e.g., "#007bff"
  order?: number; // Optional, default 0
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}
