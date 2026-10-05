# Data model: Radar

## Tabla física

`RadarTable`: nombre `brickhub-${Environment}-radar`; PK/SK String; PAY_PER_REQUEST; sin GSI/LSI; PITR y Retain. Ningún TTL editorial ni borrado automático.

| Entidad | PK | SK | Escritura/lectura |
| --- | --- | --- | --- |
| PostMetadata | POST#<id> | META | Estado y tarjeta canónicos |
| PostContent | POST#<id> | CONTENT | Detalle canónico, misma versión |
| SlugReservation | SLUG#<slug> | LOOKUP | postId, reserva condicional permanente |
| PostFeed global | FEED#POSTS | <publishedSort>#<id> | Tarjeta publicada |
| PostFeed categoría | FEED#CATEGORY#<category> | <publishedSort>#<id> | Misma tarjeta |
| PostFeed destacado | FEED#FEATURED | <publishedSort>#<id> | Solo published && featured |
| Config | RADAR#CONFIG | V1 | Textos, filtros y límites |
| Video | VIDEO#<id> | META | Datos completos y estado |
| VideoFeed | FEED#VIDEOS | <publishedSort>#<id> | Solo publicado |
| ReleaseEvent | RELEASE#<id> | META | Datos completos y estado editorial |
| ReleaseFeed global | FEED#RELEASES#MX | <releaseDate>#<id> | Solo publicado |
| ReleaseFeed mensual | FEED#RELEASES#MX#<YYYY-MM> | <releaseDate>#<id> | Mismo evento |

IDs ASCII `[a-zA-Z0-9_-]{1,128}`; slug minúsculo `[a-z0-9]+(?:-[a-z0-9]+)*`, <=160. Se prohíbe `#` en IDs, slugs y categorías. Evento id estable distinto de su fecha: para seed se genera `MX-<setNumber>-<resolvedInitialDate>` y se conserva al reprogramarlo. Índice lógico único adicional `RELEASE_UNIQUE#<market>#<setNumber>#<date>/LOOKUP` reserva la identidad natural; cambia transaccionalmente al reprogramar. Manifest distingue reprogramación del mismo evento de eventos legítimos distintos.

`publishedAt` acepta fecha civil YYYY-MM-DD válida o RFC3339 con zona; valor fuente se conserva. `publishedSort` siempre UTC ISO con milisegundos, normalizando fechas civiles a 00:00:00Z solo para orden técnico, sin atribuirles hora editorial real. Post y video se ordenan descendente por toda SK; empate ID descendente. Eventos por SK ascendente e ID ascendente. Una publicación marcada published con fecha futura sigue publicada; no hay scheduler.

## Entidades y atributos

### PostMetadata

Obligatorios: id, slug, category, type, title (1–300), excerpt (1–2000), thumbnail {url,alt}, publishedAt, publishedSort, featured boolean, tags string[] (0–30, etiquetas 1–100), status draft|published|withdrawn, schemaVersion=1, version entero positivo, updatedAt RFC3339, sourceHash SHA256 y sourceReference. Rating opcional con escala editorial 0–10. Feed contiene solo id, slug, category, type, title, excerpt, thumbnail, publishedAt, featured, tags, rating si existe, version, updatedAt, schemaVersion. No autor ni content, ni prices/galería.

Categoría y formato independientes; v1 preserva combinaciones existentes sin exigir que `type` equivalga a categoría. Status no se publica en DTO lector: el backend solo devuelve published. `image/imageAlt` del JSON fuente se normalizan a thumbnail; coverImage explícita se conserva, si falta usa thumbnail.

### PostContent

postId, schemaVersion, version, coverImage {url,alt}, content Block[] (1–1000). Opcionales author {name,avatar?}, set, relatedSets[], prices[], relatedVideo, rumorImages[]. Campos opcionales originales se preservan sin null ni valores inventados; ninguna whitelist de metadatos debe descartar campos de detalle documentados.

Set principal: number string, name, theme?, pieces entero positivo?, age?, releaseDate?, msrp no negativo?, currency?, image?. RelatedSets: number/name y opcionales de set. No FK obligatoria hacia catálogo confirmado. Precio: store, price>=0 finito, currency ISO 4217 uppercase de tres letras, url HTTPS. Son precios editoriales sin refresh automático.

Medios: url HTTPS, alt no vacío; avatar URL HTTPS. Video relacionado: platform enum tiktok|instagram-reels, url HTTPS, title, description?. Galería de rumores: url/alt/title/summary/rumorStatus opcional por imagen. Fuente puede omitir sourceUrl; no inferirlo.

### Bloques (unión discriminada por type)

| type | Obligatorios | Opcionales / restricciones |
| --- | --- | --- |
| paragraph | text | Texto plano, no HTML ejecutable |
| heading | level,text | level entero 2–6 |
| callout | tone,title,text | tone info/warning/success |
| prosCons | pros[],cons[] | title?; strings no vacíos |
| rating | score,maxScore,label,summary | 0<=score<=maxScore; maxScore>0 |
| rumorStatus | status,confidence,sourceName,lastUpdatedAt,message | sourceUrl? HTTPS; status unconfirmed/partially-confirmed/confirmed/debunked; confidence low/medium/high |
| releaseInfo | status,releaseDate,price,currency,availability[] | status upcoming/preorder/available/delayed/cancelled |
| setRanking | title,items[] | position entero>0 único, setNumber,name,image,description,score? 0–10 |
| setCard | number,name,image,description | Datos de referencia editorial |

Texto por campo <=20,000 caracteres sujeto al presupuesto final. Rating superior debe coincidir con score/maxScore normalizado a 10 del único bloque rating si existe; varios bloques rating se rechazan para evitar calificación ambigua. `content` mantiene orden; `setRanking.items` mantiene orden fuente y requiere posiciones ascendentes únicas.

### Video y evento

Video: id,title,platform,thumbnail {url,alt},durationSeconds entero positivo,publishedAt,publishedSort,url HTTPS,status,version,updatedAt,sourceHash. Adaptador convierte TikTok a tiktok, Instagram Reels a instagram-reels y duración `m:ss` a segundos; valida segundos 00–59.

Evento: id,setNumber,name,image {url,alt},market=MX,releaseDate YYYY-MM-DD real,price>=0,currency,status (upcoming/preorder/available/delayed/cancelled),url (HTTPS o ruta interna /explore/<setNumber>),editorialStatus,version,updatedAt,sourceHash,sourceIds[]. Adaptador Próximamente -> upcoming, Preventa -> preorder; estado editorial independiente de estado comercial. No inferir available por paso del tiempo.

Config: schemaVersion,version,updatedAt,sourceHash; copy y calendar conservan todas las claves del ejemplo; filters exactamente todos/rumor/lanzamiento/resena/top con etiquetas; videoLimit=4,releaseLimit=3,upcomingReleasesLimit=6 iniciales, límites 1–50. Config ausente devuelve 404, nunca datos hardcodeados como sustitución silenciosa.

## Transiciones y atomicidad

- draft -> published por acción editorial explícita; published -> draft o withdrawn retira todos los feeds; withdrawn -> published permitido con contenido válido. No borrado físico rutinario.
- Publicación: leer versión anterior coherentemente, construir diff, TransactWrite META, CONTENT, reserva slug si nueva y alta/baja/actualización de feeds afectados. Cuando la clave no cambia usar un Put, nunca Delete+Put del mismo ítem en la transacción. Condición version=expectedVersion sobre META (attribute_not_exists para crear). Reservas existentes deben apuntar al mismo ID.
- Slug inmutable en v1; cambiarlo requiere feature posterior con aliases. Retirada conserva reserva y detalle responde 404.
- Config/video/evento usan condición de versión y actualizan feeds/reserva natural en la misma transacción. Cambio de categoría/fecha elimina claves antiguas y crea nuevas.
- Hash del contenido canónico sin campos de versión/timestamps: repetición idéntica no-op. Cambio requiere expectedVersion explícita del manifiesto; hash igual al seed pero versión modificada no autoriza sobrescritura.
- Ningún archivo completo es atómico: validación global antes de escribir; cada entidad es atómica. Fallo parcial produce reporte por entidad; reintento idempotente continúa sin duplicar.
- Detalle: GetItem fuerte reserva; TransactGet META+CONTENT, verificar published y versiones iguales; ausencia/retirada 404, dato corrupto 500 seguro. Query fuerte feed devuelve tarjetas publicadas; no snapshot bajo ediciones concurrentes.

## Tamaños

META/tarjeta <=16 KiB; CONTENT <=320 KiB; config <=32 KiB; todos <=350 KiB contando claves/nombres/mapas/listas/UTF-8; transacción por post <=1 MiB. Rechazar antes de escribir, sin truncar. Fuera de estos presupuestos se requiere nueva decisión de almacenamiento, no segmentación implícita.


## Carga de medios

Originales en S3 privado; object key inmutable `radar/<sha256 completo>.<ext>`. Registros editoriales almacenan URL `https://<dominio CloudFront>/<objectKey>`. El bucket tiene cifrado AES256, versionado y acceso público bloqueado; solo CloudFront OAC lee mediante bucket policy. El operador puede cargar y comprobar objetos del prefijo radar, sin otorgar escritura a la Lambda lectora. No se crea endpoint de carga público.
