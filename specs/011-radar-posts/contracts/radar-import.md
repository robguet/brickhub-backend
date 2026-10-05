# Contrato de incorporación administrativa

CLI implementada `npm run radar:import -- <opciones>`. Configuración explícita mediante argumentos, sin secretos dentro del bundle. Entrada admite JSON original o normalizado schemaVersion1; la normalización conserva contenido y produce registros canónicos del modelo.

## Modos y argumentos

- `--input <path>` obligatorio; `--report <path>` obligatorio, fuera del bundle; dry-run es valor predeterminado. `--dry-run` explícito permitido.
- `--resolutions <path>` manifiesto opcional en validación, requerido si hay conflictos de estado o duplicación. `--media-base-url <https-url>` y mapa de path de origen a object key S3 del manifiesto para cargar imágenes locales durante apply y resolver referencias en dry-run.
- `--apply` habilita I/O AWS; incompatible con --dry-run. Exige `--environment dev --region <region> --table <table> --expected-account <accountId>`. Verificar STS GetCallerIdentity y DescribeTable antes de escribir; error si cuenta/tabla/ambiente no coinciden.
- `--publish <id1,id2,...>` lista explícita de posts a publicar. Sin esta lista quedan draft. Manifest debe definir publicación de videos/eventos/config y que sus medios están listos. Fechas futuras no programan nada.
- `--expected-version <manifest>` se representa mediante el campo expectedVersions del manifiesto para ediciones de entidades existentes. Conflicto concurrente detiene esa entidad con 409 lógico; nunca force implícito.

El manifiesto schemaVersion1 tiene `sourceSha256`, `releaseResolutions[]` (setNumber, mercado, sourceIds, decisión keep-date/reschedule/distinct-events, fecha aprobada, estado comercial opcional `status` y razón), `mediaObjects` mapa path->objectKey para carga de S3 (clave `radar/<sha256 completo>.<ext>`; archivos de hasta 10 MiB), `expectedVersions` mapa entityKey->entero, `publishedVideos[]`, `publishedReleases[]`, `publishConfig` boolean y `postStatuses` mapa ID->draft/published/withdrawn para cambios explícitos. Config solo se programa para escritura cuando `publishConfig` es true. SourceSha256 debe coincidir con archivo exacto; la fecha de 75383 ya está decidida (2026-07-22), pero el estado comercial debe resolverse en el manifiesto. Son campos administrativos locales, nunca DTO lector.

## Validación y escritura

Dry-run es local, sin AWS: valida estructura, fechas, slugs, bloques, duplicados, conflictos, tamaños finales estimados conservadoramente y manifiesto. Genera plan de operaciones locales; no puede certificar inexistencia/versiones de registros remotos. apply vuelve a validar y hace preflight de identidades/reservas/versiones; si hay conflictos no inicia escrituras. No usa Scan ni BatchWriteItem para romper invariantes.

apply utiliza transacciones por entidad con expectedVersion/sourceHash. Se revalida la condición durante la escritura, pues preflight no evita carreras. Fuente idéntica -> no-op; fuente modificada requiere versión esperada. Reportar created, updated, unchanged, rejected, conflict y failed por entidad. Un fallo posterior a primeras escrituras genera reporte parcial y exit distinto de cero; una nueva ejecución retoma por hashes/condiciones. No afirmar atomicidad del archivo entero.

Reporte: schemaVersion, inputSha256, mode, generatedAt, sourceCounts, normalizedCounts, consolidatedDuplicates[], conflicts[], rejected[] con path/regla, operations[] con entityId/action/expectedVersion/hash, appliedResults[] y importReady. Reporte nunca contiene credenciales ni contenido de tokens. exit0 válido/éxito; exit2 validación/conflicto; exit1 I/O/inesperado. En dry-run del ejemplo actual se espera exit2 hasta resolver medios y preparar bucket/distribución; la fecha 75383 está resuelta.

No invocar apply dentro de sam deploy, tests o pipeline por defecto. IAM operador separado del rol HTTP; STS identidad, DescribeTable, GetItem, TransactGetItems y TransactWriteItems sobre Radar únicamente. Crear tabla con SAM antes de importar. Conservación mediante Retain/PITR; actualizaciones no eliminan datos de otras entidades.

## Responsabilidad

El usuario no tiene que crear ítems en consola. El agente prepara bundle, manifiesto, reporte y comandos; después puede realizar carga dev con autorización explícita de destino y datos. La fecha 75383 ya está resuelta (22 de julio); quedan estado comercial, URL CloudFront desplegada y selección de publicación. Los 13 archivos referenciados fueron localizados en el proyecto web vecino. Revisar change set de infraestructura y dry-run del importador son pasos distintos.


## Argumentos de medios y preparación

`--assets-root <directorio>` define raíz pública local para imágenes del manifiesto; el importador rechaza traversal/symlinks fuera de esa raíz, formatos fuera de PNG/JPEG/WebP/SVG/AVIF/GIF y hashes incompatibles. `--bucket <nombre>` es requerido por apply. Medios son inmutables por hash; HeadObject evita volver a subir objetos correctos; PutObject usa IfNoneMatch y Content-Type/Cache-Control. Se verifica entrega HTTPS de cada imagen en CloudFront antes de escribir entidades; fallo de medios deja reporte, sin publicar datos que apunten a recursos no disponibles. S3 y DynamoDB no forman una transacción conjunta: una carga fallida puede dejar objetos sin referencias, seguros para reintento.

El manifest `radar-import.manifest.example.json` corresponde al SHA del bundle normalizado y mapea los 13 archivos existentes sin publicar ni escoger un estado comercial. Cuando se use el JSON original, sourceSha256 debe recalcularse. El modo distinct-events exige preparar entradas explícitas en el bundle normalizado; no se inventan eventos automáticamente. Las ediciones posteriores usan IDs estables del bundle normalizado. `--expected-version` no es un argumento CLI: las versiones van en expectedVersions del manifiesto.
