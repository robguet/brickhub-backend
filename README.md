# BrickHub Backend

Backend serverless para BrickHub Mobile, construido con TypeScript, AWS SAM,
API Gateway HTTP API y AWS Lambda.

## Endpoints

```http
GET /v1/hello
```

Respuesta:

```json
{
  "message": "Hola mundo"
}
```

```http
GET /v1/amazon-offers
```

Devuelve el catálogo de cards LEGO en Amazon; requiere `Authorization: Bearer <Cognito access token>`.
La respuesta mantiene el envelope `{ "status": "success", "data": { "offers": [] } }`
y cada card contiene únicamente `title`, `discount`, `url` e `image`. Las cards disponibles
se leen de la tabla de DynamoDB exclusiva y se ordenan por la posición editorial. Una lista
vacía es válida; un fallo de datos o de lectura devuelve un `500` seguro sin resultados parciales.

La infraestructura declara una carga inicial idempotente de las cinco promociones de Amazon. La
carga solo inserta cards ausentes y no borra ni sobrescribe cambios posteriores. No existe CRUD
público de estas cards. El contrato está en
[`specs/010-amazon-offer-cards/contracts/openapi.yaml`](specs/010-amazon-offer-cards/contracts/openapi.yaml).

```http
GET /v1/sets?query=10212&pageNumber=1&pageSize=20
```

Busca en Brickset y devuelve un envelope con `status`, `matches` y `sets`.
La función recibe únicamente `BRICKSET_SECRET_ARN`; tanto AWS como SAM local
obtienen las credenciales desde Secrets Manager. El secreto JSON contiene
`BRICKSET_API_KEY` y `BRICKSET_USER_HASH`. Nunca guardes estas credenciales en
código, logs ni configuración local.

```http
POST /v1/saved-sets
Authorization: Bearer <Cognito access token>
```

Guarda un snapshot de un set en `collection` o `wishlist` para el usuario del
token. El contrato completo, incluidos campos y respuestas idempotentes, está en
[`specs/005-save-user-set/contracts/openapi.yaml`](specs/005-save-user-set/contracts/openapi.yaml).

```http
GET /v1/shopping/search?q=LEGO%2075394
Authorization: Bearer <Cognito access token>
```

Busca una página de productos de Google Shopping mediante ScrapeDo. Los parámetros
opcionales `hl`, `gl`, `google_domain` y `location` permiten seleccionar mercado;
por omisión usan `es-mx`, `mx`, `google.com.mx` y `Mexico`. Los valores explícitos
se conservan tras quitar espacios exteriores. `q` admite 1–200 caracteres;
`location` admite 1–200 y no admite controles. Parámetros vacíos, duplicados,
malformados o desconocidos producen `400` antes de leer el secreto.

Se usa `device=desktop` y `sort_by=2` (precio mayor a menor) de forma fija. No se
aceptan `token`, `url`, `start`, `device` ni `sort_by` desde el cliente. La
paginación y filtros devueltos son informativos; no se siguen páginas adicionales.
El endpoint no guarda productos en colección, wishlist o perfil.

La respuesta es `{ "status": "success", "data": { "shopping_results": [] } }`,
con contexto, filtros, paginación y categorías opcionales cuando existen. Los
productos mantienen sus identificadores como texto, precios originales, imágenes
y campos opcionales; un total informado de cero no descarta ofertas presentes.
Los errores de Lambda usan `{ "status": "error", "code": "...", "message": "..." }`.
`401` previo a Lambda puede usar el mensaje nativo de API Gateway. `429` señala
límite del proveedor; `502`, fallo externo o respuesta inválida/excesiva; `500`,
fallo interno o secreto indisponible.

La función nueva recibe solo `SCRAPE_DO_SECRET_ARN`, configurado mediante el
parámetro SAM `ScrapeDoSecretArn`: debe ser el ARN completo del secreto existente
`scrapedo` cuyo JSON contiene
`SCRAPE_DO_API_KEY`. Proporciona el ARN en la configuración de despliegue dev o
con el mecanismo de parámetros de SAM; no guardes la API key en configuración,
comandos o logs. Solo esta función tiene lectura de ese ARN. No se crea ni rota
el secreto. Si usa una clave KMS propia, verifica los permisos específicos de
esa clave antes del despliegue; no se concede `kms:Decrypt` general.

La aplicación limita la espera total a 27 segundos, la lectura de secreto a 2 y
la consulta al proveedor a 24; la Lambda tiene timeout 29. El cuerpo externo
admite hasta 4 MiB y el objeto proxy serializado hasta 5 MiB. Si se excede el
límite, se devuelve un error seguro sin recortar ofertas o imágenes. No hay
reintentos automáticos. Solo las credenciales tienen caché en memoria de 300
segundos. Contrato completo en
[`specs/008-google-shopping-search/contracts/openapi.yaml`](specs/008-google-shopping-search/contracts/openapi.yaml).

## Requisitos locales

- Node.js 20 o posterior para desarrollo local (Lambda usa Node.js 24)
- AWS SAM CLI
- Docker Desktop, para ejecutar Lambda localmente

## Preparación

```bash
npm install
npm run check
sam build
```

## Ejecutar la API local

Con Docker Desktop iniciado y una sesión SSO vigente para `brickhub-dev`:

```bash
aws sso login --profile brickhub-dev
sam local start-api --config-env dev
```

En otra terminal:

```bash
curl http://127.0.0.1:3000/v1/hello
curl 'http://127.0.0.1:3000/v1/sets?query=10212&pageNumber=1&pageSize=20'
```

## Desplegar dev

La primera vez, revisa especialmente la región configurada en
`samconfig.toml` y ejecuta:

```bash
sam deploy --guided --config-env dev
```

En despliegues posteriores:

```bash
sam deploy --config-env dev
```

El output `ApiUrl` es el valor que debe usarse como
`BRICKHUB_API_BASE_URL` en la configuración Development de la app iOS.

## Alcance actual

El backend incluye búsqueda de catálogo en Brickset, búsqueda comercial en
Google Shopping, autenticación Cognito y rutas privadas de perfil, colección
y sets guardados. Google Shopping usa una función y un secreto independientes
y no cambia los contratos de las rutas existentes.

### Detalles y tiendas de Google Shopping

`GET /v1/shopping/product` requiere `Authorization: Bearer <token Cognito>` y los query parameters `catalog_id` (cadena decimal positiva de1–100 dígitos) y `q` (1–200 caracteres). Tras buscar, el cliente elige un `catalog_id` presente en el resultado y hace esta segunda petición. Usa el catálogo del mercado de la búsqueda; cambia de mercado realizando otra búsqueda.

`hl`, `gl`, `google_domain` y `location` son opcionales, con defaults `es-mx`, `mx`, `google.com.mx` y `Mexico`; cada valor explícito válido se conserva. Ejemplo sin credenciales reales:

```text
GET /v1/shopping/product?catalog_id=6789801949246787910&q=LEGO%2075394&hl=es-mx&gl=mx&google_domain=google.com.mx&location=Mexico
Authorization: Bearer <token Cognito>
```

Devuelve `{ "status": "success", "data": { "product_results": { ... }, "search_parameters": { ... } } }`, con los campos conocidos validados del proveedor. Preserva tiendas sin precio, ofertas repetidas/agotadas, orden, metadatos e identificadores textuales. Un producto válido sin tiendas devuelve éxito con stores vacío. Los metadatos pueden diferir del mercado enviado u omitir campos. La búsqueda conserva su contrato.

Reutiliza `ScrapeDoSecretArn`/`SCRAPE_DO_SECRET_ARN` y el secreto `scrapedo`, clave `SCRAPE_DO_API_KEY`; no requiere otro secreto. `load_all_stores` y `more_stores` siempre se envían en true por el backend y no se aceptan como parámetros públicos. Tampoco token, device, sort_by o cursores; nombres desconocidos/repetidos devuelven400.

Errores seguros:400 validación,401 autenticación (Gateway puede usar su cuerpo nativo),429 límite upstream con Retry-After válido,500 fallo interno/secreto y502 fallo upstream, respuesta inválida, expansión parcial anunciada, timeout o tamaño excesivo. No sigue cursores ni reintenta. Deadline aplicación27s, proveedor24s, secreto2s; límites4MiB upstream y5MiB proxy completo. El proveedor puede facturar varias páginas internas al expandir tiendas.

Contrato y guía: [OpenAPI producto](specs/009-shopping-product-details/contracts/openapi.yaml) y [quickstart](specs/009-shopping-product-details/quickstart.md). `ShoppingProductUrl` es el output SAM de la nueva ruta; no hay despliegue automático.
