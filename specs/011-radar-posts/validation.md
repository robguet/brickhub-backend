# Evidencia de implementación Radar

Fecha: 2026-10-05. Ambiente: local. No se desplegó ni se escribieron recursos AWS.

## Entregado

Seis rutas GET autenticadas, tabla editorial sin índices, feeds transaccionales, CLI con validación/dry-run/apply, carga de imágenes por hash a S3 privado y distribución CloudFront OAC. Publicaciones conservan categoría independiente de formato y cuerpos separados de resúmenes.

Los importadores utilizan versiones y reservas atómicas; config requiere `publishConfig`, posts requieren selección explícita o `postStatuses`; videos y eventos requieren selección en manifiesto. Las URLs multimedia resultantes son HTTPS y no hay permisos de escritura en el rol HTTP.

## Verificaciones locales

- TypeScript strict y lint pasan.
- Suite completa: 73 archivos, 352 pruebas pasan (incluye pruebas previas del backend).
- `sam validate --lint` pasa.
- `sam build --parallel` pasa (las diez funciones, incluida RadarFunction).
- Dry-run del ejemplo con manifiesto local: 9 posts, 5 videos y 4 eventos; 0 rechazos; 1 conflicto por estado comercial del 75383.
- Se localizaron los 13 archivos multimedia referenciados bajo `../lego-hub/public`; no se subieron a S3.
- Generación de 10,000 fixtures identificables y validación/dry-run local: exit0, 10,000 posts, 0 rechazos ni conflictos. Esto verifica preparación de fixtures, no el objetivo de latencia real.

## Compatibilidad de clientes

Revisión de solo lectura del proyecto iOS vecino:

- `../brickhub-mobile/BrickHubPresentation/Sources/Radar/RadarModels.swift` usa categorías `all/rumor/release/review/ranking`. El adaptador debe mapear `lanzamiento -> release`, `resena -> review`, `top -> ranking`; Todos se envía como ausencia de filtro.
- iOS modela cinco bloques (`paragraph`, `heading`, `prosCons`, `rating`, `callout`); deben añadirse `rumorStatus`, `releaseInfo`, `setRanking`, `setCard` para renderizar los nueve bloques de esta API.
- `imageURL/imageAlt` corresponde a `thumbnail.url/alt`; `isFeatured` a `featured`; portada distinta debe obtenerse de detalle.
- La selección iOS actual permite fallback al primer artículo si no hay destacado; el contrato API devuelve `post:null`, por lo que el cliente debe ajustar esa decisión al integrarse.
- No existe DTO de Radar en BrickHubData ni consumo HTTP de Radar en su APIClient. Este cambio añade el contrato backend y documenta integración; no altera ese repositorio.
- Textos/calendar y límites se conservan, incluyendo 4 videos, 3 eventos de portada y 6 próximos. El frontend web necesita consumir envelopes/listas paginadas; no usar la respuesta HTTP como sustitución directa del JSON de pantalla.

## Pendientes de operación

Despliegue y carga de datos quedan fuera de esta ejecución local. Antes de aplicarlos: revisar change set, verificar cuenta/región/dev, usar el dominio CloudFront desplegado y decidir estado comercial del 75383 y entidades que se publicarán. La fecha ya está fijada a 2026-07-22 en el bundle preparado. El manifiesto de ejemplo no elige disponibilidad ni publica contenido automáticamente.

La prueba real de 50 lectores y p95 <2 s está preparada como `radar:load --run`, pero no ejecutada. No afirmar SC-002 ni tiempos de propagación observados en AWS sin esa medición. La herramienta genera un manifiesto exacto de IDs para una limpieza posterior revisada; no contiene borrado amplio automático.

## Carga real en dev — 2026-10-05

- Usuario confirmó 75383 como Disponible y publicación de los nueve posts.
- Destino verificado mediante STS y CloudFormation: cuenta 255358858742, us-east-1, brickhub-dev.
- SAM preparó la revisión e informó `No changes to deploy`; la infraestructura Radar ya estaba presente. No se ejecutó un despliegue en esta operación.
- Importación aplicada: nueve posts publicados, configuración publicada, cinco videos y cuatro eventos guardados como borradores.
- Imágenes cargadas y entrega/MIME comprobados por el importador en https://d1sbgsppwt3l8z.cloudfront.net.
- Cero conflictos y rechazos; las veinte entidades se crearon correctamente. Evidencia: radar-dev-import-report.json.
- Falta conectar el cliente a la API y verificar su consumo con una sesión Cognito.
