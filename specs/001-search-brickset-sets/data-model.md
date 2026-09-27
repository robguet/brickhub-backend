# Data Model: Consulta de sets Brickset

## SetSearchQuery

| Field | Type | Rules |
|---|---|---|
| `query` | string | Obligatorio tras trim; no vacío y con longitud máxima definida en la implementación. |
| `pageNumber` | integer | Opcional; valor inicial `1`; mínimo `1`. |
| `pageSize` | integer | Opcional; valor inicial `20`; entre `1` y `500`. |

## BricksetCredentials

| Field | Type | Rules |
|---|---|---|
| `apiKey` | string | Obligatorio, no vacío; solo accesible mediante el proveedor de secretos. |
| `userHash` | string | Obligatorio, no vacío; se envía a Brickset junto con la API key. |

El ARN es configuración de infraestructura. El secreto, URL upstream autorizada y payloads sensibles no se registran.

## SetSearchResult

| Field | Type | Rules |
|---|---|---|
| `status` | `success` | Búsqueda completada. |
| `matches` | integer | Total reportado por Brickset; puede ser `0`. |
| `sets` | array of `BricksetSet` | Resultados de la página actual; arreglo vacío si no hay coincidencias. |

## BricksetSet

Preserva datos disponibles: identidad, número/variante, nombre, año, tema, disponibilidad, conteos, fechas, imágenes/URL, colección, precios regionales, valoraciones, empaquetado, edad, dimensiones, códigos de barra, números de artículo, datos extendidos y actualización. Los bloques anidados y valores que Brickset pueda omitir son opcionales o anulables; propiedades futuras no invalidan la respuesta.

## ErrorResponse

| Field | Type | Rules |
|---|---|---|
| `status` | `error` | Solicitud no completada. |
| `code` | string estable | `VALIDATION_ERROR`, `UPSTREAM_RATE_LIMITED`, `UPSTREAM_UNAVAILABLE` o `UPSTREAM_INVALID_RESPONSE`. |
| `message` | string seguro | No incluye secretos, URL upstream, stack trace ni mensaje literal del proveedor. |
