# Bitácora de investigación: lentitud en la primera visita a maslatino.com

> Registro cronológico de hipótesis, pruebas, fixes y resultados.
> Síntoma original: "al poner el link y dar Enter, la página tarda mucho en cargar
> la primera vez; después ya va rápido". Objetivo: primera visita ~1s.

---

## Resumen ejecutivo (estado al 2026-07-09)

Se encontraron y corrigieron **4 causas reales apiladas** (imágenes, SSR bloqueado,
Edge Function fría, y una de CSS móvil no relacionada). Todas verificadas en producción.

La **causa raíz restante — LA DOMINANTE — es el DNS del dominio**:
los nameservers son `ns1/ns2.dns-parking.com` (DNS de *parking* de Hostinger).
Medido con navegador real y caché frío: **21.1s de resolución DNS** de un total
de 21.7s hasta el primer pintado. El resto de la carga ya toma **~0.6s**.

⛔ **Este fix NO es de código.** Requiere cambiar los nameservers en el panel de
Hostinger (ver sección "Fix pendiente"). Verificado el 2026-07-09: los nameservers
siguen sin cambiar, AAAA sigue tardando 5.2s.

---

## Línea de tiempo de la investigación

### Capítulo 1 — Caché CDN del HTML del home (commit `0fd883e8`)

- **Hipótesis**: el SSR renderiza el home en cada visita (sin caché) y la Edge
  Function paga cold start.
- **Pruebas**: `Cache-Status: fwd=miss` en cada request; TTFB primer hit ~4s
  (función fría) vs ~0.65s caliente; el HTML servido contiene `ng-state` → el
  servidor espera las llamadas al backend.
- **Descubrimiento habilitante**: `@netlify/angular-runtime` genera la Edge
  Function con `cache: "manual"` → el CDN respeta cabeceras de respuesta.
- **Fix**: `Netlify-CDN-Cache-Control: s-maxage=300, stale-while-revalidate=86400, durable`
  para `/` en `frontend/src/server.ts`.
- **Resultado**: TTFB del home 0.2s con `Cache-Status: hit`. ✅ Real pero insuficiente.

### Capítulo 2 — Imágenes gigantes (commit `76c45d4f`)

- **Hipótesis**: primera visita en incógnito lenta = descargas sin caché de navegador.
- **Pruebas**: el home bajaba ~15-20MB de imágenes originales
  (cecy2grande.png local 4.5MB, portada unsplash 4.6MB, COVER-ENTREVISTAS 2MB,
  calendario.png 1MB).
- **Fix**: pipe `cdnimg` (`frontend/src/app/pipes/cdn-image.pipe.ts`) →
  `/.netlify/images?url=...&w=N` en 7 componentes del dashboard.
- **Resultado**: 4.5MB→66KB, 2MB→22KB, 1MB→7.6KB (WebP). ✅ Real pero insuficiente.

### Capítulo 3 — SSR bloqueado por el backend + Render dormido (commit `5b29c8a6`)

- **Hipótesis**: el SSR espera las ~7 llamadas HTTP del home al backend de Render
  (plan gratis, se duerme a los ~15 min, despierta en 30-60s).
- **Pruebas locales** (harness `ssr-harness.mjs` sobre el `reqHandler` real):
  - Sin SSR (shell estático): TTFB **0.002s**.
  - Con SSR, backend despierto: TTFB **0.5-1.0s** (= latencia del endpoint más lento).
  - Con timeout de 1ms (simula backend muerto): **200 OK en 0.44s**, shell completo,
    sin crash → el cliente rellena los datos.
  - Prueba directa de cold start de Render: inconclusa (el tráfico del propio
    usuario lo mantuvo despierto durante la ventana de 22 min).
- **Fixes**: interceptor `ssr-timeout` (5s máx, solo `isPlatformServer`) +
  workflow cron `keep-backend-awake.yml` (ping cada 10 min; corre con success).
- **Resultado**: el SSR nunca puede colgarse >5s. ✅ Real pero insuficiente.

### Capítulo 4 — Edge Function fría en TODAS las rutas (commit `4918cc77`)

- **Dato clave del usuario**: hasta `/contactanos` y `/nosotros-pagina`
  (client-only, sin backend) tardaban ~7s la primera vez → causa común a todas
  las rutas.
- **Pruebas**: `/contactanos` en frío TTFB **2.97s** vs 0.25s caliente; toda ruta
  pasa por la Edge Function (`path: /*`) y no se cacheaba nada.
- **Fixes**:
  - Páginas estáticas → `RenderMode.Prerender` (HTML en build; quedan en el
    `excludedPath` de la función → se sirven como archivos estáticos puros):
    contactanos, nosotros-pagina, privacy-policy, terminos-condiciones,
    descarga-la-app. OJO: `/contactanos` → 301 → `/contactanos/` (normal).
  - Caché CDN por ruta en `server.ts` (`cdnCacheFor()`): SSR con datos 5 min + SWR;
    shells client-only 1 día + SWR.
- **Resultado**: estáticas 0.2-0.4s consistente sin función. ✅ Real pero insuficiente.

### Capítulo 5 — Hueco horizontal en móvil (commit `da091ed1`, no relacionado a velocidad)

- Reproducido con Chrome headless vía CDP (viewport 390×3200): scrollWidth 394 vs 390.
- Fixes: `overflow-x: clip` en html/body; `.feature-visual` de 100vw+translateX a
  `width:100%`; `.radio-player.is-hidden` conserva `translateX(-50%)`.
- Verificado en prod: scroll horizontal físicamente bloqueado. ✅

### Capítulo 6 — LA CAUSA RAÍZ: DNS (2026-07-09) 🔴 PENDIENTE DE ACCIÓN DEL USUARIO

- **Lección de investigación**: desde el capítulo 1 los curl mostraban "dns=11s"
  y se descartó como artefacto local. Al medir con navegador real + caché DNS
  frío (script `perf-check.mjs`, CDP):

  | Fase                         | Tiempo      |
  |------------------------------|-------------|
  | DNS de maslatino.com         | **21.139s** |
  | Conexión TLS                 | 0.173s      |
  | TTFB (HTML)                  | 0.235s      |
  | Primer pintado tras el HTML  | 0.342s      |

- **Causa**: nameservers `ns1/ns2.dns-parking.com` (parking de Hostinger).
  - Autoritativo lento: ns1 666ms, ns2 90ms por consulta.
  - **AAAA (IPv6) tarda 5.2-5.9s** (queries aparentemente descartadas → el
    resolver reintenta hasta timeout; el navegador espera A+AAAA antes de conectar).
  - TTL 300s → el caché expira cada 5 minutos y la espera se repite.
- **Por qué encaja con todo el historial**: afecta todas las rutas por igual;
  "después de entrar ya va rápido" (caché DNS del SO); las mediciones con curl
  `--resolve` (que salta DNS) siempre dieron rápidas.
- **Fix requerido (panel de Hostinger + Netlify, NO es código)**: ver abajo.
- **Verificación 2026-07-09**: NS sin cambiar; AAAA frío 5.2s. El fix no se ha aplicado.

---

## Fix pendiente: migrar DNS (acción del usuario, ~10 min)

1. Netlify → sitio → *Domain management* → maslatino.com → **Set up Netlify DNS**.
2. Antes de terminar, recrear en Netlify DNS los registros de correo/verificación
   (inventariados el 2026-07-09):
   - MX `@` → `SMTP.GOOGLE.com`, prioridad 1 (Google Workspace — crítico).
   - TXT `@`: 3 registros `google-site-verification=...` (copiar de Hostinger).
   - TXT `@` SPF (hoy hay DOS SPF, inválido; dejar UNO):
     `v=spf1 include:_spf.google.com include:_spf.mail.hostinger.com ~all`
   - A apex y CNAME www → los crea Netlify automáticamente.
3. Hostinger hPanel → Dominios → maslatino.com → Nameservers → cambiar
   `ns1/ns2.dns-parking.com` por los 4 de Netlify (`dnsX.pXX.nsone.net`).
4. Propagación: minutos a horas. El sitio no se cae (apunta a lo mismo).
5. **Resultado esperado**: DNS ~0.02-0.05s → primera visita total ~1s.

Alternativa equivalente: Cloudflare DNS gratis (importa registros solo; dejar
el proxy en "DNS only"/nube gris).

---

## Mejora futura opcional (no bloqueante)

- `main.js` pesa 1.36MB (~420KB wire) porque **todas** las rutas se importan
  estáticamente en `app.routes.ts` (sin lazy loading). En celulares lentos son
  2-4s de descarga+parseo. Fix: migrar rutas a `loadComponent` (mecánico, ~30 rutas).

## Herramientas de la investigación (scratchpad, recrear si hace falta)

- `overflow-check.mjs` — CDP sin dependencias: elementos que desbordan viewport móvil.
- `perf-check.mjs` — desglose real de navegación (DNS/TLS/TTFB/FCP + top recursos).
- `screenshot.mjs` — captura móvil headless. `static-serve.mjs` — sirve dist/browser local.
- `ssr-harness.mjs` — levanta el reqHandler real de Angular SSR en local (:8080)
  y un estático sin SSR (:8081) para comparar.
- Chrome: `C:/Program Files/Google/Chrome/Application/chrome.exe`.
- OJO: en local las imágenes salen rotas (no existe `/.netlify/images` fuera de
  Netlify) — no es regresión.

## Hallazgos colaterales abiertos

- Los runs de GitHub Actions de deploy marcan `failure` desde 2026-07-03, pero el
  deploy llega a producción igual (build interno de Netlify). Revisar/eliminar el
  workflow redundante `netlify-deploy.yml` algún día.
- Dos registros SPF en el DNS actual (inválido RFC 7208) — se corrige de paso en
  la migración DNS.
