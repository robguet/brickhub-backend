# Radar: purchaseLinks — contrato para mobile

Cambio de campo en APIs existentes; no agrega endpoints.

- GET /v1/radar/posts/{slug}: `data.post.purchaseLinks`.
- GET /v1/radar/releases: `data.releases[i].purchaseLinks`.
- Listado de tarjetas `/posts` y `/featured` no incluye este campo; consultar detalle al abrir artículo.

```json
{
  "purchaseLinks": [
    { "store": "Amazon", "link": "https://www.amazon.com/s?k=lego+darth+vader" },
    { "store": "Mercado Libre", "link": "https://listado.mercadolibre.com.mx/lego-darth-vader" }
  ]
}
```

Ejemplo ilustrativo; el contenido real conserva enlaces ya registrados. `store` (no `sotore`) es texto no vacío, máximo 100 caracteres. `link` es URL HTTPS sin credenciales. Máximo 20 enlaces. El orden de respuesta define el orden de botones; tiendas no limitadas a Amazon y Mercado Libre. Parámetros afiliados conservados.

El backend nuevo devuelve siempre array; si no hay enlaces, `[]`. Durante la transición mobile debe aceptar ausencia como `[]`. Sustituye `amazonLink`; dejar de depender del campo anterior. No cambiar `prices` (comparación de precios) ni `url` de lanzamiento (navegación del set).

Mobile: añadir DTO `PurchaseLink { store: String, link: String }` y array `purchaseLinks` en detalle del post y lanzamiento; decodificar campo ausente como array vacío. Mostrar un botón por elemento, con etiqueta “Comprar en {store}”, abrir `link` externamente. Ocultar sección si array vacío; no crear URL fija en cliente. No habilitar la UI del nuevo campo hasta desplegar el backend actualizado.

Migración dev: dos reseñas toman enlaces de `prices`; cuatro lanzamientos convierten el antiguo enlace Amazon en un array de un elemento. No se agregaron URLs de productos inventadas. Los lanzamientos siguen en su estado editorial anterior.
