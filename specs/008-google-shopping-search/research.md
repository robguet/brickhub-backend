# Research: Búsqueda protegida en Google Shopping

**Fecha**: 2026-10-04. Investigación documental y del repositorio; sin invocaciones pagadas, lectura de secretos ni despliegues.

## 1. Reutilización y límites de responsabilidad

**Decision**: Módulo shopping y Lambda independientes; reutilizar HttpApi, authorizer, helper de `sub`, SDK v3, Zod y Vitest existentes.
**Rationale**: `template.yaml` usa Node.js 24 ARM64, timeout global 5 segundos y permisos por función. `src/modules/sets` ofrece el patrón controller/service/repository/client/secreto; `saved-sets.route.ts` verifica claims. La función de shopping necesita su propio timeout y permiso de secreto. No hay motivo para añadir DynamoDB, Hono o un cliente HTTP nuevo.
**Alternatives considered**: Compartir la Lambda de sets ampliaría IAM y acoplaría proveedores; incorporar framework nuevo no resuelve un problema de este endpoint.

## 2. Parámetros y mercado

**Decision**: GET fijo a `https://api.scrape.do/plugin/google/shopping`, query codificada, `device=desktop`, `sort_by=2`; mercado predeterminado solicitado y cambios parciales admitidos.
**Rationale**: El proveedor documenta el servicio; la muestra enviada tiene 40 productos para ese mercado. `2` corresponde a precio mayor a menor. No se siguen URLs aportadas por el cliente.
**Alternatives considered**: Orden relevante o ascendente no coincide con el valor solicitado; alias de mercado o catálogo propio amplían alcance.

Fuente: [Shopping oficial](https://scrape.do/documentation/google-scraper-api/shopping/search/).

**Decision**: Conservar `hl=es-mx`; verificarlo en un smoke autorizado futuro.
**Rationale**: La lista documental de idiomas incluye `es` y `es-419` y no enumera `es-mx`; esa omisión no demuestra rechazo y la muestra del usuario lo contiene. No normalizarlo a otro idioma. Un rechazo se informa como fallo de proveedor.
**Alternatives considered**: Sustituirlo preventivamente viola el mercado solicitado. No exigir otra decisión del usuario antes de tener evidencia.

Fuente: [Localización](https://scrape.do/documentation/google-scraper-api/localization/).

## 3. Datos y respuesta pública

**Decision**: Envelope success/data con las seis secciones conocidas del proveedor; validación explícita, stripping de campos nuevos y conservación de campos opcionales válidos. En productos, `position` y `title` requeridos; el resto opcional/nullable. IDs son strings, nunca números convertidos después de perder precisión.
**Rationale**: La documentación no garantiza todos los campos en toda oferta; solo posición/título siempre presentes. La muestra de 492624 bytes incluye imágenes data URI, 40 resultados y total cero. No usar total como condición de éxito. Filtros y categorías se mantienen separados.
**Alternatives considered**: Passthrough indiscriminado puede filtrar credenciales; requerir cada campo rechazaría resultados válidos; normalizar precios o fusionar categorías cambia semántica.

Fuente: [Campos y resultados de Shopping](https://scrape.do/documentation/google-scraper-api/shopping/search/) y muestra adjunta del usuario. La muestra no se invocó ni se volvió a descargar.

## 4. Errores y reintentos

**Decision**: Una llamada, sin retry automático. HTTP 429 → local 429; HTTP no exitoso restante → 502. HTTP 200 con `error` no vacío → 502, salvo señal documentada inequívoca de límite. JSON o schema inválidos → 502. Lista `[]` válida → éxito; lista ausente → inválida, sin inferir vacío por total cero.
**Rationale**: El proveedor documenta fallos transitorios y mensajes de error incluso en 200. Créditos agotados o suspensión pueden producir 401 proveedor, distintos de autenticación BrickHub. Su estrategia de retry con timeout 120 segundos no cabe en este flujo síncrono.
**Alternatives considered**: Retry y polling pueden superar el deadline y duplicar consumo. Interpretar strings por coincidencias vagas como “limit” confunde condiciones; inicialmente clasificar por status o campos inequívocos.

Fuentes: [Fallos transitorios](https://scrape.do/documentation/google-scraper-api/transient-errors/) y [códigos](https://scrape.do/documentation/api-response/status-codes/).

## 5. Presupuesto de tiempo y tamaño

**Decision**: Deadline de aplicación 27 segundos, secreto hasta 2, proveedor hasta 24, Lambda 29. Leer upstream hasta 4 MiB y serialización proxy hasta 5 MiB; overflow → 502 controlado.
**Rationale**: HTTP API admite integración hasta 30 segundos y payload de 10 MB; Lambda buffered síncrona admite 6 MiB. Un margen evita depender de esos límites. Imágenes base64 pueden aumentar el tamaño; preservar datos mientras caben y fallar explícitamente si no caben.
**Alternatives considered**: El timeout global 5 segundos es demasiado restrictivo; 120 segundos no cabe. Streaming, almacenamiento externo o eliminación de imágenes cambian alcance/contrato.

Fuentes: [Cuotas HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html), [cuotas Lambda](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html).

## 6. Secreto y seguridad

**Decision**: Parametrizar ARN de `scrapedo`, lectura SDK v3 abortable, sin retries y caché de credenciales 300 segundos. Aplicar permisos al ARN exacto. No modificar ni crear el secreto.
**Rationale**: El patrón de ARN evita dependencia de región/cuenta hardcodeada; la caché exclusiva de credenciales reduce lecturas sin almacenar productos. Timeout explícito asegura presupuesto aun cuando falla Secrets Manager.
**Alternatives considered**: Secreto enviado por cliente, variables con API key o permiso a todos los secretos incumplen seguridad; SDK defaults sin límite de espera no garantizan deadline.

Evidencia local: `src/modules/sets/brickset-secret.provider.ts`, `package.json`, constitución V. La nueva integración usa las mismas dependencias, con timeout explícito por comando.

## 7. Autenticación y formato de errores previos a Lambda

**Decision**: Gateway verifica firma, issuer, audiencia y vigencia; route exige esquema Bearer y `sub` de contexto confiable antes de validar/query/crear clientes con I/O. No scopes nuevos. El contrato 401 admite envelope Lambda y mensaje nativo Gateway, con excepción acotada en plan.
**Rationale**: Gateway permite token sin prefijo además de Bearer; la comprobación de route conserva el requisito de esquema. El helper actual únicamente extrae `sub` y no verifica firmas. Gateway no distingue access token de ID token cuando no hay scopes; conservar política actual y recomendar access token en clientes sin prometer una distinción inexistente. Los rechazos anteriores a integración no se pueden formatear desde el handler.
**Alternatives considered**: Decodificar JWT localmente sin verificar firma no autoriza; cambiar todas las rutas o añadir scopes por defecto no corresponde a este corte.

Fuentes: [JWT authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html), [Gateway responses para REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-gatewayResponse-definition.html). La personalización REST no debe trasladarse como si estuviera disponible en HTTP API.

## Resultado

Decisiones resueltas para diseño. No quedan marcadores pendientes. Antes de probar recursos reales se verificará destino dev, ARN/permisos y compatibilidad del proveedor; esa verificación no se realizó en esta fase.
