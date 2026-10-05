# Feature Specification: Catálogo de ofertas LEGO en Amazon

**Feature Branch**: `main` (rama actual; no se crea una rama en esta invocación)

**Created**: 2026-10-04

**Status**: Draft — validada y lista para planificación

**Input**: User description: "En base de datos se crearán cards de ofertas de LEGO en Amazon con título, descuento, URL e imagen. Se necesita un endpoint para obtener esas ofertas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver ofertas de Amazon disponibles (Priority: P1)

Como usuario autenticado de BrickHub, quiero consultar las cards de ofertas LEGO en Amazon para descubrir promociones y abrir la lista de Amazon que me interesa.

**Why this priority**: Entregar las promociones configuradas es el valor central de la funcionalidad.

**Independent Test**: Con una sesión Cognito válida y las cinco cards de referencia almacenadas y disponibles, consultar el catálogo y comprobar que se reciben título, descuento, enlace e imagen de cada una en el orden configurado.

**Acceptance Scenarios**:

1. **Given** una sesión Cognito válida y cards de oferta disponibles, **When** un consumidor solicita el catálogo de ofertas, **Then** recibe todas las cards disponibles con su título, texto de descuento, enlace de destino e imagen.
2. **Given** las cinco cards de referencia, **When** se consulta el catálogo, **Then** se devuelven en este orden: Señor de los Anillos, Star Wars, Marvel, Speed Champions y Próximos a descontinuar.
3. **Given** una card cuya imagen es una dirección web o una ruta de imagen propia, **When** se devuelve, **Then** se conserva exactamente la referencia de imagen configurada.
4. **Given** una card disponible, **When** el consumidor abre su enlace, **Then** puede identificar la promoción mediante el título y el descuento recibidos sin tener que conocer la estructura interna de almacenamiento.
5. **Given** un Bearer ausente, inválido, repetido o sin `sub`, **When** se solicita el catálogo, **Then** se devuelve `401` sin acceder al catálogo.

---

### User Story 2 - Consultar el catálogo cuando no hay ofertas (Priority: P2)

Como visitante de BrickHub, quiero recibir una respuesta válida cuando no haya promociones publicadas para que la aplicación pueda mostrar un estado sin ofertas en lugar de fallar.

**Why this priority**: Las promociones pueden cambiar o retirarse temporalmente sin que eso deba interrumpir la experiencia.

**Independent Test**: Consultar el catálogo sin cards disponibles y comprobar que se obtiene una lista vacía exitosa.

**Acceptance Scenarios**:

1. **Given** que no existen cards disponibles, **When** se solicita el catálogo, **Then** se responde exitosamente con una lista vacía.
2. **Given** una card no disponible para publicación, **When** se solicita el catálogo, **Then** esa card no aparece en la respuesta.

---

### User Story 3 - Recibir respuestas seguras ante problemas de datos (Priority: P2)

Como consumidor de BrickHub, quiero distinguir un catálogo vacío de un problema al obtenerlo para poder mostrar un mensaje apropiado y reintentar si corresponde.

**Why this priority**: Evita ocultar una falla operativa presentándola como si no hubiera promociones.

**Independent Test**: Simular falta de acceso al almacenamiento y una card con datos obligatorios inválidos; comprobar que no se devuelve un catálogo parcial ni detalles internos.

**Acceptance Scenarios**:

1. **Given** que no se puede obtener el catálogo, **When** se solicita, **Then** se devuelve un error seguro y distinguible de una lista vacía.
2. **Given** que una card disponible no contiene uno de sus datos obligatorios válidos, **When** se lee el catálogo, **Then** se rechaza la respuesta como error seguro sin inventar datos ni entregar una lista parcial.
3. **Given** cualquier respuesta de error, **When** se entrega al consumidor o se registra, **Then** no revela detalles internos del almacenamiento ni datos sensibles.

### Edge Cases

- No hay cards disponibles: devolver éxito con una lista vacía, no un error de inexistencia.
- Hay cards no disponibles: excluirlas sin alterar el orden relativo de las restantes.
- Una card disponible tiene título, descuento, enlace o imagen ausente, vacío o inválido: devolver un error seguro; no omitirla silenciosamente ni fabricar un valor.
- Las imágenes pueden ser direcciones web o rutas relativas de imágenes propias; ambos formatos se conservan tal como fueron configurados.
- El enlace de una oferta debe ser una dirección web segura; enlaces malformados o no seguros en una card disponible invalidan el catálogo.
- Cards con el mismo título o descuento pueden coexistir si representan promociones distintas; no se deduplican por texto.
- Una lectura sin resultados y un fallo de almacenamiento producen resultados diferentes para el consumidor.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST exponer un endpoint versionado bajo `/v1` para consultar el catálogo de ofertas LEGO en Amazon, exigiendo una credencial Bearer válida y vigente de Cognito antes de acceder al catálogo.
- **FR-002**: El endpoint MUST devolver un sobre de éxito consistente con el resto de BrickHub y una lista ordenada de cards de oferta disponibles.
- **FR-003**: Cada card devuelta MUST incluir `title`, `discount`, `url` e `image`, preservando exactamente los valores configurados para esos cuatro campos.
- **FR-004**: El sistema MUST obtener las cards desde el catálogo persistido y MUST NOT codificar las promociones de referencia en el endpoint.
- **FR-005**: Cada card persistida MUST tener un identificador interno estable, estado de disponibilidad y posición de presentación, además de los cuatro atributos públicos. El identificador y el estado no tienen que exponerse al consumidor.
- **FR-006**: Solo las cards marcadas como disponibles MUST aparecer en el catálogo. Las cards MUST devolverse de menor a mayor posición de presentación; ante igual posición, MUST usarse un orden estable por identificador interno.
- **FR-007**: Los títulos y descuentos MUST ser texto no vacío. Las direcciones de destino MUST ser URLs HTTPS válidas. Las referencias de imagen MUST ser una URL HTTPS válida o una ruta relativa no vacía de imagen propia. Una card disponible que incumpla cualquiera de estas reglas MUST impedir un éxito parcial.
- **FR-008**: El catálogo inicial MUST contener las siguientes cinco promociones, con sus enlaces e imágenes exactos y en el orden indicado:

  | Posición | Título | Descuento | URL | Imagen |
  | --- | --- | --- | --- | --- |
  | 1 | LEGO Señor de los Anillos | hasta 22% | `https://www.amazon.com.mx/shop/robguetstudios/list/X3WXTWMAYNAM?ref_=aipsflist` | `https://m.media-amazon.com/images/I/51gw0UWtBJL._AC_.jpg` |
  | 2 | Promociones Star Wars | 20%, 30% y más | `https://www.amazon.com.mx/shop/robguetstudios/list/2BYYTGJR5PBWR?ref_=aipsflist` | `/images/home/amazon-offers/star-wars.png` |
  | 3 | Descuentos Marvel | hasta 30% | `https://www.amazon.com.mx/shop/robguetstudios/list/300N3SHRJVVQT?ref_=aipsflist` | `/images/home/amazon-offers/marvel.png` |
  | 4 | Descuentos Speed Champions | hasta 30% | `https://www.amazon.com.mx/shop/robguetstudios/list/27T66WQIKQ2FA?ref_=aipsflist` | `/images/home/amazon-offers/speed-champions.png` |
  | 5 | Próximos a descontinuar | hasta 27% | `https://www.amazon.com.mx/shop/robguetstudios/list/2BCWC7BLW6D1L?ref_=aipsflist` | `/images/home/amazon-offers/proximos-a-descontinuar.png` |
- **FR-009**: Cuando no haya cards disponibles, el endpoint MUST responder exitosamente con una lista vacía.
- **FR-010**: Cuando el catálogo no pueda leerse o contenga una card disponible inválida, el endpoint MUST devolver un error interno seguro y consistente. MUST NOT devolver una lista parcial ni presentar el problema como una lista vacía.
- **FR-011**: La consulta MUST ser de solo lectura: no modifica las cards, perfiles, colección, wishlist ni otras rutas existentes.
- **FR-012**: Las respuestas y registros MUST evitar detalles internos del almacenamiento y cualquier información sensible. Los errores MUST conservar la semántica vigente de BrickHub para fallos internos.
- **FR-013**: El catálogo o un error seguro MUST estar disponible para el consumidor en un máximo de 5 segundos en las pruebas de aceptación.

### Key Entities *(include if feature involves data)*

- **Card de oferta de Amazon**: Promoción LEGO disponible para mostrar, con identificador interno, título, descuento, URL de destino, referencia de imagen, disponibilidad y posición de presentación.
- **Catálogo de ofertas**: Colección ordenada de cards disponibles entregada a los consumidores.
- **Referencia de imagen**: Dirección HTTPS externa o ruta relativa propia asociada a una card.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las consultas con las cinco cards de referencia disponibles devuelve las cinco cards con sus cuatro atributos públicos exactos y en el orden configurado.
- **SC-002**: El 100% de las consultas sin cards disponibles devuelve una lista vacía exitosa en lugar de un error.
- **SC-003**: El 100% de las cards no disponibles queda fuera de las respuestas verificadas, sin cambiar el orden relativo de las cards disponibles.
- **SC-004**: El 100% de los casos simulados de datos inválidos o error de lectura devuelve un error seguro, sin catálogo parcial ni detalles internos.
- **SC-005**: Las consultas verificadas finalizan con el catálogo completo o un error seguro dentro de 5 segundos.
- **SC-006**: Un consumidor puede reconocer y abrir la promoción deseada usando título, descuento, enlace e imagen, sin autenticarse ni conocer identificadores internos.

## Assumptions

- Se propone `GET /v1/amazon-offers` como la ruta versionada protegida; el contrato exacto se formalizará durante la planificación.
- Las cards se crean y administran previamente en la base de datos. Crear, editar, publicar o eliminar cards mediante endpoints administrativos queda fuera de alcance de esta versión.
- La lectura reutiliza el Bearer token de Cognito de las rutas existentes, aun cuando las ofertas no contengan datos de usuario; una solicitud sin token válido se rechaza antes de leer DynamoDB.
- Las cinco cards y sus valores proporcionados son el contenido inicial esperado del catálogo; precio, inventario, vigencia real de Amazon, verificación de enlaces y extracción de promociones quedan fuera de alcance.
- La posición se usa para conservar una presentación editorial explícita. La inicial corresponde al orden de la lista proporcionada.
- La infraestructura, el modelo físico de persistencia, los permisos y la estrategia de carga inicial se decidirán en la planificación, conforme a la constitución del proyecto.
