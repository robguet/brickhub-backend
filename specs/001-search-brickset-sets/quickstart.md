# Quickstart: Validación de consulta de sets

## Prerrequisitos

- Node.js 20+, AWS SAM CLI y Docker Desktop.
- Secreto de desarrollo en Secrets Manager y permiso local para leerlo.
- Archivo local ignorado, por ejemplo `env/dev.local.json`, que inyecte solo `BRICKSET_SECRET_ARN` para `SearchSetsFunction`; nunca valores de credenciales.

## Validación automatizada

```bash
npm run typecheck
npm run lint
npm test
sam validate --lint
sam build
```

Todos los comandos deben terminar correctamente. Las pruebas usan proveedores falsos y no consumen cuota ni secretos reales.

## Validación local manual

1. Iniciar SAM local con el archivo de ARN no sensible.
2. Solicitar `GET /v1/sets?query=10212&pageNumber=1&pageSize=20`.
3. Confirmar `200`, `status: "success"`, `matches` no negativo y `sets` arreglo según [el contrato](./contracts/openapi.yaml).
4. Solicitar sin `query` y confirmar `400` con `VALIDATION_ERROR`.
5. Revisar logs: deben excluir secretos, API key, hash, URL autorizada y payload sensible.

Una búsqueda sin coincidencias devuelve `200`, `matches: 0` y `sets: []`. Los fallos upstream se validan con fakes; no deben provocarse repetidamente contra Brickset por su cuota diaria.
