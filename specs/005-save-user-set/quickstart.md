# Quickstart: Validar guardado de sets

## Prerrequisitos

- Dependencias instaladas con `npm ci`.
- AWS SAM CLI instalado para validación y build; no se requieren llamadas a AWS ni despliegue.
- Un Bearer access token de Cognito solo para prueba manual tras un despliegue explícitamente aprobado.

## Validación automatizada

Desde la raíz del repositorio, ejecutar:

```bash
npm run typecheck
npm run lint
npm test
sam validate --lint
sam build
```

Los tests validan el contrato [openapi.yaml](contracts/openapi.yaml), las claves e invariantes de [data-model.md](data-model.md), y el aislamiento sin usar recursos AWS reales.

## Prueba manual autorizada

Tras desplegar explícitamente a `dev`, enviar `POST /v1/saved-sets` con `Authorization: Bearer <access-token>` y el body del contrato.

1. Un set válido con `destination: "collection"` devuelve `201` y `data.savedSet.created: true`.
2. Repetir el request devuelve `200` y `created: false`, sin cambiar timestamp.
3. Cambiar solo destino a `wishlist` devuelve `200`, conserva el mismo registro y actualiza su `destination`; no crea un segundo item.
4. Quitar o alterar el Bearer devuelve `401` sin escribir datos.
5. Enviar `userId`, un destino inválido, una fecha/URL inválida o una clave extra devuelve `400`.
6. Un token de otro usuario no puede leer ni sobrescribir registros del primer usuario: solo se usa el `sub` validado.

No registrar ni compartir el access token de prueba.
