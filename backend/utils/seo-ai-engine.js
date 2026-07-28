import { articleContentHash, stripHtml } from './seo-foundation.js';

export const SEO_AI_MOCK_MODEL = 'maslatino-seo-mock-v1';
export const SEO_AI_DEFAULT_LIVE_MODEL = 'gpt-5.6-sol';

export const SEO_AI_SUGGESTION_FIELDS = Object.freeze([
  'focusKeyphrase',
  'title',
  'slug',
  'metaDescription',
  'extracto',
  'summary',
  'tags',
  'imageAltGlobal',
]);

const MAX_DRAFT_JSON_CHARS = 140_000;
const FIELD_LIMITS = Object.freeze({
  title: 200,
  slug: 250,
  focusKeyphrase: 100,
  metaDescription: 500,
  extracto: 2_000,
  summary: 2_000,
  imageAltGlobal: 500,
  bodyHtml: 100_000,
});
const MAX_TAGS = 20;
const MAX_TAG_CHARS = 100;
const MAX_CATEGORIES = 50;

const STOP_WORDS = new Set([
  'actualidad', 'ante', 'bajo', 'como', 'con', 'contra', 'cuando', 'desde',
  'donde', 'durante', 'entre', 'esta', 'este', 'estos', 'hacia', 'hasta',
  'para', 'pero', 'porque', 'sobre', 'tambien', 'tras', 'una', 'unos',
  'unas', 'del', 'las', 'los', 'por', 'que', 'sus', 'the', 'and', 'for',
]);

const UNSAFE_TEXT_PATTERNS = Object.freeze([
  /\b(?:ignore|disregard|olvida|ignora)\b[^.!?\n]{0,100}\b(?:instructions?|instrucciones?|prompt|system|sistema)\b/giu,
  /\b(?:system|developer|assistant|sistema|desarrollador|asistente)\s*:/giu,
  /\b(?:ejecuta|execute|run)\s+(?:este\s+|this\s+)?(?:comando|command)\b[^.!?\n]*/giu,
  /\b(?:revela|revelar|muestra|mostrar|exfiltra|exfiltrar|filtra|filtrar|envia|envía|enviar|borra|borrar|elimina|eliminar)\b[^.!?\n]{0,100}\b(?:secretos?|credenciales?|claves?|tokens?|datos?|archivos?)\b/giu,
  /\b(?:rm\s+-rf|curl\s+https?:\/\/|wget\s+https?:\/\/|powershell(?:\.exe)?|cmd(?:\.exe)?|javascript:|data:text\/html)\b[^.!?\n]*/giu,
]);

export class SeoAiValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'SeoAiValidationError';
    this.code = 'INVALID_SEO_AI_DRAFT';
    this.details = details;
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function getString(value, field, details) {
  if (value == null) return '';
  if (typeof value !== 'string') {
    details.push(`${field} debe ser texto.`);
    return '';
  }
  return value.trim();
}

function normalizeTags(value, details) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    details.push('tags debe ser una lista de textos.');
    return [];
  }
  if (value.length > MAX_TAGS) {
    details.push(`tags admite como máximo ${MAX_TAGS} elementos.`);
  }

  const result = [];
  for (const tag of value.slice(0, MAX_TAGS)) {
    if (typeof tag !== 'string') {
      details.push('Cada tag debe ser texto.');
      continue;
    }
    const normalized = tag.trim();
    if (normalized.length > MAX_TAG_CHARS) {
      details.push(`Cada tag admite como máximo ${MAX_TAG_CHARS} caracteres.`);
      continue;
    }
    if (normalized) result.push(normalized);
  }
  return [...new Set(result)];
}

function normalizeCategories(value, details) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    details.push('categories debe ser una lista.');
    return [];
  }
  if (value.length > MAX_CATEGORIES) {
    details.push(`categories admite como máximo ${MAX_CATEGORIES} elementos.`);
  }

  return value.slice(0, MAX_CATEGORIES).map((category) => {
    if (typeof category === 'string' || typeof category === 'number') {
      return String(category);
    }
    if (isPlainObject(category)) {
      return String(category._id || category.id || category.slug || category.name || '');
    }
    return '';
  }).filter(Boolean);
}

function validateLengths(draft, details) {
  for (const [field, maximum] of Object.entries(FIELD_LIMITS)) {
    if (draft[field].length > maximum) {
      details.push(`${field} admite como máximo ${maximum} caracteres.`);
    }
  }
}

export function normalizeSeoDraft(input) {
  if (!isPlainObject(input)) {
    throw new SeoAiValidationError('draft debe ser un objeto.');
  }

  let serialized;
  try {
    serialized = JSON.stringify(input);
  } catch {
    throw new SeoAiValidationError('draft no se pudo serializar.');
  }
  if (typeof serialized !== 'string') {
    throw new SeoAiValidationError('draft no se pudo serializar.');
  }
  if (serialized.length > MAX_DRAFT_JSON_CHARS) {
    throw new SeoAiValidationError(
      `draft admite como máximo ${MAX_DRAFT_JSON_CHARS} caracteres serializados.`
    );
  }

  const details = [];
  const meta = isPlainObject(input.meta) ? input.meta : {};
  const draft = {
    title: getString(input.title, 'title', details),
    slug: getString(input.slug, 'slug', details),
    focusKeyphrase: getString(input.focusKeyphrase, 'focusKeyphrase', details),
    metaDescription: getString(
      input.metaDescription ?? meta.description,
      'metaDescription',
      details
    ),
    extracto: getString(input.extracto, 'extracto', details),
    summary: getString(input.summary, 'summary', details),
    imageAltGlobal: getString(
      input.imageAltGlobal ?? meta.imageAltGlobal,
      'imageAltGlobal',
      details
    ),
    bodyHtml: getString(input.bodyHtml ?? input.body, 'bodyHtml', details),
    tags: normalizeTags(input.tags, details),
    categories: normalizeCategories(input.categories, details),
  };

  validateLengths(draft, details);
  if (!draft.title && !stripHtml(draft.bodyHtml)) {
    details.push('draft necesita al menos title o bodyHtml con contenido.');
  }

  if (details.length) {
    throw new SeoAiValidationError('El borrador SEO no es válido.', details);
  }
  return draft;
}

export function sanitizeSeoSuggestionText(value, maximum = 500) {
  let text = stripHtml(String(value || ''))
    .replace(/[<>`]/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/https?:\/\/\S+/giu, ' ');

  for (const pattern of UNSAFE_TEXT_PATTERNS) {
    text = text.replace(pattern, ' ');
  }

  return text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximum)
    .trim();
}

function stripDiacritics(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function createSlug(value) {
  return stripDiacritics(sanitizeSeoSuggestionText(value, 200))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 75)
    .replace(/-+$/g, '');
}

function compactAtWord(value, maximum) {
  const safe = sanitizeSeoSuggestionText(value, maximum + 50);
  if (safe.length <= maximum) return safe;
  const compact = safe.slice(0, maximum + 1).replace(/\s+\S*$/u, '').trim();
  return compact || safe.slice(0, maximum).trim();
}

function firstExcerpt(value, maximum) {
  const safe = sanitizeSeoSuggestionText(value, maximum + 100);
  if (!safe) return '';
  const firstSentence = safe.match(/^.*?[.!?](?:\s|$)/u)?.[0]?.trim();
  return compactAtWord(
    firstSentence && firstSentence.length >= 60 ? firstSentence : safe,
    maximum
  );
}

function keywordCandidates(value) {
  const words = stripDiacritics(sanitizeSeoSuggestionText(value, 500))
    .toLowerCase()
    .match(/[a-z0-9]{3,}/g) || [];

  const unique = [];
  for (const word of words) {
    if (STOP_WORDS.has(word) || unique.includes(word)) continue;
    unique.push(word);
    if (unique.length === 6) break;
  }
  return unique;
}

function normalizedTag(value) {
  return compactAtWord(value, 40)
    .replace(/^#+/u, '')
    .trim();
}

function scoreDraft(draft) {
  let score = 0;
  const titleLength = draft.title.length;
  const slugLength = draft.slug.length;
  const focusWords = draft.focusKeyphrase.split(/\s+/u).filter(Boolean).length;
  const descriptionLength = draft.metaDescription.length;
  const extractLength = draft.extracto.length;
  const summaryLength = draft.summary.length;
  const altLength = draft.imageAltGlobal.length;

  if (titleLength >= 25 && titleLength <= 65) score += 15;
  else if (titleLength > 0 && titleLength <= 80) score += 8;

  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(draft.slug) && slugLength <= 75) score += 10;
  if (focusWords >= 2 && focusWords <= 6) score += 15;
  else if (focusWords === 1) score += 7;

  if (descriptionLength >= 120 && descriptionLength <= 160) score += 20;
  else if (descriptionLength >= 70 && descriptionLength <= 180) score += 10;

  if (extractLength >= 80 && extractLength <= 240) score += 10;
  else if (extractLength > 0 && extractLength <= 300) score += 5;

  if (summaryLength >= 80 && summaryLength <= 250) score += 10;
  else if (summaryLength > 0 && summaryLength <= 300) score += 5;

  if (draft.tags.length >= 2 && draft.tags.length <= 5) score += 10;
  else if (draft.tags.length === 1) score += 5;

  if (altLength >= 20 && altLength <= 160) score += 10;
  else if (altLength > 0 && altLength <= 200) score += 5;

  return Math.max(0, Math.min(100, score));
}

function buildWarnings(draft, safeDraft, bodyText) {
  const warnings = [];
  if (!safeDraft.title) warnings.push('Falta un título editorial utilizable.');
  if (bodyText.length < 150) warnings.push('El contenido es breve; revisa las sugerencias con contexto editorial.');
  if (!safeDraft.focusKeyphrase) warnings.push('No hay frase clave objetivo definida.');
  if (!safeDraft.metaDescription) warnings.push('No hay meta descripción definida.');
  if (!safeDraft.imageAltGlobal) warnings.push('Falta el texto alternativo global de imagen.');

  const rawPlainFields = [
    draft.title,
    draft.focusKeyphrase,
    draft.metaDescription,
    draft.extracto,
    draft.summary,
    draft.imageAltGlobal,
    ...draft.tags,
  ];
  const containsUnsafePlainText = rawPlainFields.some((value) => {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    return sanitizeSeoSuggestionText(value, normalized.length + 1) !== normalized;
  });
  if (containsUnsafePlainText) {
    warnings.push('Se omitió texto no seguro de las sugerencias.');
  }

  return warnings;
}

function buildSafeDraft(draft) {
  return {
    title: sanitizeSeoSuggestionText(draft.title, 200),
    slug: createSlug(draft.slug),
    focusKeyphrase: sanitizeSeoSuggestionText(draft.focusKeyphrase, 100),
    metaDescription: sanitizeSeoSuggestionText(draft.metaDescription, 500),
    extracto: sanitizeSeoSuggestionText(draft.extracto, 500),
    summary: sanitizeSeoSuggestionText(draft.summary, 500),
    imageAltGlobal: sanitizeSeoSuggestionText(draft.imageAltGlobal, 250),
    tags: draft.tags.map(normalizedTag).filter(Boolean),
  };
}

function suggestion(field, currentValue, suggestedValue, reason) {
  return { field, currentValue, suggestedValue, reason };
}

export function createMockSeoAnalysis(input, options = {}) {
  const draft = normalizeSeoDraft(input);
  const sourceContentHash = articleContentHash(draft);
  const now = options.now instanceof Date
    ? options.now
    : new Date(options.now || Date.now());
  if (Number.isNaN(now.getTime())) {
    throw new SeoAiValidationError('La fecha de análisis no es válida.');
  }

  const safeDraft = buildSafeDraft(draft);
  const bodyText = sanitizeSeoSuggestionText(draft.bodyHtml, 10_000);
  const headlineSource = safeDraft.title || firstExcerpt(bodyText, 65) || 'Actualidad Mas Latino';
  const suggestedTitle = compactAtWord(headlineSource, 65);
  const keywords = keywordCandidates(`${suggestedTitle} ${bodyText.slice(0, 600)}`);
  const suggestedFocus = compactAtWord(
    safeDraft.focusKeyphrase || keywords.slice(0, 4).join(' ') || 'actualidad latina',
    80
  );
  const descriptionSource = safeDraft.metaDescription || bodyText || suggestedTitle;
  const suggestedDescription = firstExcerpt(descriptionSource, 160);
  const extractSource = safeDraft.extracto || bodyText || suggestedDescription;
  const suggestedExtract = firstExcerpt(extractSource, 220);
  const summarySource = safeDraft.summary || bodyText || suggestedExtract;
  const suggestedSummary = firstExcerpt(summarySource, 240);
  const suggestedTags = [...new Set([
    ...safeDraft.tags,
    ...keywords.map(normalizedTag),
  ].filter(Boolean))].slice(0, 5);
  const suggestedAlt = compactAtWord(
    safeDraft.imageAltGlobal || `Imagen relacionada con ${suggestedTitle}`,
    160
  );

  const suggestions = [
    suggestion(
      'focusKeyphrase',
      safeDraft.focusKeyphrase,
      suggestedFocus,
      'Define una frase principal breve y relacionada con el tema.'
    ),
    suggestion(
      'title',
      safeDraft.title,
      suggestedTitle,
      'Mantiene un titular claro dentro de una longitud útil para buscadores.'
    ),
    suggestion(
      'slug',
      safeDraft.slug,
      createSlug(safeDraft.slug || suggestedTitle),
      'Usa una URL corta, legible y sin caracteres especiales.'
    ),
    suggestion(
      'metaDescription',
      safeDraft.metaDescription,
      suggestedDescription,
      'Resume el contenido con texto plano y una extensión controlada.'
    ),
    suggestion(
      'extracto',
      safeDraft.extracto,
      suggestedExtract,
      'Ofrece una introducción compacta para listados y vistas previas.'
    ),
    suggestion(
      'summary',
      safeDraft.summary,
      suggestedSummary,
      'Sintetiza la idea principal sin modificar el cuerpo editorial.'
    ),
    suggestion(
      'tags',
      safeDraft.tags,
      suggestedTags,
      'Agrupa términos temáticos reutilizables sin exceder cinco etiquetas.'
    ),
    suggestion(
      'imageAltGlobal',
      safeDraft.imageAltGlobal,
      suggestedAlt,
      'Describe la imagen en texto plano para accesibilidad y contexto.'
    ),
  ];

  const suggestedDraft = {
    title: suggestedTitle,
    slug: createSlug(safeDraft.slug || suggestedTitle),
    focusKeyphrase: suggestedFocus,
    metaDescription: suggestedDescription,
    extracto: suggestedExtract,
    summary: suggestedSummary,
    tags: suggestedTags,
    imageAltGlobal: suggestedAlt,
  };
  const before = scoreDraft(safeDraft);
  const proposedScore = scoreDraft(suggestedDraft);

  return {
    analysisId: `seo_mock_${sourceContentHash.slice(0, 24)}`,
    sourceContentHash,
    generatedAt: now.toISOString(),
    provider: 'mock',
    model: SEO_AI_MOCK_MODEL,
    mode: 'mock',
    scores: {
      before,
      after: Math.max(before, proposedScore),
    },
    warnings: buildWarnings(draft, safeDraft, bodyText),
    suggestions,
  };
}

export function getSeoAiStatus(env = process.env) {
  const mockEnabled = String(env.SEO_AI_MOCK || '').trim().toLowerCase() === 'true';
  const hasApiKey = Boolean(String(env.OPENAI_API_KEY || '').trim());

  if (mockEnabled) {
    return {
      configured: true,
      provider: 'mock',
      model: SEO_AI_MOCK_MODEL,
      mode: 'mock',
    };
  }

  if (hasApiKey) {
    return {
      configured: false,
      provider: 'openai',
      model: String(env.OPENAI_MODEL || SEO_AI_DEFAULT_LIVE_MODEL).trim(),
      mode: 'disabled',
      message: 'Credencial detectada, pero el proveedor real todavía no está implementado.',
    };
  }

  return {
    configured: false,
    provider: 'none',
    model: '',
    mode: 'disabled',
    message: 'Configura OPENAI_API_KEY o activa SEO_AI_MOCK=true para desarrollo.',
  };
}
