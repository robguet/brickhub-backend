# Feature Specification: Consulta de sets Brickset

**Feature Branch**: `001-search-brickset-sets`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "Implementar el primer endpoint de consulta de sets en Brickset y extraer las credenciales del proveedor para manejarlas como secretos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar un set por número (Priority: P1)

Como cliente de BrickHub, quiero consultar un número de set LEGO para recibir los sets coincidentes y mostrarlos en la aplicación.

**Why this priority**: Es la primera capacidad de catálogo del producto y entrega valor aun sin funciones de colección, autenticación o persistencia.

**Independent Test**: Se puede probar enviando una consulta válida, como `10212`, y comprobando que se devuelve el estado de la consulta, el total de coincidencias y los datos de cada set encontrado.

**Acceptance Scenarios**:

1. **Given** que el cliente proporciona una consulta de set válida y Brickset devuelve coincidencias, **When** solicita la ruta pública de catálogo, **Then** recibe una respuesta satisfactoria con el estado, el número de coincidencias y una lista de sets que conserva los datos disponibles del proveedor.
2. **Given** que el cliente proporciona una consulta válida sin coincidencias, **When** solicita la ruta pública de catálogo, **Then** recibe una respuesta satisfactoria con cero coincidencias y una lista vacía.
3. **Given** que un set incluye datos opcionales incompletos del proveedor, **When** se devuelve el resultado, **Then** se preservan los campos disponibles y la respuesta sigue siendo válida para el contrato público.

---

### User Story 2 - Recibir errores seguros y útiles (Priority: P2)

Como cliente de BrickHub, quiero saber si mi consulta no es válida o si el catálogo está temporalmente no disponible, sin que se filtren detalles sensibles.

**Why this priority**: Permite que la app informe y gestione problemas de búsqueda sin revelar credenciales ni detalles internos del proveedor.

**Independent Test**: Se puede probar con una consulta ausente o inválida y simulando un fallo del proveedor, verificando que el cliente recibe el código y el envelope de error correspondientes, sin secretos en el body ni en los logs.

**Acceptance Scenarios**:

1. **Given** que falta la consulta o no cumple las reglas de formato, **When** el cliente solicita la ruta, **Then** recibe un error de validación que indica cómo corregir la solicitud.
2. **Given** que Brickset no puede completar la consulta dentro del tiempo permitido, **When** el cliente solicita la ruta, **Then** recibe un error de proveedor seguro y consistente, sin las credenciales ni la respuesta interna del proveedor.

### Edge Cases

- La consulta está vacía, solo contiene espacios o excede el límite de longitud definido para evitar solicitudes involuntariamente costosas.
- Brickset responde con un estado de aplicación no exitoso, una carga malformada o campos no esperados.
- Brickset no responde, responde con un error HTTP o limita temporalmente las solicitudes.
- Un resultado contiene arreglos vacíos u objetos opcionales vacíos, por ejemplo información regional de precio o dimensiones.
- El resultado incluye texto no ASCII, URLs ausentes o fechas no disponibles.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST exponer una ruta pública versionada bajo `/v1` para buscar sets usando un término de consulta suministrado por el cliente.
- **FR-002**: El sistema MUST validar que la consulta existe, eliminar espacios externos y rechazar valores vacíos o que excedan el límite documentado antes de contactar al proveedor.
- **FR-003**: El sistema MUST solicitar a Brickset los resultados asociados a la consulta validada y devolver un envelope de éxito consistente que incluya `status`, `matches` y `sets`.
- **FR-004**: Cada set devuelto MUST conservar el contrato del proveedor para los datos de catálogo disponibles: identificadores, número y variante, nombre, año, clasificación temática, disponibilidad, conteos, fechas, URLs e imágenes, datos de colección, precios regionales, calificación, empaquetado, rangos de edad, dimensiones, códigos de barras, números de artículo, datos extendidos y fecha de actualización.
- **FR-005**: El sistema MUST tratar como opcionales los bloques de datos de catálogo que Brickset omita o entregue vacíos, sin invalidar resultados que sí tengan información utilizable.
- **FR-006**: El sistema MUST obtener las credenciales requeridas por Brickset desde una ubicación de secretos administrada, sin incluirlas en el código fuente, archivos de configuración versionados, respuestas HTTP ni logs.
- **FR-007**: El sistema MUST devolver errores de validación seguros y consistentes para solicitudes de búsqueda inválidas.
- **FR-008**: El sistema MUST traducir fallos, tiempos de espera, limitación o respuestas inválidas de Brickset en un error de proveedor seguro y consistente.
- **FR-009**: El sistema MUST imponer un tiempo máximo de espera al proveedor y registrar información de diagnóstico estructurada que excluya secretos, credenciales y cargas sensibles.
- **FR-010**: El sistema MUST mantener la compatibilidad del contrato con los DTOs de BrickHubData y versionar cualquier cambio incompatible en una nueva ruta.

### Key Entities

- **Consulta de set**: Término validado enviado por el cliente para buscar sets de catálogo.
- **Resultado de búsqueda**: Estado informado por el proveedor, número total de coincidencias y lista de sets.
- **Set de catálogo**: Representación de un set LEGO, incluyendo datos básicos, imagen, enlaces, detalles de disponibilidad, colecciones, precios regionales, valoraciones, dimensiones e identificadores auxiliares disponibles.
- **Credenciales de Brickset**: Par de valores privados necesarios para autorizar la consulta al proveedor; solo son accesibles para el servicio en ejecución.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las consultas válidas con una respuesta exitosa del proveedor entregan al cliente el estado, el conteo de coincidencias y la lista de sets sin alterar sus valores de catálogo disponibles.
- **SC-002**: El 100% de las solicitudes con consulta vacía o inválida son rechazadas antes de iniciar una consulta al proveedor.
- **SC-003**: El 100% de los errores del proveedor que llegan al cliente excluyen credenciales, secretos y detalles internos.
- **SC-004**: En pruebas con respuestas representativas que contienen datos opcionales vacíos o ausentes, el 100% de las respuestas válidas del proveedor sigue disponible para el cliente.
- **SC-005**: Para consultas de desarrollo con el proveedor disponible, al menos el 95% de los resultados se entrega al cliente en menos de 3 segundos, excluyendo interrupciones del proveedor.

## Assumptions

- La ruta de catálogo es pública en esta primera iteración porque no consulta ni modifica datos de usuario.
- La consulta se usa inicialmente como búsqueda por número o texto de set; filtros avanzados, paginación, caché y persistencia quedan fuera de alcance.
- El proveedor Brickset mantiene un mecanismo de consulta con un término de búsqueda y devuelve un envelope equivalente al contrato proporcionado.
- Las credenciales existentes entregadas para desarrollo se migrarán a un secreto administrado y se revocarán o rotarán si hubieran quedado expuestas fuera de ese almacén.
- La especificación describe el resultado de negocio; la elección concreta de nombre de ruta, límites de consulta y mecanismo de inyección de secretos se decidirá en el plan técnico, respetando la constitución del proyecto.
