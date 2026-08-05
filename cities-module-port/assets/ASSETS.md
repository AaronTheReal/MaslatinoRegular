# Assets del módulo Cities

Los binarios **no están incluidos** en este paquete: son ~30 MB y duplicarlos dentro del repo no compensa. Aquí tienes el inventario exacto y los comandos para copiarlos desde el proyecto de origen.

---

## 1. `assets/cyties/` — fotos de ciudad (11 archivos, **28 MB**)

Ruta origen: `frontend/public/assets/cyties/`
Ruta destino esperada por el código: `assets/cyties/`

| Archivo | Peso | Usado en |
|---|---|---|
| `atlanta.png` | 3.2 MB | tarjeta `/cities` + hero |
| `boston.png` | 1.5 MB | tarjeta `/cities` + hero |
| `dallas.png` | 608 KB | tarjeta `/cities` + hero |
| `filadelfia.png` | 1.5 MB | tarjeta `/cities` + hero |
| `houston.png` | 832 KB | tarjeta `/cities` + hero |
| `kansas city.png` ⚠️ | **8.4 MB** | tarjeta `/cities` + hero |
| `los angeles.png` ⚠️ | 1.5 MB | tarjeta `/cities` + hero |
| `miami.png` | **6.7 MB** | tarjeta `/cities` + hero |
| `new york.png` ⚠️ | 1.7 MB | tarjeta `/cities` + hero |
| `san francisco.png` ⚠️ | 744 KB | tarjeta `/cities` + hero |
| `seattle.png` | 1.4 MB | tarjeta `/cities` + hero |

⚠️ **Cuatro nombres contienen un espacio** y se referencian URL-encodeados (`kansas%20city.png`) en dos sitios: los `style="background-image: url(...)"` de `cities.html` y el campo `image` de `CITY_MAP` en `restaurantes.ts`.

Cada imagen se usa dos veces: como fondo de la tarjeta en `/cities` (`aspect-[1.72/1]`, ~400 px de ancho real) y como hero a pantalla completa en `/restaurantes/:ciudad` (hasta 1500 px, con `NgOptimizedImage` `fill priority`).

---

## 2. `assets/iconospartes/` — iconos (13 archivos, **2 MB**)

Ruta origen: `frontend/public/assets/iconospartes/`
Ruta destino esperada por el código: `assets/iconospartes/`

**Categorías** (referenciados en `partes.ts` y en el hero de cada `parte-*`):

| Archivo | Sección |
|---|---|
| `eventos.webp` | Events |
| `hangout.webp` | Hang out |
| `fanzone.webp` | Fan Zone |
| `turismo.webp` | Tourism |
| `restaurantes.webp` | The best restaurants |

**Clima** (referenciados en `weather-service.ts`; los nombres son claves del contrato, no decoración):

| Archivo | Condición devuelta por la API |
|---|---|
| `sol.svg` | `soleado` |
| `nube-sol.svg` | `parcialmente-nublado` |
| `nube.svg` | `nublado` |
| `lluvia.svg` | `lluvia` |
| `tormenta.svg` | `tormenta` |
| `nieve.svg` | `nieve` |
| `termometro.svg` | fijo — "Feels like" |
| `gota.svg` | fijo — "Chance of rain" |

Si falta alguno de los seis SVG de condición, la tarjeta de clima queda con un icono roto para ese estado del tiempo — y solo se notará el día que haga ese tiempo.

---

## 3. Copiar los assets

Ajusta `DESTINO` a la carpeta pública de tu proyecto (`public/assets` o `src/assets` según tu configuración de Angular).

**PowerShell**
```powershell
$ORIGEN  = "C:\Users\mraar\Desktop\Proyectos\MasLatinoNetwork\frontend\public\assets"
$DESTINO = "C:\ruta\a\tu\proyecto\frontend\public\assets"
Copy-Item -Recurse -Force "$ORIGEN\cyties"        "$DESTINO\"
Copy-Item -Recurse -Force "$ORIGEN\iconospartes"  "$DESTINO\"
```

**Bash**
```bash
ORIGEN="/c/Users/mraar/Desktop/Proyectos/MasLatinoNetwork/frontend/public/assets"
DESTINO="/ruta/a/tu/proyecto/frontend/public/assets"
cp -r "$ORIGEN/cyties" "$ORIGEN/iconospartes" "$DESTINO/"
```

Si necesitas el paquete **autocontenido** (para enviarlo por zip a otra máquina), copia los assets aquí dentro antes de comprimir:

```bash
cp -r frontend/public/assets/cyties frontend/public/assets/iconospartes cities-module-port/assets/
```

---

## 4. Recomendación: optimiza antes de copiar

28 MB de PNG para 11 fotos es desproporcionado, y `miami.png` (6.7 MB) y `kansas city.png` (8.4 MB) se cargan con `priority` en el hero — bloquean el LCP de la página de ciudad.

Convirtiéndolas a WebP a 1600 px de ancho bajas a ~200 KB cada una (**~99 % menos**) sin pérdida visible:

```bash
# requiere ImageMagick
for f in frontend/public/assets/cyties/*.png; do
  out="$(echo "${f%.png}" | tr ' ' '-').webp"
  magick "$f" -resize 1600x -quality 82 "$out"
done
```

El `tr ' ' '-'` aprovecha para quitar los espacios de los nombres. **Si renombras, actualiza los dos sitios que los referencian:**

1. `CITY_MAP` en `pages/restaurantes/restaurantes.ts` — campo `image` de las 11 entradas
2. Los 11 `style="background-image: url('assets/cyties/…')"` de `pages/cities/cities.html`

Y en ese caso desaparece también el `%20` de las rutas, que es una fuente recurrente de errores.
