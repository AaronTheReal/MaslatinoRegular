import test from 'node:test';
import assert from 'node:assert/strict';

import {
  articleContentHash,
  buildArticleCanonical,
  escapeXml,
  isArticleCanonical,
  isNoticiaPubliclyVisible,
  normalizeSiteOrigin,
  publicArticleLastModified,
  publicNoticiaFilter,
  stripHtml,
} from '../utils/seo-foundation.js';

test('construye canonical de noticia sobre el dominio primario', () => {
  assert.equal(
    buildArticleCanonical('mi-noticia'),
    'https://maslatino.com/noticia/mi-noticia'
  );
  assert.equal(
    buildArticleCanonical('/mi-noticia/', 'https://www.maslatino.com/ruta'),
    'https://maslatino.com/noticia/mi-noticia'
  );
});

test('normaliza orígenes inválidos sin aceptar rutas', () => {
  assert.equal(normalizeSiteOrigin('https://maslatino.com/otra'), 'https://maslatino.com');
  assert.equal(normalizeSiteOrigin('no-es-url'), 'https://maslatino.com');
});

test('distingue una canonical propia de una fuente externa', () => {
  assert.equal(isArticleCanonical('https://maslatino.com/noticia/nota'), true);
  assert.equal(isArticleCanonical('https://www.maslatino.com/noticia/nota'), true);
  assert.equal(isArticleCanonical('https://maslatino.com/nota-legada'), true);
  assert.equal(
    isArticleCanonical('https://maslatino.com/wp-content/uploads/foto.jpg'),
    false
  );
  assert.equal(isArticleCanonical('https://agencia.example/foto'), false);
});

test('escapa valores XML y elimina HTML para análisis', () => {
  assert.equal(escapeXml('A & B < C'), 'A &amp; B &lt; C');
  assert.equal(stripHtml('<p>Hola <strong>mundo</strong></p>'), 'Hola mundo');
});

test('el hash cambia con el contenido editorial y es estable', () => {
  const base = { title: 'Título', bodyHtml: '<p>Texto</p>', categories: ['2', '1'] };
  assert.equal(articleContentHash(base), articleContentHash(base));
  assert.notEqual(articleContentHash(base), articleContentHash({ ...base, title: 'Otro' }));
});

test('el hash cubre todos los campos que analiza el asistente SEO', () => {
  const base = {
    title: 'Título',
    slug: 'titulo',
    focusKeyphrase: 'noticias latinas',
    metaDescription: 'Descripción editorial',
    extracto: 'Extracto',
    summary: 'Resumen',
    imageAltGlobal: 'Imagen del titular',
    tags: ['actualidad', 'comunidad'],
    bodyHtml: '<p>Texto</p>',
    categories: ['2', '1'],
  };

  for (const patch of [
    { slug: 'otro-slug' },
    { metaDescription: 'Otra descripción' },
    { tags: ['economía'] },
    { imageAltGlobal: 'Otra imagen' },
  ]) {
    assert.notEqual(
      articleContentHash(base),
      articleContentHash({ ...base, ...patch })
    );
  }
});

test('los cambios internos de IA no alteran la fecha pública del artículo', () => {
  const article = {
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    contentUpdatedAt: new Date('2026-07-10T00:00:00.000Z'),
    updatedAt: new Date('2026-07-28T00:00:00.000Z'),
  };

  assert.equal(
    publicArticleLastModified(article).toISOString(),
    '2026-07-10T00:00:00.000Z'
  );
});

test('la visibilidad pública coincide con autorización y programación', () => {
  const now = new Date('2026-07-28T12:00:00.000Z');

  assert.equal(isNoticiaPubliclyVisible({ autorizada: false }, now), false);
  assert.equal(isNoticiaPubliclyVisible({ autorizada: true, publishAt: null }, now), true);
  assert.equal(
    isNoticiaPubliclyVisible(
      { autorizada: true, publishAt: '2026-07-28T11:59:59.000Z' },
      now
    ),
    true
  );
  assert.equal(
    isNoticiaPubliclyVisible(
      { autorizada: true, publishAt: '2026-07-28T12:00:01.000Z' },
      now
    ),
    false
  );
  assert.equal(
    isNoticiaPubliclyVisible({ autorizada: true, publishAt: 'fecha-inválida' }, now),
    false
  );
});

test('la elegibilidad pública mantiene compatibilidad con autorizada', () => {
  const now = new Date('2026-07-28T12:00:00.000Z');
  const publicationConstraint = {
    $or: [
      { publishAt: null },
      { publishAt: { $lte: now } },
    ],
  };

  assert.deepEqual(publicNoticiaFilter({ press: true }, now), {
    autorizada: true,
    press: true,
    $and: [publicationConstraint],
  });
  assert.deepEqual(publicNoticiaFilter({ autorizada: false }, now), {
    autorizada: true,
    $and: [publicationConstraint],
  });
});

test('compone filtros adicionales sin publicar noticias programadas a futuro', () => {
  const now = new Date('2026-07-28T12:00:00.000Z');
  const recent = { createdAt: { $gte: new Date('2026-07-26T12:00:00.000Z') } };

  assert.deepEqual(publicNoticiaFilter({ $or: [recent] }, now), {
    $or: [recent],
    autorizada: true,
    $and: [
      {
        $or: [
          { publishAt: null },
          { publishAt: { $lte: now } },
        ],
      },
    ],
  });
});
