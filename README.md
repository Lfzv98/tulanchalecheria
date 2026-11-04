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

## Datos de ejemplo
Las embarcaciones, tarifas y muelles del catálogo son de ejemplo y así se indica en la app, hasta cargar los datos reales. El video del hero es una animación generada por código; se puede reemplazar por tomas reales de dron en `dist/media/`.

## Estructura
- `src/`: fuentes (body.html, styles.css, app.js, features.js, booking.js, shell.js, admin.js).
- `video/`: escena (`scene.html`) y render (`render.js`) del video del hero; `video/out/` tiene los archivos codificados.
- `build.py`: genera `dist/` (necesita Python + Pillow). `dist/` se publica tal cual en Vercel (ver `vercel.json`).
- `tests.js`: 80 verificaciones con Playwright en iPhone, Pixel, Galaxy, iPad, Galaxy Tab, laptop y escritorio (motor Chromium). Uso: `TLL_PASS=... node tests.js` con el sitio servido en el puerto 8765.
