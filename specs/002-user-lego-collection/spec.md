# Feature Specification: Colección LEGO del usuario

**Feature Branch**: `002-user-lego-collection`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "Implementa una API protegida por JWT de Amazon Cognito para gestionar la colección LEGO del usuario. La Lambda debe obtener el identificador del usuario desde el claim `sub` del JWT validado, no desde datos enviados por la app. Guarda y consulta los sets en DynamoDB usando ese `sub`. Implementa endpoints para listar, añadir, editar y eliminar sets del usuario. Crear y configurar Cognito User Pool con email/contraseña y correo de verificación; añadir Google y Apple como proveedores; crear el App Client de iOS; configurar API Gateway para validar JWT antes de llamar a las Lambdas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear y acceder a mi cuenta (Priority: P1)

Como usuario de BrickHub, quiero crear y verificar una cuenta con mi correo y contraseña, o acceder con Google o Apple desde la app iOS, para usar mi colección con una identidad personal confiable.

**Why this priority**: Una identidad verificada es necesaria para que la colección sea privada y para que el sistema pueda atribuir cada set a la persona correcta.

**Independent Test**: Se puede probar registrando una cuenta por correo, completando la verificación y accediendo a las operaciones privadas; también se prueba el acceso desde iOS mediante Google y Apple y se confirma que cada sesión recibe una identidad válida.

**Acceptance Scenarios**:

1. **Given** que una persona no tiene cuenta, **When** se registra con un correo válido y una contraseña que cumple las reglas, **Then** recibe un mensaje de verificación en ese correo y no puede usar operaciones privadas hasta verificarlo.
2. **Given** que una persona verifica el correo recibido, **When** inicia sesión con su correo y contraseña, **Then** puede obtener una sesión autenticada para usar su colección.
3. **Given** que una persona elige Google o Apple en la app iOS, **When** completa correctamente el acceso con ese proveedor, **Then** puede obtener una sesión autenticada para usar su colección.
4. **Given** que el correo no se verifica, la contraseña no cumple las reglas o el proveedor externo rechaza el acceso, **When** la persona intenta crear o iniciar sesión, **Then** recibe una explicación segura que no revela credenciales ni información de otras cuentas.

---

### User Story 2 - Consultar mi colección (Priority: P1)

Como usuario autenticado de BrickHub, quiero consultar mis sets LEGO guardados para ver mi colección sin que aparezcan sets de otra persona.

**Why this priority**: Ver la colección propia es el valor mínimo de una gestión personal de sets y confirma el aislamiento de los datos.

**Independent Test**: Se puede probar creando sets para dos identidades autenticadas distintas y solicitando la colección de cada una; cada respuesta solo contiene sus propios registros.

**Acceptance Scenarios**:

1. **Given** que un usuario autenticado tiene sets guardados, **When** solicita listar su colección, **Then** recibe una respuesta satisfactoria con todos y solo los sets que le pertenecen.
2. **Given** que un usuario autenticado aún no tiene sets guardados, **When** solicita listar su colección, **Then** recibe una respuesta satisfactoria con una lista vacía.
3. **Given** que existen sets de otros usuarios, **When** un usuario autenticado solicita su colección, **Then** no se revelan esos sets ni su existencia.

---

### User Story 3 - Añadir un set a mi colección (Priority: P1)

Como usuario autenticado de BrickHub, quiero añadir un set LEGO a mi colección para conservar un registro personal de él.

**Why this priority**: Sin la creación de registros, la colección no aporta valor persistente.

**Independent Test**: Se puede probar enviando los datos válidos de un set bajo una identidad autenticada y verificando que el set aparece al listar la colección de esa misma identidad, pero no en otra.

**Acceptance Scenarios**:

1. **Given** que el usuario está autenticado y proporciona datos válidos de un set, **When** solicita añadirlo, **Then** recibe el registro creado y este queda asociado exclusivamente a su identidad autenticada.
2. **Given** que la solicitud de alta contiene un identificador de usuario proporcionado por la app, **When** se procesa la solicitud, **Then** dicho valor no determina ni puede cambiar la propiedad del registro.
3. **Given** que faltan datos obligatorios del set o son inválidos, **When** solicita añadirlo, **Then** recibe un error de validación y no se crea ningún registro.

---

### User Story 4 - Corregir o eliminar un set de mi colección (Priority: P2)

Como usuario autenticado de BrickHub, quiero editar o eliminar uno de mis sets para mantener mi colección correcta.

**Why this priority**: Mantiene la colección fiable después de cambios, errores de captura o la venta de un set.

**Independent Test**: Se puede probar creando un set para una identidad, modificándolo y eliminándolo; también se intenta cada operación desde otra identidad para confirmar que no puede afectar el registro.

**Acceptance Scenarios**:

1. **Given** que el usuario autenticado posee un set guardado y envía cambios válidos, **When** solicita editarlo, **Then** recibe el registro actualizado y su propiedad no cambia.
2. **Given** que el usuario autenticado posee un set guardado, **When** solicita eliminarlo, **Then** la operación se confirma y el set deja de aparecer en su colección.
3. **Given** que un set pertenece a otra identidad autenticada o no existe, **When** el usuario solicita editarlo o eliminarlo, **Then** recibe una respuesta de inexistencia que no revela información sobre la propiedad del set.

### Edge Cases

- La solicitud no incluye una credencial de autenticación válida, está vencida o no contiene una identidad confiable.
- El correo de una cuenta recién creada no se verifica, se usa un enlace vencido o se solicita una nueva verificación.
- Un proveedor de inicio de sesión externo cancela, rechaza o no devuelve una identidad válida.
- La app iOS intenta usar una credencial emitida para otra aplicación, audiencia o entorno.
- La app intenta enviar, alterar o reutilizar un identificador de usuario en el cuerpo, parámetros o ruta de cualquiera de las operaciones.
- El identificador de set solicitado es malformado, no existe o pertenece a otra identidad.
- Una edición no contiene cambios, intenta borrar campos obligatorios o entrega valores fuera de las reglas de validación.
- Dos solicitudes concurrentes intentan modificar o eliminar el mismo registro; la respuesta no debe dejar datos parcialmente actualizados ni confirmar una modificación inexistente.
- La colección contiene suficientes registros para requerir una continuación de resultados; el usuario puede recuperar el conjunto completo sin mezclar registros de otras personas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST ofrecer operaciones versionadas bajo `/v1` para que un usuario autenticado pueda listar, añadir, editar y eliminar sus sets de colección.
- **FR-002**: El sistema MUST permitir a una persona crear una cuenta mediante correo electrónico y contraseña, y exigir la verificación de ese correo antes de habilitarle operaciones privadas.
- **FR-003**: El sistema MUST permitir a una persona iniciar sesión mediante Google o Apple desde la app iOS y obtener una identidad autenticada equivalente para las operaciones privadas.
- **FR-004**: El cliente iOS registrado MUST poder obtener credenciales de sesión válidas únicamente para su propia aplicación, sin requerir que almacene secretos de autenticación.
- **FR-005**: El sistema MUST exigir una credencial JWT válida emitida por Amazon Cognito y validarla en el perímetro de las operaciones privadas antes de permitir cualquier operación de colección; si no es válida, debe devolver un error de autenticación seguro.
- **FR-006**: Para cada operación de colección, el sistema MUST derivar la identidad del propietario exclusivamente del claim `sub` de la credencial validada.
- **FR-007**: El sistema MUST no aceptar ningún identificador de usuario enviado por la app como fuente de autorización, partición, consulta o propiedad de un set; si se recibe, no puede alterar el resultado ni la asociación del registro.
- **FR-008**: El sistema MUST guardar cada set de colección en DynamoDB con exactamente un propietario derivado de la identidad autenticada y usar esa misma identidad para consultar los sets del usuario.
- **FR-009**: El sistema MUST permitir crear un registro de set con un identificador de catálogo y los atributos de colección definidos por el contrato, validando todos los valores suministrados antes de persistirlos.
- **FR-010**: El sistema MUST devolver al listar solo los registros cuyo propietario sea la identidad autenticada, incluyendo una continuación de resultados cuando sea necesaria para recuperar una colección completa.
- **FR-011**: El sistema MUST permitir editar únicamente un registro que pertenezca a la identidad autenticada, conservar su propietario original y devolver el registro resultante.
- **FR-012**: El sistema MUST permitir eliminar únicamente un registro que pertenezca a la identidad autenticada y confirmar la eliminación solo cuando esta se complete.
- **FR-013**: El sistema MUST tratar los registros inexistentes y los registros de otro usuario de la misma forma externa al editar o eliminar, sin revelar si el registro existe ni quién lo posee.
- **FR-014**: El sistema MUST rechazar entradas malformadas o incompletas sin crear ni modificar datos, y usar respuestas de éxito y error consistentes con las demás rutas públicas.
- **FR-015**: El sistema MUST mantener compatibilidad con los DTOs de BrickHubData; cualquier cambio incompatible del contrato debe publicarse mediante una versión de API nueva o una estrategia de migración explícita.
- **FR-016**: El sistema MUST registrar información diagnóstica suficiente para investigar fallos sin exponer tokens, cabeceras de autorización, identificadores personales completos ni detalles internos de persistencia.

### Key Entities

- **Identidad autenticada**: Identidad confiable del usuario que se obtiene de la credencial validada; contiene el `sub` que delimita todos sus datos de colección.
- **Cuenta de usuario**: Cuenta personal creada con correo y contraseña verificada, o a través de Google o Apple, que se vincula a una única identidad autenticada.
- **Cliente iOS**: Aplicación móvil registrada para solicitar sesiones destinadas a BrickHub; no conserva secretos de autenticación.
- **Set de colección**: Registro personal de un set LEGO, identificado dentro de la colección, con una referencia de catálogo, atributos de colección definidos por el contrato y un único propietario.
- **Colección**: Conjunto de sets de colección que pertenecen a una identidad autenticada; puede devolverse en varias páginas sin mezclar propietarios.
- **Solicitud de modificación**: Datos validados que expresan los cambios permitidos sobre un set de colección, sin incluir ni cambiar la identidad de su propietario.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En pruebas de aislamiento con al menos dos identidades y colecciones distintas, el 100% de las respuestas de listado contiene exclusivamente registros de la identidad que realizó la solicitud.
- **SC-002**: El 100% de los intentos de crear, editar, consultar o eliminar un set usando un identificador de usuario suministrado por la app conserva la asociación determinada por la identidad autenticada o es rechazado de forma segura.
- **SC-003**: El 100% de las operaciones válidas de alta, edición y eliminación se refleja correctamente al consultar de nuevo la colección del mismo usuario.
- **SC-004**: El 100% de los intentos de editar o eliminar un registro ajeno devuelve una respuesta indistinguible de la de un registro inexistente y no modifica datos de otro usuario.
- **SC-005**: En una colección de hasta 100 sets, al menos el 95% de las solicitudes de listado se completa en menos de 2 segundos en condiciones normales de desarrollo.
- **SC-006**: El 100% de las solicitudes sin credencial válida se rechaza antes de leer o modificar datos de colección.
- **SC-007**: El 100% de las cuentas creadas con correo y contraseña requiere una verificación de correo satisfactoria antes de completar una operación privada.
- **SC-008**: En pruebas de aceptación desde iOS, las personas pueden completar el acceso por correo/contraseña, Google y Apple en menos de 3 minutos por método cuando sus credenciales externas son válidas.

## Assumptions

- Se creará y configurará un User Pool de Amazon Cognito con correo/contraseña, verificación por correo, Google y Apple; los datos de configuración y credenciales de proveedores se proporcionarán de forma segura durante la planificación y despliegue.
- Se creará un App Client público para iOS y se configurará API Gateway para validar los JWT de Cognito antes de invocar la lógica de colección.
- Los datos persistentes de la colección se almacenarán en DynamoDB, tal como establece el alcance solicitado; el diseño de claves, índices y paginación se decidirá durante la planificación técnica.
- La primera versión gestiona sets individuales de una colección personal; compartir colecciones, perfiles públicos, importación masiva, fotos, historial de cambios y sincronización offline quedan fuera de alcance.
- Un set de colección tiene un identificador estable generado por el servicio y una referencia de catálogo obligatoria; los demás atributos editables se concretarán en el contrato compatible con BrickHubData durante la planificación.
- Los límites de tamaño, el número de resultados por página y la política ante duplicados se definirán en el contrato técnico, sin debilitar el aislamiento por propietario.
