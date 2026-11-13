#!/bin/sh
# Video del hero (dron de Mochima, 12-13 nov). Fuente: grabación de pantalla 2058x1170 (HEVC, 60 fps, rango completo).
# Se baja a 1920x1080 (reducción = nítido, sin pixeleo; nunca se sube de resolución).
# Color: la fuente viene en rango completo (0-255); se convierte bien a rango de video (16-235) y se etiqueta BT.709,
# así el navegador no la muestra lavada. Un toque de saturación y contraste para que el mar se vea vivo y natural.
# Fluidez: la grabación de pantalla capturó un video de 24 fps con tiempos irregulares (32/48/52 ms entre cuadros);
# pasarlo a 30 fps repetía y saltaba cuadros = tirones. Aquí se quitan los cuadros repetidos (mpdecimate) y se
# reparten parejos a 24 fps, la cadencia original del dron. Fotograma clave cada 2 s y bucle sin corte.
# Salidas: MP4 (H.264, lo usan Safari y Chrome) y WebM (VP9, respaldo) + póster nítido del primer cuadro.
set -e
SRC="$1"; OUT=video/out; mkdir -p "$OUT"
BASE="mpdecimate,setpts=N/24/TB,fps=24,crop=2058:1156,scale=1920:1080:flags=lanczos+accurate_rnd+full_chroma_int:in_range=full:out_range=limited,format=yuv420p,split[a][b];[a]trim=1:17,setpts=PTS-STARTPTS[m];[b]trim=0:1,setpts=PTS-STARTPTS[s];[m][s]xfade=transition=fade:duration=1:offset=15[v0];[v0]hqdn3d=1:1:2:2,unsharp=5:5:0.75:5:5:0,eq=saturation=1.16:contrast=1.06:gamma=0.98,vibrance=intensity=0.12[v]"
TAGS="-color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709"
ffmpeg -y -v error -i "$SRC" -filter_complex "$BASE" -map "[v]" -c:v libx264 -preset slower -tune film -profile:v high -level 4.1 -pix_fmt yuv420p -crf 20 -maxrate 7M -bufsize 14M -r 24 -g 48 -keyint_min 48 -sc_threshold 0 $TAGS -movflags +faststart -an "$OUT/hero2-1080.mp4"
ffmpeg -y -v error -i "$SRC" -filter_complex "$BASE" -map "[v]" -c:v libvpx-vp9 -b:v 0 -crf 31 -row-mt 1 -deadline good -cpu-used 2 -r 24 -g 48 -pix_fmt yuv420p $TAGS -an "$OUT/hero2-1080.webm"
# póster nítido (primer cuadro del bucle = lo que se ve mientras carga)
ffmpeg -y -v error -i "$OUT/hero2-1080.mp4" -frames:v 1 -vf "scale=in_range=limited:out_range=full" -c:v libwebp -quality 94 "$OUT/hero2-land.webp"
ls -la "$OUT"/hero2-1080.* "$OUT"/hero2-land.webp
