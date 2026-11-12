#!/bin/sh
# Video del hero (dron de Mochima, 12 nov). Fuente: 2058x1170 (grabación de pantalla).
# Se baja a 1920x1080 (reducción = nítido, sin pixeleo; NO se sube de resolución porque inventar píxeles es lo que
# se veía borroso). Bucle sin corte (el final se funde con el principio), nitidez suave y un toque de color.
# Una sola versión horizontal: en el celular se recorta a lo alto (object-fit: cover), que al reducir se ve nítido.
# Salidas: MP4 (H.264, lo usan Safari y Chrome) y WebM (VP9, respaldo) + póster nítido.
set -e
SRC="$1"; OUT=video/out; mkdir -p "$OUT"
# recorte 16:9 desde 2058x1170, bucle sin corte y limpieza muy leve para no perder detalle
BASE="fps=30,crop=2058:1156,scale=1920:1080:flags=lanczos+accurate_rnd,format=yuv420p,split[a][b];[a]trim=1:17,setpts=PTS-STARTPTS[m];[b]trim=0:1,setpts=PTS-STARTPTS[s];[m][s]xfade=transition=fade:duration=1:offset=15[v0];[v0]hqdn3d=0.8:0.8:1.5:1.5,unsharp=5:5:0.8:3:3:0.4,eq=saturation=1.07:contrast=1.03[v]"
ffmpeg -y -v error -i "$SRC" -filter_complex "$BASE" -map "[v]" -c:v libx264 -preset slow -profile:v high -level 4.1 -pix_fmt yuv420p -crf 20 -maxrate 9M -bufsize 16M -movflags +faststart -an "$OUT/hero2-1080.mp4"
ffmpeg -y -v error -i "$SRC" -filter_complex "$BASE" -map "[v]" -c:v libvpx-vp9 -b:v 0 -crf 30 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p -an "$OUT/hero2-1080.webm"
# póster nítido (primer cuadro del bucle)
ffmpeg -y -v error -i "$OUT/hero2-1080.mp4" -frames:v 1 -c:v libwebp -quality 92 "$OUT/hero2-land.webp"
ls -la "$OUT"/hero2-1080.* "$OUT"/hero2-land.webp
