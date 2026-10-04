# Quickstart de validación: Detalles de producto

Endpoint y pruebas implementados. Esta guía valida localmente y no despliega ni lee secretos.

## Prerrequisitos y checks locales

Node compatible con el proyecto, dependencias instaladas, SAM CLI. Desde la raíz:

```sh
npm run typecheck
npm run lint
npm test
sam validate --lint
sam build
```

Ejecutar además el subconjunto de detalles:

```sh
npx vitest run tests/unit/modules/shopping tests/integration/handlers/get-shopping-product.test.ts tests/contract/shopping-product.contract.test.ts
```

Todos los checks deben pasar. Tests usan fetch/secreto inyectados y claims Gateway controlados; nunca AWS real. Incluir fixture de la respuesta adjunta `tests/fixtures/shopping/mexico-shopping-product.json`.

## Escenarios verificables

| Escenario | Resultado esperado |
|---|---|
| Catálogo6789801949246787910 y qLEGO75394 |200;33 tiendas/8 alternativas, orden/decimales/IDs preservados |
| Mercado omitido/parcial/personalizado |defaults por campo y valores explícitos enviados exactamente |
| Catálogo más de16 dígitos/con ceros iniciales |texto preservado, sin pérdida de precisión |
| Sin Bearer/sub confiable |401; cero lectura de secreto/fetch |
| Query inválida/desconocida/duplicada/flagsfalse |400; cero lectura de secreto/fetch |
| Producto stores vacío |200; ausencia de producto/stores ⇒502 |
| Proveedor429 con Retry-After válido/inválido |429; header solo cuando válido |
| Fallo HTTP/error lógico/JSON/schema/URL/reflexión |502 seguro, sin raw payload |
| Secreto falla |500 seguro |
| Header truncado o cursor no vacío |502; sin éxito parcial ni consultas adicionales |
| Header/cuerpo lentos o streams enormes |abort/cancel,502 antes de límites |
| Proxy con escape JSON supera5MiB |502; no omitir tiendas |
| Búsqueda existente |respuesta intacta, cero consulta de detalles |

Comprobar JWT authorizer, IAM ARN exacto, timeout29s,256MB y LogGroup14d en contrato SAM. Validar fixture y respuestas contra OpenAPI, incluidos null/ausentes/arrays vacíos y rechazos. Repetir suite completa tras cualquier refactor compartido.

## Flujo con endpoint dev ya autorizado

Solo si la función está desplegada en dev mediante un flujo aprobado. BASE_URL es el origen HTTP API sin /v1 final; BEARER_TOKEN proviene de una sesión Cognito válida. No activar trazas shell ni pegar tokens reales en repositorio/salida de chat. Un smoke de producto consume créditos del proveedor; no forma parte de las pruebas unitarias.

```sh
curl --get "$BASE_URL/v1/shopping/search" \
  --header "Authorization: Bearer $BEARER_TOKEN" \
  --data-urlencode 'q=LEGO 75394' \
  --data-urlencode 'hl=es-mx' \
  --data-urlencode 'gl=mx' \
  --data-urlencode 'google_domain=google.com.mx' \
  --data-urlencode 'location=Mexico'
```

Elegir `data.shopping_results[*].catalog_id` presente, conservar como string. No sustituir por product_id si falta; elegir otro resultado. Repetir búsqueda si se cambia mercado porque el catálogo es regional.

```sh
curl --get "$BASE_URL/v1/shopping/product" \
  --header "Authorization: Bearer $BEARER_TOKEN" \
  --data-urlencode 'catalog_id=6789801949246787910' \
  --data-urlencode 'q=LEGO 75394' \
  --data-urlencode 'hl=es-mx' \
  --data-urlencode 'gl=mx' \
  --data-urlencode 'google_domain=google.com.mx' \
  --data-urlencode 'location=Mexico'
```

Esperado:200 con status:success y data.product_results. La referencia no garantiza33 tiendas reales en otro momento. La muestra devuelve dominio diferente y omite algunos parámetros; no rellenarlos. No enviar token del proveedor ni load_all_stores/more_stores: son privados/fijos. Gateway401 puede tener cuerpo nativo message. Ver [contrato público](contracts/openapi.yaml) y [contrato privado](contracts/scrapedo.md).
