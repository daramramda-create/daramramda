#!/bin/sh
# One command: picture → sound → master.  LEMO_ANGLE=swiftshader on machines without a GPU.
set -e
LIB=${LIB:-$HOME/lemo-opuscar}
export LIB
HERE=$(cd "$(dirname "$0")" && pwd)
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the Lemo-Opuscar library folder"; exit 1; }
cd "$LIB"
node core/render/video.mjs "$HERE" --fps 24 --workers 2 --size 1080x1920 --q 'ssaa=1&sm=2048' --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/kospi-5000-crash.mp4" 24 1   # needs ffmpeg 7+ (on 6.x: two-pass loudnorm + mux by hand)
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/cues.json" "$HERE/subtitles_ko.srt"
