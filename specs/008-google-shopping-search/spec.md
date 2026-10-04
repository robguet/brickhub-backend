# Feature Specification: Búsqueda protegida en Google Shopping

**Feature Branch**: `main` (rama actual; no se crea una rama en esta invocación)

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "Crear un endpoint GET para buscar productos de Google Shopping mediante ScrapeDo. El usuario proporciona q y puede modificar hl, gl, google_domain y location seleccionando su mercado. Usar el secreto scrapedo, clave SCRAPE_DO_API_KEY, y proteger el endpoint con Bearer token."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buscar productos con una sesión válida (Priority: P1)

Como usuario autenticado de BrickHub, quiero buscar productos por texto y consultar sus ofertas para comparar opciones de compra en mi mercado.

**Why this priority**: La búsqueda de productos y ofertas es el valor principal solicitado.

**Independent Test**: Buscar `LEGO 75394` con una sesión válida y sin personalizar el mercado; comprobar las ofertas recibidas para México.

**Acceptance Scenarios**:

1. **Given** una sesión válida y ofertas disponibles, **When** el usuario busca `LEGO 75394`, **Then** obtiene los productos con sus títulos, identificadores, enlaces, comercios y precios disponibles, conservando el orden del proveedor.
2. **Given** una búsqueda sin parámetros de mercado, **When** se consulta, **Then** se usa `hl=es-mx`, `gl=mx`, `google_domain=google.com.mx` y `location=Mexico`.
3. **Given** productos con imágenes, calificaciones, reseñas, cuotas o precios alternativos, **When** se devuelven, **Then** esos datos se conservan cuando existen; su ausencia no invalida un producto.
4. **Given** una respuesta válida sin productos, **When** finaliza la búsqueda, **Then** se devuelve un éxito con una lista vacía.
5. **Given** una respuesta con productos y total informado de cero, **When** se procesa, **Then** se conservan los productos y no se descartan por ese total.
6. **Given** una respuesta con filtros, paginación y grupos por categoría, **When** se devuelve, **Then** esas secciones se conservan por separado sin consultar páginas adicionales ni guardar productos del usuario.

---

### User Story 2 - Impedir búsquedas sin autenticación (Priority: P1)

Como responsable de BrickHub, quiero permitir búsquedas únicamente a usuarios con sesión válida para proteger el acceso y el consumo del proveedor.

**Why this priority**: La protección con Bearer token es una condición explícita para habilitar la función.

**Independent Test**: Solicitar búsquedas sin credencial y con credenciales inválidas; verificar que no se consultan el proveedor ni su secreto.

**Acceptance Scenarios**:

1. **Given** una solicitud sin Bearer token, **When** se busca, **Then** se rechaza con un error de autenticación que indica que se requiere una credencial válida.
2. **Given** una credencial vacía, malformada, vencida o no emitida para BrickHub, **When** se busca, **Then** se rechaza sin acceder al proveedor ni a su secreto, y sin revelar datos sensibles.
3. **Given** una credencial válida de BrickHub, **When** se busca, **Then** se aplica la política de las rutas privadas existentes sin requerir permisos especiales nuevos.
4. **Given** una solicitud sin autenticación y con parámetros inválidos, **When** se procesa, **Then** se informa primero el error de autenticación.

---

### User Story 3 - Buscar en un mercado seleccionado (Priority: P2)

Como usuario autenticado, quiero ajustar idioma, país, dominio de Google y ubicación para consultar ofertas del mercado seleccionado.

**Why this priority**: Permite obtener ofertas relevantes fuera del mercado predeterminado.

**Independent Test**: Buscar con `hl=en`, `gl=us`, `google_domain=google.com` y `location=United States`; comprobar que esos valores se utilizan.

**Acceptance Scenarios**:

1. **Given** los cuatro parámetros de mercado explícitos, **When** se busca, **Then** se respetan esos valores y no se sustituyen por México.
2. **Given** solamente algunos parámetros de mercado, **When** se busca, **Then** los omitidos usan sus valores predeterminados y los proporcionados se conservan.
3. **Given** texto con espacios, acentos, `&` o `+`, **When** se busca, **Then** el proveedor recibe un único texto sin convertir sus caracteres en parámetros adicionales.
4. **Given** texto vacío o parámetros de mercado malformados, vacíos o repetidos, **When** busca un usuario autenticado, **Then** se informa un error de validación sin consultar al proveedor.

---

### User Story 4 - Comprender fallos de la búsqueda (Priority: P2)

Como usuario, quiero distinguir una búsqueda sin ofertas de un servicio indisponible para decidir si cambio mi búsqueda o reintento después.

**Why this priority**: Evita presentar fallos externos como ausencia de productos.

**Independent Test**: Simular indisponibilidad, espera excesiva, límites y datos incompatibles; comprobar errores seguros y un tiempo de respuesta acotado.

**Acceptance Scenarios**:

1. **Given** un fallo del proveedor, espera excesiva o respuesta incompatible, **When** se busca, **Then** se informa un fallo de proveedor y no un éxito sin productos.
2. **Given** un límite de solicitudes, **When** se busca, **Then** se informa el límite y se comunica cuándo reintentar únicamente si existe información válida disponible.
3. **Given** una credencial del proveedor ausente, inválida o inaccesible en el secreto configurado, **When** se busca, **Then** se informa indisponibilidad sin exponer el secreto ni consultar sin credencial.
4. **Given** cualquiera de los casos de éxito o error, **When** finaliza la solicitud, **Then** ni la respuesta ni sus registros contienen credenciales o detalles internos.

### Edge Cases

- `q` ausente, vacío tras quitar espacios exteriores, repetido o mayor de 200 caracteres: error de validación para usuarios autenticados.
- Parámetros de mercado repetidos, vacíos o malformados: error de validación. Los omitidos usan los valores predeterminados.
- Una combinación sintácticamente válida pero rechazada por el proveedor produce un fallo de proveedor; no se cambia silenciosamente a otro mercado.
- Los identificadores largos se conservan como texto. Los precios numéricos y formateados mantienen sus valores originales sin conversión de monedas.
- Las imágenes pueden ser enlaces o contenido embebido, como en la muestra; no se exige que todas sean enlaces remotos.
- Los campos opcionales ausentes o nulos no generan valores ficticios. Una respuesta sin lista principal interpretable es inválida, salvo que el proveedor indique explícitamente ausencia de resultados.
- Los grupos por categoría pueden repetir productos de la lista principal; las colecciones se conservan separadas sin deduplicarlas.
- Los enlaces de continuación no se siguen automáticamente y no pueden revelar credenciales.
- Los errores de autenticación del proveedor no se presentan como un error de la sesión del usuario.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST ofrecer una búsqueda GET en una ruta privada versionada bajo `/v1`, separada de la búsqueda existente de catálogo de sets.
- **FR-002**: Cada solicitud MUST exigir una credencial Bearer válida, vigente y emitida para BrickHub, mediante la autenticación existente de Cognito antes de validar la búsqueda. Una credencial ausente o inválida MUST producir `401` sin acceder al proveedor ni a su secreto; no se requieren permisos especiales nuevos.
- **FR-003**: El usuario MUST proporcionar `q` como un único texto no vacío de hasta 200 caracteres después de quitar espacios exteriores. Entradas inválidas MUST producir `400` antes de consultar al proveedor.
- **FR-004**: El usuario MUST poder modificar `hl`, `gl`, `google_domain` y `location`. Los omitidos MUST usar, respectivamente, `es-mx`, `mx`, `google.com.mx` y `Mexico`; los explícitos MUST conservarse tras quitar espacios exteriores.
- **FR-005**: El sistema MUST validar `hl` como código de idioma de dos o tres letras con región opcional de dos letras separada por guion; `gl` como código de país de dos letras; `google_domain` como dominio de Google sin esquema, puerto, ruta ni parámetros; y `location` como texto no vacío de hasta 200 caracteres sin caracteres de control. Parámetros repetidos MUST rechazarse.
- **FR-006**: El sistema MUST consultar Google Shopping mediante ScrapeDo usando `q` y los cuatro parámetros de mercado, con `device=desktop` y `sort_by=2` fijos. El cliente MUST NOT sustituir la dirección del servicio ni aportar o sustituir la credencial del proveedor.
- **FR-007**: La credencial de ScrapeDo MUST obtenerse del secreto existente `scrapedo` en Secrets Manager, leyendo la clave JSON `SCRAPE_DO_API_KEY`; el usuario MUST NOT necesitar conocerla ni enviarla.
- **FR-008**: La respuesta MUST conservar los productos de `shopping_results`, su orden, identificadores como texto y datos disponibles de títulos, enlaces, comercios, precios, imágenes, calificaciones, reseñas, cuotas, precios alternativos y referencias de detalle, sin inventar campos ausentes.
- **FR-009**: La respuesta MUST conservar como secciones separadas el contexto de búsqueda, información de resultados, filtros, paginación y grupos por categoría cuando existan y sean válidos. El total informado MUST NOT utilizarse para descartar productos recibidos.
- **FR-010**: Cada solicitud MUST obtener solamente la página inicial. La paginación devuelta MUST ser informativa y MUST NOT provocar consultas adicionales automáticas en esta versión.
- **FR-011**: Una búsqueda válida sin productos MUST producir éxito con una lista vacía. Un fallo de proveedor o datos incompatibles MUST NOT transformarse en un éxito sin resultados.
- **FR-012**: Las respuestas MUST seguir los envelopes y semántica del proyecto: `400` para validación, `401` para autenticación, `429` para límites, `502` para fallos del proveedor y `500` para fallos internos como indisponibilidad o configuración inválida del secreto.
- **FR-013**: La búsqueda MUST terminar con resultados o un error seguro en un máximo de 30 segundos en las pruebas de aceptación. MUST existir una espera acotada para el proveedor y tratamiento explícito de sus límites de solicitudes.
- **FR-014**: Credenciales Bearer, claves del proveedor, URLs que las contengan y detalles internos MUST quedar fuera de respuestas, metadatos y registros. Los errores MUST distinguir validación, autenticación, límite e indisponibilidad sin revelar esos datos.
- **FR-015**: La búsqueda MUST ser de consulta y MUST NOT guardar productos en colección, wishlist o perfil ni cambiar el comportamiento de las rutas existentes.

### Key Entities

- **Solicitud de búsqueda**: Texto `q` y parámetros de mercado proporcionados por un usuario autenticado.
- **Mercado**: Idioma `hl`, país `gl`, dominio `google_domain` y ubicación `location` que contextualizan las ofertas.
- **Producto u oferta**: Resultado con posición, identificador, título, enlace, comercio y precio; puede incluir imagen, calificación, reseñas, cuotas y precios alternativos.
- **Resultado de búsqueda**: Lista principal y secciones opcionales de contexto, filtros, paginación y categorías, conservando sus relaciones originales.
- **Credencial del usuario**: Sesión Bearer de BrickHub que habilita la búsqueda.
- **Credencial del proveedor**: Secreto exclusivo del backend que permite consultar ScrapeDo y nunca se entrega al usuario.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100% de los escenarios con sesión válida y ofertas disponibles, el usuario puede consultar productos, comercios y precios sin proporcionar credenciales del proveedor.
- **SC-002**: El 100% de las solicitudes sin sesión válida se rechaza sin devolver productos ni consumir búsquedas externas.
- **SC-003**: El 100% de las pruebas de mercado conserva los valores explícitos y aplica los valores de México únicamente a los parámetros omitidos.
- **SC-004**: La muestra proporcionada conserva sus 40 productos principales en el mismo orden, sin pérdida de precisión en identificadores o precios, aunque el total informado sea cero.
- **SC-005**: El 100% de los escenarios de validación, ausencia de productos, indisponibilidad y límites comunica una condición distinguible y accionable; resultados y errores llegan dentro de 30 segundos en las pruebas de aceptación.
- **SC-006**: Ninguna respuesta ni registro de las pruebas de aceptación contiene credenciales del usuario, claves del proveedor ni direcciones que revelen esas credenciales.

## Assumptions

- Se propone `GET /v1/shopping/search` como ruta nueva; el contrato detallado se formalizará en la planificación. Se usa `q` como nombre público del texto solicitado.
- El cliente selecciona el mercado y envía los parámetros correspondientes. Una interfaz de selección y un catálogo propio de mercados quedan fuera del alcance.
- Se admiten cambios parciales de mercado, usando valores predeterminados para campos omitidos. La aceptación de una combinación depende de ScrapeDo.
- Se reutiliza el Bearer token de Cognito de las rutas privadas existentes; no se incorpora inicio de sesión nuevo.
- La dirección solicitada es `https://api.scrape.do/plugin/google/shopping`, mediante GET con los parámetros indicados y `token` obtenido exclusivamente por el backend. La dirección, el proveedor y el secreto son restricciones expresas del usuario, no decisiones de arquitectura nuevas.
- El secreto `scrapedo` ya existe con `SCRAPE_DO_API_KEY`. Su disponibilidad y permiso de lectura son dependencias. No se consultó su contenido durante la especificación.
- La muestra adjunta es una referencia, no una garantía de resultados constantes: contiene `search_parameters`, `search_information`, `shopping_results`, `filters`, `pagination` y `categorized_shopping_results`, con campos opcionales e imágenes embebidas.
- Las referencias opacas de detalle de producto de la muestra son datos del resultado, distintos de las credenciales del usuario o proveedor. No se incorporan consultas de detalle.
- Los límites de 200 caracteres y 30 segundos son supuestos iniciales verificables para acotar entradas y esperas.
- Quedan fuera paginación solicitada por el cliente, selección de dispositivo u orden, filtros adicionales, conversión de monedas, caché, persistencia, compras y cambios a la búsqueda de Brickset.
