# Streaming de campaña

Plataforma de transmisión en vivo con banners de publicidad del partido alrededor del reproductor.

- **Video:** [Mux](https://www.mux.com/) recibe la señal por RTMPS (desde OBS) y la entrega por HLS.
- **Backend:** Express + SQLite (`node:sqlite`), sin dependencias nativas.
- **Frontend:** HTML/JS estático con `hls.js`, que se sirve desde el propio servidor.

## Puesta en marcha

```bash
cp .env.example .env    # completa ADMIN_TOKEN, credenciales de Mux y hosts permitidos
npm install
node --env-file=.env src/server.js
npm test
```

Se necesita Node.js 22.13 o posterior.

1. Abre `/admin`, ingresa el `ADMIN_TOKEN` y pulsa **Obtener datos de ingesta para OBS**.
2. En OBS → Ajustes → Emisión → *Personalizado*: copia el servidor `rtmps://global-live.mux.com:443/app` y la clave.
3. En Mux → Settings → Webhooks, apunta a `https://<tu-dominio>/api/webhooks/mux` y copia el secreto en `MUX_WEBHOOK_SECRET`.
   El webhook cambia el estado a *en vivo* o *inactivo* de forma automática.
4. Crea los banners desde `/admin`. Cada uno exige el campo **"Pagado por"**, que se muestra al público.

## Despliegue

El servidor necesita un proceso persistente y un disco para SQLite: Render, Railway, Fly.io o un VPS.
No uses Vercel serverless, porque el sistema de archivos es efímero.
Si usas un proxy inverso, activa `TRUST_PROXY=true` para que el rate limiting vea la IP real.

## API

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/estado` | público | Estado de la transmisión y `playbackId` (solo en vivo) |
| GET | `/api/banners` | público | Banners vigentes (JSON plano, sin HTML) |
| GET/POST | `/api/admin/banners` | Bearer | Listar o crear banners |
| PATCH/DELETE | `/api/admin/banners/:id` | Bearer | Pausar, activar o eliminar |
| POST | `/api/admin/stream` | Bearer | Crea la transmisión en Mux (una sola vez) y devuelve los datos de ingesta |
| PATCH | `/api/admin/stream` | Bearer | Cambia el título visible |
| POST | `/api/webhooks/mux` | firma HMAC | Eventos de Mux |

## Controles de seguridad

- **Rate limiting:** global (600 peticiones / 15 min), admin (60 / 15 min) y webhook (120 / min).
- **CORS:** cerrado por defecto; solo admite los orígenes exactos de `CORS_ORIGINS` y rechaza `*`.
- **CSP estricta** con Helmet: sin scripts inline, `frame-ancestors 'none'` y medios limitados a Mux.
- **URLs de banners:** se validan con `new URL()`; solo `https`, sin credenciales y con hostname exacto en la lista blanca.
- **Datos públicos:** el frontend los inserta con `textContent` y `createElement`, nunca con `innerHTML`.
- **Base de datos:** solo sentencias preparadas; los IDs se generan con `crypto.randomUUID()`.
- **Token admin y webhook:** el token admin se compara en tiempo constante y el webhook se verifica con HMAC-SHA256 (tolerancia de 5 minutos).
- **Clave del stream:** solo viaja en la respuesta admin, con `Cache-Control: no-store`. No se guarda en la base de datos ni se registra en logs.
- **Logs:** escapan los caracteres de control (`\n`, `\r`) para evitar la inyección de registros.

## Cumplimiento electoral (Ecuador)

La plataforma incluye dos ayudas:

- **Identificación del pagador:** el campo "Pagado por" es obligatorio y se muestra bajo cada banner.
- **Silencio electoral:** entre `SILENCIO_ELECTORAL_INICIO` y `SILENCIO_ELECTORAL_FIN`, la API deja de servir banners y transmisión.

Las vigencias por banner (`startsAt` / `endsAt`) permiten limitar las piezas al periodo oficial de campaña.

> Estas funciones **no sustituyen la asesoría legal**. Verifica con el CNE y con el responsable del manejo económico de la campaña:
> - las fechas oficiales de campaña y de silencio electoral del proceso;
> - los límites y el registro del gasto electoral en medios digitales y plataformas, conforme al Código de la Democracia y los reglamentos vigentes del CNE;
> - los requisitos de identificación de la propaganda.
