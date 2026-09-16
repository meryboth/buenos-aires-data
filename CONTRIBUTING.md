# Cómo colaborar

¡Gracias por querer sumarte a **Buenos Aires Data Driven**! Es un proyecto abierto que cruza urbanismo, GIS y 3D web
para leer la ciudad con datos abiertos. Hay lugar para perfiles muy distintos: no hace falta saber de todo.

## Quiénes pueden aportar

| Perfil | Aportes posibles |
|---|---|
| Urbanismo y planificación | Proponer preguntas y análisis, revisar metodologías, detectar lecturas equivocadas de la normativa |
| GIS y datos | Sumar datasets, mejorar el cruce por parcela, validar resultados contra la realidad, capas hechas en QGIS |
| Desarrollo web / 3D | Nuevos análisis, interfaz, rendimiento, accesibilidad, publicación |
| Diseño | Visualización, leyendas, experiencia en celular |
| Documentación y comunicación | Explicar resultados, tutoriales, traducciones |

## Por dónde empezar

1. Mirá los [issues abiertos](https://github.com/meryboth/buenos-aires-data/issues), especialmente los marcados con
   `good first issue` o `help wanted`.
2. Si querés trabajar en algo, comentalo en el issue para que no se dupliquen esfuerzos.
3. ¿Tenés una idea que no está? Abrí un issue con la plantilla **Propuesta de análisis** o **Mejora** antes de
   programar: así lo conversamos primero.

Algunas ideas para arrancar:

- **Análisis "Sol y sombra":** sombras de invierno con la ciudad actual y con la envolvente completa.
- **Análisis "Densidad y transporte":** capacidad remanente según la distancia a subte, tren y Metrobus.
- **Carga progresiva:** mostrar primero una versión liviana de los edificios y completar el detalle después.
- **Escala barrio:** mostrar todas las construcciones con el mapa alejado sin que los tiles pesen demasiado.
- **Validación:** comparar la categoría de parcelas conocidas con lo que se ve en la calle.
- **Pruebas:** tests unitarios para `scripts/lib/zoning.mjs` (normalización de SMP y clasificación).

## Preparar el entorno

Requisitos: Node.js 20.11 o superior y ~2 GB libres. Para las pruebas automáticas, Edge o Chrome instalado.

```bash
git clone https://github.com/<tu-usuario>/buenos-aires-data.git
cd buenos-aires-data
npm install
npm run dev         # http://localhost:5180 (los datos procesados ya vienen en el repositorio)
```

El [README](README.md) explica la arquitectura, el pipeline de datos y cómo
[agregar un análisis](README.md#cómo-agregar-un-análisis).

## Flujo de trabajo

1. Hacé un fork y creá una rama descriptiva: `analisis/sol-y-sombra`, `fix/ficha-parcela`, `docs/tutorial-qgis`.
2. Hacé cambios chicos y enfocados; un pull request por tema.
3. Antes de abrir el pull request, verificá:

   ```bash
   npm run typecheck
   npm run build
   npm run smoke -- http://localhost:5180/ captura.png --all-layers
   ```

4. Si el cambio puede afectar el rendimiento (capas, tiles, hover), corré el benchmark antes y después y pegá los
   números en el pull request:

   ```bash
   npm run build && npm run preview
   npm run bench -- http://localhost:4180/ --runs=3
   ```

5. Si cambia la interfaz, sumá capturas al pull request. Si cambia algo visible en la documentación, podés regenerar las
   imágenes con `npm run docs:screenshots`.
6. Abrí el pull request completando la plantilla. La verificación automática (tipos y build) tiene que pasar.

### Mensajes de commit

En español, en imperativo y describiendo el cambio: `Agrega análisis de sol y sombra`,
`Corrige el filtro de la envolvente con zoom bajo`.

## Convenciones del código

- **TypeScript estricto** en `src/`; scripts de datos en JavaScript moderno (`.mjs`).
- **Textos y comentarios en español** (de Argentina). Los comentarios explican el *por qué*, no el *qué*.
- **Sin frameworks de interfaz:** componentes simples que generan HTML (`src/ui/`). Todo texto que venga de datos se
  escapa con `esc()`.
- **Colores:** las categorías viven en `src/config.ts`. Si agregás colores de datos, validá que se distingan con visión
  de colores atípica y acompañalos siempre con texto.
- **Rendimiento en MapLibre:** agregar capas, cambiar filtros o colores que dependen de los datos reprocesa toda la
  fuente. Leé la sección [Rendimiento](README.md#rendimiento) antes de tocar `src/layers/`.
- **Datos:** los datos procesados (`public/tiles/*.pmtiles`, `public/data/`) sí se versionan porque el sitio publicado
  los necesita. Regeneralos y commitealos sólo si cambian los datos de origen o el pipeline (cada versión suma ~65 MB al
  historial), en un commit aparte. Nunca subas las descargas crudas: van al caché fuera del proyecto.

## Datos y metodología

Los resultados de este proyecto se leen como afirmaciones sobre la ciudad, así que la metodología importa tanto como el
código:

- Documentá cada supuesto en la pestaña **Método** del análisis y en el README.
- Explicitá los límites (qué no modela el cálculo, qué tan actual es el dato).
- Evitá lecturas que puedan malinterpretarse; por ejemplo, "más alto que el código actual" no implica infracción.
- Citá las fuentes y respetá sus licencias (BA Data publica bajo CC BY 2.5 AR).

## Reportar errores

Usá la plantilla **Reporte de error** e incluí pasos para reproducirlo, navegador y sistema, y una captura si es
visual. Si el error es en los datos (una parcela mal clasificada, por ejemplo), indicá el SMP de la parcela.

## Código de conducta

Este proyecto sigue un [código de conducta](CODE_OF_CONDUCT.md). Al participar, te comprometés a respetarlo.

## Licencia

Al contribuir, aceptás que tu aporte se publique bajo la [licencia MIT](LICENSE) del proyecto.
