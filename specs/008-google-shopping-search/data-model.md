# Data Model: Búsqueda en Google Shopping

No se crean tablas, registros o índices. Las entidades son DTOs de entrada/salida y puertos en memoria.

## ShoppingQuery

| Campo | Tipo | Regla | Default |
|---|---|---|---|
| q | string | Requerido, trim, 1–200 caracteres | Ninguno |
| hl | string | Trim; idioma 2–3 letras, región opcional de 2 letras separada por guion | es-mx |
| gl | string | Trim; 2 letras | mx |
| google_domain | string | Trim; patrón `google.(com o cc o com.cc o co.cc)`; sin esquema, ruta, puerto o query | google.com.mx |
| location | string | Trim, 1–200 caracteres, sin controles Unicode | Mexico |

Validar case-insensitive sin cambiar el valor explícito. Patrón de dominio `^google\.(?:com|[a-z]{2}|(?:com|co)\.[a-z]{2})$`; es validación sintáctica, no catálogo de mercados. URL upstream permanece fija aunque un mercado sea rechazado. Raw query se decodifica una vez mediante URLSearchParams; duplicados y nombres desconocidos producen 400. Ausencia de campos opcionales usa defaults; string vacío explícito no equivale a ausencia.

## ShoppingSearchData

`shopping_results` es siempre array, incluso vacío. `search_parameters`, `search_information`, `filters`, `pagination` y `categorized_shopping_results` son opcionales/nullable: ausentes permanecen ausentes y null permanece null. Solo se devuelven propiedades documentadas en OpenAPI. La lista principal no se mezcla con categorías ni se deduplica; su longitud no se deriva de total_results.

### ShoppingProduct

- Requeridos: `position` entero positivo y `title` string no vacío.
- Opcionales/nullable: `product_id`, `catalog_id` como strings no vacíos; `product_link` HTTP(S); `source`, `price` strings; `extracted_price` número finito no negativo; `rating` entre 0 y 5; `reviews` entero no negativo.
- `thumbnail` y `source_icon`: enlace HTTP(S) o data URI de imagen png/jpeg/webp/gif base64. No SVG/HTML ni esquemas ejecutables.
- `immersive_product_page_token`: referencia opaca string, no JWT de sesión BrickHub ni API key de ScrapeDo; conservar sin decodificar ni usar para llamadas nuevas.
- `installment`: objeto con `text` opcional/nullable.
- `alternative_price`: objeto con `price` y `extracted_price` opcionales/nullable; conservar moneda original sin conversión.
- Una propiedad presente con tipo inválido produce 502 de respuesta inválida. Propiedades desconocidas se omiten mediante schemas Zod con stripping; no usar passthrough.

### SearchParameters

Campos opcionales/nullable conocidos: `engine`, `q`, `google_domain`, `hl`, `gl`, `device`, `location`, `uule` strings; `start` y `sort_by` enteros no negativos. Jamás incluir `token` o credenciales aunque existan en payload. Este objeto describe el contexto que reportó el proveedor.

### SearchInformation

Campos string opcionales/nullable: `page_title`, `query_displayed`, `organic_results_state`, `shopping_results_state`, `results_for`, `country`, `city`; `total_results` entero no negativo; `time_taken_displayed` número no negativo. `total_results=0` es compatible con productos no vacíos.

### Filters, Pagination, CategorizedShoppingResults

- Filter: `input_type`, `type` opcionales/nullable; `options` array opcional/nullable de objetos con `text`, `shoprs` opcionales/nullable. Son informativos, no habilitan aplicación de filtros en esta versión.
- Pagination: `current` entero no negativo, `next` y `previous` strings opcionales/nullable. Admitir path `/plugin/google/shopping` relativo o URL HTTPS del mismo origen del proveedor; reconstruir en forma relativa con parámetros permitidos `q`, `hl`, `gl`, `google_domain`, `location`, `device`, `sort_by`, `start`, `uule`, `shoprs`. Eliminar credenciales y propiedades de query desconocidas. Un enlace de origen/path ajeno no se devuelve; no se sigue ninguno.
- Category: `title` string requerido y `shopping_results` array requerido de ShoppingProduct; conserva pertenencia y orden originales.

## ShoppingCredentials

SecretString es JSON válido con `SCRAPE_DO_API_KEY` string no vacío. API key solo existe en infraestructura/repository, nunca en DTO público o service. El ARN llega desde configuración SAM. TTL de credenciales 300 segundos por contenedor, no caché de búsqueda. Error de lectura/configuración → `500 INTERNAL_ERROR` sin valor ni causa cruda.

## Seguridad de salida y tamaño

Validar URL de producto sin userinfo, solo HTTP(S); eliminar parámetros de credenciales conocidos (`token`, `apiKey`, `api_key`, `SCRAPE_DO_API_KEY`, `authorization`, `password`) case-insensitive. No confundir la propiedad explícita `immersive_product_page_token` con una credencial. Tras mapeo y saneamiento, cualquier string que aún incluya la API key utilizada invalida la respuesta (502), nunca se devuelve ni loggea. Lectura hasta 4 MiB y proxy serializado hasta 5 MiB; no truncar silenciosamente ofertas/imágenes.

## Puertos y estados

- `ShoppingCatalog.search(query, deadline): Promise<ShoppingSearchData>`: puerto de dominio implementado por ScrapeDoRepository.
- `ScrapeDoCredentialsProvider.getCredentials(deadline): Promise<ShoppingCredentials>`: infraestructura sustituible en pruebas.
- Cliente fetch y cliente Secrets Manager inyectables; error tipado con code/status seguros, sin response body ni URL tokenizada.
- Estados por solicitud: recibida → autenticada → validada → credencial disponible → proveedor consultado → respuesta validada/saneada → serializada. Cualquier rechazo termina el flujo; auth y validación fallidas nunca leen secretos ni llaman al proveedor.
- Sin cambios persistentes ni transiciones de perfil, wishlist o colección.

El contrato completo está en [contracts/openapi.yaml](contracts/openapi.yaml); mapping externo en [contracts/scrapedo.md](contracts/scrapedo.md).
