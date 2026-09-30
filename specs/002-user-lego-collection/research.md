# Research: Colección LEGO del usuario

## Cognito, federación y cliente iOS

### Decision

Crear un User Pool con `email` requerido como identificador de inicio de sesión, registro por correo/contraseña, verificación de correo y recuperación por correo verificado. Configurar Google y Sign in with Apple en el mismo pool y habilitarlos en un App Client dedicado a iOS. El cliente es público, no tiene secreto, usa authorization code con PKCE y callbacks/sign-out URLs pre-registrados. Se habilita un dominio de Cognito para inicio de sesión administrado.

### Rationale

`sub` es estable aunque cambie el correo. Un emisor único simplifica la autorización del backend y evita validar directamente tokens heterogéneos de proveedores. PKCE protege el canje del código en una aplicación nativa que no puede custodiar secretos.

### Alternatives considered

- `username` separado y email alias: añade un identificador sin valor para la app.
- Validar tokens de Google/Apple directamente en API Gateway: multiplica emisores y validadores.
- App Client con secreto o implicit flow: una app pública no puede proteger un secreto y los tokens no deben viajar en URL.

### Configuration and risks

- Los IdPs deben mapear el email requerido y el App Client debe admitir `COGNITO`, `Google` y `SignInWithApple`.
- Registrar `https://<dominio-cognito>/oauth2/idpresponse` en los proveedores; callbacks iOS exactos y pre-registrados.
- Apple puede entregar nombre/correo solo en el primer consentimiento; no depender del nombre en logins posteriores.
- Credenciales de Google y Apple, incluida clave privada de Apple, se aprovisionan en Secrets Manager con llaves en mayúsculas y guiones bajos; no van a código, logs ni outputs.
- No se habilita MFA por email porque el mismo correo se usa para recuperación.

Fuentes: [atributos de User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html), [registro y confirmación](https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html), [proveedores sociales](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html), [PKCE](https://docs.aws.amazon.com/cognito/latest/developerguide/using-pkce-in-authorization-code.html).

## Autorización de API Gateway

### Decision

Configurar un JWT authorizer nativo de HTTP API con `Authorization` como identity source, issuer del User Pool y audiencia del App Client iOS. Definir resource server `lego-collection` con scopes `sets.read` y `sets.write`; `GET` requiere lectura y las mutaciones escritura. Las rutas aceptan `Bearer` access tokens. Como defensa adicional, el handler rechaza un evento sin `requestContext.authorizer.jwt.claims.sub`.

### Rationale

API Gateway valida firma, issuer, audiencia, expiración y scopes antes de la Lambda. Los scopes distinguen el token destinado a la API. La comprobación de `sub` en el handler evita una frontera de confianza implícita si una ruta se configura erróneamente.

### Alternatives considered

- Lambda authorizer: añade código, coste y latencia.
- REST API Cognito authorizer: válido, pero el proyecto ya usa HTTP API.
- ID tokens sin scopes: no expresan permiso API.
- Validar JWT solo en Lambda: no corta tráfico antes del cómputo.

Fuentes: [JWT authorizer HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html), [resource servers y scopes](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html), [access token](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html).

## Persistencia y aislamiento

### Decision

Usar una tabla DynamoDB con `PK = USER#<sub>` y `SK = SET#<collectionSetId>`, donde `collectionSetId` es UUIDv7 generado por el servicio. Su orden temporal permite listar de forma descendente con `Query` y `ScanIndexForward=false`. No se crea GSI. El cursor opaco versionado contiene solo el último identificador; al recibirlo se reconstruye la clave con el `sub` derivado.

Alta usa `attribute_not_exists`; edición y borrado condicionan existencia y tipo de entidad. Un fallo condicional responde el mismo `404 RESOURCE_NOT_FOUND` para set ajeno o inexistente. No hay `GetItem` global ni `Scan`.

### Rationale

Todo acceso vive en la partición del propietario autenticado. Aunque se manipule path, body o cursor, el PK se genera solo desde `sub`. Las condiciones eliminan TOCTOU y no confirman cambios inexistentes.

### Alternatives considered

- `PK = SET#id` y GSI por propietario: obliga a buscar antes de autorizar y aumenta el riesgo de filtración.
- `Scan` con filtro: no es frontera de autorización ni escala.
- GSI por catálogo: fuera de alcance hasta existir patrón de acceso real.
- Offset: con mutaciones puede omitir o duplicar resultados.

## Contrato y campos

### Decision

Mantener el catálogo público existente en `GET /v1/sets` y exponer la colección privada bajo `/v1/collection/sets`. Cada set de colección es una instancia personal; se permiten referencias repetidas al catálogo. La API no devuelve ni acepta `sub`, `userId` ni propietario. Los schemas Zod son estrictos: esos campos causan `400`.

`catalogSetId` es inmutable en `PATCH`; una corrección crea el registro correcto y borra el incorrecto. La atomicidad de DynamoDB cubre concurrencia de esta versión; no se añade control de versión optimista sin necesidad de UX.

### Rationale

Separar la colección de la búsqueda pública conserva el contrato existente. Envelopes uniformes dan una interfaz predecible a iOS y la validación estricta impide usar accidentalmente un campo de propiedad.

### Alternatives considered

- Reutilizar `/v1/sets`: colisiona con catálogo.
- `/v1/users/{sub}/sets`: expone identidad manipulable.
- Ignorar `ownerId`: oculta errores del cliente.
- `204` en DELETE: rompe envelope uniforme.
