#!/bin/sh
# Video del hero (18 nov), desde la grabación de pantalla original de Eduardo (1170x2058 girada = 2058x1170, HEVC, rango completo).
# La grabación capturó a 60 Hz un video de dron de 24 fps: se quitan los cuadros repetidos (mpdecimate) y se reparten
# parejos a 24 fps (sin tirones). Bucle sin corte (fundido de 1 s al final), color convertido a rango de video BT.709,
# un toque de saturación y contraste, y nitidez suave (sin el sobre-enfoque de la versión anterior).
# Tres tamaños para que ninguna pantalla decodifique más de lo que muestra (el HTML elige):
#   hero3-1080.mp4  1920x1080  pantallas horizontales grandes (más de 1400 px físicos)
#   hero3-720.mp4   1280x720   pantallas horizontales chicas o con ahorro de datos
#   hero3-port.mp4  720x1080   celulares en vertical (recorte centrado en la playa, 55 %)
set -e
SRC="$1"; OUT=video/out; mkdir -p "$OUT"
PRE="mpdecimate,setpts=N/24/TB,fps=24"
LOOP="split[a][b];[a]trim=1:17,setpts=PTS-STARTPTS[m];[b]trim=0:1,setpts=PTS-STARTPTS[s];[m][s]xfade=transition=fade:duration=1:offset=15[v0];[v0]hqdn3d=1:1:2:2,eq=saturation=1.14:contrast=1.05:gamma=0.98,vibrance=intensity=0.1"
SC="flags=lanczos+accurate_rnd+full_chroma_int:in_range=full:out_range=limited"
TAGS="-color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709"
X264="-c:v libx264 -tune film -profile:v high -pix_fmt yuv420p -r 24 -g 48 -keyint_min 48 -sc_threshold 0 $TAGS -movflags +faststart -an"
ffmpeg -y -v error -i "$SRC" -filter_complex "[0:v]$PRE,crop=2058:1156,scale=1920:1080:$SC,format=yuv420p,$LOOP,unsharp=5:5:0.6:5:5:0[v]" -map "[v]" $X264 -preset slower -level 4.1 -crf 19.5 -maxrate 8M -bufsize 16M "$OUT/hero3-1080.mp4"
ffmpeg -y -v error -i "$SRC" -filter_complex "[0:v]$PRE,crop=2058:1156,scale=1280:720:$SC,format=yuv420p,$LOOP,unsharp=5:5:0.5:5:5:0[v]" -map "[v]" $X264 -preset slow -level 4.0 -crf 19 -maxrate 4M -bufsize 8M "$OUT/hero3-720.mp4"
ffmpeg -y -v error -i "$SRC" -filter_complex "[0:v]$PRE,crop=780:1170:703:0,scale=720:1080:$SC,format=yuv420p,$LOOP,unsharp=5:5:0.5:5:5:0[v]" -map "[v]" $X264 -preset slow -level 4.0 -crf 18 -maxrate 5M -bufsize 10M "$OUT/hero3-port.mp4"
# pósters: primer cuadro de cada versión (lo que se ve mientras carga)
ffmpeg -y -v error -i "$OUT/hero3-1080.mp4" -frames:v 1 -vf "scale=in_range=limited:out_range=full" -c:v libwebp -quality 90 "$OUT/hero3-land.webp"
ffmpeg -y -v error -i "$OUT/hero3-port.mp4" -frames:v 1 -vf "scale=in_range=limited:out_range=full" -c:v libwebp -quality 90 "$OUT/hero3-port.webp"
