import {
  createMockSeoAnalysis,
  getSeoAiStatus,
  SeoAiValidationError,
} from '../utils/seo-ai-engine.js';
import {
  createAnthropicSeoProvider,
  SeoAiProviderError,
} from '../utils/seo-ai-provider.js';
import { getSeoAiTelemetry } from '../utils/seo-ai-telemetry.js';

function errorPayload(code, message, status, details) {
  return {
    error: {
      code,
      message,
      ...(details?.length ? { details } : {}),
    },
    status,
  };
}

export function createSeoAiController(options = {}) {
  const env = options.env || process.env;
  const now = options.now || (() => new Date());
  let provider = options.provider || null;

  function getProvider() {
    if (!provider) {
      provider = createAnthropicSeoProvider({ env, now });
    }
    return provider;
  }

  return {
    status(_req, res) {
      const currentStatus = getSeoAiStatus(env);
      return res.status(200).json({
        ...currentStatus,
        ...(currentStatus.mode === 'live'
          ? { telemetry: getSeoAiTelemetry() }
          : {}),
      });
    },

    async analyze(req, res) {
      const currentStatus = getSeoAiStatus(env);

      if (currentStatus.mode === 'disabled') {
        return res.status(503).json(errorPayload(
          'SEO_AI_NOT_CONFIGURED',
          'SEO IA no está configurado. Define ANTHROPIC_API_KEY o usa SEO_AI_MOCK=true en desarrollo.',
          currentStatus
        ));
      }

      try {
        const result = currentStatus.mode === 'mock'
          ? createMockSeoAnalysis(req?.body?.draft, { now: now() })
          : await getProvider().analyze(req?.body?.draft);

        return res.status(200).json(result);
      } catch (error) {
        if (error instanceof SeoAiValidationError) {
          return res.status(400).json(errorPayload(
            error.code,
            error.message,
            currentStatus,
            error.details
          ));
        }

        if (error instanceof SeoAiProviderError) {
          return res.status(error.status).json(errorPayload(
            error.code,
            error.message,
            currentStatus,
            error.details
          ));
        }

        return res.status(500).json(errorPayload(
          'SEO_AI_ANALYSIS_FAILED',
          'No se pudo analizar el borrador.',
          currentStatus
        ));
      }
    },
  };
}

let defaultController = null;

function getDefaultController() {
  if (!defaultController) {
    defaultController = createSeoAiController();
  }
  return defaultController;
}

export function status(req, res) {
  return getDefaultController().status(req, res);
}

export function analyze(req, res) {
  return getDefaultController().analyze(req, res);
}

export default {
  status,
  analyze,
};
