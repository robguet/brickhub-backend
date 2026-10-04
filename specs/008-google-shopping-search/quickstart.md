# Quickstart: validación de búsqueda en Google Shopping

El handler y los adapters de esta feature están implementados. Esta guía describe pruebas locales con dobles y un smoke opcional de dev; no se ha desplegado la función ni se han leído secretos reales durante la implementación.

## Preparación

Desde la raíz del proyecto, Node.js >=20 para tooling y SAM CLI. Docker solo para `sam local`. Reutilizar dependencias de `package.json`; no instalar otro stack.

```bash
npm ci
npm run typecheck
npm run lint
npm test
sam validate --lint
sam build
```

Los cinco gates obligatorios deben pasar tras implementación. Pruebas unitarias/integración de handler usan mocks de Secrets Manager, fetch, reloj y contexto JWT; no acceden a AWS o ScrapeDo. Pruebas de contrato inspeccionan OpenAPI y SAM, incluidos authorizer, path, IAM al ARN exacto, timeout y retención.

## Escenarios locales con dobles

| Escenario | Resultado esperado | Verificación de frontera |
|---|---|---|
| q=LEGO 75394, sesión válida, sin mercado | 200 y defaults México | Una llamada GET al origen fijo, desktop y sort_by 2 |
| Mercado explícito en/us/google.com/United States | 200 con contexto correspondiente | Valores conservados |
| Mercado parcial | 200 | Solo campos omitidos reciben defaults |
| Sin Bearer, vacío, esquema incorrecto o sin sub autenticado | 401 UNAUTHENTICATED | Cero lecturas de secreto y cero búsquedas |
| Sin auth y query inválida | 401 | Autenticación precede validación |
| q ausente/vacío/>200, gl inválido, mercado vacío/duplicado | 400 VALIDATION_ERROR | Cero lecturas de secreto y cero búsquedas |
| q con acentos, &, + o coma | Texto íntegro | URLSearchParams codifica sin crear parámetros nuevos |
| Query con token/url/start/device/sort_by/userId | 400 | No se permite sustituir configuración o identidad |
| Muestra del usuario | 40 productos principales en orden | Total cero no elimina ofertas; categorías separadas |
| Producto sin campos opcionales o con null | 200 | No inventar valores; IDs largos siguen strings |
| shopping_results vacío | 200 y [] | No confundir vacío con fallo |
| Lista ausente, JSON inválido, campo inválido, error lógico en HTTP 200 | 502 | Nunca éxito vacío ficticio |
| HTTP upstream 429 | 429 | Retry-After solo si válido; una sola llamada |
| HTTP upstream 401/403/5xx, redirect, timeout | 502 | No transformar fallo proveedor en 401 del usuario |
| Secreto ausente, JSON inválido, clave vacía o timeout | 500 | No consulta upstream; sin datos sensibles |
| Body upstream >4 MiB o proxy >5 MiB | 502 pequeño | Cancelar lectura, no truncar ofertas como éxito |
| Datos extra token/apiKey/URL tokenizada/clave en string | Saneado o 502 seguro | Sin claves en respuestas ni registros |

Usar temporizadores controlados para probar deadline de 27 segundos, secreto 2 y proveedor 24, incluyendo demoras durante lectura del body. El fixture `tests/fixtures/shopping/mexico-shopping.json` conserva los 40 productos y las imágenes data URI de la muestra sin credenciales del servicio. Verificar IDs y precios exactos, no solo snapshots completos.

## Configuración dev posterior a implementación

SAM debe incorporar `ScrapeDoSecretArn` y la variable `SCRAPE_DO_SECRET_ARN`. Proporcionar el ARN real del secreto existente `scrapedo` en la configuración dev autorizada; no guardar API key en variables, archivos, comandos o fixtures. El secreto contiene `SCRAPE_DO_API_KEY` y no se crea/rota en este cambio. Mantener IAM al ARN exacto; confirmar KMS si aplica.

`sam local start-api --config-env dev` requiere Docker y credenciales AWS si no se inyectan dobles. SAM local no equivale a verificación real del JWT authorizer: no debilitar autenticación para hacerlo funcionar. La suite de handler con claims simulados valida la lógica; la aceptación de firma, audiencia y vigencia se comprueba contra Gateway dev solo con autorización para el smoke.

## Smoke en dev, únicamente cuando esté autorizado

Verificar cuenta/región/ambiente y que la función nueva ya esté desplegada con autorización. Usar sesión de un usuario de pruebas y un token vigente; estos comandos son instrucciones, no se ejecutaron durante el plan.

```bash
read -r 'SHOPPING_DEV_BASE_URL?URL base de dev: '
read -rs 'SHOPPING_ACCESS_TOKEN?Access token de prueba: '
# No activar trazas de shell ni curl -v: ambos pueden revelar credenciales.
curl --silent --show-error --get "$SHOPPING_DEV_BASE_URL/v1/shopping/search" \
  --header "Authorization: Bearer $SHOPPING_ACCESS_TOKEN" \
  --data-urlencode 'q=LEGO 75394'
curl --silent --show-error --get "$SHOPPING_DEV_BASE_URL/v1/shopping/search" \
  --header "Authorization: Bearer $SHOPPING_ACCESS_TOKEN" \
  --data-urlencode 'q=LEGO 75394' \
  --data-urlencode 'hl=en' --data-urlencode 'gl=us' \
  --data-urlencode 'google_domain=google.com' \
  --data-urlencode 'location=United States'
curl --silent --show-error --include --get "$SHOPPING_DEV_BASE_URL/v1/shopping/search" \
  --data-urlencode 'q=LEGO 75394'
unset SHOPPING_ACCESS_TOKEN
```

Primera búsqueda: 200 con ofertas reales o lista vacía válida, mercado mexicano; confirmar que `es-mx` es aceptado por el proveedor. Si el proveedor lo rechaza, registrar el fallo seguro y discutir un ajuste explícito; no sustituir el idioma silenciosamente. Segunda: mercado explícito conservado. Tercera: 401 sin invocar Lambda/proveedor; el cuerpo puede ser el mensaje nativo de Gateway. No exigir 40 productos vivos: esa cantidad solo corresponde al fixture.

Probar además token vencido/emisor o audiencia incorrectos con credenciales de prueba autorizadas, entrada inválida autenticada y medición del tiempo de respuesta. Inspeccionar logs por códigos/requestId y ausencia de tokens/URLs tokenizadas. No inducir límites reales ni agotar créditos: 429 y fallos se prueban con dobles.

No ejecutar `sam deploy` desde esta guía sin aprobación explícita y revisión de change set/destino. Los contratos y límites están en [OpenAPI](contracts/openapi.yaml), [integración](contracts/scrapedo.md) y [modelo](data-model.md).
