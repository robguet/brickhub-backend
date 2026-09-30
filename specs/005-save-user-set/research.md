# Research: Guardar set del usuario

## Ruta y request

**Decision**: Usar `POST /v1/saved-sets` con `{ "destination": "collection" | "wishlist", "set": { ... } }`.

**Rationale**: El destino es estado del recurso. No se sobrecarga `/v1/collection/sets`, que modela una posesión física con cantidad y condición, no un snapshot del catálogo.

**Alternatives considered**: Rutas separadas duplicarían validación; query parameter no corresponde a datos persistidos; extender el CRUD de colección mezclaría dominios.

## Autenticación y propiedad

**Decision**: Aplicar `CognitoJwtAuthorizer` al evento SAM y extraer solo `requestContext.authorizer.jwt.claims.sub` mediante el helper existente.

**Rationale**: Es el patrón ya configurado en las rutas privadas y mantiene el Bearer token fuera de las capas de dominio.

**Alternatives considered**: Verificar manualmente el header duplica el authorizer y arriesga fugas; recibir `userId` permitiría escritura cruzada.

## Clave e idempotencia

**Decision**: `PK = USER#<sub>`, `SK = SAVED_SET#<setID>`, `entityType = SAVED_SET`. Ejecutar `PutItem` condicional; si falla por existencia, ejecutar `UpdateItem` condicional sobre la misma PK/SK para actualizar `destination`, snapshot y `updatedAt` sin cambiar `createdAt`.

**Rationale**: La PK aísla identidades y el SK hace único usuario/set sin índice ni `Scan`. La condición resiste concurrencia y permite mover el set entre listas sin duplicarlo.

**Alternatives considered**: PK global mezcla usuarios; usar `number`/URL como identidad es menos estable; sobrescribir siempre cambiaría snapshots silenciosamente; `409` contradice la idempotencia definida en la especificación.

## Validación de snapshot

**Decision**: Validar un objeto `set` estricto. Son obligatorios `setID`, `number`, `numberVariant`, `name`, `year`, `theme`, `category`, `released` y `pieces`; imágenes, fechas, URL, rating, empaque y EAN son opcionales.

**Rationale**: Protege la frontera HTTP y admite ausencia legítima de metadatos no esenciales.

**Alternatives considered**: `Record<string, unknown>` sin validación incumple el contrato; requerir cada campo de Brickset rechazaría snapshots válidos incompletos.

## Función e IAM

**Decision**: Crear `SaveUserSetFunction` con `dynamodb:PutItem` y `dynamodb:UpdateItem` sobre `UserDataTable`, y Log Group de 14 días.

**Rationale**: Son exactamente las operaciones para crear y resolver un reintento; una Lambda separada no ensancha permisos del CRUD de posesiones existente.

**Alternatives considered**: Reusar la Lambda de colección mezcla responsabilidades; una tabla/GSI nueva no aporta valor al alcance.
