#!/bin/sh
LIB=/root/lemo-opuscar; HERE=$(cd "$(dirname "$0")/.." && pwd); cd "$LIB"
r() { LEMO_ANGLE=swiftshader node core/render/still.mjs "$HERE" $2 --size 1080x1920 --q "cut=$1&ssaa=${SSAA:-1}${Q}" --prefix "c$1_" --out "$HERE/stills" 2>&1 | grep -v '^\[note\]'; }
r 1 "${T1:-1.0 4.3}"; r 2 "${T2:-2.2 4.5}"; r 3 "${T3:-2.0 6.0}"; r 4 "${T4:-2.0 7.5}"
