# Contrato de integración ScrapeDo

## Solicitud

GET al origen fijo `https://api.scrape.do/plugin/google/shopping`. Construir con URL/URLSearchParams, nunca concatenando query. Parámetros: `token` desde `scrapedo.SCRAPE_DO_API_KEY`; `q`, `hl`, `gl`, `google_domain`, `location` desde ShoppingQuery; `device=desktop`, `sort_by=2` constantes. Sin headers Bearer de BrickHub, body, redirects o parámetros adicionales. No seguir pagination.next.

## Respuesta y validación

Datos externos siempre entran como unknown y se validan con Zod antes de service/DTO. HTTP 200 no garantiza éxito si hay un campo error no vacío. Éxito requiere `shopping_results` como array interpretable, que puede ser vacío. No inferir vacío por `total_results=0`; campos opcionales no presentes no se inventan. IDs numéricos en vez de strings se rechazan para evitar precisión perdida. Secciones/campos permitidos se describen en OpenAPI; propiedades nuevas desconocidas se omiten.

| Condición | Status local | Code | Mensaje seguro |
|---|---|---|---|
| Query inválida | 400 | VALIDATION_ERROR | La consulta de búsqueda no es válida. |
| Bearer/claims ausentes en route | 401 | UNAUTHENTICATED | Se requiere una credencial Bearer válida. |
| Secreto/configuración inaccesible o inválido | 500 | INTERNAL_ERROR | La búsqueda no está disponible en este momento. |
| HTTP proveedor 429 | 429 | UPSTREAM_RATE_LIMITED | La búsqueda está temporalmente limitada. Intenta más tarde. |
| HTTP proveedor 401, 403 u otro no exitoso | 502 | UPSTREAM_UNAVAILABLE | El proveedor de búsqueda no está disponible en este momento. |
| Timeout, error de red o redirect | 502 | UPSTREAM_UNAVAILABLE | El proveedor de búsqueda no está disponible en este momento. |
| JSON/schema inválido o error lógico en 200 | 502 | UPSTREAM_INVALID_RESPONSE | El proveedor devolvió una respuesta inválida. |
| Lectura mayor de 4 MiB o proxy mayor de 5 MiB | 502 | UPSTREAM_RESPONSE_TOO_LARGE | La respuesta de búsqueda supera el tamaño permitido. |
| Fallo interno inesperado | 500 | INTERNAL_ERROR | La búsqueda no está disponible en este momento. |

No clasificar mensajes por coincidencias vagas. Para el 429, reenviar Retry-After solo si es un entero entre 1 y 86400 segundos o una fecha HTTP válida futura dentro de ese rango, convirtiéndola a segundos; no reenviar headers crudos. Si falta o es inválido, omitirlo. No hay reintentos automáticos.

## Presupuestos y saneamiento

Deadline de aplicación 27 s, secreto 2 s, proveedor 24 s, Lambda 29 s. Abort cubre conexión y body; lectura cuenta bytes reales aunque Content-Length falte o mienta. Serialización mide respuesta proxy completa en UTF-8. Un overflow termina en error pequeño; no recortar datos como si la consulta hubiera tenido éxito.

Retirar campos desconocidos y parámetros de credenciales de URLs. Continuaciones solo del origen/path esperado, devueltas como paths relativos con query permitida. Si cualquier string permitido conserva la API key utilizada, rechazar con error seguro. No almacenar/loggear cuerpos, URLs de request ni errores SDK/fetch. Las referencias opacas de detalle de producto son campos de datos permitidos, no credenciales de acceso al servicio.

## Fuentes y evidencia

- [Shopping Search](https://scrape.do/documentation/google-scraper-api/shopping/search/)
- [Errores transitorios](https://scrape.do/documentation/google-scraper-api/transient-errors/)
- [Status codes](https://scrape.do/documentation/api-response/status-codes/)
- Muestra del usuario: 40 productos principales, 3 categorías y total informado cero, con imágenes embebidas. Su fixture de implementación debe retirar cualquier credencial, conservar los 40 productos y mantener al menos una imagen data URI representativa; no se incorpora el adjunto a código en esta fase.
