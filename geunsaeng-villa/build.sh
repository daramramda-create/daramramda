#!/bin/sh
# 컷 4개를 렌더링하고 음악·효과음을 합쳐 cut1.mp4 ~ cut4.mp4 를 만든다.
#   sh build.sh            전체 (그림 + 소리 + 합성)
#   sh build.sh audio      그림은 그대로 두고 소리와 합성만 다시
set -e
LIB=${LIB:-/root/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB LEMO_ANGLE=${LEMO_ANGLE:-swiftshader}
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
# ffmpeg 7+ (시스템 ffmpeg가 6.x이면 프로젝트 전용 PyPI 빌드를 앞에 둔다)
[ -x "$HERE/tools/bin/ffmpeg" ] && PATH="$HERE/tools/bin:$PATH" && export PATH
SSAA=${SSAA:-1.5}
mkdir -p "$HERE/out"
cd "$LIB"
for c in 1 2 3 4; do
  node core/render/events.mjs "$HERE" --size 1080x1920 --q "cut=$c" --out "$HERE/out/events$c.json"
  if [ "$1" != audio ]; then
    node core/render/video.mjs "$HERE" --size 1080x1920 --fps 24 --workers 3 --q "cut=$c&ssaa=$SSAA" --out "$HERE/out/video$c.mp4"
  fi
done
"$LIB/.venv/bin/python" "$HERE/mix.py"
for c in 1 2 3 4; do
  sh core/render/mux.sh "$HERE/out/video$c.mp4" "$HERE/out/mix$c.wav" "$HERE/cut$c.mp4" 24 0
  "$LIB/.venv/bin/python" core/render/srt.py "$HERE/out/cues$c.json" "$HERE/cut$c.srt"
done
