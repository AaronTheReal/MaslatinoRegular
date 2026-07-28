import {
  createMockSeoAnalysis,
  getSeoAiStatus,
  SeoAiValidationError,
} from '../utils/seo-ai-engine.js';

function errorPayload(code, message, status) {
  return {
    error: {
      code,
      message,
    },
    status,
  };
}

export function createSeoAiController(options = {}) {
  const env = options.env || process.env;
  const now = options.now || (() => new Date());

  return {
    status(_req, res) {
      return res.status(200).json(getSeoAiStatus(env));
    },

    analyze(req, res) {
      const currentStatus = getSeoAiStatus(env);

      if (currentStatus.provider === 'openai' && !currentStatus.configured) {
        return res.status(501).json(errorPayload(
          'SEO_AI_PROVIDER_NOT_IMPLEMENTED',
          'La credencial está configurada, pero el proveedor OpenAI real aún no está implementado.',
          currentStatus
        ));
      }

      if (currentStatus.mode === 'disabled') {
        return res.status(503).json(errorPayload(
          'SEO_AI_NOT_CONFIGURED',
          'SEO IA no está configurado. Define OPENAI_API_KEY o usa SEO_AI_MOCK=true en desarrollo.',
          currentStatus
        ));
      }

      try {
        const result = createMockSeoAnalysis(req?.body?.draft, { now: now() });
        return res.status(200).json(result);
      } catch (error) {
        if (error instanceof SeoAiValidationError) {
          return res.status(400).json({
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
            status: currentStatus,
          });
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

export function status(req, res) {
  return createSeoAiController().status(req, res);
}

export function analyze(req, res) {
  return createSeoAiController().analyze(req, res);
}

export default {
  status,
  analyze,
};
