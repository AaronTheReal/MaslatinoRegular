import axios from 'axios';

import { buildArticleCanonical } from './seo-foundation.js';

export async function recacheNoticia(slug) {
  const prerenderToken = String(process.env.PRERENDER_TOKEN || '').trim();
  const normalizedSlug = String(slug || '').trim();

  if (!prerenderToken || !normalizedSlug) {
    return {
      skipped: true,
      reason: !prerenderToken
        ? 'PRERENDER_TOKEN no configurado'
        : 'slug no proporcionado',
    };
  }

  const url = buildArticleCanonical(
    normalizedSlug,
    process.env.PUBLIC_SITE_ORIGIN
  );

  try {
    const response = await axios.post(
      'https://api.prerender.io/recache',
      { prerenderToken, url },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Prerender-Token': prerenderToken,
        },
        timeout: 15_000,
      }
    );

    return {
      skipped: false,
      status: response.status,
      url,
    };
  } catch (error) {
    console.error(
      `Error al recachear ${normalizedSlug}:`,
      error?.message || error
    );
    throw error;
  }
}
