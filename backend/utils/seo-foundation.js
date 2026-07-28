import crypto from 'crypto';

export const DEFAULT_PUBLIC_SITE_ORIGIN = 'https://maslatino.com';

export function normalizeSiteOrigin(value = DEFAULT_PUBLIC_SITE_ORIGIN) {
  const raw = String(value || DEFAULT_PUBLIC_SITE_ORIGIN).trim();
  try {
    const url = new URL(raw);
    if (url.hostname.toLowerCase() === 'www.maslatino.com') {
      return DEFAULT_PUBLIC_SITE_ORIGIN;
    }
    return `${url.protocol}//${url.host}`.replace(/\/+$/, '');
  } catch {
    return DEFAULT_PUBLIC_SITE_ORIGIN;
  }
}

export function buildArticleCanonical(slug, siteOrigin = DEFAULT_PUBLIC_SITE_ORIGIN) {
  const normalizedSlug = String(slug || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');

  if (!normalizedSlug) return normalizeSiteOrigin(siteOrigin);
  return `${normalizeSiteOrigin(siteOrigin)}/noticia/${encodeURIComponent(normalizedSlug)}`;
}

export function isArticleCanonical(value, siteOrigin = DEFAULT_PUBLIC_SITE_ORIGIN) {
  if (!value) return false;
  try {
    const expected = new URL(normalizeSiteOrigin(siteOrigin));
    const candidate = new URL(String(value));
    const normalizeHost = (host) => (
      host.toLowerCase() === 'www.maslatino.com'
        ? 'maslatino.com'
        : host.toLowerCase()
    );
    const pathname = candidate.pathname.replace(/\/+$/, '') || '/';
    const isCurrentArticlePath = /^\/noticia\/[^/]+$/u.test(pathname);
    const isLegacyArticlePath = /^\/[^/]+$/u.test(pathname)
      && !/\.[a-z0-9]{2,5}$/iu.test(pathname);

    return normalizeHost(candidate.host) === normalizeHost(expected.host)
      && (isCurrentArticlePath || isLegacyArticlePath);
  } catch {
    return false;
  }
}

export function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function stripHtml(value = '') {
  return String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function articleContentHash(article = {}) {
  const stableInput = JSON.stringify({
    title: String(article.title || ''),
    slug: String(article.slug || ''),
    focusKeyphrase: String(article.focusKeyphrase || ''),
    metaDescription: String(
      article.metaDescription || article.meta?.description || ''
    ),
    summary: String(article.summary || ''),
    extracto: String(article.extracto || ''),
    imageAltGlobal: String(
      article.imageAltGlobal || article.meta?.imageAltGlobal || ''
    ),
    body: stripHtml(article.bodyHtml || article.body || ''),
    tags: Array.isArray(article.tags)
      ? article.tags.map((tag) => String(tag || '')).filter(Boolean).sort()
      : [],
    categories: Array.isArray(article.categories)
      ? article.categories.map((category) => String(category?._id || category?.id || category || '')).sort()
      : [],
  });

  return crypto.createHash('sha256').update(stableInput).digest('hex');
}

export function publicArticleLastModified(article = {}) {
  return article.contentUpdatedAt
    || article.updatedAt
    || article.createdAt
    || new Date(0);
}

export function isNoticiaPubliclyVisible(article = {}, now = new Date()) {
  if (article.autorizada !== true) return false;
  if (!article.publishAt) return true;

  const publishAt = new Date(article.publishAt);
  const referenceTime = new Date(now);

  return Number.isFinite(publishAt.getTime())
    && Number.isFinite(referenceTime.getTime())
    && publishAt.getTime() <= referenceTime.getTime();
}

export function publicNoticiaFilter(extra = {}, now = new Date()) {
  // `state` no puede añadirse todavía: la mayoría del histórico autorizado sigue
  // marcado como draft/review y requiere una migración editorial independiente.
  // `publishAt`, en cambio, sí evita exponer contenido programado antes de tiempo.
  const { $and: extraAnd, ...rest } = extra;
  const inheritedAnd = Array.isArray(extraAnd)
    ? extraAnd
    : extraAnd
      ? [extraAnd]
      : [];

  return {
    ...rest,
    autorizada: true,
    $and: [
      ...inheritedAnd,
      {
        $or: [
          { publishAt: null },
          { publishAt: { $lte: now } },
        ],
      },
    ],
  };
}
