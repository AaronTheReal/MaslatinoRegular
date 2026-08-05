# assets/cyties — imágenes de ciudad (PENDIENTE DE COPIAR)

Estas 11 imágenes **no venían en el paquete de portado** (`cities-module-port`)
y no existen en este repositorio: hay que copiarlas desde el proyecto de origen
(MasLatino Network), en `frontend/public/assets/cyties/`.

Hasta que se copien, `/cities` y `/cities/:ciudad` funcionan, pero las tarjetas
y el hero se ven sin foto (queda el fondo gris del contenedor).

## Archivos esperados

Los nombres están referenciados en `frontend/src/models/cities.model.ts`
(constante `CITIES`). Cuatro llevan un espacio en el nombre:

| Archivo | Peso original |
|---|---|
| `atlanta.png` | 3.2 MB |
| `boston.png` | 1.5 MB |
| `dallas.png` | 608 KB |
| `filadelfia.png` | 1.5 MB |
| `houston.png` | 832 KB |
| `kansas city.png` | 8.4 MB |
| `los angeles.png` | 1.5 MB |
| `miami.png` | 6.7 MB |
| `new york.png` | 1.7 MB |
| `san francisco.png` | 744 KB |
| `seattle.png` | 1.4 MB |

## Recomendado: convertir a WebP antes de copiarlas

28 MB para once fotos es desproporcionado, y `kansas city.png` (8.4 MB) se
carga en el hero con prioridad alta, así que bloquea la métrica LCP. Al
convertirlas conviene además quitar los espacios del nombre:

```bash
# Ejemplo con ImageMagick, desde la carpeta de origen
for f in *.png; do
  cwebp -q 82 -resize 1600 0 "$f" -o "${f// /-}"
  # produce kansas-city.webp, los-angeles.webp, ...
done
```

Si las renombras, actualiza el campo `image` de cada entrada en `CITIES`
(`frontend/src/models/cities.model.ts`). Es el **único** sitio donde viven esas
rutas: en el módulo de origen estaban repetidas en el HTML y en un mapa aparte.
