# Data Model: Detalles y tiendas

Sin tablas ni persistencia. DTOs y puertos propios de producto en módulo shopping; mercado/error/deadline compartidos. Ver [OpenAPI](contracts/openapi.yaml) para tipos normativos.

## ShoppingProductQuery

Relación: ShoppingQuery vigente + catalog_id.

| Campo | Obligatorio | Regla |
|---|---|---|
| catalog_id | Sí | trim exterior, 1–100 dígitos, alguno no cero; preservar cadena y ceros iniciales |
| q | Sí | trim, 1–200 caracteres |
| hl | No | default es-mx; idioma2–3 letras, región opcional2, case insensitive |
| gl | No | default mx;2 letras |
| google_domain | No | default google.com.mx; regex vigente Google sin esquema/ruta |
| location | No | default Mexico; trim1–200, sin Unicode Cc |

Nombres públicos sensibles a mayúsculas conforme al endpoint previo. Rechazar duplicados/desconocidos. No exponer token, flags, device, sort_by, cursors ni userId.

## ShoppingProductData y ProductResults

Raíz requiere product_results; search_parameters es opcional/null. ProductResults requiere title no vacío y stores array (vacío válido). product_id opcional/null cadena no vacía; more_options opcional/null array; extension_ids opcional/null objeto con catalog_id opcional/null; source opcional/null string sin enum fijo.

MoreOption: title y product_id obligatorios no vacíos; IDs textuales. Ninguna alternativa dispara más consultas.

## ShoppingStore

Obligatorios position entero positivo y name no vacío. Opcionales/null: title, tag, merchant_id, price, currency, shipping, tax_hint, total (strings); link HTTP(S); logo/thumbnail imágenes seguras; extracted_price, shipping_extracted, extracted_total números finitos no negativos; rating finito0–5; reviews entero no negativo; details_and_offers array de strings. IDs presentes no vacíos. No mínimo de tiendas ni límite de33; límite por bytes.

Conservar lista en orden, comerciantes repetidos, disponibilidad textual y precios sin redondear. Ausentes permanecen ausentes; null se mantiene. No completar valores desde la query. URL insegura invalida; URL segura se mantiene literal salvo retirada de parámetros de credencial.

## ProductSearchParameters

Campos opcionales/null: catalog_id, product_id (IDs no vacíos), engine,q,hl,gl,google_domain,location,device (strings), load_all_stores/more_stores (boolean). Muestra omite location/more_stores y refleja otro google_domain; no exigir ecos ni sobrescribir valores.

## Frontera privada y estado

Respuesta upstream entra como unknown; comprobar HTTP/error lógico y truncado declarado antes de validar DTO. next_page_token no vacío o header truncado:true ⇒502, sin cursor público. Retirar propiedades desconocidas después de validación, no exigir coincidencia product_id/catalog_id.

Estados: recibido → autenticado → validado → credencial disponible → consulta → validación/saneamiento → éxito. Cualquier fallo interrumpe con400/401/429/500/502. Leer secreto/proveedor solo tras auth+validación. Un producto sin tiendas sigue el estado éxito; falta product_results/title/stores es502.

Credencial cacheada solo en Lambda hasta300s. DTOs no almacenan credencial/identidad. Resultado público requiere status:success y data; error status:error, code,message. Gateway puede dar401 con message nativo.
