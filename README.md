# BrickHub Backend

Backend serverless para BrickHub Mobile, construido con TypeScript, AWS SAM,
API Gateway HTTP API y AWS Lambda.

## Endpoints

```http
GET /v1/hello
```

Respuesta:

```json
{
  "message": "Hola mundo"
}
```

```http
GET /v1/sets?query=10212&pageNumber=1&pageSize=20
```

Busca en Brickset y devuelve un envelope con `status`, `matches` y `sets`.
La función recibe únicamente `BRICKSET_SECRET_ARN`; tanto AWS como SAM local
obtienen las credenciales desde Secrets Manager. El secreto JSON contiene
`BRICKSET_API_KEY` y `BRICKSET_USER_HASH`. Nunca guardes estas credenciales en
código, logs ni configuración local.

## Requisitos locales

- Node.js 20 o posterior para desarrollo local (Lambda usa Node.js 24)
- AWS SAM CLI
- Docker Desktop, para ejecutar Lambda localmente

## Preparación

```bash
npm install
npm run check
sam build
```

## Ejecutar la API local

Con Docker Desktop iniciado y una sesión SSO vigente para `brickhub-dev`:

```bash
aws sso login --profile brickhub-dev
sam local start-api --config-env dev
```

En otra terminal:

```bash
curl http://127.0.0.1:3000/v1/hello
curl 'http://127.0.0.1:3000/v1/sets?query=10212&pageNumber=1&pageSize=20'
```

## Desplegar dev

La primera vez, revisa especialmente la región configurada en
`samconfig.toml` y ejecuta:

```bash
sam deploy --guided --config-env dev
```

En despliegues posteriores:

```bash
sam deploy --config-env dev
```

El output `ApiUrl` es el valor que debe usarse como
`BRICKHUB_API_BASE_URL` en la configuración Development de la app iOS.

## Alcance actual

Este corte incluye una búsqueda de catálogo a Brickset. Cognito, DynamoDB y las
funciones de colección se añadirán cuando una ruta las necesite.
