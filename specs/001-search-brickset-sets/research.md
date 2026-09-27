# Research: Consulta de sets Brickset

## Consulta de Brickset

- **Decision**: Usar `GET https://brickset.com/api/v3.asmx/getSets` con `apiKey` y un `params` construido mediante serialización segura de `{ query, pageSize, pageNumber }`.
- **Rationale**: Brickset permite GET y define `params` como JSON; cubre la búsqueda inicial y evita concatenar URL o credenciales manualmente.
- **Alternatives considered**: POST form-urlencoded queda para filtros grandes o complejos; no se necesita aún.

## Credenciales y Secrets Manager

- **Decision**: Almacenar un único secreto JSON con `BRICKSET_API_KEY` y `BRICKSET_USER_HASH`; configurar la función solo con `BRICKSET_SECRET_ARN`. Ambos campos son obligatorios y se envían a Brickset para reproducir la llamada del proveedor indicada por el producto.
- **Rationale**: Un secreto único simplifica rotación y evita credenciales en código/configuración versionada, mientras que enviar ambos valores conserva el contrato de la llamada externa solicitada.
- **Alternatives considered**: Dos secretos separados añaden coste sin beneficio actual; variables de entorno con valores secretos contradicen la constitución.

## Acceso de mínimo privilegio

- **Decision**: Usar AWS Lambda Powertools Parameters con transformación JSON y caché de 300 s. SAM declarará `secretsmanager:GetSecretValue` limitado al ARN. `kms:Decrypt` solo se agrega para una CMK concreta.
- **Rationale**: Ofrece parsing/caché de TypeScript y reduce coste/latencia, manteniendo acceso encapsulado.
- **Alternatives considered**: SDK v3 y caché propia duplican lógica; Lambda extension agrega layer y complejidad local para un único secreto.

## Modelo, paginación y fallos

- **Decision**: Conservar `status`, `matches` y `sets`; aceptar campos opcionales/nulos y propiedades nuevas del proveedor. Usar `pageNumber=1`, `pageSize=20`, validar `pageSize` 1..500, no reintentar, devolver cero resultados como éxito y traducir mensajes upstream a errores seguros.
- **Rationale**: Brickset documenta tamaño 20, máximo 500 y hasta 100 llamadas diarias de `getSets` para claves individuales; también evoluciona su modelo y devuelve éxito para búsquedas vacías.
- **Alternatives considered**: Sin paginación, 404 para cero resultados y reintentos automáticos se descartan por carga no acotada, semántica incorrecta y consumo de cuota.

## Fuentes

- [Brickset API v3 documentation](https://brickset.com/article/52664/api-version-3-documentation)
- [Brickset getSets operation](https://brickset.com/api/v3.asmx?op=getSets)
- [Brickset Web Services limits](https://brickset.com/article/52666/brickset-web-services)
- [AWS Lambda: use Secrets Manager](https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html)
- [AWS SAM policy templates](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-template-list.html)
