# Feature Specification: Eliminar set guardado

**Feature Branch**: `007-delete-saved-set`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Ahora se necesita crear un endpoint para eliminar un set guardado de la db, usa seguridad bearer token."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Eliminar uno de mis sets guardados (Priority: P1)

Como usuario autenticado, quiero eliminar un set guardado de una de mis listas para mantener mi colección o wishlist actualizadas.

**Why this priority**: Eliminar registros que ya no desea conservar es la capacidad esencial de mantenimiento de las listas personales.

**Independent Test**: Se puede probar guardando un set para un usuario autenticado, solicitando su eliminación mediante el identificador del set y comprobando que deja de aparecer para ese usuario, sin afectar otros sets.

**Acceptance Scenarios**:

1. **Given** un usuario con una credencial Bearer válida y un set guardado, **When** solicita eliminar ese set, **Then** el set se elimina de sus listas y la respuesta confirma la eliminación.
2. **Given** un usuario con varios sets guardados, **When** elimina uno de ellos, **Then** los demás sets guardados permanecen disponibles sin cambios.
3. **Given** un set guardado con destino `collection` o `wishlist`, **When** su propietario solicita eliminarlo, **Then** se elimina el registro guardado independientemente de su destino.

---

### User Story 2 - Mantener el aislamiento entre cuentas (Priority: P2)

Como usuario, quiero que solo yo pueda eliminar mis sets guardados para que nadie pueda modificar mis listas.

**Why this priority**: Las listas de sets son datos privados y su integridad depende de que la operación se limite al propietario autenticado.

**Independent Test**: Se puede probar creando el mismo set guardado para dos usuarios y verificando que la eliminación de uno no borra ni altera el registro del otro.

**Acceptance Scenarios**:

1. **Given** dos usuarios con sets guardados, **When** uno solicita eliminar un set, **Then** la operación solo puede afectar el registro perteneciente a su propia cuenta.
2. **Given** un usuario autenticado intenta indicar una identidad distinta en la solicitud, **When** solicita eliminar un set, **Then** la identidad declarada por el cliente no determina qué registro puede eliminarse.
3. **Given** un usuario solicita eliminar un set que no tiene guardado, **When** se procesa la solicitud, **Then** no se elimina ningún registro de otra cuenta.

---

### User Story 3 - Rechazar eliminaciones sin autenticación válida (Priority: P3)

Como servicio, quiero rechazar solicitudes no autenticadas para impedir eliminaciones no autorizadas.

**Why this priority**: La autenticación es necesaria para proteger datos personales y evitar acciones destructivas ajenas.

**Independent Test**: Se puede probar la operación sin credencial, con una credencial inválida y con una credencial válida, verificando que solo la última puede eliminar su propio registro.

**Acceptance Scenarios**:

1. **Given** una solicitud sin encabezado Bearer o con una credencial inválida, **When** intenta eliminar un set guardado, **Then** se rechaza y no se elimina ningún registro.
2. **Given** una credencial expirada, alterada o destinada a otra aplicación, **When** intenta eliminar un set guardado, **Then** se rechaza sin revelar datos de las listas.

### Edge Cases

- La solicitud se rechaza si el identificador de set no tiene un formato válido.
- Cuando el set solicitado no está guardado para el usuario autenticado, el resultado comunica que el recurso no existe y no elimina otro registro.
- Repetir la eliminación de un set ya eliminado no altera datos adicionales ni revela si ese set pertenece a otra cuenta.
- Una solicitud que intenta incluir un identificador de usuario no puede ampliar ni cambiar el alcance de la eliminación.
- Un fallo interno devuelve el error público seguro y consistente del producto, sin exponer detalles de almacenamiento, credenciales ni datos de otros usuarios.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer una operación privada y versionada para eliminar un set guardado del usuario autenticado mediante el identificador del set.
- **FR-002**: La operación DEBE exigir una credencial Bearer válida y rechazar solicitudes sin credencial o con una credencial inválida, expirada, alterada o no autorizada.
- **FR-003**: El sistema DEBE obtener la identidad del propietario exclusivamente de la credencial autenticada; no DEBE usar una identidad de usuario enviada por el cliente como fuente de autorización.
- **FR-004**: El sistema DEBE eliminar únicamente el set guardado que coincida con el identificador solicitado y pertenezca al usuario autenticado.
- **FR-005**: La eliminación DEBE afectar al registro completo del set guardado, incluidos su destino y los metadatos asociados, sin afectar otros sets del mismo usuario ni registros de otros usuarios.
- **FR-006**: La operación DEBE validar el identificador del set antes de intentar la eliminación.
- **FR-007**: Cuando no exista un set guardado que coincida para el usuario autenticado, la operación DEBE informar que el recurso no existe y no DEBE eliminar registros de otra cuenta.
- **FR-008**: La respuesta exitosa DEBE confirmar de manera consistente la eliminación del set solicitado, sin revelar credenciales, detalles internos de almacenamiento ni datos de otros usuarios.
- **FR-009**: Las respuestas de validación, autenticación, autorización, recurso inexistente y error interno DEBEN respetar el formato público consistente del producto y no exponer información sensible.

### Key Entities *(include if feature involves data)*

- **Set guardado**: Registro de un set de LEGO conservado por un único usuario, identificado por el set y clasificado en `collection` o `wishlist`.
- **Propietario autenticado**: Usuario identificado exclusivamente desde una credencial Bearer válida; define los registros que puede eliminar.
- **Identificador del set**: Identificador numérico único del set guardado que el usuario solicita eliminar.
- **Confirmación de eliminación**: Resultado que comunica al usuario que su set guardado fue retirado de sus listas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En pruebas con un set guardado válido, el 100% de las solicitudes autenticadas del propietario eliminan solo el set solicitado y confirman el resultado.
- **SC-002**: En pruebas con al menos dos usuarios, el 100% de las eliminaciones exitosas no afectan registros pertenecientes a otra cuenta.
- **SC-003**: El 100% de las solicitudes sin una credencial Bearer válida se rechazan sin eliminar registros.
- **SC-004**: El 100% de las solicitudes de eliminación para un set no guardado no eliminan registros y comunican que el recurso no existe.
- **SC-005**: Al menos el 95% de las eliminaciones autorizadas se confirman al usuario en menos de 2 segundos bajo la carga normal de desarrollo definida para el servicio.

## Assumptions

- La aplicación ya cuenta con un proveedor de identidad que verifica credenciales Bearer y entrega una identidad única por usuario.
- El identificador que selecciona el set para eliminar es `setID`, como en los sets guardados existentes.
- Un set guardado es único por usuario y `setID`, independientemente de si su destino actual es `collection` o `wishlist`.
- La solicitud usa la semántica de eliminación de un recurso y no requiere cuerpo de solicitud.
- Este alcance cubre exclusivamente eliminar un set guardado; crear, listar, editar, mover, recuperar y eliminar todos los sets de una lista quedan fuera de alcance.
