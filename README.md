# Tu Lancha Lechería: web app (PWA), versión 4

App web instalable, de diseño claro, para Tu Lancha Lechería: chárters, paseos en lancha, yates y catamaranes con capitán desde Lechería a Mochima y las islas. Reservas por WhatsApp (+58 414 308 3864).

Sitio: https://tulanchalecheria.vercel.app

## Secciones (cada una es su propia pantalla)
- **Inicio:** video cinematográfico del hero (1080p, en bucle, con póster), parallax por capas, cifras (+1.200 chárters, +1.000 clientes), prensa (Guía de Valentina Quintero, IVC, Venevisión), cómo funciona, parte del mar.
- **Flota:** catálogo con filtros por tipo, grupo, muelle y pernocta.
- **Reservar:** asistente de 4 pasos (personas, embarcación, destino y fecha, extras) con total en USD o Bs. La reserva se confirma dentro de la app: el cliente recibe su código TLL-#### y su comprobante en PDF, y lo envía a Tu Lancha por WhatsApp: en el celular, con la hoja de compartir (el PDF va como archivo con un mensaje corto); en la computadora, el PDF se descarga y se abre el chat de Tu Lancha para adjuntarlo (WhatsApp no permite adjuntar archivos desde un enlace). Después quedan “Volver al inicio” y “Ver mi viaje”. Sus reservas quedan en **Mi viaje**, y mientras haya una vigente la portada muestra un acceso discreto bajo los botones (código, embarcación, fecha, “Comprobante” y “Ver mi viaje”).
- **Escoge tu muelle:** en el paso del rumbo, además de los muelles de Eduardo, el cliente puede marcar su propio muelle con un pin en un mapa satelital (Leaflet + imágenes Esri, sin llave de Google), con búsqueda de lugares y “Mi ubicación”. La ubicación se guarda en el teléfono, va en el WhatsApp de la reserva como enlace de Google Maps, en el PDF y en el panel (Reservas › “Muelle escogido por el cliente”: mapa satelital, Abrir en Google Maps, Enviar al capitán). La recogida ahí queda “por confirmar”.
- **Playas y rutas**, **Experiencias**, **Regalos y Club** (tarjetas de regalo y referidos), **Aliados**, **Mi viaje** (ubicación en vivo con botón de emergencia y álbum del día), **Nosotros** (teléfono, WhatsApp, indicaciones en Google Maps, preguntas), **Propietarios** (formar parte del pool).
- **Panel privado de Eduardo:** `#capitan` o 6 toques al logo del pie. Ver “Panel de control” más abajo.

## Panel de control (Eduardo)
Entrada oculta: `tulanchalecheria.vercel.app/#capitan`, o 6 toques seguidos al logo del pie de página. Usuario `tulanchalecheria`; la contraseña inicial se entrega aparte y conviene cambiarla en **Ajustes** la primera vez.

Qué se controla desde ahí (los cambios quedan en borrador y los clientes los ven al tocar **Publicar cambios**):
- **Resumen:** ventas, cobrado, por cobrar, ticket promedio, comisión, ventas por mes, por embarcación, rumbos, canales e idioma de los clientes.
- **Reservas:** las que hacen los clientes en la app llegan solas (estado Nueva). Confirmar, abono 50 %, marcar pagado, WhatsApp, editar, cancelar, registrar a mano las de WhatsApp e Instagram, exportar a Excel (CSV).
- **Embarcaciones:** 4 fotos (dron, exterior, interior, camarote), datos, capacidad, tarifa, recargo de fin de semana, hora extra, playas por salida, muelle base, Rumbo 4, recogidas, accesorios (no tiene, incluido o con costo), descripción en español e inglés, orden, ocultar, duplicar y eliminar.
- **Rumbos y playas** (con foto por playa), **Muelles y recogidas**, **Pagos** (varias cuentas Zelle con una principal que es la única que ve el cliente; Binance con ID, usuario, QR y botón “Abrir en Binance”), **Aliados** (con logo y enlace) y **Ajustes** (lo incluido en todas, versiones anteriores para deshacer, comisión, usuario y contraseña, respaldos).
- Cada sección tiene un botón **?** con instrucciones en ventana emergente.

Fotos: se suben desde la galería del teléfono (JPG, PNG, WebP o HEIC que el teléfono convierta). El panel las recorta y comprime solo: embarcaciones 1600 × 1000 px (16:10, mínimo 1000 px), playas 1200 × 1200 px (mínimo 800 px), logos 512 × 512 px y QR 600 × 600 px en PNG. Avisa si la foto es pequeña o vertical.

Cómo funciona por dentro: `api/admin.js` (función de Vercel) usa la misma base Upstash Redis del seguimiento en vivo.
- La contraseña nunca se guarda en claro: se compara un PBKDF2-SHA256 (150.000 iteraciones). Si Eduardo la cambia desde el panel, la nueva queda solo en Redis (`adm:cred`) y reemplaza la del código. Tras 8 intentos fallidos desde la misma conexión se bloquea 15 minutos. La sesión es un token aleatorio que dura 12 horas.
- El catálogo publicado está en `adm:cat` (público en `GET /api/admin?a=cat`, con caché de 15 s en Vercel); la web lo aplica al abrir y guarda una copia en el teléfono. Se guardan las últimas 15 versiones (`adm:hist`).
- Las fotos se guardan en Redis (`img:<id>`) y se sirven con caché permanente. Las reservas de la app van a `adm:bk`.
- Si se pierde la contraseña: borrar la llave `adm:cred` en Upstash vuelve a la contraseña inicial.

## Seguimiento en vivo (GPS real)
En el modo a bordo, "Compartir en vivo" crea un enlace `#sigue/<id>` que se puede mandar a cualquier contacto. El teléfono a bordo publica su GPS en `api/live` (función de Vercel) y quien abre el enlace ve la lancha moverse en un mapa real (OpenStreetMap), sin recargar.
- Sin datos, las posiciones se guardan en el teléfono y se envían todas al volver la señal; el mapa de quien mira salta solo a la posición actual y dibuja el tramo.
- Cada viaje usa un id aleatorio (no el código de reserva) y una clave que solo tiene el teléfono que comparte. Los datos se borran solos a las 24 horas.
- Límite real: el navegador solo envía el GPS con la app abierta. En iPhone se pausa si se bloquea la pantalla o se cambia de app (la app pide mantener la pantalla encendida y se reanuda sola al volver).

**Activarlo (una vez, gratis):** en Vercel, abre el proyecto › Storage › Create Database › Upstash (Redis), plan Free, y conéctalo al proyecto. Vercel crea solas las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`. Después, Redeploy. Sin esas variables, la app avisa que el seguimiento aún no está activado. El plan gratis de Upstash da 500.000 comandos al mes: un viaje de 4 horas usa unos 15.000 al publicar y unos 7.000 por cada persona que lo mira (unos 20 viajes al mes con 2 personas mirando). Si se pasa, Upstash cobra unos $0,20 por cada 100.000 comandos extra.

## Comprobante de reserva
Al confirmar, la app genera en el teléfono un PDF con el resumen, el checklist, el total y el abono (jsPDF, en `src/vendor/`). En el celular se envía como archivo con la hoja de compartir (WhatsApp u otra app); en computadora se descarga para adjuntarlo. Es un comprobante de reserva, no una factura fiscal.

## Idiomas (español e inglés de EE. UU.)
- La web abre siempre en español, sin importar el idioma del teléfono. El botón de la barra superior (EN) la cambia a inglés y, ya en inglés, muestra ES para volver. La elección se recuerda en ese teléfono. También se puede abrir en inglés con `?lang=en`.
- El español es el texto original. `src/i18n-dict.js` tiene las traducciones como filas `[español, inglés, …]` (la tercera columna, de portugués, ya no se usa) y patrones para frases con datos (fechas, montos, personas). `src/i18n.js` traduce la página en vivo, los mensajes de WhatsApp al tocarlos, el comprobante PDF y los títulos.
- Nombres propios (playas, islas, muelles, embarcaciones, Zelle, Binance) y teléfonos no se traducen. La alerta SOS va siempre en español primero (911, Guardacostas, Capitanía) y debajo en inglés si el cliente usa la web en inglés.
- `tests-idiomas.js`: abre siempre en español, botón en todos los tamaños de pantalla, recorrido sin restos en español, WhatsApp, PDF y SOS bilingüe.

## Datos de ejemplo
Las embarcaciones, tarifas y muelles del catálogo son de ejemplo y así se indica en la app, hasta cargar los datos reales. El video del hero es una animación generada por código; se puede reemplazar por tomas reales de dron en `dist/media/`.

## Estructura
- `src/`: fuentes (body.html, styles.css, app.js, features.js, booking.js, shell.js, admin.js).
- `video/`: escena (`scene.html`) y render (`render.js`) del video del hero; `video/out/` tiene los archivos codificados.
- `build.py`: genera `dist/` (necesita Python + Pillow). `dist/` se publica tal cual en Vercel (ver `vercel.json`).
- `tests.js`: 80 verificaciones con Playwright en iPhone, Pixel, Galaxy, iPad, Galaxy Tab, laptop y escritorio (motor Chromium). Uso: `node tests.js` con el sitio servido en el puerto 8765.
- `tests-panel.js`: el panel de punta a punta (acceso, bloqueo, fotos, publicar, reservas, versiones, contraseña, teléfono) contra la API real con un Redis falso: `node tests-vivo-servidor.js dist api/live.js 8766 &` y luego `TLL_USER=... TLL_PASS=... node tests-panel.js`.
