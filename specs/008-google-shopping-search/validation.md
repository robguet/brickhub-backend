# Validation: Google Shopping Search

**Fecha**: 2026-10-04. Entorno local, sin invocaciones a AWS o ScrapeDo, lectura de secretos reales ni despliegue.

## Gates

| Comando | Resultado |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS: 195 pruebas en 38 archivos |
| `sam validate --lint` | PASS: plantilla SAM válida |
| `sam build` | PASS: seis funciones empaquetadas, incluida SearchShoppingFunction |

## Evidencia de aceptación

- Las pruebas iniciales fallaron por capacidades ausentes antes de implementarlas: guardia fundacional, schemas/delegación/HTTP/infraestructura, credenciales ambiguas, validación de mercado y saneamiento/tamaño. Luego se verificaron sus incrementos y se ejecutó la suite completa.
- La fixture derivada del adjunto conserva 40 productos principales, tres categorías, IDs como texto, precios originales, orden y total informado cero. Imágenes y referencias de detalle de producto se conservan; no contiene credenciales del servicio.
- Integración con repository, cliente y provider reales, sustituyendo únicamente fetch y SDK, devuelve 40 productos y prueba una lectura de secreto/una llamada externa; no sigue paginación ni accede a DynamoDB.
- La entrada inválida y la autenticación rechazada evitan construir dependencias con I/O y evitan lecturas/búsquedas. El handler exportado rechaza solicitudes anónimas.
- Temporizadores controlados verifican cancelación por timeout de secreto (2 s), proveedor (24 s, incluidos headers y body) y aplicación (27 s); fallos del secreto evitan llamar al proveedor. Resultados SDK tardíos no se cachean.
- Overflow upstream (>4 MiB) cancela la lectura aun cuando Content-Length sea falso. Overflow de proxy (>5 MiB UTF-8) produce error pequeño en controller/route, sin truncar ofertas como éxito.
- HTTP 429 propaga únicamente Retry-After saneado; 401 proveedor no se confunde con autenticación del usuario. JSON/schema/error lógico inválidos nunca se convierten en lista vacía exitosa.
- URLs de producto y continuaciones se sanean; enlaces ajenos se omiten; propiedades desconocidas con credenciales se retiran y reflejos de la clave en campos permitidos se rechazan. Los logs incluyen solo metadatos seguros.
- Validación adicional con Ajv disponible en tooling, sin añadir dependencias, contrastó salida del schema real con OpenAPI: fixture de 40 productos y caso de campos opcionales/null válidos.
- SAM/contrato comprueban authorizer, ruta, ARN exacto, ausencia de DynamoDB/Function URL/scopes nuevos, retención, memoria, timeout y configuración sin API key.

## Límites y verificaciones posteriores

No se han probado firmas/vigencia de tokens contra Gateway real ni disponibilidad/permisos del secreto `scrapedo`. SAM local no verifica el authorizer JWT; los tests simulan claims de contexto confiables. El 401 nativo anterior a Lambda tiene la excepción de formato descrita en plan.md.

Para desplegar, suministrar el ARN real del secreto mediante `ScrapeDoSecretArn`, verificar cuenta/región/ambiente dev y permisos KMS específicos si el secreto utiliza clave propia. La configuración SAM existente no incluye todavía ese ARN y no se ha modificado con valores inventados. Confirmar `hl=es-mx` con smoke autorizado y no sustituirlo silenciosamente. El deploy requiere aprobación explícita y revisión del change set; estas verificaciones cloud no forman parte de los gates locales.

No se cambian los contratos ni el código de las rutas existentes. La suite completa incluye sus pruebas de regresión. No hay `.specify/extensions.yml`; no se registraron hooks de implementación.
