# Bitácora de investigación: lentitud en la primera visita a maslatino.com

> Registro cronológico de hipótesis, pruebas, fixes y resultados.
> Síntoma original: "al poner el link y dar Enter, la página tarda mucho en cargar
> la primera vez; después ya va rápido". Objetivo: primera visita ~1s.

---

## Resumen ejecutivo (estado al 2026-07-14)

Se encontraron y corrigieron **4 causas reales apiladas** (imágenes, SSR bloqueado,
Edge Function fría, y una de CSS móvil no relacionada). Todas verificadas en producción.

La **causa raíz restante — LA DOMINANTE — es el DNS del dominio**:
los nameservers son `ns1/ns2.dns-parking.com` (DNS de *parking* de Hostinger).
Medido con navegador real y caché frío: **21.1s de resolución DNS** de un total
de 21.7s hasta el primer pintado. El resto de la carga ya toma **~0.6s**.

⛔ **Este fix NO es de código.** Requiere cambiar los nameservers donde el dominio
está registrado — que resultó ser **GoDaddy**, no Hostinger (ver sección "Fix
pendiente"). Verificado el 2026-07-09: los nameservers siguen sin cambiar.
Re-verificado el **2026-07-14** (capítulo 8): NS siguen en dns-parking; DNS frío
tarda **12.05s** de forma repetible; saltando el DNS, el sitio SSR completo
responde en **0.58s**. El SSR queda exonerado por tercera vez.

✅ **2026-07-14: la solución quedó PREPARADA Y VERIFICADA** — zona DNS completa en
Netlify respondiendo todo en ~81ms (sitio, www, correo Google, admin, api, etc.).
⏳ **Falta UN solo paso, del usuario, en GoDaddy** (ver "Cierre" al final).
La causa ya NO está en investigación: está probada y con solución lista.

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

### Capítulo 7 — Contraprueba A/B: DNS vs todo-lo-demás (2026-07-10)

El usuario dudó del diagnóstico DNS ("tal vez es el SSR"). Experimento controlado:
misma carga completa en Chrome real, perfil limpio, con una sola variable —
resolver DNS o recibir la IP ya resuelta (`--host-resolver-rules`):

| Métrica                    | B: sin DNS (IP dada) | A: con DNS real |
|----------------------------|----------------------|-----------------|
| DNS                        | 0 ms                 | **21,171 ms**   |
| TLS                        | 99 ms                | 102 ms          |
| TTFB                       | 166 ms               | 21,351 ms       |
| First Contentful Paint     | **436 ms**           | 21,664 ms       |
| Load completo              | **1,286 ms**         | 22,337 ms       |
| Recursos / transferido     | 42 / 1.8MB           | 42 / 1.8MB      |
| Errores JS (hidratación)   | 0                    | 0               |

**Conclusión definitiva**: con DNS resuelto, el sitio completo (SSR incluido)
carga en 1.3s. El SSR pinta en 436ms sin errores. TODO el problema restante es
la resolución DNS de los nameservers dns-parking.

Hallazgo secundario de la corrida A1: un deploy purga el caché del CDN y el
primer visitante después paga el render SSR completo (~4.6s extra observados).
Con stale-while-revalidate solo afecta a UN visitante por deploy. Los deploys
de documentación también purgan — minimizarlos o aceptar el costo.

Auto-verificación posible para el usuario en su PC (reversible): agregar
`75.2.60.5 maslatino.com` a `C:\Windows\System32\drivers\etc\hosts` (como
administrador), abrir maslatino.com → carga en ~1s; quitar la línea después.

### Capítulo 8 — Experimento CSR en producción y tercera exoneración del SSR (2026-07-14)

Contexto: el usuario pidió desplegar manualmente solo `dist/.../browser` (sin SSR)
como experimento, conservando el SSR como respaldo.

- **Incidente aprendido**: `netlify deploy --prod --dir=...` desde el repo NO sube
  la carpeta tal cual — lee `netlify.toml`, re-ejecuta `ng build` y empaqueta la
  Edge Function SSR, que queda **sin enlazar a las rutas** → 404 en `/` y toda ruta
  no prerenderizada (probado con netlify-cli 23.9.5 + @netlify/angular-runtime 4.0.0).
  Producción estuvo caída ~2 min; se restauró con `netlify api restoreSiteDeploy`.
  También se descubrió así que dos deploys manuales previos del usuario ese día
  (22:47 y 22:49) tenían el mismo 404.
- **Receta correcta para deploy CSR manual**: copiar `browser/` FUERA del repo,
  `index.csr.html` → `index.html`, añadir `/* /index.html 200` al `_redirects`,
  y `netlify deploy --no-build --prod --site maslatino --dir=<copia>` desde esa
  carpeta. Funcionó a la primera (draft verificado antes de publicar).
- **Deploys que quedaron vivos para A/B** (inmutables en Netlify):
  - SSR sano (publicado): `6a4f4c71e4d55d0008fc4778`
  - CSR experimental: `6a56c0bfaf045cc3a95acf06` → https://6a56c0bfaf045cc3a95acf06--maslatino.netlify.app
- Al volver al SSR, el usuario reportó de nuevo "30s en entrar" y sospechó del SSR
  ("con el deploy manual de browser no me pasaba"). Re-medición del mismo día:

  | Prueba (2026-07-14)                          | Resultado                        |
  |----------------------------------------------|----------------------------------|
  | NS del dominio                                | `ns1/ns2.dns-parking.com` (sin cambios) |
  | A autoritativo (ns1/ns2)                      | 346ms / 111ms                    |
  | AAAA autoritativo                             | 133-201ms, respuesta vacía       |
  | curl DNS frío, 1ª vez                         | dns **12.06s**, total 16.13s     |
  | curl DNS frío, 2ª vez (inmediata)             | dns **12.05s** otra vez → ni siquiera cachea |
  | curl con IP resuelta (`--resolve`)            | ttfb 0.47s, **total 0.58s**      |

- **Por qué el deploy manual CSR "se sentía" rápido**: durante las pruebas de un
  deploy se visita el sitio repetidamente → el caché DNS del navegador/SO está
  caliente y los 12-21s desaparecen. CSR y SSR pagan EXACTAMENTE el mismo DNS;
  la variable nunca fue el modo de render. Con DNS resuelto el SSR responde en
  0.47-0.58s (y el CDN lo sirve cacheado).
- **Conclusión (tercera vez)**: la causa es el DNS de dns-parking. El fix sigue
  siendo la migración de nameservers (sección siguiente). Sin eso, CUALQUIER
  versión del sitio — CSR, SSR o HTML plano — seguirá tardando 12-30s en caché frío.
- **La prueba que lo cerró (descubierta por el usuario)**: `maslatino.netlify.app`
  "carga inmediatamente" y `maslatino.com` "se tarda". Ambas URLs sirven EXACTAMENTE
  el mismo deploy SSR; solo cambia quién resuelve el DNS. Medido en el momento
  (caché frío, misma máquina):

  | URL                        | DNS        | Total      |
  |----------------------------|------------|------------|
  | maslatino.netlify.app (NS de Netlify) | 0.25s | **1.34s**  |
  | maslatino.com (NS dns-parking)        | **12.06s** | **13.08s** |

  Es el experimento perfecto: misma app, mismo SSR, mismo CDN — 10x de diferencia
  solo por los nameservers. Imposible que sea el SSR.

---

## Fix pendiente: migrar DNS (acción del usuario, ~10 min)

> **ACTUALIZACIÓN 2026-07-14: los pasos 1 y 2 ya están HECHOS.** Se creó la zona
> DNS en Netlify vía API (zone id `6a56e0e1b84b9b56a977c555`) con los 12 registros:
> NETLIFY apex+www, MX de Google, 3 TXT de verificación, SPF corregido (UNO solo,
> ahora SÍ incluye a Google), DKIM completo, DMARC (copiado tal cual, malformado
> en origen), y los heredados de Hostinger (autoconfig, autodiscover, ftp).
> Verificado consultando `dns1.p07.nsone.net` directo: todo responde correcto en
> **81ms** (vs 12,059ms de dns-parking medidos el mismo día).
> Nota técnica: `netlify api createDnsZone` devuelve 500 (bug de la CLI); funcionó
> con POST directo a `api.netlify.com/api/v1/dns_zones`.
>
> **CORRECCIÓN IMPORTANTE (mismo día, al ver el panel de Hostinger del usuario):**
> el dominio está registrado en **GoDaddy** (confirmado por RDAP: "GoDaddy.com, LLC"),
> no en Hostinger — Hostinger solo hospeda la zona DNS de parking. Por lo tanto el
> cambio de nameservers se hace en **GoDaddy**, no en Hostinger.
> Además, el panel reveló 2 registros de producción invisibles al inventario público,
> ya copiados y verificados en la zona de Netlify:
> - `admin` CNAME → `cname.vercel-dns.com` (panel admin en Vercel)
> - `api` A → `18.191.71.237` (API en AWS)
>
> **SOLO FALTA EL PASO 3** (GoDaddy, único que no se puede hacer por API):
> GoDaddy → My Domains → maslatino.com → Nameservers → "I'll use my own nameservers":
> `dns1.p07.nsone.net`, `dns2.p07.nsone.net`, `dns3.p07.nsone.net`, `dns4.p07.nsone.net`
> No tocar nada en Hostinger (y NO usar su botón "Reset DNS records").

1. Netlify → sitio → *Domain management* → maslatino.com → **Set up Netlify DNS**.
2. Antes de terminar, recrear en Netlify DNS los registros de correo/verificación
   (inventario COMPLETO re-verificado el 2026-07-14; el del 07-09 omitía DKIM y DMARC):
   - MX `@` → `SMTP.GOOGLE.com`, prioridad 1 (Google Workspace — crítico).
   - TXT `@`: 3 registros `google-site-verification=...` (copiar de Hostinger).
   - TXT `google._domainkey` → DKIM de Google (`v=DKIM1; k=rsa; p=MIIBIjANBgkq...`,
     copiar el valor completo — crítico para que los correos no caigan en spam).
   - TXT `_dmarc` → `v=DMARC1; p=none; rua=mailto:dmarc-reports@...` (copiar completo).
   - TXT `@` SPF: dejar UNO solo. Hallazgo 2026-07-14: la situación actual es PEOR
     de lo anotado — hay un registro malformado (`_spf.google.com ~all`, sin el
     prefijo `v=spf1`, no es SPF válido) y el único SPF válido
     (`v=spf1 include:_spf.mail.hostinger.com ~all`) **NO autoriza a Google** →
     el correo saliente de Google Workspace hoy sale con SPF softfail y es más
     propenso a caer en spam. La migración lo corrige de paso con:
     `v=spf1 include:_spf.google.com include:_spf.mail.hostinger.com ~all`
   - A apex y CNAME www → los crea Netlify automáticamente.
   Nota tranquilizadora para el usuario: las cuentas/correos de Google NO viven en
   el DNS; solo hay que copiar estos registros para que el flujo de correo no se
   interrumpa. Con ambas zonas respondiendo lo mismo durante la propagación, el
   corte es de cero segundos.
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

---

## Cierre 2026-07-14: análisis final de verificación y estado exacto para retomar

> Esta sección existe para que cualquier chat/persona nueva retome SIN re-investigar.
> **La causa ya está probada tres veces. NO volver a sospechar del SSR.**

### Medición final de cierre (2026-07-14, caché DNS frío, misma máquina)

| URL (mismo deploy SSR en ambas)  | DNS       | Total      |
|----------------------------------|-----------|------------|
| https://maslatino.netlify.app/   | 0.05s     | **1.15s**  |
| https://maslatino.com/           | **12.04s**| **13.41s** |

El propio usuario lo confirmó a ojo: el `.netlify.app` "carga inmediatamente",
el `.com` "se tarda ~30 segundos". Misma app, mismo SSR, mismo CDN — la única
diferencia es qué nameservers resuelven el dominio. **Causa: DNS. Cerrado.**

### Qué quedó hecho (no repetir)

1. Zona DNS `maslatino.com` creada en Netlify: id `6a56e0e1b84b9b56a977c555`,
   cuenta `aaronthereal` (visible en app.netlify.com → Domains).
2. Los **14 registros** copiados y verificados respondiendo en `dns1.p07.nsone.net`
   (~81ms): NETLIFY apex + www, MX `SMTP.GOOGLE.com` prio 1, 3 TXT
   `google-site-verification`, SPF corregido (uno solo, ahora incluye a Google),
   DKIM `google._domainkey` completo, DMARC (copiado tal cual; malformado en
   origen: `rua=mailto:dmarc-reports@` sin dominio — mejorable algún día),
   `admin` CNAME → `cname.vercel-dns.com` (Vercel), `api` A → `18.191.71.237`
   (AWS), `ftp` A → `62.72.49.192`, `autoconfig`/`autodiscover` CNAME → Hostinger.
3. Registrador confirmado por RDAP: **GoDaddy.com, LLC** (Hostinger solo presta
   el DNS de parking; por eso el cambio NO se hace en Hostinger).
4. El correo Google Workspace NO corre riesgo: ambas zonas responden lo mismo
   durante la propagación; las cuentas viven en Google, no en el DNS.

### ⏳ ÚNICO PASO PENDIENTE (usuario, en GoDaddy, ~2 min)

Verificado al cierre (RDAP + resolver público): los NS del registro **siguen
siendo `ns1/ns2.dns-parking.com`** → el cambio en GoDaddy aún no se guarda.

GoDaddy → Mis productos → maslatino.com → **Servidores de nombres** →
"Cambiar servidores de nombres" → "Ingresaré mis propios servidores" → poner los 4:
`dns1.p07.nsone.net`, `dns2.p07.nsone.net`, `dns3.p07.nsone.net`, `dns4.p07.nsone.net`
→ Guardar (aceptar la advertencia genérica; puede pedir código de verificación).
NO tocar nada en Hostinger (especialmente NO su botón "Reset DNS records").

### Cómo verificar cuando el usuario diga "listo"

```powershell
# 1. ¿Ya se delegó? (debe mostrar dns1-4.p07.nsone.net)
Resolve-DnsName maslatino.com -Type NS -Server 8.8.8.8

# 2. Velocidad real (dns debe bajar de ~12s a <0.3s)
ipconfig /flushdns; curl.exe -o NUL -s -w 'dns:%{time_namelookup}s total:%{time_total}s' https://maslatino.com/

# 3. Correo intacto (debe seguir siendo SMTP.GOOGLE.com prio 1)
Resolve-DnsName maslatino.com -Type MX -Server 8.8.8.8
```

Resultado esperado tras propagar (15 min-24h, típico <1h): primera visita ~1s,
correo sin interrupción, SSR y SEO intactos. Con eso, esta bitácora se cierra.

---

## 🎉 RESUELTO — 2026-07-14: verificación final tras el cambio de nameservers en GoDaddy

El usuario cambió los nameservers en GoDaddy. Propagación confirmada y medida
el mismo día (fue casi instantánea, no tardó las 15min-24h previstas):

### 1. Delegación propagada

- Resolver de Google (8.8.8.8): `dns1-4.p07.nsone.net` ✅
- Resolver de Cloudflare (1.1.1.1): `dns1-4.p07.nsone.net` ✅
- (RDAP de Verisign dio timeout puntual — no es señal de nada, los dos
  resolvers públicos ya concuerdan y son la prueba que importa)

### 2. Velocidad — el objetivo se cumplió

| Medición                              | Antes (dns-parking) | Después (Netlify DNS) |
|----------------------------------------|---------------------|------------------------|
| DNS (caché frío)                       | 12.04s              | **0.12s**              |
| Total primera visita                   | 13.41s              | **1.15s**              |
| Total con DNS ya cacheado (uso normal) | ~1s (una vez resuelto)| **0.57-0.64s**       |

3 corridas seguidas confirman consistencia (0.64s / 0.57s / 0.59s total).
Como referencia, `maslatino.netlify.app` (siempre tuvo DNS sano) midió
0.96-1.02s en las mismas corridas — **maslatino.com ahora es igual de
rápido o más**, sin haber tocado el SSR ni el código.

### 3. Correo Google Workspace — intacto, cero interrupción

MX (`smtp.google.com` prio 1), las 3 verificaciones de Google, SPF (corregido,
ahora sí incluye a Google), DKIM y DMARC: todos responden igual que antes de
migrar, verificado en el resolver público tras la propagación.

### 4. Todo lo demás — intacto

`www.maslatino.com` → 200. `admin.maslatino.com` (Vercel) y `api.maslatino.com`
(AWS) siguen resolviendo a sus valores originales.

### Veredicto final

**La causa raíz (DNS de dns-parking) queda confirmada y CERRADA.** El SSR y el
código nunca fueron el problema — quedó exonerado formalmente cuatro veces
(capítulos 3, 6, 7, 8) y esta corrida final lo remata: con el DNS sano, el
sitio con SSR completo carga en ~0.6s, a la par de un subdominio que nunca
tuvo el problema. No queda ninguna investigación de rendimiento pendiente en
esta bitácora. Cualquier lentitud futura en maslatino.com es un problema nuevo,
no una recaída de este.
