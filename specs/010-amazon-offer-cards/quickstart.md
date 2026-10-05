# Quickstart de validación: Catálogo de ofertas Amazon

Esta guía valida la funcionalidad localmente; no despliega ni modifica recursos AWS existentes.

## Prerrequisitos y checks

Con Node compatible, dependencias instaladas y SAM CLI, desde la raíz del repositorio ejecutar:

```sh
npm run typecheck
npm run lint
npm test
sam validate --lint
sam build
```

Ejecutar también el subconjunto de la funcionalidad:

```sh
npx vitest run tests/unit/modules/amazon-offers tests/integration/handlers/get-amazon-offers.test.ts tests/contract/amazon-offers.contract.test.ts
```

Las pruebas inyectan el repositorio o Document Client; no usan AWS real ni credenciales. Todas las puertas deben pasar antes de revisión.

## Escenarios verificables

| Escenario | Resultado esperado |
|---|---|
| Cinco cards iniciales disponibles | `200`, cinco cards en posiciones 1–5 y los cuatro atributos exactos por card. |
| Sin cards disponibles | `200` y `data.offers: []`. |
| Card oculta junto a cards disponibles | `200`; la oculta no se devuelve y se mantiene el orden relativo de las visibles. |
| Imagen HTTPS y ruta `/images/...` | `200`; ambos valores se conservan literalmente. |
| Título/descuento vacío, URL no HTTPS, imagen inválida o claves inconsistentes | `500 INTERNAL_ERROR`; nunca una lista parcial. |
| Error o demora de DynamoDB | `500 INTERNAL_ERROR`, mensaje seguro y log sin error bruto. |
| Solicitud sin Authorization, Bearer malformado o sin `sub` | `401`; no se consulta DynamoDB ni se construye el controller. |
| Ruta, permisos, tabla y log group SAM | `GET /v1/amazon-offers`, con `CognitoJwtAuthorizer`; permiso Query únicamente en la tabla nueva, retención 14 días. |
| Seed repetido | No cambia las cinco cards existentes ni borra datos; items ausentes se insertan. |

Validar las respuestas contra [el contrato público](contracts/openapi.yaml): no debe contener identificador interno, posición, estado ni claves DynamoDB.

## Smoke opcional en dev autorizado

Solo después de un despliegue dev aprobado y con el origen HTTP API configurado como `BASE_URL`:

```sh
curl --fail-with-body "$BASE_URL/v1/amazon-offers" --header "Authorization: Bearer $BEARER_TOKEN"
```

Se espera `200` con `status: "success"` y `data.offers`. `BEARER_TOKEN` debe ser una sesión Cognito válida y no debe registrarse ni compartirse. Este smoke no forma parte de la suite automatizada ni autoriza un despliegue.
