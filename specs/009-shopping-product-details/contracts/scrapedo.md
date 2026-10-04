# Contrato privado: ScrapeDo Google Shopping Product

## Solicitud

GET fijo `https://api.scrape.do/plugin/google/shopping/product`.

| Parámetro | Origen |
|---|---|
| token | Secrets Manager `scrapedo`, clave SCRAPE_DO_API_KEY |
| catalog_id, q | entrada validada |
| hl, gl, google_domain, location | entrada válida o defaults México |
| load_all_stores | literal true |
| more_stores | literal true |

No enviar sort_by/device/product_id/cursor ni parámetros desconocidos. Device usa default desktop del proveedor. URLSearchParams codifica texto/ubicación. No imprimir URL completa, headers ni cuerpo.

## Respuesta

Validar forma de [data-model.md](../data-model.md). product_results.title y stores obligatorios; price opcional, stores vacío válido. Preservar todos los campos contratados del ejemplo; retirar desconocidos como en búsqueda. No igualdad obligatoria de identificadores ni de metadatos con query. El cuerpo público está bajo data; no raw relay.

## Completitud y expansión

La [documentación oficial](https://scrape.do/documentation/google-scraper-api/shopping/product/) confirma que load_all_stores pagina dentro del proveedor; more_stores es legado token. Se envían ambas por requisito del usuario. Un200 con `Scrape.do-Auto-Page-Truncated: true` (comparación case insensitive de valor trim) o next_page_token string no vacío representa continuación/incompletitud y se traduce a502 UPSTREAM_INVALID_RESPONSE. Tipo de cursor inválido también502. Cursor ausente/null/vacío no se publica ni se sigue. No añadir consultas de `/product/stores`.

## Errores y límites

-429 ⇒ UPSTREAM_RATE_LIMITED; Retry-After solo convertido a segundos1–86400, aceptar entero o fechaHTTP canónica futura; sin retry.
- Otros status no2xx ⇒502 UPSTREAM_UNAVAILABLE, incluso400/404/410 upstream; no reenviar cuerpos/mensajes.
- error lógico no vacío en200 ⇒502 UPSTREAM_INVALID_RESPONSE.
- JSON/UTF-8/schema/URL/reflexión del secreto/truncado anunciados inválidos ⇒502 UPSTREAM_INVALID_RESPONSE.
- Deadline proveedor24s dentro de total27s ⇒502 UPSTREAM_UNAVAILABLE; abort fetch y reader, boundedOperation aun para dobles no cooperativos.
- >4MiB upstream o >5MiB proxy completo ⇒502 UPSTREAM_RESPONSE_TOO_LARGE; sin truncar.
- Secreto no disponible/malformado/config ausente ⇒500 INTERNAL_ERROR, lectura2s, maxAttempts1.

Origen/path fijados, redirect:error. Sanitizar URLs conocidas quitando parámetros token/apikey/api_key/scrape_do_api_key/authorization/password/access_token y rechazar userinfo/esquemas ejecutables. Comprobar clave reflejada en DTO retenido incluso codificación URI; no considerar todos los campos que contienen la palabra token como credenciales por defecto.

Los costos y latencia internos pueden crecer con la expansión. No afirmar un tiempo real del proveedor ni un máximo mundial de tiendas. Una llamada externa de BrickHub puede equivaler a múltiples páginas facturadas por proveedor.
