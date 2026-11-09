#!/bin/sh
# 스토리보드용 정지 화면: 컷별 핵심 시점
LIB=/root/lemo-opuscar; HERE=$(cd "$(dirname "$0")/.." && pwd)
cd "$LIB"
r() { LEMO_ANGLE=swiftshader node core/render/still.mjs "$HERE" $2 --size 1080x1920 --q "cut=$1&ssaa=${SSAA:-1}" --prefix "c$1_" --out "$HERE/stills" 2>&1 | grep -v '^\[note\]'; }
r 1 "0.6 1.6 3.6"
r 2 "1.6 3.4 6.5"
r 3 "1.2 2.7 4.2 6.5"
r 4 "2.4 5.0 6.8 8.6"
