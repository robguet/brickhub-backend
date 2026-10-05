# Research: Radar persistente

Fecha: 2026-10-05. Investigación documental y revisión del backend existente; no se consultaron recursos AWS de la cuenta.

## 1. Tabla y lecturas

**Decision**: Tabla `brickhub-${Environment}-radar`, PK/SK, PAY_PER_REQUEST, sin GSI ni LSI en v1. Resúmenes materializados en feeds global, por categoría y destacado; actualización transaccional junto con META/CONTENT. Query con ConsistentRead para feeds; TransactGetItems para META y CONTENT en detalle.

**Rationale**: Retirada y modificación deben reflejarse coherentemente en listados y detalle. Las lecturas fuertes en la tabla base evitan desfases de GSI y la hidratación adicional de cada tarjeta. La réplica pequeña de resúmenes aumenta escrituras y almacenamiento, pero el ritmo editorial es bajo comparado con lecturas.

**Alternatives considered**: Dos GSIs proyectados de la propuesta inicial reducen mantenimiento explícito, pero sus lecturas son eventualmente consistentes y necesitarían validar estado/versión y rellenar páginas. Guardar toda la página en un ítem impide crecimiento independiente. Bloques individuales y S3 para texto son innecesarios con un límite explícito en v1.

Fuentes de almacenamiento de medios: [S3 privado con OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html), [S3 static hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html). Fuentes: [consistencia](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html), [transacciones](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html).

## 2. Paginación y crecimiento

**Decision**: Query por feed con rango de SK, Limit 1–50, LastEvaluatedKey validado dentro de un cursor base64url. Orden de posts/videos descendente por instante normalizado e ID; eventos ascendente por fecha e ID. Fecha máxima fijada en primera consulta de posts/videos; no se ofrece snapshot bajo ediciones concurrentes ni inserciones retroactivas.

**Rationale**: Trabajo acotado por página, sin Scan ni offsets. Query puede terminar por límite de 1 MB antes de alcanzar Limit: el cursor se devuelve mientras exista LastEvaluatedKey, incluso en páginas cortas.

**Alternatives considered**: Offset exige recorrer prefijos. Buckets mensuales/shards exigen merge y cursores más complejos; se difieren hasta tener evidencia de carga. El volumen de registros no garantiza por sí mismo capacidad para tráfico concentrado.

Fuentes: [paginación](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html), [diseño de particiones](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html).

## 3. Presupuesto de tamaño

**Decision**: META y cada tarjeta de feed <=16 KiB; CONTENT <=320 KiB; config <=32 KiB; cualquier ítem <=350 KiB incluyendo claves. Medir nombres y valores con las reglas DynamoDB, no usar JSON.stringify como estimador exacto. Una transacción por publicación tiene presupuesto <=1 MiB y nunca se agrupa un archivo completo en una sola transacción.

**Rationale**: Margen bajo el límite de 400 KB por ítem; separar el cuerpo reduce coste de cada listado. TransactGet admite 100 ítems y 4 MB, suficiente para dos ítems con esos presupuestos.

**Alternatives considered**: Truncar pierde contenido. Dividir bloques o S3 añade complejidad sin necesidad demostrada; un error explícito habilita revisarlo posteriormente.

Fuentes: [límites](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html), [cálculo de tamaño](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/CapacityUnitCalculations.html), [proyección de Query](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Other.html).

## 4. Incorporación editorial

**Decision**: CLI local TypeScript con validación/dry-run por defecto, modo apply explícito, manifiesto de resoluciones y optimistic concurrency. No custom resource de SAM para sembrar noticias; no endpoints de escritura. Los nueve posts quedan draft inicialmente. Tabla vacía al desplegar infraestructura.

**Rationale**: El seed de ofertas existente responde a un catálogo controlado; contenido editorial cambiante y fechas contradictorias requieren revisión independiente. Dry-run produce resultados concretos antes de autorizar AWS. Repetir el mismo contenido es no-op; no sobrescribir ediciones posteriores.

**Alternatives considered**: Consola manual pierde reproducibilidad; importar automáticamente en cada despliegue podría sobrescribir noticias. CMS queda fuera de alcance.

## 5. Seguridad y contratos

**Decision**: Reutilizar Cognito y validación Bearer/sub antes de construir dependencias. GET bajo /v1 con `{status:'success',data:...}` y error estándar. Cursor sin firma: su contenido se trata como entrada no confiable, esquema cerrado y PK calculada en servidor, nunca una clave proporcionada por el usuario. Manipular el cursor solo permite desplazarse por un feed publicado que el usuario ya puede leer.

**Rationale**: No hay límites de autorización delegados al cursor. No añadir secretos ni dependencias para firmar un marcador de navegación. Rechazar PK, campos adicionales, rangos imposibles y cursores incompatibles con filtros; no prometer integridad criptográfica.

**Alternatives considered**: HMAC requeriría gestión de secreto para una capacidad que no necesita protección adicional en este alcance; se revisaría si el cursor concediera acceso restringido.

## 6. Referencias multimedia y datos conflictivos

**Decision**: Guardar originales en S3 privado y URLs de lectura HTTPS de CloudFront en el contenido. CLI permite cargar imágenes por prefijo estable; en dry-run requiere mediaBaseUrl y mapeo que resuelva path local a object key. Eventos duplicados se consolidan por set/mercado/fecha. El usuario confirmó 75383 para el 22 de julio de 2026; se aplica al artículo y al evento calendario consolidado.

**Rationale**: El backend no conoce un dominio editorial propio y los clientes iOS no pueden resolver rutas web relativas. Un bucket privado limita acceso directo al origen; CloudFront con OAC permite URLs HTTPS de CDN sin habilitar lectura pública en S3. Destinos internos `/explore/...` se conservan como rutas de navegación, no URLs multimedia.

**Alternatives considered**: Habilitar ACL pública del bucket o usar endpoint de sitio S3; se prefiere CloudFront OAC con acceso al origen restringido. Dominio personalizado y certificados se difieren. No se altera fecha sin confirmación editorial. Mantener paths relativos en respuestas públicas daría un contrato ambiguo.

## Resultado

No quedan incertidumbres técnicas para generar tareas. La fecha del 75383 ya está resuelta por el usuario (22 de julio de 2026). La carga de medios a S3/CloudFront debe implementarse y configurarse antes de aplicar el contenido público. No se han verificado DTOs de Radar del repositorio iOS: el contrato es nuevo y la integración deberá contrastarlo con el cliente antes de cambiar consumo.


## Ajustes verificados durante implementación

Los archivos del ejemplo existen bajo `../lego-hub/public` (13 recursos únicos). Se preparó mapeo S3 por hash, sin subirlos. Se añadió política IAM administrada para operador como artefacto SAM, sin asociarla a ningún principal ni al rol lector. Los modelos iOS se revisaron en el repositorio vecino; se documentaron las diferencias de enums/bloques y ausencia de DTO Radar en validation.md. No se cambió el cliente. El build de SAM usa Node.js 24 arm64; CLI local se compila a node20 conforme al motor existente del repositorio.
