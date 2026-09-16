# Buenos Aires Data Driven

[![Verificación](https://github.com/meryboth/buenos-aires-data/actions/workflows/ci.yml/badge.svg)](https://github.com/meryboth/buenos-aires-data/actions/workflows/ci.yml)
[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-3dd6a0)](LICENSE)
[![Se buscan colaboradores](https://img.shields.io/badge/se%20buscan-colaboradores-3987e5)](CONTRIBUTING.md)
[![Datos: BA Data](https://img.shields.io/badge/datos-BA%20Data%20·%20CC%20BY%202.5%20AR-8f8d87)](https://data.buenosaires.gob.ar)

**La Ciudad de Buenos Aires en 3D, leída con datos abiertos.** Los 1,4 millones de volúmenes edificados de la ciudad,
con su altura real, cruzados con el Código Urbanístico y otras fuentes de [BA Data](https://data.buenosaires.gob.ar)
para responder preguntas urbanas concretas: ¿cuánto se puede construir todavía?, ¿cómo crece la ciudad en altura?

**👉 Probala en [buenos-aires-data.vercel.app](https://buenos-aires-data.vercel.app)**

![Vista principal: análisis de capacidad constructiva sobre el Microcentro](docs/screenshots/01-capacidad.webp)

<p align="center"><img src="docs/screenshots/intro.gif" alt="Animación de entrada: la cámara vuela desde la vista de la ciudad hasta el Microcentro" width="560"></p>

> **Proyecto open source que busca colaboradores.** Si te interesa la ciudad desde el urbanismo, los datos, el diseño o
> el desarrollo, hay lugar para vos: mirá [Colaborá](#colaborá).

---

## Contenido

- [Qué es](#qué-es)
- [Colaborá](#colaborá)
- [Recorrido por la app](#recorrido-por-la-app)
- [Análisis](#análisis)
  - [Capacidad constructiva](#capacidad-constructiva)
  - [Altura de la ciudad](#altura-de-la-ciudad)
  - [Próximos análisis](#próximos-análisis)
- [Cómo funciona](#cómo-funciona)
- [Puesta en marcha](#puesta-en-marcha)
- [Scripts](#scripts)
- [Pipeline de datos](#pipeline-de-datos)
- [Rendimiento](#rendimiento)
- [Pruebas y benchmark](#pruebas-y-benchmark)
- [Estructura del código](#estructura-del-código)
- [Cómo agregar un análisis](#cómo-agregar-un-análisis)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Hoja de ruta](#hoja-de-ruta)
- [Fuentes, licencias y créditos](#fuentes-licencias-y-créditos)

---

## Qué es

Un visor 3D navegable en el navegador que une **urbanismo, GIS y 3D web**. No es sólo un mapa con edificios: cada vista
es un **análisis** que responde una pregunta sobre la ciudad, con su metodología explícita, estadísticas por barrio y
ficha de cada parcela.

- **1.386.616** volúmenes edificados (Tejido urbano, fotogrametría).
- **318.046** parcelas cruzadas con la normativa vigente del **Código Urbanístico** (diciembre de 2024).
- **48** barrios con estadísticas y rankings.
- Funciona en escritorio y celular, sin claves de API ni servicios pagos.

## Colaborá

Buenos Aires Data Driven es **software libre** (licencia MIT) y crece con aportes de perfiles distintos:

| Si sabés de… | Podés aportar |
|---|---|
| Urbanismo y planificación | Nuevas preguntas y análisis, revisión de metodologías y de la lectura de la normativa |
| GIS y datos | Datasets nuevos, mejoras en los cruces, validación de resultados, capas hechas en QGIS |
| Desarrollo web / 3D | Análisis, interfaz, rendimiento, accesibilidad, publicación |
| Diseño | Visualización, leyendas, experiencia en celular |
| Comunicación | Documentación, tutoriales, difusión de resultados |

**Por dónde empezar:**

1. Leé la [guía para colaborar](CONTRIBUTING.md) y el [código de conducta](CODE_OF_CONDUCT.md).
2. Buscá issues con las etiquetas [`good first issue`](https://github.com/meryboth/buenos-aires-data/labels/good%20first%20issue)
   o [`help wanted`](https://github.com/meryboth/buenos-aires-data/labels/help%20wanted).
3. ¿Tenés una idea? Abrí una [propuesta de análisis](https://github.com/meryboth/buenos-aires-data/issues/new?template=propuesta-de-analisis.yml):
   no hace falta programar para proponer una pregunta sobre la ciudad.

**Se busca ayuda especialmente en:** los análisis *Sol y sombra* y *Densidad y transporte*, la vista a escala barrio
y la validación de resultados en territorio.

## Recorrido por la app

### Selector de análisis

Cada caso de uso se elige desde el panel. Los análisis marcados como *Próximamente* ya están previstos en el registro.

![Selector de análisis abierto](docs/screenshots/04-selector-analisis.webp)

### Ficha de parcela

Al hacer clic en un edificio se abre su ficha: categoría, altura construida frente a la permitida (con un indicador
visual) y datos normativos. Los volúmenes translúcidos muestran **lo que falta construir** hasta el límite del código.

![Ficha de parcela sobre Rivadavia, en Caballito, con la envolvente sin construir](docs/screenshots/02-ficha-parcela.webp)

### Leyenda que filtra

La leyenda flotante funciona como filtro: al elegir una categoría, el resto de la ciudad queda en translúcido.

![Filtro "Más alto que el código actual" sobre el Microcentro](docs/screenshots/03-filtro.webp)

### Zonas

El selector de zona cambia las estadísticas a las de un barrio, centra el mapa y resalta su contorno.

![Palermo seleccionado](docs/screenshots/06-barrio.webp)

### Capas y metodología

La pestaña **Capas** suma recorridos de colectivos, ciclovías y límites de barrios. La pestaña **Método** explica cómo
se calcula cada análisis y enlaza las fuentes.

| Capas | Método |
|---|---|
| ![Pestaña Capas con colectivos y ciclovías](docs/screenshots/08-capas.webp) | ![Pestaña Método](docs/screenshots/07-metodo.webp) |

### Celular

En pantallas chicas el panel pasa a ser una hoja inferior y la leyenda se desliza en horizontal.

<p align="center"><img src="docs/screenshots/09-celular.webp" alt="Vista en celular" width="300"></p>

### Otras funciones

- **Cámara:** animación de entrada, órbita automática, alternancia 2D/3D y botón de vista inicial.
- **Avisos de carga:** "Cargando edificios…" al descargar datos y "Aplicando…" al cambiar de análisis; si el cambio
  tarda, el mapa se atenúa para que no se confunda con el resultado final.
- **Enlaces compartibles:** el análisis activo viaja en la URL (`#capacidad`, `#altura`).
- **Accesibilidad:** colores validados para visión de colores atípica, leyendas siempre con texto, navegación por
  teclado en el panel y respeto de "reducir movimiento" del sistema.

---

## Análisis

### Capacidad constructiva

> **¿Cuánto se puede construir todavía?**

Para cada parcela se compara la altura construida con la máxima que permite el Código Urbanístico.

| Concepto | Definición |
|---|---|
| Altura permitida | Mayor valor entre la *unidad de edificabilidad* y el *plano límite* de la parcela (Código Urbanístico, dic. 2024). La relación entre ambos no es uniforme en el dataset, por eso se toma el máximo. |
| Altura construida | Volumen más alto relevado en la parcela (Tejido urbano). Parcelas sin volúmenes: 0 m (baldíos, playas, espacios abiertos). |
| Tolerancia | ±3 m: tanques, salas de máquinas y cajas de escalera pueden superar el plano límite. |
| Volumen sin construir | Área de la parcela × (permitida − construida), sólo en parcelas con remanente. Es una **cota superior**: no descuenta retiros, fondo libre de manzana ni FOT. |

**Categorías** (escala divergente: azul = puede crecer, gris = en el límite, rojo = supera):

| Color | Categoría | Criterio |
|---|---|---|
| `#3987e5` | Puede crecer +4 pisos | construida más de 12 m por debajo de la permitida |
| `#9ec5f4` | Puede crecer 1 a 4 pisos | entre 3 y 12 m por debajo |
| `#8f8d87` | Ya usa lo permitido | diferencia dentro de ±3 m |
| `#e66767` | Más alto que el código actual | más de 3 m por encima |
| `#eed27a` | Patrimonio protegido | parcela catalogada (tiene prioridad sobre el resto) |
| `#4a4945` | Reglas especiales | distritos sin altura única: urbanizaciones (U), áreas de protección histórica (APH), RUA, etc. |
| `#2e2e2c` | Sin dato | la parcela no figura en el Código Urbanístico publicado |

> **Importante:** "más alto que el código actual" **no implica una infracción**. La mayoría son edificios anteriores a
> la norma vigente; por eso se concentran en los barrios centrales e históricos.

**Resultados (toda la ciudad):**

| Indicador | Valor |
|---|---|
| Parcelas que todavía pueden crecer en altura | **80 %** (35 % más de 4 pisos, 45 % de 1 a 4) |
| Parcelas más altas que el código actual | **3,6 %** (11.556) |
| Parcelas que ya usan lo permitido | 7,7 % |
| Volumen teórico sin construir | ~1.154 millones de m³ |

| Dónde más se puede crecer (volumen) | Dónde más se supera el código actual (% de parcelas) |
|---|---|
| 1. Mataderos — 64 M m³ | 1. Retiro — 19,5 % |
| 2. Flores — 57 M m³ | 2. San Nicolás — 14,0 % |
| 3. Balvanera — 51 M m³ | 3. Recoleta — 13,6 % |
| 4. Villa Lugano — 46 M m³ | 4. San Telmo — 12,4 % |
| 5. Almagro — 45 M m³ | 5. Monserrat — 9,7 % |

### Altura de la ciudad

> **¿Cómo crece la ciudad en altura?**

Cada edificio se pinta con una rampa secuencial de un solo tono según su altura: cuanto más claro, más alto.

![Análisis de altura: Catalinas y Puerto Madero](docs/screenshots/05-altura.webp)

| Indicador (toda la ciudad) | Valor |
|---|---|
| Altura media de lo construido | **9,3 m** (≈ 3 pisos) |
| Parcelas con 10 pisos o más (≥ 30 m) | 5,6 % |
| Parcelas con edificación relevada | 95 % |
| Distribución | 60 % hasta 2 pisos · 25 % de 3 a 4 · 5,6 % de 5 a 8 · 9 % de 9 a 15 · 0,7 % más de 15 |

Barrios más altos por altura media: Retiro (30,1 m), Recoleta (25,4 m), San Nicolás (24,8 m), Monserrat (17,5 m) y
Palermo (16,7 m). Los más bajos rondan los 5 m (Villa Lugano, Villa Soldati, Villa Riachuelo).

La altura media se calcula sobre la altura máxima de cada parcela con edificación; los pisos se estiman a razón de 3 m.

### Próximos análisis

| Análisis | Pregunta |
|---|---|
| Sol y sombra | ¿Qué calles y plazas pierden sol si se construye todo lo permitido? |
| Densidad y transporte | ¿Se puede construir más donde hay subte, tren y Metrobus? |

---

## Cómo funciona

```mermaid
flowchart LR
  subgraph BA["BA Data (datos abiertos)"]
    T[Tejido urbano<br/>1 GB GeoJSON]
    P[Parcelas<br/>438 MB GeoJSON]
    C[Código Urbanístico<br/>CSV por parcela]
    O[Colectivos, ciclovías,<br/>barrios]
  end
  subgraph PIPE["Pipeline Node (npm run data)"]
    B1[build-building-tiles]
    B2[build-parcel-tiles]
    F[fetch-data]
  end
  subgraph OUT["public/"]
    VT1[tiles/buildings.pmtiles<br/>vector tiles z12–z14]
    VT2[tiles/parcels.pmtiles<br/>vector tiles z14]
    J[data/resumen-barrios.json]
    G[data/*.geojson]
  end
  subgraph APP["App web (Vite + TypeScript)"]
    ML[MapLibre GL<br/>edificios y envolvente 3D]
    DK[MapLibre GL<br/>colectivos, ciclovías, barrios]
    UI[Panel, leyenda, ficha]
  end
  T --> B1
  C --> B1
  C --> B2
  P --> B2
  B1 -- altura construida por parcela --> B2
  O --> F
  B1 --> VT1
  B2 --> VT2
  B2 --> J
  F --> G
  VT1 --> ML
  VT2 --> ML
  G --> DK
  J --> UI
```

### Stack

| Pieza | Rol |
|---|---|
| [Vite](https://vite.dev) + TypeScript | Build y servidor de desarrollo; interfaz sin framework |
| [MapLibre GL JS 6](https://maplibre.org) | Todo el mapa: base, edificios y envolvente 3D (`fill-extrusion` sobre vector tiles) y capas de datos (colectivos, ciclovías, barrios) |
| [CARTO Dark Matter](https://github.com/CartoDB/basemap-styles) | Mapa base gratuito, sin API key |
| Node (`geojson-vt` + `vt-pbf`) | Conversión de los GeoJSON gigantes en vector tiles |
| [PMTiles](https://docs.protomaps.com/pmtiles/) | Un archivo por capa de tiles, leído con pedidos por rango desde cualquier hosting estático |
| Space Grotesk + Inter | Tipografías incluidas en el proyecto (sin servicios externos) |
| `puppeteer-core` | Smoke test, benchmark y capturas con el Edge/Chrome instalado |

> Antes el proyecto usaba deck.gl para las capas de datos, lo que obligaba a quedarse en MapLibre 5, con
> una vulnerabilidad crítica (XSS en `DOM.sanitize`). Al reemplazarlo por capas nativas se actualizó a MapLibre 6:
> `npm audit` sin vulnerabilidades, 36 FPS en vez de 28 al girar la cámara y un JS principal de 283 KB (gzip) en vez de
> 498 KB. MapLibre 6 ubica su worker junto a su propio módulo; como Vite cambia esa ruta al empaquetar, `src/main.ts`
> se lo pasa con `setWorkerUrl`.

---

## Puesta en marcha

**Requisitos:** Node.js 20.11 o superior, ~2 GB libres para las descargas y, para las pruebas, Edge o Chrome instalado.

```bash
git clone https://github.com/meryboth/buenos-aires-data.git
cd buenos-aires-data
npm install
# npm run data      # opcional: vuelve a descargar y procesar los datos (~3 min, baja ~1,6 GB)
npm run dev         # http://localhost:5180
```

Los datos ya procesados (`public/tiles/*.pmtiles` y `public/data/`, ~75 MB) **están en el repositorio**, así que
después de `npm install` podés correr `npm run dev` directamente. `npm run data` sólo hace falta para actualizarlos
desde BA Data o después de cambiar el pipeline.

Las descargas crudas se guardan **fuera del proyecto**, en `~/.cache/digital-buenos-aires` (configurable con la
variable `DBA_CACHE_DIR`), para no sincronizar gigas a carpetas como OneDrive. Una segunda corrida reutiliza lo
descargado.

### Publicar

La app publicada está en **[buenos-aires-data.vercel.app](https://buenos-aires-data.vercel.app)** y Vercel la
actualiza con cada push a `main` (configuración en `vercel.json`).

`npm run build` genera un sitio 100 % estático en `dist/`, que sirve en cualquier hosting que acepte pedidos por
rango (`Range`), necesarios para leer los archivos PMTiles: Vercel, Netlify, Cloudflare Pages, GitHub Pages, un bucket
S3/R2, etc. La URL del sitio se define en `.env`:

```bash
VITE_SITE_URL=https://buenos-aires-data.vercel.app
```

Con eso se agregan el enlace canónico y `og:url`, y la miniatura para redes se sirve desde el propio sitio. Si publicás
en otra dirección, cambiala (o dejala vacía para usar la miniatura del repositorio). La app también es instalable
(manifiesto web con íconos para escritorio, Android e iOS).

### Parámetros de URL

| Parámetro | Efecto |
|---|---|
| `#capacidad`, `#altura` | Abre directamente ese análisis |
| `?nointro` | Omite la animación de entrada |
| `?workers=N` | Cantidad de workers de MapLibre (por defecto, 2 a 4 según los núcleos) |
| `?aa=0` / `?aa=1` | Fuerza el antialiasing (por defecto, sólo en pantallas de densidad normal) |
| `?debug` | Expone `window.map` en producción (lo usan las pruebas automáticas) |

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:5180` |
| `npm run build` | Chequeo de tipos y build de producción en `dist/` |
| `npm run preview` | Sirve el build en `http://localhost:4180` |
| `npm run typecheck` | Sólo el chequeo de tipos |
| `npm run data` | Pipeline completo: `data:fetch` + `data:buildings` + `data:parcels` |
| `npm run data:fetch` | Colectivos, ciclovías y barrios → `public/data/` (acepta nombres: `npm run data:fetch -- barrios`) |
| `npm run data:buildings` | Tejido urbano + normativa → `public/tiles/buildings.pmtiles` |
| `npm run data:parcels` | Parcelas + normativa → `public/tiles/parcels.pmtiles` y `public/data/resumen-barrios.json` |
| `npm run smoke` | Prueba de humo con navegador headless ([ver abajo](#pruebas-y-benchmark)) |
| `npm run bench` | Benchmark de rendimiento con GPU real |
| `npm run docs:screenshots` | Regenera las capturas y el GIF de este README |
| `npm run brand` | Regenera íconos, miniatura para redes (`public/og-image.jpg`) y vista previa del repo (`docs/social-preview.jpg`) |

---

## Pipeline de datos

| Capa | Dataset | Procesamiento |
|---|---|---|
| Edificios 3D | [Tejido urbano](https://data.buenosaires.gob.ar/dataset/tejido-urbano) (1,08 GB) | `scripts/build-building-tiles.mjs` |
| Normativa | [Código Urbanístico](https://data.buenosaires.gob.ar/dataset/codigo-urbanistico) (CSV, 318 mil parcelas) | `scripts/lib/zoning.mjs`, se une por SMP |
| Parcelas | [Parcelas catastrales](https://data.buenosaires.gob.ar/dataset/parcelas) (438 MB) | `scripts/build-parcel-tiles.mjs` |
| Colectivos | [Recorridos de colectivos](https://data.buenosaires.gob.ar/dataset/colectivos-recorridos) | `scripts/fetch-data.mjs` |
| Ciclovías | [Ciclovías](https://data.buenosaires.gob.ar/dataset/ciclovias) | `scripts/fetch-data.mjs` |
| Barrios | [Barrios](https://data.buenosaires.gob.ar/dataset/barrios) | `scripts/fetch-data.mjs` |

### Cómo se generan los tiles

Los GeoJSON de BA Data traen un feature por línea, así que se procesan **en streaming**, sin cargarlos enteros en
memoria (`scripts/lib/tiles.mjs`):

1. **Agrupado:** cada feature se escribe en archivos NDJSON por tile del zoom mínimo que toca (con un margen para el
   buffer de los tiles vecinos).
2. **Corte:** por cada grupo, `geojson-vt` corta los tiles de cada zoom y `vt-pbf` los codifica en formato Mapbox Vector
   Tile.
3. **Empaquetado:** los tiles se comprimen con gzip y se escriben en un único archivo
   [PMTiles v3](https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md) por capa (`scripts/lib/pmtiles.mjs`;
   la librería `pmtiles` sólo lee, así que el escritor es propio). En el navegador, el protocolo `pmtiles://`
   (`src/layers/pmtiles.ts`) pide cada tile con un pedido por rango y guarda los ya leídos en una caché compartida.

| Tiles | Zooms | Filtro por zoom | Resultado |
|---|---|---|---|
| Edificios | z12–z14 (z15+ se sobre-amplía) | z12: ≥ 30 m · z13: ≥ 9 m · z14: todos | `buildings.pmtiles`: 92 tiles, 47,5 MB |
| Parcelas | z14 | todas | `parcels.pmtiles`: 67 tiles, 16,7 MB |

Cada volumen lleva su altura, el SMP de la parcela y las propiedades del análisis (`hcons` altura construida máxima de
la parcela, `perm` altura permitida, `cat` categoría y `dist` distrito especial). El id va en el campo nativo del tile.

### Detalles y decisiones

- **SMP normalizado.** Cada dataset escribe el código de parcela distinto (`087-006A-015`, `87-006A-015`,
  `055 - 200 - 005`); se normaliza antes de unir. El cruce cubre el **97,4 %** de las parcelas con edificios.
- **Alturas dudosas.** Valores mayores a 300 m son errores de relevamiento (el edificio más alto de la ciudad ronda los
  235 m); se acotan, quedan marcados como `sospechosa` y no cuentan para la altura de la parcela.
- **GeoJSON del Código Urbanístico corrupto.** El archivo publicado empieza a mitad de un registro; se usa el CSV, que
  trae la misma información por parcela.
- **Acceso al portal.** BA Data rechaza clientes sin User-Agent de navegador; los scripts lo envían.
- **Resumen por barrio.** `build-parcel-tiles` calcula, para la ciudad y cada barrio, la cantidad de parcelas por
  categoría, el volumen sin construir y las estadísticas de altura. La app lo lee de `resumen-barrios.json`.

---

## Rendimiento

La app se optimizó midiendo cada cambio con `npm run bench` (mediana de 5 corridas, notebook con Ryzen 9 4900HS y
Radeon integrada, vista inicial en 1400×850):

| Métrica | Antes | Después |
|---|---|---|
| Carga hasta ver todo | 15,8 s | **5,5 s** |
| FPS girando la cámara | 28 | **40** |
| Cuadros lentos (percentil 95) | 245 ms | **57 ms** |
| Datos de tiles descargados en la prueba | 20,2 MB | 17,5 MB (comprimidos) |
| JavaScript principal (gzip) | 498 KB | **283 KB** |
| Peso total de los tiles | 162 MB en ~200 archivos | **64 MB en 2 archivos** |

**Qué se hizo y por qué:**

- **Una fuente por vista y carga diferida.** En MapLibre, agregar una capa, cambiar un filtro o un color que depende de
  los datos reprocesa *toda* la fuente con todas sus capas. Cada vista (capacidad, altura y filtro) usa su propia
  fuente sobre los mismos tiles y se crea recién al usarla; después se alterna por opacidad, que es instantáneo.
  Precargar la vista de altura costaba ~7 s, y separar cada categoría en su propia capa duplicaba el trabajo.
- **Más workers.** MapLibre procesa los tiles con un solo worker salvo en Safari; con 2 a 4 la carga baja ~20 %.
  Más de 4 no mejora.
- **Envolvente liviana.** Una sola capa, sólo desde zoom 14 y sin descargar parcelas fuera del análisis de capacidad
  (costaba ~4 s de carga y 10 FPS).
- **Tiles más chicos.** El id va en el campo nativo del tile y no además como propiedad (−18 %), y cada tile va
  comprimido con gzip dentro del PMTiles (−50 %).
- **Caché de tiles compartida.** Las vistas usan fuentes distintas sobre el mismo archivo; una caché en memoria (con tope
  de 96 MB) evita descargar dos veces el mismo tile al cambiar de análisis.
- **Hover.** Como máximo una consulta por cuadro y ninguna con la cámara en movimiento.
- **Sin deck.gl.** Las capas de datos son nativas de MapLibre: menos JavaScript, un solo motor de dibujo y las capas de
  colectivos y ciclovías se descargan recién al activarlas.
- **Antialiasing sólo en pantallas comunes.** En GPUs integradas cuesta ~25 % de FPS y en pantallas de alta densidad
  casi no se nota.
- **Opacidad exactamente 1** en las capas activas: MapLibre dibuja las extrusiones en una sola pasada.
- **Pantalla de carga** que se va con los primeros edificios; el resto se completa con un aviso.

**Compensaciones:** el primer cambio a "Altura" y el primer filtro tardan ~1–2 s (procesan su fuente, con aviso en
pantalla); los siguientes son instantáneos. La caché de tiles suma unos MB de memoria.

---

## Pruebas y benchmark

Las pruebas usan el Edge o Chrome instalado (`puppeteer-core`, sin descargar navegadores). Si no está en la ruta
habitual, definí `BROWSER_PATH`.

```bash
# Prueba de humo: carga, errores de consola, clic en un edificio y captura
npm run smoke -- http://localhost:5180/ captura.png --all-layers --at=-58.4435,-34.6195,16.3

# Benchmark contra el build de producción
npm run build
npm run preview
npm run bench -- http://localhost:4180/ --runs=5
```

| Opción del smoke test | Efecto |
|---|---|
| `--all-layers` | Activa todas las capas antes de verificar |
| `--at=lon,lat,zoom[,pitch,bearing]` | Posiciona la cámara |

El benchmark usa la GPU real (`--use-angle=d3d11`) e informa carga, datos descargados por la página y sus workers,
memoria, FPS orbitando, costo del hover y tiempos de cambio de análisis y de filtro.

---

## Estructura del código

```
├─ index.html              metadatos (SEO, Open Graph, datos estructurados), pantalla de carga e interfaz
├─ public/                 favicon, íconos, manifiesto web, miniatura, datos (data/) y tiles (tiles/*.pmtiles)
├─ vite.config.ts          sirve los PMTiles con pedidos por rango, metadatos según VITE_SITE_URL y puertos
├─ vercel.json             build y caché del sitio publicado
├─ scripts/
│  ├─ fetch-data.mjs       datasets livianos → public/data
│  ├─ build-building-tiles.mjs
│  ├─ build-parcel-tiles.mjs
│  ├─ smoke.mjs            prueba de humo
│  ├─ bench.mjs            benchmark
│  ├─ screenshots.mjs      capturas de este README
│  ├─ brand-assets.mjs     íconos, miniatura para redes y vista previa del repo
│  └─ lib/
│     ├─ common.mjs        descargas, caché y utilidades
│     ├─ tiles.mjs         generador genérico de vector tiles en streaming
│     ├─ pmtiles.mjs       escritor de archivos PMTiles v3
│     └─ zoning.mjs        normativa por parcela y clasificación
├─ src/
│  ├─ main.ts              arranque, estado, cámara, hover y clics
│  ├─ config.ts            vista inicial, mapa base, rampas y categorías
│  ├─ analysis.ts          tipos del resumen y datos de la ficha
│  ├─ analyses/            un módulo por análisis + registro
│  ├─ layers/
│  │  ├─ buildings.ts      vistas de edificios (una fuente por vista)
│  │  ├─ envelope.ts       envolvente permitida sin construir
│  │  ├─ pmtiles.ts        protocolo pmtiles:// con caché compartida
│  │  └─ transport.ts      capas de datos (colectivos, ciclovías, barrios)
│  ├─ ui/                  panel, leyenda, ficha, herramientas, avisos y gráficos
│  └─ style.css
└─ docs/                   capturas de la documentación y vista previa del repo
```

---

## Cómo agregar un análisis

Cada análisis es un objeto `AnalysisDef` (`src/analyses/types.ts`):

```ts
export const miAnalisis: AnalysisDef = {
  id: 'mi-analisis',                 // también se agrega al tipo AnalysisId
  title: 'Título en el selector',
  question: '¿Qué pregunta responde?',
  description: 'Una oración que explique cómo se lee el mapa.',
  status: 'disponible',              // o 'proximamente'
  icon: '<path d="…"/>',             // contenido de un <svg> de 24×24
  diagram: '<svg …>…</svg>',         // opcional: diagrama de la tarjeta explicativa
  colorMode: 'normativa',            // cómo se pintan los edificios
  envelope: false,                   // mostrar la envolvente sin construir
  filterable: false,                 // la leyenda filtra categorías
  stats: ({ area, summary, focus }) => '…',  // HTML de las estadísticas (ciudad o barrio)
  rankings: (summary) => [ … ],               // rankings de barrios
  method: (summary) => '…',                   // texto de la pestaña Método
};
```

1. Crear el módulo en `src/analyses/` (ver `capacidad.ts` y `altura.ts`).
2. Registrarlo en `ANALYSES` (`src/analyses/index.ts`).
3. Si necesita datos nuevos por barrio, agregarlos en `scripts/build-parcel-tiles.mjs` y en el tipo `AreaSummary`.
4. Si necesita otra forma de pintar los edificios, sumar una vista en `src/layers/buildings.ts` con **su propia fuente**
   (ver [Rendimiento](#rendimiento)).

`src/ui/charts.ts` ofrece piezas listas: indicadores (`kpi`), barra apilada con desglose (`stackWithBreakdown`) y
rankings (`rankingsHtml`).

---

## Limitaciones conocidas

- **Normativa simplificada.** No se modelan retiros, fondo libre de manzana ni FOT; el volumen sin construir es una
  cota superior útil para comparar barrios, no una cifra de mercado.
- **Altura relevada.** La fotogrametría incluye elementos de azotea, y el relevamiento puede no reflejar obras
  recientes.
- **Cruce incompleto.** Un 2,6 % de las parcelas con edificios no tiene normativa asociada.
- **Vista de barrio.** Con el mapa alejado (zoom 13) se ocultan las construcciones de menos de 9 m para aligerar los
  tiles, y en los barrios bajos predomina la envolvente.
- **Subte.** Se dejó fuera por ahora.
- **Datos en el repositorio.** Cada regeneración de los tiles suma ~65 MB al historial de git; conviene actualizarlos
  sólo cuando cambian los datos de origen o el pipeline.

## Hoja de ruta

¿Querés tomar alguno de estos puntos? Comentalo en un issue o abrí uno nuevo (ver [Colaborá](#colaborá)).

- [ ] Análisis **Sol y sombra**.
- [ ] Análisis **Densidad y transporte**.
- [x] Publicar la app: tiles en **PMTiles** en un hosting estático ([Vercel](https://buenos-aires-data.vercel.app)).
- [ ] Mostrar todas las construcciones a escala barrio.
- [ ] Vehículos en tiempo real con la API de Transporte de la Ciudad (requiere credenciales).
- [ ] Sumar capas producidas en QGIS (GeoJSON o GeoPackage) al pipeline.

---

## Fuentes, licencias y créditos

- **Datos:** [BA Data](https://data.buenosaires.gob.ar), Gobierno de la Ciudad de Buenos Aires. Los datasets usados se
  publican bajo licencia [Creative Commons Atribución 2.5 Argentina](https://creativecommons.org/licenses/by/2.5/ar/)
  (ver la ficha de cada dataset).
- **Mapa base:** © [CARTO](https://carto.com/attributions) · © colaboradores de
  [OpenStreetMap](https://www.openstreetmap.org/copyright).
- **Librerías:** MapLibre GL JS (BSD-3), PMTiles (BSD-3), Vite (MIT), geojson-vt (ISC), vt-pbf (MIT), puppeteer-core
  (Apache-2.0), Inter y Space
  Grotesk (SIL OFL).
- **Código de este repositorio:** [licencia MIT](LICENSE). Las contribuciones se publican bajo la misma licencia.
