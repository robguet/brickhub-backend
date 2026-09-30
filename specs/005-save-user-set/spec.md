# Feature Specification: Guardar set del usuario

**Feature Branch**: `005-save-user-set`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "Necesito implementar un nuevo endpoint que guarde el set en Mi Colección o mi Wishlist para cada usuario, usando el objeto de set proporcionado y un bearer token."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guardar un set autenticado (Priority: P1)

Como usuario autenticado, quiero guardar un set de LEGO en Mi Colección o en mi Wishlist para conservarlo asociado solamente a mi cuenta.

**Why this priority**: Es la capacidad esencial para que un usuario construya y mantenga sus listas personales.

**Independent Test**: Se puede probar enviando una solicitud autenticada con un set válido y un destino, y comprobando que el set queda disponible únicamente para la cuenta autenticada en el destino elegido.

**Acceptance Scenarios**:

1. **Given** un usuario con una credencial Bearer válida y un set válido, **When** guarda el set en Mi Colección, **Then** el set se conserva en Mi Colección de ese usuario con todos los atributos recibidos.
2. **Given** un usuario con una credencial Bearer válida y un set válido, **When** guarda el set en mi Wishlist, **Then** el set se conserva en la Wishlist de ese usuario con todos los atributos recibidos.
3. **Given** dos usuarios autenticados diferentes, **When** uno guarda un set, **Then** el otro no puede consultar, modificar ni sobrescribir ese registro mediante esta operación.

---

### User Story 2 - Evitar registros duplicados o ambiguos (Priority: P2)

Como usuario autenticado, quiero que cada set guardado tenga un único destino para que mis listas no contengan estados contradictorios.

**Why this priority**: Mantiene la integridad de las listas y evita que un mismo registro se interprete simultáneamente como colección y wishlist.

**Independent Test**: Se puede probar intentando guardar el mismo set para el mismo usuario más de una vez y verificando que el resultado no crea un registro duplicado ni un destino ambiguo.

**Acceptance Scenarios**:

1. **Given** un set ya guardado por un usuario en uno de los destinos, **When** el usuario repite la solicitud con el mismo destino, **Then** el sistema no crea un registro adicional y comunica el resultado de forma consistente.
2. **Given** una solicitud que intenta asignar más de un destino al mismo set, **When** se valida la solicitud, **Then** se rechaza antes de guardar información.
3. **Given** un set ya guardado en Mi Colección, **When** el usuario lo guarda en mi Wishlist, **Then** el mismo registro cambia su destino a Wishlist sin crear un segundo registro.

---

### User Story 3 - Proteger el guardado de sets (Priority: P3)

Como servicio, quiero rechazar solicitudes sin autenticación válida para impedir que alguien guarde sets en nombre de otra persona.

**Why this priority**: La protección de datos personales es necesaria para que las listas sean confiables.

**Independent Test**: Se puede probar la operación sin credencial, con una credencial inválida y con una credencial válida, verificando los resultados de acceso esperados.

**Acceptance Scenarios**:

1. **Given** una solicitud sin encabezado Bearer o con una credencial no válida, **When** intenta guardar un set, **Then** se rechaza y no se crea ningún registro.
2. **Given** una credencial Bearer válida, **When** intenta declarar la identidad de otro usuario en la solicitud, **Then** el set se asocia únicamente con la identidad autenticada.

### Edge Cases

- La solicitud se rechaza si falta algún atributo obligatorio del set o si sus valores no tienen el formato esperado.
- La solicitud se rechaza si el destino no es exactamente Mi Colección o mi Wishlist.
- La solicitud se rechaza si la fecha, URL, número de set o identificador numérico recibidos no pueden interpretarse de forma válida.
- Los campos opcionales de imagen, código de barras, subtema, puntuaciones y fechas de lanzamiento/salida se conservan cuando se proporcionan y no impiden guardar el set cuando no se proporcionan.
- Una credencial expirada, alterada o destinada a otra aplicación no permite crear registros.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer una operación privada, versionada, para guardar un set de LEGO para el usuario autenticado.
- **FR-002**: La operación DEBE exigir una credencial Bearer válida y rechazar solicitudes sin credencial o con una credencial inválida, expirada o no autorizada.
- **FR-003**: El sistema DEBE obtener la identidad propietaria exclusivamente de la credencial autenticada; no DEBE aceptar una identidad de usuario enviada por el cliente como fuente de autorización.
- **FR-004**: El sistema DEBE permitir exactamente uno de estos destinos por set y usuario: `collection` o `wishlist`; guardar un set existente en el otro destino DEBE mover el mismo registro.
- **FR-005**: El sistema DEBE conservar, para cada set guardado, su identificador, número, variante, nombre, año, tema, subtema, categoría, disponibilidad, número de piezas, fechas de lanzamiento y salida, imágenes, enlace informativo, puntuación, conteos de puntuaciones y reseñas, tipo de empaque, código EAN y fecha de última actualización cuando se proporcionen.
- **FR-006**: El sistema DEBE exigir como mínimo el identificador del set, número, variante, nombre, año, tema, categoría, estado de lanzamiento y número de piezas; los demás atributos del objeto recibido son opcionales.
- **FR-007**: El sistema DEBE validar todos los valores recibidos, incluidos identificadores numéricos, URLs, fechas, objetos de imagen y código de barras, antes de intentar guardarlos.
- **FR-008**: El sistema DEBE evitar que el mismo usuario tenga registros duplicados del mismo set en el mismo destino y DEBE responder de manera consistente cuando se repita la solicitud.
- **FR-009**: El sistema DEBE impedir que una operación de guardado permita crear, modificar o sobrescribir datos pertenecientes a otra identidad autenticada.
- **FR-010**: La respuesta exitosa DEBE confirmar el set guardado y su destino, sin revelar credenciales ni datos de otros usuarios.
- **FR-011**: Las respuestas de validación, autenticación, autorización, conflicto y error interno DEBEN seguir el formato de error público consistente del producto y no exponer detalles internos ni información sensible.

### Key Entities *(include if feature involves data)*

- **Set guardado**: Copia de la información de un set de LEGO que el usuario decide conservar, identificada por el set y asociada a un único destino.
- **Destino de lista**: Clasificación exclusiva del set guardado, con los valores `collection` o `wishlist`.
- **Propietario autenticado**: Usuario identificado por la credencial Bearer válida; determina de forma exclusiva quién puede poseer el set guardado.
- **Información del set**: Metadatos del set, incluidas sus imágenes, fechas, puntuaciones, empaque, enlace externo y código de barras cuando estén disponibles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las solicitudes con una credencial válida y un set válido guardan el set en el destino solicitado sin asociarlo a otra cuenta.
- **SC-002**: El 100% de las solicitudes sin credencial válida se rechazan y no crean ningún set guardado.
- **SC-003**: En pruebas de aislamiento con al menos dos usuarios, el 100% de los sets guardados permanecen asociados exclusivamente a su propietario autenticado.
- **SC-004**: En pruebas de repetición de solicitud, el 100% de los casos no producen registros duplicados del mismo set para el mismo usuario y destino.
- **SC-005**: Al menos el 95% de las solicitudes válidas completan la confirmación de guardado en menos de 2 segundos bajo la carga normal de desarrollo definida para el servicio.

## Assumptions

- La aplicación ya cuenta con un proveedor de identidad que emite credenciales Bearer verificables y con una identidad única por usuario.
- Mi Colección y mi Wishlist se representan como los valores de destino `collection` y `wishlist`, respectivamente.
- La repetición del mismo set en el mismo destino se tratará de forma idempotente: no crea un duplicado y devuelve una confirmación consistente.
- Guardar el mismo set en el otro destino actualiza `destination` en el registro existente; un set nunca existe en ambas listas para el mismo usuario.
- Este alcance cubre exclusivamente guardar un set; consultar, editar, eliminar, mover entre listas e importar colecciones quedan fuera de alcance.
