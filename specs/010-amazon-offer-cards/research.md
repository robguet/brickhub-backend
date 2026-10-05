# Investigación: Catálogo de ofertas LEGO en Amazon

## Decisión 1: Tabla separada para las cards públicas

**Decisión**: Usar una tabla DynamoDB `AmazonOfferCardsTable` independiente de `UserDataTable`.

**Rationale**: Las cards son contenido editorial público, no pertenecen a un usuario y no requieren el aislamiento ni el patrón de acceso de perfiles, colección o wishlist. Una tabla independiente permite una política IAM de solo `Query` para la Lambda pública y evita exponer por accidente datos de usuario.

**Alternativas consideradas**:

- Reutilizar `UserDataTable`: rechazada porque mezcla contenido global público con datos aislados por usuario y amplía el alcance de permisos.
- Devolver una constante desde la Lambda: rechazada por FR-004, que exige leer el catálogo persistido.

## Decisión 2: Orden y publicación en la clave de orden

**Decisión**: Usar `PK = CATALOG#AMAZON_OFFERS` y `SK = AVAILABLE#<posición de seis dígitos>#<amazonOfferId>` para cards visibles; las ocultas usarán el prefijo `HIDDEN#`.

**Rationale**: Una Query con prefijo devuelve solo las cards visibles, ya en el orden editorial, sin Scan, filtros ni índice secundario. El id interno elimina la ambigüedad si dos cards tienen la misma posición.

**Alternativas consideradas**:

- Guardar todas las cards y usar `FilterExpression`: rechazada porque puede exigir leer varias páginas y dificulta asegurar que el catálogo completo se entregó.
- Crear un GSI para disponibilidad/posición: rechazado porque el patrón se satisface con la clave primaria y añadiría coste y complejidad.

## Decisión 3: Lectura protegida y contrato mínimo

**Decisión**: Exponer `GET /v1/amazon-offers` con Cognito Bearer y responder `{status: "success", data: {offers: [{title, discount, url, image}]}}`.

**Rationale**: La constitución exige que toda ruta HTTP nueva valide Cognito Bearer y un `sub` antes de I/O. El envelope coincide con rutas existentes y solo revela los cuatro campos solicitados.

**Alternativas consideradas**:

- Permitir lectura anónima: rechazada por la política de seguridad obligatoria de la constitución.
- Devolver la lista como cuerpo raíz: rechazada para mantener el envelope consistente de BrickHub.

## Decisión 4: Carga inicial reproducible y no destructiva

**Decisión**: Usar un Custom Resource de CloudFormation con una Lambda de seed idempotente que inserte las cinco cards mediante escrituras condicionales y no borre datos al eliminar el stack.

**Rationale**: DynamoDB/SAM no declara items iniciales directamente. La carga automática declarada mantiene la infraestructura y el catálogo inicial reproducibles sin sobrescribir cambios editoriales posteriores ni requerir pasos de consola.

**Alternativas consideradas**:

- Crear los items a mano en consola: rechazada por la constitución, que requiere cambios permanentes reproducibles como código.
- Sobrescribir los cinco items en cada despliegue: rechazada porque destruiría cambios editoriales posteriores.
- Añadir endpoints CRUD públicos: rechazada porque amplía la superficie de escritura sin ser parte de esta funcionalidad.

## Decisión 5: Validar los datos al límite de lectura

**Decisión**: Validar cada item DynamoDB mediante Zod antes de construir la respuesta; cualquier card disponible malformada produce 500 seguro.

**Rationale**: Satisface la prohibición de resultados parciales y evita propagar links inseguros, datos incompletos o detalles internos. Las referencias de imagen aceptan HTTPS y rutas relativas propias, como exige la muestra.

**Alternativas consideradas**:

- Omitir items malformados: rechazada por FR-007 y FR-010; ocultaría errores de administración.
- Confiar en que todos los datos fueron validados al escribir: rechazada porque no hay endpoint administrativo en esta versión y el almacenamiento sigue siendo una frontera no confiable.
