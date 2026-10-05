# Modelo de datos: Catálogo de ofertas LEGO en Amazon

## AmazonOfferCard (persistencia)

| Campo | Tipo | Reglas |
|---|---|---|
| `PK` | string | Siempre `CATALOG#AMAZON_OFFERS`. |
| `SK` | string | `AVAILABLE#<posición seis dígitos>#<amazonOfferId>` o `HIDDEN#<posición seis dígitos>#<amazonOfferId>`. Determina disponibilidad y orden. |
| `entityType` | string | Siempre `AMAZON_OFFER_CARD`. |
| `amazonOfferId` | string | Identificador editorial interno, no vacío y estable. No se publica. |
| `position` | integer | Entero positivo. Define el orden editorial. |
| `isAvailable` | boolean | Debe coincidir con el prefijo de `SK`; solo `true` es visible. No se publica. |
| `title` | string | Texto no vacío. Se publica sin transformación. |
| `discount` | string | Texto no vacío. Se publica sin transformación. |
| `url` | string | URL HTTPS absoluta, sin credenciales. Se publica sin transformación. |
| `image` | string | URL HTTPS absoluta, sin credenciales, o ruta relativa propia que inicia con `/`. Se publica sin transformación. |

## AmazonOffer (contrato público)

| Campo | Tipo | Reglas |
|---|---|---|
| `title` | string | Igual al valor persistido; requerido. |
| `discount` | string | Igual al valor persistido; requerido. |
| `url` | string | Igual al valor persistido; requerido. |
| `image` | string | Igual al valor persistido; requerido. |

No se exponen `PK`, `SK`, `entityType`, `amazonOfferId`, `position` ni `isAvailable`.

## Estado y transiciones editoriales

| Estado | Representación | Visible en GET | Transición futura |
|---|---|---|---|
| Disponible | `AVAILABLE#...`, `isAvailable=true` | Sí | Mover a prefijo `HIDDEN#` y actualizar el estado de manera atómica. |
| No disponible | `HIDDEN#...`, `isAvailable=false` | No | Mover a prefijo `AVAILABLE#` y actualizar el estado de manera atómica. |

Las transiciones no forman parte de una API de esta funcionalidad; documentan la invariante que deberá respetar la administración futura.

## Catálogo inicial

| ID interno | Posición | Título | Descuento |
|---|---:|---|---|
| `lord-of-the-rings` | 1 | LEGO Señor de los Anillos | hasta 22% |
| `star-wars` | 2 | Promociones Star Wars | 20%, 30% y más |
| `marvel` | 3 | Descuentos Marvel | hasta 30% |
| `speed-champions` | 4 | Descuentos Speed Champions | hasta 30% |
| `retiring-soon` | 5 | Próximos a descontinuar | hasta 27% |

Las URL e imágenes exactas corresponden a [FR-008 de la especificación](./spec.md#functional-requirements). La carga inicial usa inserción condicional: una card existente no se sobrescribe.
