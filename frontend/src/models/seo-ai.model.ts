export const SEO_AI_FIELDS = [
  'focusKeyphrase',
  'title',
  'slug',
  'metaDescription',
  'extracto',
  'summary',
  'tags',
  'imageAltGlobal',
] as const;

export type SeoAiField = (typeof SEO_AI_FIELDS)[number];
export type SeoAiMode = 'disabled' | 'mock' | 'live';
export type SeoAiSuggestionValue = string | string[];

/**
 * Snapshot editable que se envía al analizador.
 * Todos los campos son opcionales porque una noticia puede estar incompleta
 * mientras el periodista todavía la redacta.
 */
export interface SeoAiDraft {
  focusKeyphrase?: string;
  title?: string;
  slug?: string;
  metaDescription?: string;
  extracto?: string;
  summary?: string;
  tags?: string[];
  imageAltGlobal?: string;
  bodyHtml?: string;
  content?: unknown[];
  categories?: string[];
}

export interface SeoAiStatusResponse {
  configured: boolean;
  provider: string;
  model: string;
  mode: SeoAiMode;
  message?: string;
}

export interface SeoAiAnalyzeRequest {
  draft: SeoAiDraft;
  noticiaId?: string;
}

export interface SeoAiScores {
  before: number;
  after: number;
}

export interface SeoAiSuggestion {
  field: SeoAiField;
  currentValue: SeoAiSuggestionValue;
  suggestedValue: SeoAiSuggestionValue;
  reason: string;
}

export interface SeoAiAnalyzeResponse {
  analysisId: string;
  sourceContentHash: string;
  generatedAt: string;
  provider: string;
  model: string;
  mode: SeoAiMode;
  scores: SeoAiScores;
  warnings: string[];
  suggestions: SeoAiSuggestion[];
}

export interface SeoAiApplySuggestionEvent {
  field: SeoAiField;
  value: SeoAiSuggestionValue;
}

export const SEO_AI_FIELD_LABELS: Readonly<Record<SeoAiField, string>> = {
  focusKeyphrase: 'Frase clave principal',
  title: 'Título',
  slug: 'Slug',
  metaDescription: 'Meta descripción',
  extracto: 'Extracto',
  summary: 'Resumen',
  tags: 'Etiquetas',
  imageAltGlobal: 'Texto alternativo de la imagen',
};
