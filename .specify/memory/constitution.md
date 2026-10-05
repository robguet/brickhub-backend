# BrickHub Backend Constitution

## Core Principles

### I. Arquitectura serverless y reproducible

El backend DEBE construirse exclusivamente sobre servicios serverless de AWS. AWS SAM DEBE ser la
fuente de verdad para infraestructura, empaquetado y despliegues. Todo recurso AWS DEBE declararse
como código; la configuración manual en consola está prohibida salvo para recuperación o diagnóstico,
y cualquier cambio permanente realizado allí DEBE reflejarse después en SAM. Inicialmente solo existe
el ambiente `dev`, pero nombres, parámetros y recursos DEBEN permitir añadir `staging` y `production`
sin rediseñar la solución. Esto garantiza que el sistema pueda recrearse y auditarse de forma
determinista.

### II. TypeScript estricto

Todas las funciones Lambda y módulos del backend DEBEN usar TypeScript con `strict` habilitado. Los
contratos, comandos, entidades, dependencias y respuestas DEBEN tener tipos explícitos en sus límites.
El uso de `any` está prohibido salvo cuando sea técnicamente inevitable; toda excepción DEBE estar
localizada, justificada con un comentario y protegida mediante validación o narrowing. Esta regla hace
que los contratos sean comprobables antes del despliegue y reduce fallos de integración.

### III. Separación por capas

La dirección de dependencias DEBE ser:
`handler -> route -> controller -> use case/service -> repository -> infraestructura`.

- Los handlers solo DEBEN adaptar eventos y respuestas de AWS Lambda.
- Las routes solo DEBEN declarar método, path, middleware y controller.
- Los controllers DEBEN validar y transformar HTTP, sin acceder directamente a AWS.
- Las reglas de negocio DEBEN vivir en use cases o services.
- Los repositories DEBEN encapsular DynamoDB y proveedores externos.
- El dominio NO DEBE depender de infraestructura, frameworks HTTP ni SDKs de AWS.

Esta separación permite probar reglas de negocio sin red, contenedores ni recursos cloud.

### IV. Contratos API estables

Todas las rutas públicas DEBEN versionarse bajo `/v1`. Los contratos JSON DEBEN mantenerse compatibles
con los DTOs de BrickHubData en iOS. Un cambio incompatible DEBE introducir una nueva versión de API o
una estrategia de migración explícita y probada. Las respuestas de éxito y error DEBEN usar envelopes
consistentes. Todo body, query parameter, path parameter y valor externo DEBE validarse con Zod antes de
entrar a la lógica de negocio. Estas reglas mantienen una frontera predecible entre la app y el backend.

### V. Seguridad por defecto

Secretos, tokens, contraseñas y credenciales NO DEBEN guardarse en el repositorio ni enviarse a la app
iOS. Las credenciales de proveedores externos DEBEN residir en AWS Secrets Manager como pares
llave-valor. Cada llave DEBE usar mayúsculas y guiones bajos, con el patrón
`<PROVEEDOR>_API_KEY`; por ejemplo, la credencial de Brickset DEBE llamarse `BRICKSET_API_KEY`.
Las rutas privadas DEBEN exigir JWT válido de Cognito y tomar la identidad exclusivamente del claim
`sub`; un `userId` recibido desde el cliente NO DEBE usarse como fuente de autorización. Cada función
DEBE tener permisos IAM mínimos. Logs y errores NO DEBEN exponer headers `Authorization`, tokens,
passwords, secretos, PII completa, stack traces ni detalles internos. La protección debe existir en cada
frontera, no depender de la buena conducta del cliente.

Toda ruta HTTP nueva DEBE configurarse con el authorizer JWT de Cognito y validar también, dentro de la
route, un único header `Authorization: Bearer <token>` con un claim `sub` no vacío antes de construir
dependencias con I/O. La ausencia, ambigüedad o invalidez del Bearer DEBE responder `401` sin acceder a
repositorios, secretos ni proveedores. No se permiten nuevas rutas públicas anónimas salvo una excepción
explícita, acotada y aprobada conforme a esta constitución.

### VI. Integridad y aislamiento de datos

Toda operación sobre datos de usuario DEBE derivar y comprobar su partición mediante la identidad
autenticada. Un usuario NO DEBE leer ni modificar datos pertenecientes a otro usuario. Cada set guardado
DEBE pertenecer exactamente a un destino: `wishlist` o `collection`; dos booleanos independientes como
`isWishlist` e `isCollection` NO DEBEN ser la fuente de verdad. Las invariantes DEBEN aplicarse en el
backend y, cuando corresponda, mediante condiciones atómicas de persistencia. La app iOS nunca se
considera una frontera de confianza.

### VII. Calidad verificable

Cada módulo DEBE incluir pruebas unitarias de sus use cases o services y pruebas de controller o handler
para sus contratos HTTP. Un cambio no está completo hasta que pasan `typecheck`, lint, tests,
`sam validate` y build. Toda corrección de un bug DEBE añadir una prueba de regresión que demuestre el
fallo previo y la corrección. Las pruebas unitarias NO DEBEN depender de recursos AWS reales; las
integraciones DEBEN aislarse mediante repositories o adapters sustituibles. La evidencia automatizada
es parte del entregable, no una actividad opcional posterior.

### VIII. Operación y observabilidad

Las funciones DEBEN emitir logs estructurados con contexto útil para diagnóstico y sin información
sensible. Todo Log Group DEBE tener retención explícita. Los errores internos DEBEN convertirse a códigos
HTTP seguros y consistentes. Cada integración externa DEBE definir timeout, manejo de rate limits y
traducción de errores del proveedor. Antes de habilitar producción DEBEN existir alarmas básicas para
errores Lambda y respuestas 5xx. El sistema debe poder diagnosticarse sin revelar datos protegidos.

### IX. Simplicidad y alcance incremental

Solo DEBE implementarse la infraestructura necesaria para la funcionalidad en curso. Cognito, DynamoDB,
Secrets Manager y proveedores externos NO DEBEN añadirse hasta que una ruta o caso de uso real los
necesite. Se DEBEN preferir soluciones pequeñas y mantenibles frente a abstracciones anticipadas. Hono es
opcional y solo PUEDE incorporarse cuando simplifique de forma demostrable el enrutamiento o middleware.
Toda complejidad adicional DEBE justificarse en el plan técnico. Esta disciplina mantiene bajos el coste,
el riesgo y la carga operativa mientras el producto evoluciona.

### X. Despliegues controlados

`dev` DEBE ser el único ambiente mientras no se aprueben otros explícitamente. La automatización NO DEBE
desplegar cambios a AWS sin aprobación explícita. Cuenta, región y ambiente de destino DEBEN verificarse
antes de cada despliegue. Ningún cambio destructivo de datos o infraestructura PUEDE ejecutarse sin
revisión del alcance, estrategia de recuperación y confirmación humana. CI DEBE validar el proyecto, pero
la promoción de infraestructura permanece como una decisión deliberada.

## Restricciones Técnicas y de Seguridad

- La entrada HTTP DEBE ser API Gateway HTTP API y el cómputo DEBE ejecutarse en AWS Lambda.
- AWS SDK v3 DEBE utilizarse para integraciones con servicios AWS cuando sean necesarias.
- DynamoDB DEBE ser la persistencia inicial para perfiles, wishlist y colección.
- Cognito DEBE proporcionar autenticación email/password y Sign in with Apple para rutas privadas.
- Secrets Manager DEBE almacenar las credenciales de Brickset, ScrapeDo y futuros proveedores como
  pares llave-valor; sus llaves DEBEN cumplir el patrón `<PROVEEDOR>_API_KEY`.
- Los códigos HTTP DEBEN conservar esta semántica: `400` validación, `401` autenticación, `403`
  autorización, `404` inexistencia, `409` conflicto, `429` límite, `502` proveedor y `500` fallo interno.
- Los valores específicos de cuenta, región, URLs privadas y secretos NO DEBEN codificarse en el código.
- Las decisiones reemplazables, como número de Lambdas, uso de Hono, proveedor externo o runtime exacto,
  DEBEN permanecer en planes técnicos y no tratarse como invariantes constitucionales.

## Flujo de Desarrollo y Puertas de Calidad

1. Toda funcionalidad DEBE comenzar con una especificación que identifique contrato, reglas, seguridad y
   criterios verificables.
2. El plan técnico DEBE justificar recursos AWS nuevos, permisos IAM, persistencia y complejidad añadida.
3. La implementación DEBE respetar las capas y añadir sus pruebas en el mismo cambio.
4. Antes de revisión DEBEN pasar, como mínimo, `npm run typecheck`, `npm run lint`, `npm test`,
   `sam validate --lint` y `sam build`.
5. La revisión DEBE comprobar compatibilidad con iOS, aislamiento entre usuarios, ausencia de secretos,
   mínimo privilegio, manejo seguro de errores e infraestructura reproducible.
6. Las pruebas contra recursos reales DEBEN usar exclusivamente datos identificables de desarrollo y no
   PUEDEN ejecutarse implícitamente dentro de la suite unitaria.
7. El despliegue DEBE requerir revisión del change set y confirmación del destino antes de aplicarse.

## Governance

Esta constitución prevalece sobre especificaciones, planes y decisiones puntuales que la contradigan.
Cada revisión de una especificación, implementación o despliegue DEBE comprobar su cumplimiento. Toda
excepción DEBE estar limitada en alcance, justificar por qué es necesaria, registrar sus riesgos y definir
cuándo se eliminará; una excepción no modifica por sí sola esta constitución.

Las enmiendas DEBEN proponer el texto exacto, explicar el motivo y el impacto, actualizar la fecha de
última modificación y obtener aprobación antes de aplicarse. Si una enmienda cambia contratos o prácticas
vigentes, DEBE incluir un plan de migración. La versión sigue SemVer: MAJOR para eliminar o redefinir de
forma incompatible principios; MINOR para añadir principios o ampliar materialmente obligaciones; PATCH
para aclaraciones sin cambio normativo. El Sync Impact Report es material temporal de revisión y DEBE
eliminarse antes de confirmar la constitución en control de versiones.

**Version**: 1.2.0 | **Ratified**: 2026-09-20 | **Last Amended**: 2026-10-04
