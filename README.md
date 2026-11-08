# Tu Lancha Lechería: web app (PWA), versión 4

App web instalable, de diseño claro, para Tu Lancha Lechería: chárters, paseos en lancha, yates y catamaranes con capitán desde Lechería a Mochima y las islas. Reservas por WhatsApp (+58 414 308 3864).

Sitio: https://tulanchalecheria.vercel.app

## Secciones (cada una es su propia pantalla)
- **Inicio:** video cinematográfico del hero (1080p, en bucle, con póster), parallax por capas, cifras (+1.200 chárters, +1.000 clientes), prensa (Guía de Valentina Quintero, IVC, Venevisión), cómo funciona, parte del mar.
- **Flota:** catálogo con filtros por tipo, grupo, muelle y pernocta.
- **Reservar:** asistente de 4 pasos (personas, embarcación, destino y fecha, extras) con total en USD o Bs. La reserva se confirma dentro de la app: el cliente recibe su código TLL-#### y su comprobante, y con un toque se le avisa a Tu Lancha por WhatsApp. Sus reservas quedan en **Mi viaje**.
- **Playas y rutas**, **Experiencias**, **Regalos y Club** (tarjetas de regalo y referidos), **Aliados**, **Mi viaje** (ubicación en vivo con botón de emergencia y álbum del día), **Nosotros** (teléfono, WhatsApp, indicaciones en Google Maps, preguntas), **Propietarios** (formar parte del pool).
- **Panel privado de Eduardo:** `#capitan` o 5 toques al logo del pie. Ver la guía del dueño.

## Seguridad del panel (léase)
El sitio es estático: no hay servidor. La contraseña se verifica en el navegador con PBKDF2-SHA256 (600.000 iteraciones) y los datos del panel se guardan cifrados con AES-GCM solo en el dispositivo de Eduardo. Como el repositorio es público, el verificador de la contraseña es visible; por eso la contraseña es larga y aleatoria (~115 bits), lo que hace inviable adivinarla por fuerza bruta. Aun así, no es un login de servidor: para datos compartidos entre dispositivos o varios usuarios hace falta un backend (por ejemplo Supabase).

## Seguimiento en vivo (GPS real)
En el modo a bordo, "Compartir en vivo" crea un enlace `#sigue/<id>` que se puede mandar a cualquier contacto. El teléfono a bordo publica su GPS en `api/live` (función de Vercel) y quien abre el enlace ve la lancha moverse en un mapa real (OpenStreetMap), sin recargar.
- Sin datos, las posiciones se guardan en el teléfono y se envían todas al volver la señal; el mapa de quien mira salta solo a la posición actual y dibuja el tramo.
- Cada viaje usa un id aleatorio (no el código de reserva) y una clave que solo tiene el teléfono que comparte. Los datos se borran solos a las 24 horas.
- Límite real: el navegador solo envía el GPS con la app abierta. En iPhone se pausa si se bloquea la pantalla o se cambia de app (la app pide mantener la pantalla encendida y se reanuda sola al volver).

**Activarlo (una vez, gratis):** en Vercel, abre el proyecto › Storage › Create Database › Upstash (Redis), plan Free, y conéctalo al proyecto. Vercel crea solas las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`. Después, Redeploy. Sin esas variables, la app avisa que el seguimiento aún no está activado. El plan gratis de Upstash da 500.000 comandos al mes: un viaje de 4 horas usa unos 15.000 al publicar y unos 7.000 por cada persona que lo mira (unos 20 viajes al mes con 2 personas mirando). Si se pasa, Upstash cobra unos $0,20 por cada 100.000 comandos extra.

## Comprobante de reserva
Al confirmar, la app genera en el teléfono un PDF con el resumen, el checklist, el total y el abono (jsPDF, en `src/vendor/`). En el celular se envía como archivo con la hoja de compartir (WhatsApp u otra app); en computadora se descarga para adjuntarlo. Es un comprobante de reserva, no una factura fiscal.

## Datos de ejemplo
Las embarcaciones, tarifas y muelles del catálogo son de ejemplo y así se indica en la app, hasta cargar los datos reales. El video del hero es una animación generada por código; se puede reemplazar por tomas reales de dron en `dist/media/`.

## Estructura
- `src/`: fuentes (body.html, styles.css, app.js, features.js, booking.js, shell.js, admin.js).
- `video/`: escena (`scene.html`) y render (`render.js`) del video del hero; `video/out/` tiene los archivos codificados.
- `build.py`: genera `dist/` (necesita Python + Pillow). `dist/` se publica tal cual en Vercel (ver `vercel.json`).
- `tests.js`: 80 verificaciones con Playwright en iPhone, Pixel, Galaxy, iPad, Galaxy Tab, laptop y escritorio (motor Chromium). Uso: `TLL_PASS=... node tests.js` con el sitio servido en el puerto 8765.
