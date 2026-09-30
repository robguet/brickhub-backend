# Quickstart: Validación de colección LEGO autenticada

## Prerrequisitos

- Node.js 20+, AWS SAM CLI y Docker Desktop.
- Credenciales AWS dirigidas deliberadamente a `dev`; no desplegar sin revisar cuenta, región y change set.
- Parámetros no sensibles de Cognito y secretos de Google/Apple ya existentes en Secrets Manager; nunca valores reales versionados.
- Callback iOS registrado y dos cuentas de prueba para validar aislamiento.

## Configuración manual de proveedores

- Google: registrar el redirect `https://<dominio-cognito>/oauth2/idpresponse`, proporcionar `GoogleClientId` y guardar el secreto JSON con la llave `GOOGLE_API_KEY` en Secrets Manager.
- Apple: registrar el mismo redirect, proporcionar `AppleClientId`, `AppleTeamId` y `AppleKeyId`, y guardar la clave privada con la llave `APPLE_API_KEY` en Secrets Manager.
- iOS: proporcionar un `IosCallbackUrl` exacto y un `CognitoDomainPrefix` único. El App Client no lleva secreto; usa authorization code con PKCE.
- No copiar secretos, tokens, claves privadas ni valores de estos parámetros a archivos versionados o logs.

## Validación automatizada

```bash
npm run typecheck
npm run lint
npm test
sam validate --lint
sam build
```

Todos deben terminar correctamente. Las pruebas usan repositories y eventos autenticados falsos; no consumen DynamoDB, Cognito ni secretos reales.

## Validación de infraestructura

1. Confirmar User Pool con correo/verificación, Google, Apple y App Client iOS sin secreto.
2. Confirmar code flow con PKCE, callbacks exactos y scopes `lego-collection/sets.read` / `lego-collection/sets.write`.
3. Confirmar JWT authorizer y scope correspondiente en cada ruta del [contrato](./contracts/openapi.yaml).
4. Confirmar IAM mínimo: `PutItem`, `Query`, `UpdateItem`, `DeleteItem`; nunca `Scan`.
5. Confirmar retención de logs y ausencia de secretos en outputs.

## Escenarios end-to-end

1. Registrar correo/contraseña y confirmar que no puede usar rutas privadas antes de verificar el correo.
2. Iniciar sesión con correo, Google y Apple desde iOS; validar access token Cognito para App Client.
3. Con token A, crear set por `POST /v1/collection/sets`; confirmar `201` y que no devuelve `sub`.
4. Listar con `limit=1`, seguir `nextCursor` hasta `null`, comprobar orden estable y ausencia de sets de B.
5. Actualizar y borrar set A; confirmar envelopes y que deja de listarse.
6. Con token B, mutar el `collectionSetId` de A: debe responder igual que uno inexistente (`404 RESOURCE_NOT_FOUND`) y preservar A.
7. Enviar `sub`, `userId` u `ownerId`, cursor malformado, token vencido y token sin scope; confirmar rechazo sin cambios.
8. Revisar logs: solo request ID, evento y código, sin `Authorization`, JWT, secreto, correo completo o stack trace.
