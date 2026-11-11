#!/bin/sh
LIB=/root/lemo-opuscar; HERE=$(cd "$(dirname "$0")/.." && pwd); cd "$LIB"
for c in 1 2 3 4; do LEMO_ANGLE=swiftshader node core/render/video.mjs "$HERE" --size 1080x1920 --fps 24 --workers 3 --q "cut=$c&ssaa=1.5" --out "$HERE/out/video$c.mp4" || exit 1; done
echo ALL_DONE
