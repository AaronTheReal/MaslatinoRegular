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

/** Consumo y costo estimado del proveedor real, reportado por el backend. */
export interface SeoAiTelemetry {
  requests: number;
  succeeded: number;
  failed: number;
  refused: number;
  cached: number;
  errorRate: number;
  averageLatencyMs: number;
  estimatedCostUsd: number;
}

export interface SeoAiStatusResponse {
  configured: boolean;
  provider: string;
  model: string;
  mode: SeoAiMode;
  message?: string;
  promptVersion?: string;
  telemetry?: SeoAiTelemetry;
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

export interface SeoAiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
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
  promptVersion?: string;
  /** El backend reutilizó un análisis previo del mismo borrador. */
  cached?: boolean;
  latencyMs?: number;
  usage?: SeoAiUsage;
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
