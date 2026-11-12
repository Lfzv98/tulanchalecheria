# Tu Lancha Lechería: web app (PWA), versión 5

App web instalable, de diseño claro, para Tu Lancha Lechería: chárters, paseos en lancha, yates y catamaranes con capitán desde Lechería a Mochima y las islas. Reservas por WhatsApp (+58 414 308 3864).

Sitio: https://tulanchalecheria.vercel.app

## Navegación (versión 5, 12 nov)
- **Portada compacta, pensada para el celular:** header, hero (foto de Mochima o la que Eduardo suba desde el panel, con la franja de prensa), la lancha de la casa (galería que rota sola, “+500 viajes exitosos · 5.0”) y el **menú giratorio**; abajo el footer con el cintillo de aliados.
- **Menú giratorio (`src/nav.js`):** 18 pantallas flotantes en 3D (2 por sección: Embarcaciones, Playas, Experiencias, Regalos y Club, Servicio a bordo, Mi viaje, Nosotros, Reservar, Propietarios). Gira solo y despacio, se arrastra con el dedo con inercia, y las pestañas de abajo giran a cada sección. Con “reducir movimiento” queda quieto. Las imágenes son de relleno difuminado hasta que Eduardo suba las reales en **Portada y tienda**; entonces se ven nítidas.
- **Búsqueda del header:** busca secciones, embarcaciones, rumbos, playas, aliados, experiencias y preguntas frecuentes, sin importar acentos. Atajos Ctrl/⌘ K y “/”; con flechas y Enter. En el celular se abre a pantalla completa.
- **Menú lateral** (botón Explorar): todas las secciones con ícono, buscar y WhatsApp. En el celular sigue la barra inferior.

## Secciones (cada una es su propia pantalla)
- **Inicio:** ver “Navegación”. Pasos, mosaico, capas y banda de llamada a la acción salieron de la portada (todo sigue en sus secciones).
- **Embarcaciones:** “Lo mejor de la flota, filtrado para ti”, filtros por tipo y grupo (sin muelle base: no se muestra). Cada tarjeta muestra solo las fotos que existen (proa, popa, área social, camarote; en mini yates y yates también habitación, baño y accesorios): **un espacio sin foto no aparece**. La recomendada rota sus fotos sola y con flechas. Sin calificación: “+N viajes” y velocidad en nudos para mini yates y yates.
- **Reservar:** asistente de 4 pasos (personas, embarcación, destino y fecha, extras) con total en USD o Bs. Los niños de 7 años o menos cuentan en el filtro (cada embarcación tiene puestos + niños extra). Avisos con ícono de grupos de gran contextura y mascotas (solo perros hasta 7 kg). Precio **por rumbo** (no recargo), millas náuticas por rumbo, foto en miniatura de la embarcación, muelles sugeridos con “servicio por uso de muelle” (se paga en sitio y va aparte en el ticket), recogidas con costo según tamaño (El Morro $15/$20/$30/$50), Punta Palma deshabilitado, La Caleta “bajo calado”, Marina Américo Vespucio sin costo para las embarcaciones con base ahí, nota de que el regreso depende del capitán, caretas con cantidad, nota de la parrillera y Tienda Tu Lancha (accesorios en stock con precio). En el celular el botón de reservar aparece solo en el último paso. Pago por Zelle, Binance Pay, **PayPal (+4,5 % sobre el abono)** o efectivo. La reserva se confirma dentro de la app: el cliente recibe su código TLL-#### y su comprobante en PDF, y lo envía a Tu Lancha por WhatsApp: en el celular, con la hoja de compartir (el PDF va como archivo con un mensaje corto); en la computadora, el PDF se descarga y se abre el chat de Tu Lancha para adjuntarlo (WhatsApp no permite adjuntar archivos desde un enlace). Después quedan “Volver al inicio” y “Ver mi viaje”. Sus reservas quedan en **Mi viaje**, y mientras haya una vigente la portada muestra un acceso discreto bajo los botones (código, embarcación, fecha, “Comprobante” y “Ver mi viaje”).
- **Escoge tu muelle:** en el paso del rumbo, además de los muelles de Eduardo, el cliente puede marcar su propio muelle con un pin en un mapa satelital (Leaflet + imágenes Esri, sin llave de Google), con búsqueda de lugares y “Mi ubicación”. La ubicación se guarda en el teléfono, va en el WhatsApp de la reserva como enlace de Google Maps, en el PDF y en el panel (Reservas › “Muelle escogido por el cliente”: mapa satelital, Abrir en Google Maps, Enviar al capitán). La recogida ahí queda “por confirmar”.
- **Playas y rumbos** (6 rumbos: 4 Isla La Borracha y Puinare, 5 Isletas de Píritu, 6 Manare y Playa Blanca; las playas sin foto no muestran espacio vacío), **Experiencias**, **Regalos y Club** (tarjetas de regalo y referidos), **Servicio a bordo** (aliados VIP en cuadros con portada, logo o iniciales), **Mi viaje** (ubicación en vivo con botón de emergencia y álbum del día), **Nosotros** (teléfono, WhatsApp, indicaciones en Google Maps, preguntas), **Propietarios** (formar parte del pool y servicios para propietarios: capitán, inflables y accesorios).
- **Panel privado de Eduardo:** `#capitan` o 6 toques al logo del pie. Ver “Panel de control” más abajo.

## Panel de control (Eduardo)
Entrada oculta: `tulanchalecheria.vercel.app/#capitan`, o 6 toques seguidos al logo del pie de página. Usuario `tulanchalecheria`; la contraseña inicial se entrega aparte y conviene cambiarla en **Ajustes** la primera vez.

Qué se controla desde ahí (los cambios quedan en borrador y los clientes los ven al tocar **Publicar cambios**):
- **Resumen:** ventas, cobrado, por cobrar, ticket promedio, comisión, ventas por mes, por embarcación, rumbos, canales e idioma de los clientes.
- **Reservas:** las que hacen los clientes en la app llegan solas (estado Nueva). Confirmar, abono 50 %, marcar pagado, WhatsApp, **enviar al propietario** (WhatsApp con los datos de la salida), editar, cancelar, registrar a mano las de WhatsApp e Instagram, exportar a Excel (CSV). La fecha no se bloquea sola: Eduardo confirma.
- **Embarcaciones:** fotos por espacio (proa, popa, área social, camarote; habitación, baño y accesorios solo en mini yates, barcos y yates), datos, tamaño, puestos y niños extra, velocidad, viajes realizados, WhatsApp del propietario, promoción, tarifa base, recargo de fin de semana, hora extra, **precio por rumbo** (tarifa base, precio propio, por confirmar o no lo hace), playas por salida, muelle base, desde qué muelles puede salir, excepciones de recogida, accesorios y caretas con cantidad, **vencimientos de documentos** (licencia, radio, patrón, combustible; aviso en el Resumen 30 días antes), descripción en español e inglés.
- **Rumbos y playas** (millas, diferencia sobre la tarifa base, rumbos solo para algunas embarcaciones, agregar rumbo, foto por playa), **Muelles y recogidas** (servicio por uso de muelle, costo de recogida por tamaño, sin costo para embarcaciones con base, motivo si no está disponible), **Pagos** (Zelle con una principal, Binance con QR, PayPal con su comisión), **Servicio a bordo** (logo, portada, enlace y categorías para propietarios), **Portada y tienda** (foto principal, las 18 pantallas del menú giratorio y los artículos de la tienda) y **Ajustes** (lo incluido en todas, versiones anteriores para deshacer, comisión, usuario y contraseña, respaldos).
- Cada sección tiene un botón **?** con instrucciones en ventana emergente.

Fotos: se suben desde la galería del teléfono (JPG, PNG, WebP o HEIC que el teléfono convierta). El panel las recorta y comprime solo: embarcaciones 1600 × 1000 px (16:10, mínimo 1000 px), playas 1200 × 1200 px (mínimo 800 px), logos 512 × 512 px, QR 600 × 600 px en PNG, portada 1920 × 1080 px, pantallas del menú 900 × 1200 px y portadas de aliados 1200 × 800 px.

Catálogos publicados antes del 12 nov se pasan solos al formato nuevo (`migrateCat` en `src/app.js`, `v: 2`): fotos dron/exterior/interior → proa/popa/área social, Rumbo 4 viejo (Manare) → Rumbo 6, recargos → diferencia por rumbo, recogidas por tamaño, muelles nuevos. Se guarda en el formato nuevo la próxima vez que Eduardo publique. Avisa si la foto es pequeña o vertical.

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
- `src/`: fuentes (body.html, styles.css, app.js, features.js, booking.js, plan.js, shell.js, nav.js, admin.js, i18n.js, i18n-dict.js).
- `video/`: escena (`scene.html`) y render (`render.js`) del video del hero; `video/out/` tiene los archivos codificados.
- `build.py`: genera `dist/` (necesita Python + Pillow). `dist/` se publica tal cual en Vercel (ver `vercel.json`).
- `tests.js`, `tests-pantallas.js`, `tests-idiomas.js`, `tests-pdf.js`, `tests-sos.js`, `tests-videos.js`: verificaciones con Playwright en iPhone, Pixel, Galaxy, iPad, Galaxy Tab, laptop y escritorio (motor Chromium). Uso: `node tests.js` con el sitio servido en el puerto 8765.
- `tests-panel.js`: el panel de punta a punta (acceso, bloqueo, fotos, publicar, reservas, versiones, contraseña, teléfono) contra la API real con un Redis falso: `node tests-vivo-servidor.js dist api/live.js 8766 &` y luego `TLL_USER=... TLL_PASS=... node tests-panel.js`.
