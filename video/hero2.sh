#!/bin/sh
# Video del hero (dron de Mochima enviado por Luis, 12 nov).
# Bucle sin corte (el último segundo se funde con el primero), menos ruido de compresión, escalado lanczos y nitidez.
# Salidas: horizontal 2560x1440 y 1920x1080, vertical 1080x1920 para celulares; H.264 (todos) y VP9 (Android/Chrome).
set -e
SRC="$1"; OUT=video/out; mkdir -p $OUT
LOOP="fps=30,format=yuv420p,split[a][b];[a]trim=1:17,setpts=PTS-STARTPTS[m];[b]trim=0:1,setpts=PTS-STARTPTS[s];[m][s]xfade=transition=fade:duration=1:offset=15,hqdn3d=1.2:1.2:2.5:2.5"
POL="unsharp=5:5:0.65:5:5:0,eq=saturation=1.06:contrast=1.02"
LAND="$LOOP,crop=2058:1158"
PORT="$LOOP,crop=658:1170:(iw-658)*0.55:0"
X264="-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart -an"
VP9="-c:v libvpx-vp9 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p -an"
ffmpeg -y -v error -i "$SRC" -filter_complex "[0:v]$LAND,scale=2560:1440:flags=lanczos,$POL" $X264 -crf 21 $OUT/hero2-1440.mp4
ffmpeg -y -v error -i "$SRC" -filter_complex "[0:v]$LAND,scale=1920:1080:flags=lanczos,$POL" $X264 -crf 21 $OUT/hero2-1080.mp4
ffmpeg -y -v error -i "$SRC" -filter_complex "[0:v]$PORT,scale=1080:1920:flags=lanczos,$POL" $X264 -crf 21 $OUT/hero2-port.mp4
ffmpeg -y -v error -i "$SRC" -filter_complex "[0:v]$LAND,scale=1920:1080:flags=lanczos,$POL" $VP9 -crf 33 $OUT/hero2-1080.webm
ffmpeg -y -v error -i "$SRC" -filter_complex "[0:v]$PORT,scale=1080:1920:flags=lanczos,$POL" $VP9 -crf 33 $OUT/hero2-port.webm
# pósters (primer cuadro del bucle) para que se vea al instante mientras carga
ffmpeg -y -v error -i $OUT/hero2-1080.mp4 -frames:v 1 -c:v libwebp -quality 82 $OUT/hero2-land.webp
ffmpeg -y -v error -i $OUT/hero2-port.mp4 -frames:v 1 -c:v libwebp -quality 82 $OUT/hero2-port.webp
ls -la $OUT/hero2-*
