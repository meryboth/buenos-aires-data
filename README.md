# Buenos Aires Data Driven

La ciudad en 3D leída con datos abiertos ([BA Data](https://data.buenosaires.gob.ar)): 1,4 millones de
volúmenes edificados con su altura real, y un selector de **análisis** que responde preguntas urbanas sobre esa base.

## Análisis disponibles

| Análisis | Pregunta | Estado |
|---|---|---|
| Capacidad constructiva | ¿Cuánto se puede construir todavía? | disponible |
| Altura de la ciudad | ¿Cómo crece la ciudad en altura? | disponible |
| Sol y sombra | ¿Qué calles y plazas pierden sol si se construye todo lo permitido? | próximamente |
| Densidad y transporte | ¿Se puede construir más donde hay subte, tren y Metrobus? | próximamente |

Cada análisis es un módulo en `src/analyses/` (pregunta, diagrama, colores, estadísticas, rankings y metodología)
registrado en `src/analyses/index.ts`. El análisis activo viaja en el hash de la URL (`#capacidad`, `#altura`).

### Capacidad constructiva: altura construida vs. permitida

Para cada una de las 318.046 parcelas:

- **Permitido:** mayor valor entre la unidad de edificabilidad y el plano límite (Código Urbanístico, normativa a dic. 2024).
- **Construido:** volumen más alto relevado en la parcela (Tejido urbano, fotogrametría).
- **Categorías:** remanente > 4 pisos (> 12 m) · remanente 1–4 pisos · en el límite (±3 m, por tanques y salas de
  máquinas) · supera la norma · catalogado (protección patrimonial) · normativa especial (U, APH, RUA…) · sin dato.
- **Envolvente permitida sin construir:** volumen translúcido desde la altura construida hasta la permitida.
- **Resumen por barrio** (`public/data/resumen-barrios.json`): proporción por categoría y volumen teórico remanente
  (área × diferencia de altura; cota superior que ignora retiros, fondo libre de manzana y FOT).

Resultado actual: 80 % de las parcelas tiene capacidad remanente y 3,6 % supera la altura permitida, concentradas en
Retiro, San Nicolás, Recoleta y San Telmo. **Superar la norma actual no implica irregularidad:** muchos edificios son
anteriores al código vigente.

Límites conocidos: el cruce por SMP cubre el 97,4 % de las parcelas con edificios; la altura fotogramétrica
incluye elementos de azotea; no se modelan retiros ni el FOT.

### Altura de la ciudad

Edificios pintados con una rampa secuencial por altura; altura media construida, proporción de parcelas con 10 pisos
o más y distribución por rangos de pisos, para la ciudad y cada barrio.

## Interfaz

- Panel con pestañas (Explorar / Capas / Método), selector de análisis y de zona (ciudad o barrio).
- Leyenda flotante que filtra categorías: las no elegidas quedan como volúmenes translúcidos.
- Ficha de parcela con indicador visual construido vs. permitido.
- Animación de entrada (se omite con `?nointro` o con "reducir movimiento"), órbita automática y cambio 2D/3D.
- Avisos de carga: "Cargando edificios…" al descargar tiles y "Aplicando…" al cambiar de análisis si el mapa tarda.

## Rendimiento

`npm run bench` mide la app con GPU real (Edge/Chrome headless con ANGLE D3D11): carga, datos descargados, memoria,
FPS orbitando, hover y cambio de análisis. Medir contra el build de producción:

```bash
npm run build
npm run preview                                   # http://localhost:4180
npm run bench -- http://localhost:4180/ --runs=5
```

Mediana de 5 corridas en una notebook con Ryzen 9 4900HS y Radeon integrada, vista inicial (Microcentro, 1400×850):

| Métrica | Antes | Después |
|---|---|---|
| Carga hasta ver todo | 15,8 s | 5,9 s |
| Tiles descargados | 20,2 MB | 17,5 MB |
| Memoria JS | 28 MB | 23 MB |

Qué se hizo y por qué:

- **Una fuente por vista y carga diferida.** En MapLibre, agregar una capa, cambiar un filtro o un color que depende de
  los datos reprocesa *toda* la fuente con todas sus capas. Cada vista (capacidad, altura y filtro) usa su propia fuente
  sobre los mismos tiles y se crea recién al usarla; después se alterna por opacidad (instantáneo). Precargar la vista de
  altura costaba ~7 s y separar cada categoría en su propia capa duplicaba el trabajo.
- **Más workers.** MapLibre 5 procesa tiles con un solo worker salvo en Safari; con 2 a 4 la carga baja ~20 %.
- **Envolvente liviana.** Una sola capa, sólo desde zoom 14 y sin descargar parcelas fuera del análisis de capacidad
  (costaba ~4 s y 10 FPS).
- **Tiles más chicos.** El id va en el campo nativo del tile y no como propiedad (−18 %).
- **Hover.** Una consulta por cuadro como máximo, ninguna con la cámara en movimiento, y sin leer píxeles de deck.gl si
  no hay capas de líneas activas.
- **Antialiasing sólo en pantallas comunes.** En GPUs integradas cuesta ~25 % de FPS y en pantallas de alta densidad
  casi no se nota (`?aa=0|1` lo fuerza).
- **Opacidad exactamente 1** en las capas activas: MapLibre dibuja las extrusiones en una sola pasada.
- **Pantalla de carga** que se va con los primeros edificios; el resto se completa con un aviso.

Compensaciones: el primer cambio a "Altura" y el primer filtro tardan ~1–2 s (procesan su fuente, con aviso en pantalla);
los siguientes son instantáneos. Al publicar, servir los tiles comprimidos: con gzip pesan la mitad.

## Stack

| Pieza | Rol |
|---|---|
| [Vite](https://vite.dev) + TypeScript | Build y servidor de desarrollo |
| [MapLibre GL JS 5](https://maplibre.org) | Mapa base y edificios 3D (`fill-extrusion` sobre vector tiles) |
| [deck.gl 9](https://deck.gl) (`MapboxOverlay` intercalado) | Capas de datos (colectivos, ciclovías, barrios) |
| Mapa base CARTO Dark Matter | Gratis, sin API key (requiere atribución) |
| Node (`geojson-vt` + `vt-pbf`) | Pipeline que convierte el GeoJSON del tejido urbano en tiles |

> MapLibre se mantiene en v5 porque deck.gl 9.4 todavía no es compatible con MapLibre 6
> (usa `map.transform`, que v6 hizo privado). `npm audit` avisa de un XSS en
> `DOM.sanitize` de v5; el proyecto no inserta HTML de terceros vía MapLibre. Migrar cuando deck.gl lo soporte.

## Puesta en marcha

```bash
npm install
npm run data        # descarga datasets y genera tiles (~3 min, baja ~1,6 GB la primera vez)
npm run dev         # http://localhost:5180
```

`npm run smoke -- http://localhost:5180/ captura.png [--all-layers] [--at=lon,lat,zoom]` abre la app en Edge/Chrome
headless, verifica que el mapa cargue sin errores, hace clic en un edificio y guarda una captura.

## Datos

| Capa | Dataset | Procesamiento |
|---|---|---|
| Edificios 3D | [Tejido urbano](https://data.buenosaires.gob.ar/dataset/tejido-urbano) (1,08 GB GeoJSON) | `scripts/build-building-tiles.mjs` → `public/tiles/buildings/` |
| Normativa | [Código Urbanístico](https://data.buenosaires.gob.ar/dataset/codigo-urbanistico) (CSV por parcela; el GeoJSON oficial está corrupto) | se une por SMP en ambos scripts de tiles |
| Parcelas | [Parcelas catastrales](https://data.buenosaires.gob.ar/dataset/parcelas) (438 MB GeoJSON) | `scripts/build-parcel-tiles.mjs` → `public/tiles/parcels/` + resumen por barrio |
| Colectivos | [Recorridos de colectivos](https://data.buenosaires.gob.ar/dataset/colectivos-recorridos) | `scripts/fetch-data.mjs` → `public/data/` |
| Ciclovías | [Ciclovías](https://data.buenosaires.gob.ar/dataset/ciclovias) | ídem |
| Barrios | [Barrios](https://data.buenosaires.gob.ar/dataset/barrios) | ídem |

- Las descargas crudas se guardan **fuera del proyecto** (`~/.cache/digital-buenos-aires`, configurable con
  `DBA_CACHE_DIR`) para no sincronizar 1 GB a OneDrive. `public/data` y `public/tiles` están en `.gitignore`.
- El portal de BA Data rechaza clientes sin User-Agent de navegador; los scripts lo envían.
- Tiles de edificios: z12 sólo ≥ 30 m, z13 ≥ 9 m, z14 todos (z15+ se sobre-amplía). Alturas > 300 m se
  consideran errores de relevamiento y se acotan (quedan marcadas con `sospechosa`).
- Los SMP vienen con formatos distintos según el dataset (`087-006A-015`, `87-006A-015`, `055 - 200 - 005`); se normalizan antes de unir.
- Parcelas sólo en z14 (la envolvente no se dibuja más lejos).
- Resultado actual: edificios 92 tiles (~98 MB, máx. 3 MB); parcelas 67 tiles (~32 MB). Con gzip, la mitad.

## Estructura

```
scripts/            pipeline de datos, smoke test y benchmark (scripts/lib: tiles genéricos, normativa)
src/config.ts       vista inicial, mapa base, rampa de alturas y categorías
src/analyses/       casos de uso (capacidad, altura) y registro
src/analysis.ts     tipos del resumen y datos de la ficha
src/layers/         edificios, envolvente (MapLibre) y capas de datos (deck.gl)
src/ui/             panel, dock de leyenda, ficha, herramientas de cámara y avisos de carga
vite.config.ts      sirve los tiles desde disco (204 si no existen, en vez del fallback a index.html)
```

## Próximos pasos posibles

- Implementar los análisis "próximamente" (sol y sombra, densidad y transporte) y otros como evolución temporal.
- Mostrar todas las construcciones a escala barrio (hoy z13 oculta las menores a 9 m por peso de tiles).
- Empaquetar los tiles en un único **PMTiles** para publicar en hosting estático (Cloudflare R2, GitHub Pages).
- Vehículos en tiempo real con la **API de Transporte** de la Ciudad (requiere credenciales).
- Capas producidas en **QGIS** (exportadas a GeoJSON o GeoPackage) sumadas al pipeline.
- Subte (líneas, estaciones y animación a partir del GTFS), pospuesto por ahora.
