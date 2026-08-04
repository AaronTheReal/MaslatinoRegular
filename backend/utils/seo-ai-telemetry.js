/**
 * Telemetría en memoria del asistente SEO con IA.
 *
 * La bitácora exige registrar costo, latencia y tasa de error antes de
 * considerar el proveedor real listo. Los contadores viven por proceso: son
 * suficientes para vigilar el gasto desde el panel y no añaden dependencias ni
 * almacenamiento nuevo. Si algún día hace falta histórico, esto se sustituye por
 * un colector externo sin tocar el resto del flujo.
 */

// Precios por millón de tokens (USD). Sobrescribibles por entorno para no tener
// que tocar código cuando cambie la tarifa.
const DEFAULT_INPUT_PRICE = 5;
const DEFAULT_OUTPUT_PRICE = 25;
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

function emptyState() {
  return {
    startedAt: new Date().toISOString(),
    requests: 0,
    succeeded: 0,
    failed: 0,
    refused: 0,
    cached: 0,
    latency: { lastMs: 0, maxMs: 0, totalMs: 0, samples: 0 },
    tokens: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheCreation: 0,
    },
    estimatedCostUsd: 0,
    lastError: null,
  };
}

let state = emptyState();

function priceFor(env, key, fallback) {
  const parsed = Number.parseFloat(String(env?.[key] ?? '').trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toCount(value) {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

export function estimateSeoAiCostUsd(usage = {}, env = process.env) {
  const inputPrice = priceFor(env, 'ANTHROPIC_INPUT_PRICE_PER_MTOK', DEFAULT_INPUT_PRICE);
  const outputPrice = priceFor(env, 'ANTHROPIC_OUTPUT_PRICE_PER_MTOK', DEFAULT_OUTPUT_PRICE);

  const input = toCount(usage.input_tokens);
  const output = toCount(usage.output_tokens);
  const cacheRead = toCount(usage.cache_read_input_tokens);
  const cacheCreation = toCount(usage.cache_creation_input_tokens);

  const cost =
    (input * inputPrice
      + cacheRead * inputPrice * CACHE_READ_MULTIPLIER
      + cacheCreation * inputPrice * CACHE_WRITE_MULTIPLIER
      + output * outputPrice) / 1_000_000;

  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function recordSeoAiAttempt() {
  state.requests += 1;
}

export function recordSeoAiSuccess({ latencyMs = 0, usage = {}, env = process.env } = {}) {
  state.succeeded += 1;

  const latency = Math.max(0, Math.round(latencyMs));
  state.latency.lastMs = latency;
  state.latency.maxMs = Math.max(state.latency.maxMs, latency);
  state.latency.totalMs += latency;
  state.latency.samples += 1;

  state.tokens.input += toCount(usage.input_tokens);
  state.tokens.output += toCount(usage.output_tokens);
  state.tokens.cacheRead += toCount(usage.cache_read_input_tokens);
  state.tokens.cacheCreation += toCount(usage.cache_creation_input_tokens);

  state.estimatedCostUsd = Math.round(
    (state.estimatedCostUsd + estimateSeoAiCostUsd(usage, env)) * 1_000_000
  ) / 1_000_000;
}

export function recordSeoAiCacheHit() {
  state.cached += 1;
}

export function recordSeoAiFailure(code = 'UNKNOWN') {
  const normalized = String(code || 'UNKNOWN');
  if (normalized === 'SEO_AI_REFUSED') {
    state.refused += 1;
  }
  state.failed += 1;
  state.lastError = { code: normalized, at: new Date().toISOString() };
}

export function getSeoAiTelemetry() {
  const { samples, totalMs, ...latency } = state.latency;
  const billable = state.succeeded + state.failed;

  return {
    startedAt: state.startedAt,
    requests: state.requests,
    succeeded: state.succeeded,
    failed: state.failed,
    refused: state.refused,
    cached: state.cached,
    errorRate: billable ? Math.round((state.failed / billable) * 1000) / 1000 : 0,
    latency: {
      ...latency,
      averageMs: samples ? Math.round(totalMs / samples) : 0,
    },
    tokens: { ...state.tokens },
    estimatedCostUsd: state.estimatedCostUsd,
    lastError: state.lastError,
  };
}

export function resetSeoAiTelemetry() {
  state = emptyState();
}
