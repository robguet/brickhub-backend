# Feature Specification: Consulta de detalles y tiendas de Google Shopping

**Feature Branch**: `main` (directorio independiente: `009-shopping-product-details`)

**Created**: 2026-10-04

**Status**: Draft — validada y lista para planificación

**Input**: Crear un nuevo endpoint después de la búsqueda de Google Shopping. El consumidor enviará `catalog_id`, `q`, `hl`, `gl`, `google_domain` y `location`; se consultará `https://api.scrape.do/plugin/google/shopping/product` con la misma credencial privada y con `load_all_stores=true` y `more_stores=true`, devolviendo el resultado del proveedor. Referencia: respuesta adjunta con 33 tiendas y 8 opciones alternativas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar las tiendas de un producto elegido (Priority: P1)

Como usuario autenticado, quiero elegir un producto de la búsqueda y consultar sus detalles y tiendas proporcionando su catálogo y el texto buscado.

**Why this priority**: Permite pasar de los resultados de búsqueda a las ofertas del producto elegido.

**Independent Test**: Enviar el catálogo `6789801949246787910` y `q=LEGO 75394` con autorización válida y una respuesta controlada como la muestra; comprobar los detalles recibidos.

**Acceptance Scenarios**:

1. **Given** un catálogo y búsqueda válidos, **When** el consumidor llama al nuevo endpoint, **Then** se solicita al proveedor ese catálogo y texto con ambas opciones de tiendas activadas.
2. **Given** la respuesta de referencia, **When** se devuelve el resultado, **Then** se conservan sus 33 tiendas en orden, 8 opciones alternativas, identificadores, título y fuente.
3. **Given** tiendas sin precio, imagen o valoración, **When** se devuelve el producto, **Then** esas tiendas permanecen y no se inventan atributos.
4. **Given** un producto válido sin tiendas, **When** se devuelve el resultado, **Then** se obtiene éxito con una lista vacía.
5. **Given** una búsqueda terminada, **When** el consumidor todavía no solicita detalles, **Then** la búsqueda conserva su respuesta y no consulta automáticamente ningún catálogo.

---

### User Story 2 - Elegir el mercado de la consulta (Priority: P1)

Como usuario, quiero obtener ofertas para el idioma, país, dominio y ubicación que elija, usando el mismo contexto que en mi búsqueda.

**Why this priority**: Las tiendas y condiciones disponibles dependen del mercado elegido.

**Independent Test**: Consultar detalles con mercado mexicano, un mercado personalizado y parámetros parcialmente omitidos; verificar los valores enviados.

**Acceptance Scenarios**:

1. **Given** `hl=es-mx`, `gl=mx`, `google_domain=google.com.mx` y `location=Mexico`, **When** se consulta el producto, **Then** el proveedor recibe esos cuatro valores.
2. **Given** valores personalizados válidos, **When** se consulta el producto, **Then** se usan los valores aportados sin sustituirlos por México.
3. **Given** parámetros de mercado omitidos, **When** se consulta el producto, **Then** cada parámetro omitido adopta el valor mexicano vigente en búsqueda.
4. **Given** metadatos del proveedor distintos del mercado pedido, **When** se devuelve el resultado, **Then** se conservan los metadatos recibidos sin afirmar que son los valores solicitados ni modificar retrospectivamente la petición.

---

### User Story 3 - Consultar con protección y errores claros (Priority: P2)

Como consumidor autorizado, quiero identificar las solicitudes inválidas y fallos del proveedor sin que se expongan credenciales.

**Why this priority**: Mantiene las garantías de acceso y confidencialidad de la primera parte.

**Independent Test**: Simular autorización inválida, parámetros inválidos, indisponibilidad, límite de consultas, demora y respuesta malformada; comprobar errores seguros y ausencia de consultas en los rechazos locales.

**Acceptance Scenarios**:

1. **Given** autorización ausente, inválida o vencida, **When** se solicita el producto, **Then** se rechaza con 401 antes de acceder al proveedor o a su credencial.
2. **Given** catálogo o búsqueda ausentes, vacíos o inválidos, **When** se solicita el producto, **Then** se devuelve 400 sin consultar al proveedor.
3. **Given** parámetros desconocidos o repetidos, incluyendo intentos de cambiar las opciones fijas, **When** se solicita el producto, **Then** se rechaza con 400.
4. **Given** límite de consultas del proveedor, **When** falla la consulta, **Then** se devuelve 429 con indicación de reintento únicamente si es válida y segura.
5. **Given** respuesta malformada, error del proveedor, demora excesiva o tamaño excesivo, **When** no es posible entregar detalles válidos, **Then** se devuelve 502 seguro sin éxito parcial ni truncamiento silencioso.
6. **Given** fallo de acceso a la credencial privada, **When** no puede completarse la consulta, **Then** se devuelve un error interno seguro sin revelar el secreto.

### Edge Cases

- Catálogos de más de 16 dígitos: conservar el identificador como texto; nunca convertirlo a un número que pierda precisión.
- Catálogo no decimal, cero, espacios internos, vacío o demasiado largo: rechazar antes de consultar.
- Catálogo sintácticamente válido sin producto utilizable: error seguro del proveedor; no fabricar un producto vacío ni convertir todo fallo en 404.
- Producto con `stores=[]`: éxito; ausencia de `product_results` no equivale a cero tiendas.
- Comercios repetidos y ofertas agotadas: conservar todas las ofertas y su orden, sin deduplicación ni filtrado por disponibilidad.
- Precios extraídos con decimales distintos del total: mantener los valores originales, sin redondear ni recalcular.
- Campos opcionales ausentes o nulos: preservar esa condición, sin valores ficticios.
- La muestra devuelve `google_domain=google.com` y omite `location` y `more_stores`: no exigir que todos los parámetros enviados sean reflejados en la respuesta.
- Respuesta con credenciales reflejadas o enlaces inseguros: mantener la protección vigente; no exponer el token ni entregar enlaces que lo contengan.
- Más o menos de 33 tiendas: aceptar la cantidad válida que entregue el proveedor dentro de los límites de respuesta; la muestra no establece un máximo de tiendas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST ofrecer un nuevo `GET /v1/shopping/product`, protegido por el mismo mecanismo Bearer de búsqueda, para consultar un catálogo por solicitud.
- **FR-002**: El consumidor MUST proporcionar `catalog_id` y `q` como parámetros de consulta. `catalog_id` MUST ser una cadena de 1 a 100 dígitos decimales que represente un valor positivo; se preservará como texto. `q` MUST contener de 1 a 200 caracteres tras quitar espacios exteriores.
- **FR-003**: El consumidor MUST poder proporcionar `hl`, `gl`, `google_domain` y `location`. Los valores omitidos MUST ser `es-mx`, `mx`, `google.com.mx` y `Mexico`, respectivamente, igual que búsqueda.
- **FR-004**: Los parámetros de mercado MUST cumplir las reglas vigentes de búsqueda: idioma de 2–3 letras con región opcional de 2 letras, país de 2 letras, dominio Google admitido sin esquema ni ruta y ubicación de 1–200 caracteres sin caracteres de control; MUST rechazarse parámetros desconocidos y repetidos con 400 antes de consultar al proveedor.
- **FR-005**: Una solicitud válida y autorizada MUST consultar `GET https://api.scrape.do/plugin/google/shopping/product` con el catálogo, texto y mercado efectivos de la petición. MUST enviar siempre `load_all_stores=true` y `more_stores=true`; estas opciones no son configurables por el consumidor.
- **FR-006**: La consulta MUST utilizar la credencial privada existente del secreto `scrapedo`, clave `SCRAPE_DO_API_KEY`, exclusivamente para el proveedor; no se aceptará un token del proveedor aportado por el consumidor ni se expondrá la credencial en respuestas, enlaces o registros.
- **FR-007**: El éxito MUST devolver el resultado de detalles recibido dentro del sobre vigente `{status: "success", data: ...}`. El contenido de `data` MUST conservar `product_results` y `search_parameters` cuando estén presentes, sin convertirlo al formato de resultados de búsqueda.
- **FR-008**: Los detalles MUST conservar los campos de la referencia presentes: `title`, `product_id`, `stores`, `more_options`, `extension_ids` y `source`. Los identificadores de producto, catálogo y comercio MUST mantenerse como cadenas.
- **FR-009**: Las tiendas MUST conservar su orden y los atributos presentes: `position`, `name`, `link`, `title`, `tag`, `merchant_id`, `logo`, `thumbnail`, `rating`, `reviews`, `price`, `extracted_price`, `currency`, `shipping`, `shipping_extracted`, `tax_hint`, `total`, `extracted_total` y `details_and_offers`. MUST preservarse valores numéricos y campos ausentes o nulos sin recalcular, redondear, ordenar ni deduplicar ofertas.
- **FR-010**: Las opciones alternativas MUST conservar sus títulos e identificadores sin desencadenar consultas adicionales. Los metadatos devueltos MUST reflejar lo recibido del proveedor; su ausencia o diferencia respecto a parámetros enviados no autoriza inventarlos o sobrescribirlos.
- **FR-011**: Una respuesta de producto válida sin tiendas MUST devolverse como éxito. Datos malformados, producto ausente o error indicado por el proveedor MUST producir un error seguro y no un éxito vacío. Los fallos MUST distinguir 400 de validación, 401 de autenticación, 429 de límites, 502 de proveedor y 500 de fallo interno.
- **FR-012**: La operación MUST finalizar dentro de 30 segundos con resultado o error, aplicar los límites vigentes de tamaño y proteger credenciales y enlaces. Una respuesta que exceda dichos límites MUST rechazarse sin omitir tiendas silenciosamente.
- **FR-013**: `/v1/shopping/search` MUST conservar su contrato y comportamiento actuales. La continuación MUST iniciarla el consumidor enviando el catálogo elegido; no se requiere una búsqueda previa registrada ni se seleccionan automáticamente productos.
- **FR-014**: El contrato y ejemplos MUST documentar el flujo búsqueda → elección de catálogo → consulta de detalles con el mismo mercado, así como autenticación, parámetros, respuesta y errores del nuevo endpoint.

### Key Entities *(include if feature involves data)*

- **Solicitud de detalles**: Catálogo textual obligatorio, texto buscado obligatorio y mercado efectivo aportados por un consumidor autenticado.
- **Mercado**: Idioma, país, dominio Google y ubicación, con valores predeterminados compartidos con búsqueda.
- **Detalles del producto**: Título, identificador, ofertas de tiendas, alternativas, fuente e identificadores de extensión proporcionados por el proveedor.
- **Oferta de tienda**: Comercio y enlace con posición y atributos opcionales de precio, entrega, disponibilidad, valoraciones e imágenes.
- **Resultado de consulta**: Detalles y metadatos dentro del sobre vigente o un error seguro reconocible por el consumidor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El consumidor puede completar el flujo búsqueda, selección de un catálogo y consulta de tiendas mediante dos solicitudes públicas, sin proporcionar credenciales del proveedor.
- **SC-002**: En el 100 % de escenarios de mercado verificados, el catálogo, búsqueda, idioma, país, dominio y ubicación enviados corresponden a los valores efectivos de la solicitud.
- **SC-003**: La referencia conserva las 33 tiendas en orden y las 8 alternativas, incluidos comercios sin precio, ofertas repetidas y agotadas, sin pérdida de precisión de identificadores ni de precios.
- **SC-004**: En el 100 % de escenarios inválidos o no autorizados verificados, no se consulta al proveedor ni se expone su credencial.
- **SC-005**: Toda consulta verificada termina con un resultado completo o un error reconocible dentro de 30 segundos; ningún caso de demora, tamaño excesivo o respuesta malformada produce éxito parcial.
- **SC-006**: El 100 % de escenarios vigentes de búsqueda sigue entregando su respuesta previa sin iniciar consultas de detalles.
- **SC-007**: Un consumidor puede reproducir el flujo completo con los ejemplos documentados e identificar tanto una lista válida vacía como un fallo de consulta.

## Assumptions

- Esta especificación actualiza la función activa `009-shopping-product-details` conforme a la petición expresa de un nuevo endpoint y catálogo aportado por el consumidor; reemplaza la propuesta previa de encadenar todo dentro de búsqueda.
- La ruta propuesta es `/v1/shopping/product`, siguiendo el espacio de rutas vigente. El resultado del proveedor se entrega dentro de `data`, conforme al sobre de éxito del proyecto; no se solicita una excepción para devolver un cuerpo raíz distinto.
- El consumidor reutiliza búsqueda y mercado al solicitar detalles. El backend no conserva contexto de búsquedas previas ni obliga a demostrar de dónde obtuvo el catálogo.
- Se reutilizan autenticación, valores mexicanos predeterminados, reglas de mercado, credencial privada y garantías de seguridad de `008-google-shopping-search`.
- El límite de catálogo de 100 dígitos y la duración máxima de 30 segundos son límites operativos asumidos para planificación. Activar ambas opciones solicita las tiendas que el proveedor pueda entregar; no garantiza todas las tiendas existentes en el mundo.
- La muestra adjunta define los campos de referencia, no una cantidad fija de ofertas ni la presencia de todos los atributos. Sus metadatos pueden omitir opciones enviadas o reflejar un dominio diferente.
- Dependencias: proveedor ScrapeDo, secreto existente, autenticación vigente y catálogo obtenido por el consumidor. Fuera de alcance: consultas de varios catálogos, consultas automáticas desde búsqueda, persistencia, nuevas pantallas, extracción de páginas de comercios y despliegue.
