# Quickstart de validación: Radar

Implementación local completada. Los scripts están disponibles y los recursos están declarados en SAM; crear recursos reales requiere despliegue autorizado. Nada de esta guía despliega o escribe AWS automáticamente.

## Prerrequisitos

Node 24 compatible, npm, SAM CLI y dependencias (`npm ci`). Para lecturas reales: dev desplegado con aprobación, credenciales del operador y token Cognito con sub válido. Entrada: radar-normalized.example.json; contiene importReady=false y artículos draft.

## Validación local

```sh
npm run typecheck
npm run lint
npm test
sam validate --lint
sam build
npm run radar:import -- --input specs/011-radar-posts/radar-normalized.example.json --dry-run --report /tmp/radar-dry-run.json
```

Esperado: las primeras cinco verificaciones pasan tras implementación. El dry-run del ejemplo finaliza con exit2 mientras falte resolver estado comercial de 75383 y mapeo/carga de medios; la fecha ya está resuelta. Nueve posts, cinco videos y cuatro eventos, con tres duplicados originales trazados. No hay llamadas AWS ni escrituras en dry-run. Con manifiesto y mediaBaseUrl reales resueltos, exit0/importReady=true.

## Carga dev controlada

1. Preparar manifiesto conforme a [contrato de importación](contracts/radar-import.md): base HTTPS de CloudFront, versiones y entidades a publicar. No editar hechos inventando fechas.
2. Completar dry-run, revisar conteos y operaciones. Conservar copia del archivo y reporte.
3. Presentar change set SAM, verificar cuenta/región/dev y obtener autorización de despliegue conforme a constitución X. Tabla inicia vacía: no seed por custom resource.
4. Revisar preflight/apply propuesto, destino y publicación; aplicar mediante CLI con argumentos del contrato y autorización. El agente puede hacerlo; el usuario no captura registros manualmente.
5. Repetir entrada idéntica: todo unchanged, ningún duplicado. Actualización con expectedVersion obsoleta: conflicto, ninguna modificación de esa entidad.

## Lecturas

Variables RADAR_API_URL y RADAR_TEST_TOKEN se obtienen fuera del repositorio; no registrar tokens ni pegar valores en ejemplos. RADAR_API_URL apunta a base API, sin /v1/radar.

```sh
curl -sS -H "Authorization: Bearer ${RADAR_TEST_TOKEN}" "${RADAR_API_URL}/v1/radar/config"
curl -sS -H "Authorization: Bearer ${RADAR_TEST_TOKEN}" "${RADAR_API_URL}/v1/radar/posts?limit=2&category=rumor"
curl -sS -H "Authorization: Bearer ${RADAR_TEST_TOKEN}" "${RADAR_API_URL}/v1/radar/featured"
curl -sS -H "Authorization: Bearer ${RADAR_TEST_TOKEN}" "${RADAR_API_URL}/v1/radar/posts/vale-la-pena-tie-interceptor"
curl -sS -H "Authorization: Bearer ${RADAR_TEST_TOKEN}" "${RADAR_API_URL}/v1/radar/videos?limit=4"
curl -sS -H "Authorization: Bearer ${RADAR_TEST_TOKEN}" "${RADAR_API_URL}/v1/radar/releases?month=2026-08"
```

En fixture resuelto publicado: envelope success y tarjetas sin content. Los nueve detalles conservan content y campos del original. Top, opinión y guía mantienen category distinta de type. Mes vacío -> []; detalle desconocido/draft/retirado ->404; featured vacío ->post:null; falta auth ->401 y repositorio no invocado. Parámetros/cursor invalidado por cambio de filtro ->400. DB/timeout ->500 seguro.

## Escenarios de integridad

- Recorrer páginas de todas las categorías en catálogo fijo y comparar conjuntos de IDs con fixture: cero omisiones/duplicados.
- Consultar detalle al editar y retirar con transacciones: versión uniforme y ningún post retirado después de completar escritura aparece en consultas nuevas.
- Cambiar categoría/fecha/featured: claves antiguas desaparecen y las nuevas aparecen, mismo ID; calificaciones contradictorias/tamaño excesivo se rechazan antes de escribir.
- Estado comercial de eventos no cambia automáticamente por fecha.
- Insertar posts nuevos entre páginas: se respeta límite temporal; documentar que retroactividad/ediciones no ofrecen snapshot.

## Carga opt-in

El script radar-load-test genera fixtures con IDs `radar-load-<runId>-...`, 10,000 posts y 50 lectores, mide p95 de página20 y detalle (<2 s). Ejecución real solo en dev autorizado, fuera de npm test; incluir cold starts y errores en reporte, excluir descargas multimedia. Usar manifiesto de claves exactas para limpieza propuesta y aprobada, nunca Scan/borrado amplio; no mezclar fixtures con contenido editorial real. Coste y throttling se reportan, no asumir capacidad por volumen.

## Evidencia

Guardar reporte local del importador, resultados de calidad, contratos validados y medición opt-in. No afirmar SC-002 verificado hasta completar carga real. Ver [modelo](data-model.md), [API](contracts/radar-api.md) e [importación](contracts/radar-import.md). Consultar [validation.md](validation.md) para evidencia e integración iOS; esta implementación local no realiza cargas AWS.


## Dry-run con imágenes reales

El manifiesto `radar-import.manifest.example.json` mapea las 13 referencias a claves `radar/<sha256>.<ext>` sin elegir estado comercial ni publicar. La URL de ejemplo de este comando es un placeholder para validación local; reemplazarla por `RadarMediaBaseUrl` del stack al importar realmente.

```sh
npm run radar:import -- --input specs/011-radar-posts/radar-normalized.example.json --report /tmp/radar-dry-run.json --resolutions specs/011-radar-posts/radar-import.manifest.example.json --media-base-url https://media.example.invalid --assets-root ../lego-hub/public --dry-run
```

Esperado exit2 por estado comercial contradictorio (el artículo dice available y el calendario upcoming). Las 13 imágenes locales están presentes y los 9 posts/5 videos/4 eventos se validan sin rechazos. El manifiesto debe añadir el estado aprobado a releaseResolutions; no se deduce del paso del tiempo.

## Generar y medir carga

```sh
npm run radar:load -- --generate --output /tmp/radar-load.json --manifest /tmp/radar-load-manifest.json --run-id prueba --count 10000
npm run radar:import -- --input /tmp/radar-load.json --report /tmp/radar-load-dry-run.json --resolutions /tmp/radar-load-manifest.json --dry-run
```

Son operaciones locales. El modo run requiere `--environment dev --api-url <base API sin /v1/radar> --token-env <nombre de variable> --run-id prueba --count 10000 --output <reporte>` y fixtures previamente publicados mediante una carga separada y autorizada. El script primero verifica el número de fixtures de esa ejecución, luego mide páginas/detalles con 50 lectores por defecto, conserva fallos/timeouts y exporta p95; el token nunca entra al reporte.


## Resultado local

Ejecutados con éxito: typecheck, lint, 352 pruebas en 73 archivos, sam validate --lint y sam build --parallel. El bundle de 10,000 fixtures se generó y validó localmente con exit0; la prueba de tráfico real queda pendiente. Ver validation.md para limitaciones y el resultado de la simulación del contenido real.
