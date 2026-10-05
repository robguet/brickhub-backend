# Radar API v1

Contrato nuevo para implementación. Todas las rutas GET requieren `Authorization: Bearer <Cognito JWT>` y claim sub verificado por authorizer. Validación local antes de construir repositorios. Sin userId, escritura HTTP ni acceso anónimo.

## Envelope y endpoints

200: `{"status":"success","data":{...}}`. Error: `{"status":"error","code":"...","message":"..."}`. Content-Type application/json; charset=utf-8; Cache-Control: no-store inicialmente para reflejar retiradas. Campos PK/SK/sourceHash/sourceReference y estado privado no se exponen.

| Ruta | Parámetros | data |
| --- | --- | --- |
| /v1/radar/config | ninguno | {config: RadarConfig} |
| /v1/radar/posts | category?,limit?,cursor? | {posts: PostSummary[],page:{limit,nextCursor}} |
| /v1/radar/featured | ninguno | {post: PostSummary o null} |
| /v1/radar/posts/{slug} | slug | {post: PostSummary + PostContent público} |
| /v1/radar/videos | limit?,cursor? | {videos: Video[],page:{limit,nextCursor}} |
| /v1/radar/releases | month? o from?,limit?,cursor? | {releases: ReleaseEvent[],page:{limit,nextCursor}} |

Todos: omitir category; `todos` se rechaza 400 para que el cliente use ausencia de filtro. Valores válidos rumor/lanzamiento/resena/top. limit entero decimal 1–50, default20. month YYYY-MM válido, from YYYY-MM-DD válido; mutuamente excluyentes. Si ambos faltan, próximos desde hoy en America/Mexico_City; cursor conserva esa fecha al continuar después de medianoche. Mercado v1 fijo MX. Query desconocida o parámetros repetidos =>400 (validar rawQueryString, no solo mapa normalizado).

Los campos de DTO y de bloques están enumerados en [data-model.md](../data-model.md). Detalle une thumbnail y coverImage preservando diferencias, no devuelve postId interno/version duplicada; version y updatedAt son públicos. Video devuelve durationSeconds y platform canónica; evento devuelve estado comercial, no editorialStatus. Publicar estado confirmed nunca se infiere de fuente o fecha.

Ejemplo de lista:

```json
{"status":"success","data":{"posts":[{"id":"tie-interceptor-review","slug":"vale-la-pena-tie-interceptor","category":"resena","type":"review","title":"¿Vale la pena el nuevo TIE Interceptor?","excerpt":"Análisis del set 75382.","thumbnail":{"url":"https://media.example.com/images/radar/tie-interceptor.svg","alt":"TIE Interceptor"},"publishedAt":"2026-07-20","featured":true,"tags":["UCS"],"rating":8.5,"schemaVersion":1,"version":1,"updatedAt":"2026-10-05T12:00:00.000Z"}],"page":{"limit":20,"nextCursor":null}}}
```

Featured: Query FEED#FEATURED descendente Limit1, post null si no existe. Siempre incluido también en feed general/categoría; no descontarlo de paginación.

## Cursor

Cadena base64url <=4096 caracteres, JSON <=2048 bytes con esquema cerrado: v=1, kind posts|videos|releases, category opcional, mode month|upcoming cuando aplique, month/from normalizados, limit, direction asc|desc, upperBound (posts/videos), lastSk. No admite PK ni LastEvaluatedKey arbitraria. Servidor deriva PK desde kind/filtro; reconstruye `{PK,SK:lastSk}` con patrón y rango validados. Cursor es opaco para cliente; no firmado y no autoridad de acceso.

Primera página posts/videos fija upperBound=max(hora UTC actual, máxima publishedSort del feed) para incluir fechas futuras ya publicadas; dos lecturas Query fuertes acotadas: primera Limit1 para límite, segunda para página. Límite inclusivo `<upperBound>#~`. Cada continuación conserva filtro/limit/dirección/límite, rechaza upperBound incompatible con sintaxis y lastSk fuera del rango. Cursores de videos nunca consultan particiones de posts, ni viceversa. Modificar un cursor validado solo permite navegación por contenido publicado disponible al mismo lector.

`nextCursor=null` solo si no hay LastEvaluatedKey. Puede existir última página vacía con nextCursor null. Catálogo sin cambios: sin duplicados ni omisiones. Ediciones, retiradas o publicaciones con fecha retroactiva no tienen snapshot garantizado.

## Errores y fallos

- 400 VALIDATION_ERROR: filtro/fecha/slug/límite/cursor/query inválidos. Mensaje seguro sin detalles de claves.
- 401 UNAUTHENTICATED: Bearer ausente, ambiguo o inválido, o falta sub verificado; cero I/O.
- 404 NOT_FOUND: config ausente, slug desconocido, draft o withdrawn.
- 500 INTERNAL_ERROR: timeout/DB/corrupción; no devolver [] como sustitución de fallo.
- 429 según protección/throttling de infraestructura; no prometer un limiter nuevo.

403/409 son semánticas generales, sin casos nuevos en rutas GET. Cliente trata todas las URLs multimedia como recursos externos y conserva textos alternativos. No se descarga ni ejecuta contenido remoto desde Lambda. Validación de ítems corruptos evita respuestas parciales inconsistentes; logs registran ruta/requestId/duración/code/conteo sin cuerpos, tokens ni cursor.

## Compatibilidad

Transformar `image/imageAlt` a thumbnail, `duration` a durationSeconds y plataformas/estados a códigos canónicos implica adaptar el consumo del frontend. No sustituir el JSON hardcodeado directamente por una respuesta con shape distinto; integrar cada sección conforme a este contrato. DTOs Radar iOS no están en este repositorio: validarlos al integrar. Otras APIs /v1 permanecen iguales.

Detalle de post y ReleaseEvent incluyen `purchaseLinks: { store: string; link: string }[]`, array vacío si no hay enlaces. Sustituye el campo amazonLink. Contrato mobile: [radar-purchase-links-mobile.md](radar-purchase-links-mobile.md).

Detalle de post y ReleaseEvent incluyen también `videoLinks: { platform: "tiktok" | "instagram-reels"; link: string }[]`. Sin enlaces: `[]`. Se conserva relatedVideo por compatibilidad. Contrato mobile: [radar-video-links-mobile.md](radar-video-links-mobile.md).
