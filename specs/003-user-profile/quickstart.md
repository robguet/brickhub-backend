# Quickstart: Validación del perfil autenticado

## Prerrequisitos

- Stack `brickhub-dev` desplegado y el mismo User Pool configurado en iOS.
- Un access token Cognito válido, nunca un ID token, para una cuenta de desarrollo confirmada.
- Node.js 20+, SAM CLI y Docker Desktop para validación local.

## Validación automatizada

```bash
npm run typecheck
npm run lint
npm test
sam validate --lint
sam build
```

Las pruebas usan repositorios falsos y eventos JWT falsos; no consultan AWS real.

## Validación funcional

1. Solicitar `GET /v1/profile` con Bearer válido antes de inicializar y confirmar `404 PROFILE_NOT_FOUND`.
2. Solicitar `PUT /v1/profile` con el mismo token y body vacío; confirmar `200` y un perfil sin `sub`, correo o token.
3. Repetir PUT y confirmar el mismo `profileId` y `createdAt`.
4. Solicitar GET y confirmar que devuelve el mismo perfil.
5. Repetir con una segunda cuenta; confirmar que sus identificadores y respuestas no se cruzan.
6. Probar body con `userId` o `sub`, token vencido y ausencia de token; confirmar rechazo seguro y ausencia de cambios.
7. Ejecutar el flujo iOS: login → PUT exitoso → cerrar/abrir app → GET exitoso.
