import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  Injectable,
  InjectionToken,
  PLATFORM_ID,
} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { defer, map, Observable, throwError } from 'rxjs';

import {
  SEO_AI_FIELDS,
  SeoAiAnalyzeRequest,
  SeoAiAnalyzeResponse,
  SeoAiField,
  SeoAiMode,
  SeoAiStatusResponse,
  SeoAiSuggestion,
  SeoAiSuggestionValue,
  SeoAiTelemetry,
  SeoAiUsage,
} from '../../models/seo-ai.model';

const DEFAULT_API_BASE_URL =
  'https://maslatinoregular.onrender.com/aaron/maslatino';

export const SEO_AI_API_BASE_URL = new InjectionToken<string>(
  'SEO_AI_API_BASE_URL',
  {
    providedIn: 'root',
    factory: () => DEFAULT_API_BASE_URL,
  },
);

export class SeoAiAuthenticationError extends Error {
  constructor() {
    super('No hay una sesión de administrador disponible.');
    this.name = 'SeoAiAuthenticationError';
  }
}

@Injectable({ providedIn: 'root' })
export class SeoAiService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiBaseUrl = inject(SEO_AI_API_BASE_URL).replace(/\/+$/, '');

  hasAdminSession(): boolean {
    return this.readAdminToken() !== null;
  }

  getStatus(): Observable<SeoAiStatusResponse> {
    return defer(() => {
      const headers = this.getAuthHeaders();
      if (!headers) {
        return throwError(() => new SeoAiAuthenticationError());
      }

      return this.http
        .get<unknown>(`${this.apiBaseUrl}/admin/seo-ai/status`, { headers })
        .pipe(map((response) => normalizeStatus(response)));
    });
  }

  analyze(request: SeoAiAnalyzeRequest): Observable<SeoAiAnalyzeResponse> {
    return defer(() => {
      const headers = this.getAuthHeaders();
      if (!headers) {
        return throwError(() => new SeoAiAuthenticationError());
      }

      return this.http
        .post<unknown>(`${this.apiBaseUrl}/admin/seo-ai/analyze`, request, {
          headers,
        })
        .pipe(map((response) => normalizeAnalysis(response)));
    });
  }

  private getAuthHeaders(): HttpHeaders | null {
    const token = this.readAdminToken();
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : null;
  }

  private readAdminToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      const token = localStorage.getItem('admin_token')?.trim();
      return token || null;
    } catch {
      return null;
    }
  }
}

function normalizeStatus(payload: unknown): SeoAiStatusResponse {
  const source = unwrapRecord(payload, ['status', 'data']);
  const rawMode = normalizeMode(source?.['mode'], source?.['mock']);
  const configuredValue = source?.['configured'];
  const configured =
    typeof configuredValue === 'boolean'
      ? configuredValue
      : rawMode === 'live' || rawMode === 'mock';

  return {
    configured,
    provider: readString(source?.['provider']) || 'No configurado',
    model: readString(source?.['model']) || 'No configurado',
    mode: configured ? rawMode : 'disabled',
    message: readString(source?.['message']) || undefined,
    promptVersion: readString(source?.['promptVersion']) || undefined,
    telemetry: normalizeTelemetry(source?.['telemetry']),
  };
}

function normalizeTelemetry(value: unknown): SeoAiTelemetry | undefined {
  const source = asRecord(value);
  if (!source) {
    return undefined;
  }

  const latency = asRecord(source['latency']);
  return {
    requests: readNumber(source['requests']),
    succeeded: readNumber(source['succeeded']),
    failed: readNumber(source['failed']),
    refused: readNumber(source['refused']),
    cached: readNumber(source['cached']),
    errorRate: readNumber(source['errorRate']),
    averageLatencyMs: readNumber(latency?.['averageMs']),
    estimatedCostUsd: readNumber(source['estimatedCostUsd']),
  };
}

function normalizeAnalysis(payload: unknown): SeoAiAnalyzeResponse {
  const source = unwrapRecord(payload, ['analysis', 'data']);
  if (!source) {
    throw new Error('El backend devolvió una respuesta de análisis inválida.');
  }

  const scores = asRecord(source['scores']);
  const suggestions = normalizeSuggestions(source['suggestions']);
  const warnings = readStringArray(source['warnings']);

  return {
    analysisId: readString(source['analysisId']),
    sourceContentHash: readString(source['sourceContentHash']),
    generatedAt: readString(source['generatedAt']) || new Date().toISOString(),
    provider: readString(source['provider']) || 'No informado',
    model: readString(source['model']) || 'No informado',
    mode: normalizeMode(source['mode'], source['mock']),
    scores: {
      before: readNumber(scores?.['before']),
      after: readNumber(scores?.['after']),
    },
    warnings,
    suggestions,
    promptVersion: readString(source['promptVersion']) || undefined,
    cached: source['cached'] === true,
    latencyMs: readNumber(source['latencyMs']),
    usage: normalizeUsage(source['usage']),
  };
}

function normalizeUsage(value: unknown): SeoAiUsage | undefined {
  const source = asRecord(value);
  if (!source) {
    return undefined;
  }

  return {
    inputTokens: readNumber(source['inputTokens']),
    outputTokens: readNumber(source['outputTokens']),
    cacheReadTokens: readNumber(source['cacheReadTokens']),
    cacheCreationTokens: readNumber(source['cacheCreationTokens']),
  };
}

function normalizeSuggestions(value: unknown): SeoAiSuggestion[] {
  let candidates: unknown[] = [];

  if (Array.isArray(value)) {
    candidates = value;
  } else {
    const record = asRecord(value);
    if (record) {
      candidates = Object.entries(record).map(([field, suggestion]) => {
        const suggestionRecord = asRecord(suggestion);
        return suggestionRecord
          ? { ...suggestionRecord, field }
          : { field, suggestedValue: suggestion };
      });
    }
  }

  const result: SeoAiSuggestion[] = [];
  const seen = new Set<SeoAiField>();

  for (const candidate of candidates) {
    const record = asRecord(candidate);
    const field = readField(record?.['field']);
    if (!record || !field || seen.has(field)) {
      continue;
    }

    const suggestedValue = readSuggestionValue(
      record['suggestedValue'] ?? record['value'],
      field,
    );
    if (suggestedValue === null) {
      continue;
    }

    result.push({
      field,
      currentValue:
        readSuggestionValue(record['currentValue'], field) ??
        (field === 'tags' ? [] : ''),
      suggestedValue,
      reason:
        readString(record['reason']) ||
        readString(record['rationale']) ||
        'Sugerencia generada a partir del contenido actual.',
    });
    seen.add(field);
  }

  return result;
}

function readField(value: unknown): SeoAiField | null {
  return typeof value === 'string' &&
    (SEO_AI_FIELDS as readonly string[]).includes(value)
    ? (value as SeoAiField)
    : null;
}

function readSuggestionValue(
  value: unknown,
  field: SeoAiField,
): SeoAiSuggestionValue | null {
  if (field === 'tags') {
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return null;
  }

  return typeof value === 'string' ? value : null;
}

function normalizeMode(value: unknown, mockValue?: unknown): SeoAiMode {
  if (value === 'mock' || value === 'live' || value === 'disabled') {
    return value;
  }
  return mockValue === true ? 'mock' : 'disabled';
}

function unwrapRecord(
  payload: unknown,
  envelopeKeys: readonly string[],
): Record<string, unknown> | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  for (const key of envelopeKeys) {
    const nested = asRecord(root[key]);
    if (nested) {
      return nested;
    }
  }
  return root;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
