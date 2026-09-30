# Feature Specification: Perfil autenticado de usuario

**Feature Branch**: `003-user-profile`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "Implementar el perfil que falta para completar el inicio de sesión de iOS: `PUT /v1/profile` crea o inicializa el perfil al iniciar sesión y `GET /v1/profile` lo recupera en aperturas posteriores."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inicializar mi perfil tras iniciar sesión (Priority: P1)

Como usuario que acaba de autenticarse, quiero que la aplicación inicialice mi perfil de forma segura para que mi sesión quede lista para usar BrickHub.

**Why this priority**: La app iOS no puede completar el flujo posterior al inicio de sesión mientras no exista un perfil para la identidad autenticada.

**Independent Test**: Se puede probar iniciando una sesión válida, solicitando la inicialización dos veces y verificando que ambas respuestas representan un único perfil propio sin crear duplicados.

**Acceptance Scenarios**:

1. **Given** que una persona inicia sesión con una identidad válida que aún no tiene perfil, **When** la app solicita inicializarlo, **Then** recibe un perfil propio creado y listo para usar.
2. **Given** que una persona ya tiene perfil, **When** la app vuelve a solicitar inicializarlo, **Then** recibe el perfil existente sin crear otro ni perder sus datos.
3. **Given** que la app envía un identificador de usuario en la solicitud, **When** se inicializa el perfil, **Then** ese valor no puede determinar ni sustituir al propietario del perfil.

---

### User Story 2 - Recuperar mi perfil al abrir la app (Priority: P1)

Como usuario autenticado que vuelve a abrir BrickHub, quiero recuperar mi perfil para continuar con una sesión consistente.

**Why this priority**: Permite restaurar una sesión válida sin confundir identidades ni bloquear la navegación de la app.

**Independent Test**: Se puede probar inicializando perfiles para dos identidades y recuperando cada uno por separado; cada respuesta contiene únicamente el perfil del solicitante.

**Acceptance Scenarios**:

1. **Given** que un usuario autenticado ya tiene perfil, **When** lo solicita, **Then** recibe su propio perfil con una respuesta satisfactoria.
2. **Given** que un usuario autenticado aún no tiene perfil, **When** lo solicita, **Then** recibe una respuesta de inexistencia segura para que la app pueda inicializarlo.
3. **Given** que existen perfiles de otros usuarios, **When** una persona solicita su perfil, **Then** no obtiene ni puede inferir datos de los demás.

### Edge Cases

- La solicitud no contiene una credencial válida, está vencida o no incluye una identidad confiable.
- La app intenta enviar `sub`, `userId` u otra identidad en body, query o ruta.
- Dos solicitudes simultáneas intentan inicializar el mismo perfil por primera vez.
- Un error temporal de persistencia ocurre durante la inicialización y la app reintenta la operación.
- El perfil almacenado contiene datos incompletos o no cumple el contrato vigente de la app.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST ofrecer `PUT /v1/profile` y `GET /v1/profile` bajo `/v1` para inicializar y recuperar el perfil del usuario autenticado.
- **FR-002**: Ambas operaciones MUST exigir una credencial JWT válida antes de leer o modificar perfiles.
- **FR-003**: Ambas operaciones MUST derivar al propietario exclusivamente del claim `sub` validado y no de valores enviados por la app.
- **FR-004**: La inicialización MUST ser idempotente: solicitudes repetidas para la misma identidad devuelven el mismo perfil lógico y no crean duplicados.
- **FR-005**: La inicialización concurrente MUST conservar un único perfil asociado a la identidad autenticada.
- **FR-006**: La recuperación MUST devolver solo el perfil de la identidad autenticada y no exponer perfiles ni existencia de perfiles de terceros.
- **FR-007**: Cuando no existe perfil para la identidad autenticada, la recuperación MUST usar una respuesta de inexistencia segura y consistente.
- **FR-008**: El perfil MUST contener una identidad interna estable, correo, nombre visible, mercado predeterminado, proveedores de autenticación y metadatos de ciclo de vida suficientes para que la app restaure la sesión; no debe exponer secretos, tokens ni datos de otros usuarios.
- **FR-009**: El contrato JSON MUST ser compatible con el DTO de perfil que consume BrickHubData en iOS; cualquier cambio incompatible requiere una nueva versión o migración explícita.
- **FR-010**: El sistema MUST validar toda entrada externa y rechazar valores de propiedad o campos no admitidos sin alterar datos existentes.
- **FR-011**: Las respuestas de éxito y error MUST usar envelopes consistentes y los logs MUST excluir JWT, cabeceras de autorización, PII completa y detalles internos.

### Key Entities

- **Perfil de usuario**: Registro único y persistente que representa la presencia de una identidad autenticada en BrickHub, con identificador interno, correo, nombre visible, mercado predeterminado, proveedores de autenticación y metadatos de creación y actualización.
- **Identidad autenticada**: Identidad confiable derivada de la credencial validada; su `sub` delimita el único perfil accesible.
- **Solicitud de inicialización**: Solicitud idempotente de la app para garantizar que exista el perfil propio; no contiene ni modifica la identidad del propietario.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las inicializaciones repetidas de una misma identidad devuelve un único perfil lógico sin duplicados.
- **SC-002**: En pruebas con al menos dos identidades, el 100% de las recuperaciones devuelve exclusivamente el perfil de quien solicita la operación.
- **SC-003**: El 100% de las solicitudes sin credencial válida se rechaza antes de leer o modificar un perfil.
- **SC-004**: Al menos el 95% de las inicializaciones o recuperaciones válidas completa en menos de 2 segundos en condiciones normales de desarrollo.
- **SC-005**: Un usuario con credenciales válidas puede completar inicio de sesión, inicialización y restauración de perfil en la app sin intervención manual en al menos el 95% de los intentos de prueba.

## Assumptions

- El User Pool de Cognito y el JWT authorizer ya desplegados se reutilizan; no se crea una nueva fuente de identidad.
- La persistencia de perfiles comparte la infraestructura de DynamoDB existente, pero el diseño exacto de claves y la compatibilidad de DTO se decidirán en planificación.
- La primera versión solo inicializa y recupera el perfil; editar datos personales, avatar, preferencias, perfiles públicos y búsqueda de otros usuarios quedan fuera de alcance.
- La app iOS envía la inicialización después del login con su correo, nombre visible y mercado; esos valores son datos de perfil validados, nunca la fuente de autorización.
