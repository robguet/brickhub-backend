# Radar: videoLinks — contrato para mobile

Campo nuevo en endpoints existentes:
- GET /v1/radar/posts/{slug}: `data.post.videoLinks`.
- GET /v1/radar/releases: `data.releases[i].videoLinks`.

```json
{
  "videoLinks": [
    { "platform": "tiktok", "link": "https://www.tiktok.com/@brickhub/video/123" },
    { "platform": "instagram-reels", "link": "https://www.instagram.com/reel/ABC/" }
  ]
}
```

URLs ilustrativas. `platform` solo admite `tiktok` o `instagram-reels`; `link` debe ser HTTPS sin credenciales. Hasta 20 elementos, ordenados como deben mostrarse. Puede haber varios videos de cada plataforma. Sin videos, array vacío `[]`; mobile debe tratar ausencia como `[]` durante transición.

DTO: `VideoLink { platform: String, link: String }`; agregar array `videoLinks` al detalle y a cada lanzamiento. Mostrar un botón por elemento (“Ver TikTok” / “Ver Reel”) y abrir `link` externo. Ocultar sección si array vacío. El listado de tarjetas y destacado no contienen este campo. No modifica `/v1/radar/videos`, la sección independiente de videos.

Se conserva `relatedVideo` para compatibilidad; los nuevos consumidores deben usar `videoLinks` sin duplicar el video de `relatedVideo`. El código nuevo requiere despliegue antes de habilitar la UI. No se suben archivos de video a S3: se guardan enlaces.
