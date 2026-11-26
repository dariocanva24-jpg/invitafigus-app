# InvitaFigus — un solo repositorio

Este repo contiene **las dos aplicaciones** en carpetas separadas:

```
invitafigus-full/
├── web/     → la web (React + Vite) — antes repo "invitafigus"
└── api/     → el backend (Express) — antes repo "invitafigus-api"
```

## Subir a GitHub (una sola vez)

1. Creá un repo nuevo, por ejemplo **`invitafigus-full`**.
2. En la pantalla del repo: **Add file → Upload files**.
3. Arrastrá **TODO** el contenido de la carpeta `invitafigus-full` (las carpetas `web`, `api` y este `README.md`). No hace falta abrir los archivos ni copiar de a uno.
4. **Commit changes**. Listo: un solo repo, sin parches.

## Conectar Vercel (sin borrar nada)

No elimines los proyectos que ya tenés. Solo cambiales el origen (en la pestaña Git):

| Proyecto Vercel actual | Settings → Git → Repository | Root Directory |
|---|---|---|
| Web (`invitafigus.vercel.app`) | `tu-usuario/invitafigus-full` | `web` |
| API (la URL que usa `API_BASE_URL`) | `tu-usuario/invitafigus-full` | `api` |

Guardás y hacés **Redeploy**. Las variables de entorno se mantienen igual; `API_BASE_URL` sigue apuntando a la URL pública de la API.

> Si tu API no está en Vercel sino en Render/Railway/Otro, solo cambiá el repo a `invitafigus-full` y la carpeta/ruta a `api`.

## Seguridad

- Los `.env` reales **no están incluidos**. Solo `.env.example` con valores de ejemplo.
- Rotá la contraseña de PostgreSQL: el archivo `.env` viejo sigue en el historial del repo público anterior.

## Qué incluye esta versión

- Fotos realistas de los figuritas de ejemplo.
- Pago verificado: abrir MercadoPago ya no muestra éxito falso; se verifica con `MP_ACCESS_TOKEN` o por comprobante con `[InvitaFigus · PAGO]`.
- Tarjeta hacia **Invita con el Alma** en la pantalla posterior al checkout y mención en el footer.
- RSVP persistente, 29 equipos con escudos, audio de hinchada y links de WhatsApp con prefijo por producto.
- 
