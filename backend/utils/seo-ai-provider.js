import {
  buildLiveSeoAnalysis,
  buildSeoAiRequestMessages,
  prepareSeoAnalysisContext,
  resolveLiveModel,
  SEO_AI_PROMPT_VERSION,
  SEO_AI_RESPONSE_SCHEMA,
  SeoAiValidationError,
} from './seo-ai-engine.js';
import {
  recordSeoAiAttempt,
  recordSeoAiCacheHit,
  recordSeoAiFailure,
  recordSeoAiSuccess,
} from './seo-ai-telemetry.js';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_TOKENS = 8_000;
const DEFAULT_EFFORT = 'low';
const DEFAULT_IDEMPOTENCY_TTL_MS = 5 * 60_000;
const IDEMPOTENCY_MAX_ENTRIES = 100;
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export class SeoAiProviderError extends Error {
  constructor(code, message, { status = 502, details = [] } = {}) {
    super(message);
    this.name = 'SeoAiProviderError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function readInt(env, key, fallback, { min = 1 } = {}) {
  const parsed = Number.parseInt(String(env?.[key] ?? '').trim(), 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

function readFlag(env, key, fallback) {
  const raw = String(env?.[key] ?? '').trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
}

function readEffort(env) {
  const allowed = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
  const raw = String(env?.ANTHROPIC_EFFORT ?? '').trim().toLowerCase();
  return allowed.has(raw) ? raw : DEFAULT_EFFORT;
}

/**
 * Caché de idempotencia por contenido: dos clics seguidos sobre el mismo
 * borrador no deben producir dos cargos. La clave incluye modelo y versión de
 * prompt para que un cambio de cualquiera de los dos invalide lo guardado.
 */
function createIdempotencyCache(ttlMs) {
  const entries = new Map();

  return {
    get(key, nowMs) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= nowMs) {
        entries.delete(key);
        return null;
      }
      // Refresca la posición para que el descarte sea por uso, no por inserción.
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },
    set(key, value, nowMs) {
      entries.set(key, { value, expiresAt: nowMs + ttlMs });
      while (entries.size > IDEMPOTENCY_MAX_ENTRIES) {
        const oldest = entries.keys().next().value;
        entries.delete(oldest);
      }
    },
  };
}

let cachedSdk = null;

async function loadAnthropicSdk() {
  if (!cachedSdk) {
    try {
      const module = await import('@anthropic-ai/sdk');
      cachedSdk = module.default || module.Anthropic;
    } catch (error) {
      throw new SeoAiProviderError(
        'SEO_AI_SDK_MISSING',
        'Falta la dependencia @anthropic-ai/sdk en el backend. Ejecuta npm install.',
        { status: 503, details: [error?.message].filter(Boolean) }
      );
    }
  }
  return cachedSdk;
}

function extractJsonPayload(response) {
  const blocks = Array.isArray(response?.content) ? response.content : [];
  const text = blocks
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim();

  if (!text) {
    throw new SeoAiProviderError(
      'SEO_AI_EMPTY_RESPONSE',
      'El modelo no devolvió contenido analizable.'
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new SeoAiProviderError(
      'SEO_AI_INVALID_JSON',
      'El modelo devolvió una respuesta que no es JSON válido.'
    );
  }
}

function assertUsableStopReason(response) {
  // `refusal` llega con HTTP 200: hay que mirarlo antes de leer el contenido.
  if (response?.stop_reason === 'refusal') {
    const category = response?.stop_details?.category;
    throw new SeoAiProviderError(
      'SEO_AI_REFUSED',
      category
        ? `El modelo declinó analizar este borrador (categoría: ${category}).`
        : 'El modelo declinó analizar este borrador.',
      { status: 422 }
    );
  }

  if (response?.stop_reason === 'max_tokens') {
    throw new SeoAiProviderError(
      'SEO_AI_TRUNCATED',
      'La respuesta del modelo se cortó por límite de tokens. Reintenta o acorta el borrador.',
      { status: 502 }
    );
  }
}

function mapSdkError(error) {
  if (error instanceof SeoAiProviderError) return error;

  // Aquí una validación solo puede venir de la respuesta del modelo: el
  // borrador del editor ya se validó antes de contactar al proveedor.
  if (error instanceof SeoAiValidationError) {
    return new SeoAiProviderError('SEO_AI_INVALID_RESPONSE', error.message, {
      status: 502,
      details: error.details,
    });
  }

  const status = Number(error?.status);

  if (status === 401 || status === 403) {
    return new SeoAiProviderError(
      'SEO_AI_CREDENTIAL_REJECTED',
      'El proveedor rechazó la credencial configurada.',
      { status: 503 }
    );
  }
  if (status === 429) {
    return new SeoAiProviderError(
      'SEO_AI_RATE_LIMITED',
      'Se alcanzó el límite de uso del proveedor. Intenta de nuevo en unos minutos.',
      { status: 429 }
    );
  }
  if (status === 400) {
    return new SeoAiProviderError(
      'SEO_AI_BAD_REQUEST',
      'El proveedor rechazó la petición de análisis.',
      { status: 502, details: [error?.message].filter(Boolean) }
    );
  }
  if (error?.name === 'APIConnectionTimeoutError') {
    return new SeoAiProviderError(
      'SEO_AI_TIMEOUT',
      'El análisis superó el tiempo máximo de espera.',
      { status: 504 }
    );
  }

  return new SeoAiProviderError(
    'SEO_AI_PROVIDER_ERROR',
    'El proveedor de IA no pudo completar el análisis.',
    { status: 502, details: [error?.message].filter(Boolean) }
  );
}

export function createAnthropicSeoProvider(options = {}) {
  const env = options.env || process.env;
  const now = options.now || (() => new Date());
  const model = resolveLiveModel(env);
  const timeoutMs = readInt(env, 'ANTHROPIC_TIMEOUT_MS', DEFAULT_TIMEOUT_MS, { min: 5_000 });
  const maxTokens = readInt(env, 'ANTHROPIC_MAX_TOKENS', DEFAULT_MAX_TOKENS, { min: 1_024 });
  const maxRetries = readInt(env, 'ANTHROPIC_MAX_RETRIES', 1, { min: 0 });
  const effort = readEffort(env);
  const useFallbacks = readFlag(env, 'SEO_AI_FALLBACK', true);
  const cache = createIdempotencyCache(
    readInt(env, 'SEO_AI_IDEMPOTENCY_TTL_MS', DEFAULT_IDEMPOTENCY_TTL_MS, { min: 0 })
  );

  let clientPromise = null;

  async function getClient() {
    if (options.client) return options.client;
    if (!clientPromise) {
      clientPromise = (async () => {
        const Anthropic = await loadAnthropicSdk();
        return new Anthropic({
          apiKey: String(env.ANTHROPIC_API_KEY || '').trim(),
          maxRetries,
        });
      })().catch((error) => {
        clientPromise = null;
        throw error;
      });
    }
    return clientPromise;
  }

  return {
    model,

    async analyze(input) {
      const context = prepareSeoAnalysisContext(input, { now: now() });
      const cacheKey = `${model}|${SEO_AI_PROMPT_VERSION}|${context.sourceContentHash}`;
      const startedAt = Date.now();

      const hit = cache.get(cacheKey, startedAt);
      if (hit) {
        recordSeoAiCacheHit();
        return { ...hit, cached: true };
      }

      const { system, userContent } = buildSeoAiRequestMessages(context);
      const request = {
        model,
        max_tokens: maxTokens,
        system: [
          {
            type: 'text',
            text: system,
            cache_control: { type: 'ephemeral' },
          },
        ],
        output_config: {
          effort,
          format: { type: 'json_schema', schema: SEO_AI_RESPONSE_SCHEMA },
        },
        messages: [{ role: 'user', content: userContent }],
      };

      recordSeoAiAttempt();

      try {
        const client = await getClient();
        // Los fallbacks por refusal viven en el endpoint beta. Si el SDK
        // instalado todavía no lo expone, se degrada al endpoint estable en vez
        // de romper el análisis.
        const canFallback = useFallbacks && Boolean(client?.beta?.messages?.create);
        const messages = canFallback ? client.beta.messages : client.messages;
        if (canFallback) {
          request.betas = [FALLBACK_BETA];
          request.fallbacks = 'default';
        }

        const response = await messages.create(request, { timeout: timeoutMs });
        assertUsableStopReason(response);

        const latencyMs = Date.now() - startedAt;
        const analysis = {
          ...buildLiveSeoAnalysis(extractJsonPayload(response), context, {
            model: response?.model || model,
            promptVersion: SEO_AI_PROMPT_VERSION,
          }),
          latencyMs,
          usage: {
            inputTokens: response?.usage?.input_tokens ?? 0,
            outputTokens: response?.usage?.output_tokens ?? 0,
            cacheReadTokens: response?.usage?.cache_read_input_tokens ?? 0,
            cacheCreationTokens: response?.usage?.cache_creation_input_tokens ?? 0,
          },
          cached: false,
        };

        recordSeoAiSuccess({ latencyMs, usage: response?.usage || {}, env });
        cache.set(cacheKey, analysis, Date.now());
        return analysis;
      } catch (error) {
        const mapped = mapSdkError(error);
        recordSeoAiFailure(mapped.code || 'SEO_AI_PROVIDER_ERROR');
        throw mapped;
      }
    },
  };
}
