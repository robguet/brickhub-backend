# Feature Specification: Contenido persistente de Radar BrickHub

**Feature Branch**: `main` (rama existente; sin hook de creación)

**Created**: 2026-10-05

**Status**: Draft — validada para planificación

**Input**: User description: "Reemplazar las noticias hardcodeadas de Radar por contenido persistente, cubrir Rumores, Lanzamientos, Reseñas y TOPS y el contenido completo de cada post; adaptar el JSON proporcionado para crecimiento y futura consulta desde el backend."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explorar Radar por categoría (Priority: P1)

Como lector autenticado quiero ver las publicaciones recientes, una publicación destacada y filtrar por Todos, Rumores, Lanzamientos, Reseñas o TOPS para descubrir contenido relevante.

**Why this priority**: Sustituye la principal fuente hardcodeada y permite crecer sin descargar todo el archivo editorial.

**Independent Test**: Cargar publicaciones de las cuatro categorías, recorrer las páginas y comprobar orden y pertenencia.

**Acceptance Scenarios**:

1. **Given** publicaciones publicadas, **When** consulto Todos, **Then** recibo resúmenes del más reciente al más antiguo con continuidad para obtener más resultados.
2. **Given** una categoría seleccionada, **When** consulto sus páginas, **Then** todos los resultados pertenecen a esa categoría, incluyendo opiniones en Reseñas y guías en Lanzamientos.
3. **Given** fechas iguales, **When** recorro un conjunto sin cambios, **Then** el orden es estable y ninguna publicación se omite ni se repite.
4. **Given** una categoría vacía, **When** la consulto, **Then** recibo una colección vacía y sin continuidad.
5. **Given** varios destacados, **When** consulto la portada, **Then** aparece el publicado más recientemente, desempata por identificador y sigue disponible en el listado general.

---

### User Story 2 - Leer una publicación completa (Priority: P1)

Como lector quiero abrir un artículo por su enlace y ver su contenido completo, conservando la presentación editorial y los datos específicos de cada formato.

**Why this priority**: Las tarjetas solo son útiles si permiten acceder a un artículo íntegro.

**Independent Test**: Abrir los nueve artículos del ejemplo y comparar metadatos, bloques y recursos con el original.

**Acceptance Scenarios**:

1. **Given** un artículo publicado, **When** abro su enlace, **Then** obtengo título, resumen, portada, fecha, categoría, formato, etiquetas y todos sus bloques en orden.
2. **Given** reseñas, rumores, lanzamientos, rankings, opiniones y guías, **When** los consulto, **Then** se preservan los datos opcionales correspondientes, incluyendo autor, valoración, sets, precios, video y galería de rumores.
3. **Given** un enlace inexistente o una publicación retirada, **When** intento abrirlo, **Then** obtengo un resultado de inexistencia sin contenido editorial privado.
4. **Given** un artículo sin autor, video o valoración, **When** lo consulto, **Then** estos datos permanecen ausentes y no se inventan valores.

---

### User Story 3 - Consultar videos y calendario (Priority: P2)

Como lector quiero explorar videos cortos y lanzamientos próximos o de un mes concreto, sin cargar todo el historial.

**Why this priority**: Completa las secciones presentes en el JSON de la página Radar.

**Independent Test**: Consultar videos, próximos lanzamientos y meses con y sin eventos usando datos independientes de los artículos.

**Acceptance Scenarios**:

1. **Given** videos publicados, **When** exploro la sección, **Then** recibo título, plataforma, miniatura, duración, fecha y enlace, ordenados del más reciente al más antiguo y paginados.
2. **Given** lanzamientos en distintos meses, **When** elijo un mes, **Then** recibo exclusivamente sus eventos ordenados por fecha ascendente e identificador para desempates.
3. **Given** una fecha de referencia, **When** consulto próximos lanzamientos, **Then** recibo eventos desde esa fecha inclusive, con cantidad acotada y posibilidad de continuar.
4. **Given** un mes vacío, **When** lo consulto, **Then** obtengo una colección vacía.

---

### User Story 4 - Incorporar contenido sin alterar publicaciones ajenas (Priority: P2)

Como responsable editorial quiero incorporar el archivo inicial y actualizar un artículo de forma independiente, con detección de duplicados y datos inconsistentes.

**Why this priority**: Permite mantener el Radar mientras aumenta el número de publicaciones.

**Independent Test**: Repetir la incorporación del ejemplo y actualizar un artículo, verificando unicidad, integridad y aislamiento del resto.

**Acceptance Scenarios**:

1. **Given** un archivo válido, **When** lo incorporo dos veces, **Then** los identificadores y enlaces conservan su unicidad y no aparecen copias nuevas.
2. **Given** identificadores o enlaces en conflicto, **When** valido la incorporación, **Then** obtengo un reporte del conflicto antes de guardar los registros afectados.
3. **Given** duplicados exactos del calendario, **When** preparo la incorporación, **Then** se consolidan y el reporte muestra cuáles fueron consolidados.
4. **Given** fechas diferentes para un mismo lanzamiento, **When** preparo la incorporación, **Then** se exige una resolución editorial explícita y no se escoge una fecha arbitrariamente.
5. **Given** una publicación actualizada o retirada, **When** consulto su detalle, categorías y destacado, **Then** los resultados reflejan una versión coherente de su estado.

### Edge Cases

- Continuidad inválida o reutilizada con otro filtro: error de validación, sin resultados ambiguos.
- Publicaciones nuevas entre páginas: la continuidad mantiene un límite temporal; no se promete una instantánea frente a ediciones o retiradas concurrentes.
- Sin destacados: resultado destacado ausente, sin seleccionar un artículo arbitrario.
- Categoría, formato o bloque desconocido; fecha inválida; monto negativo; valoración fuera de escala; posiciones repetidas en un ranking: rechazo con ubicación del error.
- Un rumor puede tener varios sets y estados independientes por imagen; un número de set rumoreado no exige existencia en el catálogo confirmado.
- Imágenes o videos externos inaccesibles: se conservan texto alternativo y enlace; no se invalida la lectura del texto.
- Contenido demasiado grande: rechazo explícito antes de escribir, sin truncamiento ni importación parcial del artículo.
- Sin sesión válida: rechazo antes de consultar contenido. Fallo del servicio: error seguro, distinto de una colección vacía.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE persistir publicaciones independientes y permitir incorporar o actualizar una sin reemplazar el archivo completo de Radar.
- **FR-002**: DEBE ofrecer listados paginados de resúmenes para Todos y cada categoría, ordenados por fecha descendente e identificador estable; cada página admite de 1 a 50 resultados, con 20 como valor predeterminado.
- **FR-003**: DEBE mantener categoría y formato independientes: categorías `rumor`, `lanzamiento`, `resena`, `top`; formatos `rumor`, `release`, `review`, `ranking`, `opinion`, `guide`. `todos` representa ausencia de filtro, nunca una categoría almacenada.
- **FR-004**: DEBE resolver un artículo por enlace único y devolver su contenido completo, sin incluir cuerpos completos en los listados de tarjetas.
- **FR-005**: DEBE conservar identificador estable, enlace, título, resumen, imagen y texto alternativo, fecha de publicación, categoría, formato, etiquetas y condición de destacado; fecha de modificación y versión editorial permiten identificar cambios.
- **FR-006**: DEBE preservar los bloques ordenados `paragraph`, `heading`, `callout`, `prosCons`, `rating`, `rumorStatus`, `releaseInfo`, `setRanking` y `setCard`, validando los campos propios de cada uno. Los headings aceptan niveles 2–6; las valoraciones requieren escala positiva y puntuación dentro de ella; los rankings tienen posiciones positivas únicas.
- **FR-007**: DEBE conservar autor opcional, portada específica opcional, set principal, sets relacionados, precios por tienda con moneda y enlace, video relacionado y galería de rumores con título, resumen y estado por imagen. Una portada específica distinta de la tarjeta DEBE conservarse.
- **FR-008**: DEBE distinguir calificación, estado de rumor y estado de lanzamiento de la categoría y del formato; una valoración repetida en tarjeta y contenido DEBE coincidir o generar conflicto de validación.
- **FR-009**: DEBE ofrecer un destacado publicado con la regla de selección de US1, o ausencia explícita si no existe.
- **FR-010**: DEBE ofrecer videos paginados con los atributos y orden definidos en US3, independientemente de los videos relacionados con artículos.
- **FR-011**: DEBE ofrecer calendario por mes y próximos lanzamientos paginados con los atributos del ejemplo: set, nombre, imagen y texto alternativo, fecha, precio, moneda, estado y destino de navegación.
- **FR-012**: DEBE validar fechas y estados de lanzamiento; unicidad por set, mercado y fecha distingue eventos legítimos. Fechas contradictorias para el mismo evento DEBEN reportarse sin inferir confirmación oficial ni disponibilidad a partir de la fecha.
- **FR-013**: DEBE proporcionar configuración de portada separada del contenido editorial: textos, filtros, etiquetas del calendario y límites iniciales 4 videos, 3 eventos de portada y 6 próximos eventos; estos límites no restringen el historial accesible.
- **FR-014**: DEBE distinguir publicaciones publicadas, borradores y retiradas. Solo las publicadas son visibles al lector; fechas futuras no implican publicación automática.
- **FR-015**: DEBE exigir sesión válida para todas las consultas y usar el contenido editorial compartido para lectores autenticados. La lectura no concede permisos editoriales.
- **FR-016**: DEBE validar parámetros, continuidad y contenido; distinguir validación, autenticación, inexistencia y fallo interno mediante las convenciones vigentes, sin exponer detalles internos.
- **FR-017**: La incorporación inicial DEBE generar reporte de registros válidos, duplicados, conflictos y rechazos; conservar el origen y ser repetible sin duplicación. Los conflictos deben resolverse antes de publicar registros afectados.
- **FR-018**: DEBE limitar cada consulta a los resultados solicitados, sin recuperar todo el historial ni todos los cuerpos para mostrar una página; imágenes y videos se representan mediante referencias, sin incorporar archivos multimedia al registro editorial.
- **FR-019**: DEBE preservar precios editoriales como referencias, sin presentarlos como cotizaciones actuales ni sustituir las ofertas existentes; datos oficiales, estimados y opiniones deben conservar su naturaleza.

### Key Entities *(include if feature involves data)*

- **Publicación**: Identidad, enlace único, categoría, formato, estado editorial, fechas, versión, resumen y detalle; contiene una secuencia ordenada de bloques.
- **Resumen de publicación**: Datos necesarios para tarjetas, filtros y destacado; representa la misma publicación sin su cuerpo.
- **Bloque editorial**: Contenido tipado con atributos propios y posición; puede referenciar sets, medios, fuentes, puntuaciones o estados.
- **Recurso multimedia**: Referencia y texto alternativo, con información adicional para videos o imágenes de rumores.
- **Referencia de set y precio editorial**: Datos contextuales del artículo, moneda y tienda; no reemplaza al catálogo ni a cotizaciones actuales.
- **Video de Radar**: Recurso independiente para la sección de videos cortos.
- **Evento de lanzamiento**: Identidad editorial, set, mercado, fecha, estado, precio de referencia y destino; independiente de artículos sobre lanzamientos.
- **Configuración de Radar**: Textos de interfaz, filtros disponibles y límites de presentación inicial.
- **Reporte de incorporación**: Origen, conteos, registros rechazados, duplicados y conflictos pendientes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los nueve artículos de ejemplo conservan el 100% de sus bloques, orden y atributos editoriales, cubriendo las cuatro categorías y los seis formatos.
- **SC-002**: Con 10,000 publicaciones y 50 lectores concurrentes, el 95% de consultas de una página de 20 resúmenes o un detalle termina en menos de 2 segundos, medido sin la descarga de multimedia externo.
- **SC-003**: Recorrer un catálogo sin cambios produce cero duplicados u omisiones y ningún resumen incluye el cuerpo del artículo.
- **SC-004**: Dos incorporaciones consecutivas de la misma entrada resuelta producen el mismo número de publicaciones, videos y eventos; el 100% de conflictos del archivo inicial aparece en el reporte.
- **SC-005**: El 100% de consultas sin sesión válida y de consultas de borradores o retirados impide acceder al contenido correspondiente.
- **SC-006**: Una actualización editorial validada queda visible en detalle, categoría y destacado en un máximo de 60 segundos, sin modificar otras publicaciones.

## Assumptions

- Alcance de esta fase: especificación y propuesta de reorganización; implementación, carga a recursos reales y despliegue corresponden a fases posteriores.
- Backend de lectura, preparación de datos e incorporación controlada están incluidos; editor visual, endpoints editoriales, programación automática, buscador por texto o etiquetas, comentarios y analítica quedan fuera de esta primera versión. Sí se incluye cargar imágenes editoriales al bucket S3 mediante proceso administrativo de importación.
- Todas las nuevas consultas siguen la exigencia vigente de autenticación; acceso web anónimo requeriría definir una excepción aparte.
- El archivo proporcionado es una muestra editorial, no una fuente de hechos verificados ni una instrucción para publicar inmediatamente.
- Las fechas de publicación originales tienen precisión de día: se conserva esta precisión y se usa identidad para desempatar; futuras entradas pueden especificar instante y zona horaria. Calendario usa fechas civiles del mercado MX.
- El mercado predeterminado de los eventos es MX; la moneda indicada en cada dato se conserva, incluyendo USD en rumores. Para el set 75383 se adopta el 22 de julio de 2026, según confirmó el usuario; la fecha se aplica al artículo y al evento consolidado.
- Las imágenes editoriales se almacenarán en un bucket S3 privado y se servirán por CloudFront con Origin Access Control; las respuestas guardan URL HTTPS del CDN. Se conserva el texto alternativo. La carga de medios forma parte de la importación controlada.
- La configuración se puede cargar separadamente y mantenerse entre sesiones; el historial editorial siempre se consulta en páginas acotadas.
- Incorporación inicial mediante proceso administrativo controlado; la autenticación de lectura existente no otorga capacidad de escritura.
- La tabla y los contratos quedan definidos por el plan técnico. El alojamiento de medios se recomienda en S3 privado con distribución CloudFront; el dominio personalizado es opcional y no bloquea usar el dominio HTTPS asignado por CloudFront.
