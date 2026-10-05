# Propuesta inicial de persistencia y consultas de Radar (reemplazada por el plan técnico)

Fecha: 2026-10-05. Orientativa para `$speckit-plan`; no es infraestructura implementada ni un contrato aprobado.

## Evaluación del JSON

El documento es útil como modelo de pantalla, pero reúne configuración, artículos completos, videos y eventos con ritmos de crecimiento diferentes. Separarlos evita reemplazar el historial completo y consultar cuerpos cuando solo hacen falta tarjetas. Mantener `category` y `type`: sus combinaciones actuales son válidas y deliberadas.

El archivo [radar-normalized.example.json](radar-normalized.example.json) preserva los nueve artículos y sus campos, separa tarjetas y detalle, conserva cinco videos y consolida siete entradas del calendario en cuatro eventos. Las tres entradas redundantes del 75383 coinciden en todos sus campos salvo identificador. Se mantienen `sourceIds` para trazabilidad; no se corrige silenciosamente la contradicción entre 22 de julio en el artículo y 1 de agosto en el calendario. `importReady: false` y los artículos en borrador impiden tratar el ejemplo como contenido listo para publicar.

## Modelo recomendado para evaluar

Una tabla editorial dedicada con PK/SK, separada de datos personales. Cada publicación usa su propia partición; el cuerpo no se proyecta a los índices de listados.

| Registro | PK | SK | Contenido |
| --- | --- | --- | --- |
| Resumen | POST#<id> | META | Metadatos, estado, versión, tarjeta |
| Detalle | POST#<id> | CONTENT | Bloques, autor, portada, sets, precios, video, galería |
| Reserva de enlace | SLUG#<slug> | LOOKUP | Identificador estable y reserva única |
| Configuración | RADAR#CONFIG | V1 | Copy, filtros, calendario y límites iniciales |
| Video | VIDEO#<id> | META | Tarjeta, plataforma, duración y enlace |
| Evento | RELEASE#<market>#<setNumber>#<date> | META | Fecha, mercado, estado y datos de presentación |

Evaluar dos índices secundarios reutilizables para orden cronológico global y por agrupación. Solo los registros publicables llevan claves de listado. Resúmenes publicados: grupo global `POSTS#PUBLISHED`, grupo por categoría `POSTS#PUBLISHED#<category>`; sort key `<publishedSort>#<id>`. Videos: grupo `VIDEOS#PUBLISHED`. Eventos: grupo `RELEASES#MX`, y agrupación `RELEASES#MX#<YYYY-MM>` con sort key `<releaseDate>#<eventId>`. Ambos índices proyectan únicamente atributos de tarjetas requeridos. Para destacado puede usarse una referencia en configuración mantenida por el proceso editorial; si se exige resolver automáticamente varios destacados, evaluar un registro de índice específico y justificar su coste.

Reservar enlaces y actualizar META/CONTENT mediante operaciones condicionales y transacción para evitar versiones parciales o slugs duplicados. Repetición de importación debe ser no-op si no hay cambios, nunca sobrescribir ediciones posteriores sin control de versión. Un enlace existente conserva su reserva al retirar un artículo.

Los índices secundarios son eventualmente consistentes: comprobar el estado editorial vigente antes de entregar tarjetas o detalles, evitando exposición de retirados por un índice atrasado. El plan debe concretar cómo llenar páginas después de excluir candidatos obsoletos y cómo mantener la selección del destacado.

## Patrones de acceso y contratos tentativos

Todas las rutas requieren JWT existente y usan envelopes y validación del proyecto bajo `/v1`.

| Consulta | Ruta candidata | Acceso esperado |
| --- | --- | --- |
| Configuración | GET /v1/radar/config | Lectura por clave |
| Todos / categoría | GET /v1/radar/posts?category=rumor&limit=20&cursor=… | Query del índice global o de categoría |
| Destacado | GET /v1/radar/featured | Referencia editorial + lectura del post publicado |
| Detalle | GET /v1/radar/posts/{slug} | Lookup de enlace + lecturas META/CONTENT |
| Videos | GET /v1/radar/videos?limit=4&cursor=… | Query de videos |
| Mes | GET /v1/radar/releases?month=2026-08&limit=20&cursor=… | Query de grupo mensual |
| Próximos | GET /v1/radar/releases?from=2026-10-05&limit=6&cursor=… | Query por rango de fecha ascendente |

`month` y `from` son mutuamente excluyentes. Cursor opaco vinculado a filtro, orden, límite temporal y posición; límite predeterminado 20 y máximo 50. No usar offsets ni leer todo el historial para filtrar en memoria. No exigir conteo total en cada página. El cliente compone portada a partir de consultas acotadas; los listados no cargan CONTENT.

## Crecimiento y límites

DynamoDB admite hasta 400 KB por ítem, contando nombres y valores. Separar META y CONTENT reduce lectura innecesaria y deja los cuerpos fuera de índices. Definir un presupuesto validado inferior al máximo, considerando tamaño real DynamoDB, no solo longitud JSON. Para v1, rechazar cuerpos demasiado grandes con error claro; evaluar bloques individuales o almacenamiento de documentos externos únicamente si hay necesidad real. Imágenes y videos se almacenan fuera de la tabla como referencias.

Paginación limita el trabajo por solicitud al crecer el número de artículos; no garantiza capacidad ilimitada ante tráfico concentrado. Los grupos globales de índices pueden convertirse en particiones calientes con demanda elevada. Medir distribución y carga antes de añadir buckets por periodo o shards, porque introducen merge y cursores más complejos. El plan debe probar la meta de 10,000 artículos y 50 lectores simultáneos y ajustar si la evidencia lo exige.

Una ProjectionExpression sobre un ítem grande no reduce por sí sola la capacidad de lectura consumida. La separación física y la proyección de los índices son las decisiones que deben evaluarse para coste. Consultar con Query por claves; evitar Scan en las rutas de lectura.

## Fuentes verificadas

- [Límites de DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html): límite de ítem de 400 KB.
- [Capacidad y proyección de Query](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Other.html): proyección de respuesta no reduce capacidad de lectura por ítem.
- [Partición vertical](https://aws.amazon.com/blogs/database/use-vertical-partitioning-to-scale-data-efficiently-in-amazon-dynamodb/): separar partes del documento según patrones de acceso.
- [Buenas prácticas de Query y Scan](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html): evitar lecturas amplias y evaluar carga de particiones.

## Decisiones pendientes de planificación

Concretar índices y proyecciones, contrato de cada bloque, presupuesto por ítem, claves de orden para fechas con precisión distinta, continuidad bajo edición concurrente, mantenimiento del destacado, seguridad del cursor, permisos de incorporación, publicación coherente y verificación de recursos multimedia. Ningún dato del ejemplo se ha cargado a AWS y no se han añadido rutas HTTP ni infraestructura.


Actualización posterior: el usuario confirmó 22 de julio de 2026 para 75383. El plan actual recomienda S3 privado con CloudFront/OAC para multimedia. Consultar `research.md` y `plan.md`; esta propuesta previa de GSI no es la decisión vigente.
