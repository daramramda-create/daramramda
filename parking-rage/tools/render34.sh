#!/bin/sh
# 컷3·4 렌더 (컷1·2는 완료). 사용: sh tools/render34.sh
H="$(cd "$(dirname "$0")/.." && pwd)"; cd /root/lemo-opuscar
export LEMO_ANGLE=swiftshader
for c in 3 4; do
  node core/render/video.mjs "$H" --size 1080x1920 --fps 24 --workers 2 --q "cut=$c&ssaa=1.5" --out "$H/out/video$c.mp4" || { echo "FAILED cut $c"; exit 1; }
done
echo ALL_DONE
