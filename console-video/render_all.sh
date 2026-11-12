#!/usr/bin/env bash
# Gera o vídeo do zero: voz -> quadros de cada cena -> legendas + trilha -> MP4.
#   ./render_all.sh            versão final 1080x1920 @ 30 fps -> output/console_3d.mp4
#   ./render_all.sh --preview  prévia 540x960 @ 15 fps      -> output/previa.mp4
#   SCENES="1 2" ./render_all.sh --preview   só algumas cenas
set -euo pipefail
cd "$(dirname "$0")"

W=1080; H=1920; FPS=30; OUT=output/console_3d.mp4
if [[ "${1:-}" == "--preview" ]]; then W=540; H=960; FPS=15; OUT=output/previa.mp4; fi

command -v ffmpeg >/dev/null || { echo "instale ffmpeg"; exit 1; }
[[ -d node_modules/three ]] || npm install --silent
python3 -c "import numpy, scipy" 2>/dev/null || pip install -q -r requirements.txt
if [[ -z "${ELEVENLABS_API_KEY:-}" && -z "${TTS_ENGINE:-}" ]] && ! command -v espeak-ng >/dev/null; then
  sudo apt-get install -y espeak-ng mbrola mbrola-br4 || apt-get install -y espeak-ng mbrola mbrola-br4
fi

echo "== 1/3 voz"; python3 tools/tts.py ${SCENES:-}
IDS=${SCENES:-$(python3 -c "import json;print(' '.join(str(s['id']) for s in json.load(open('build/timeline.json'))['scenes']))")}

echo "== 2/3 quadros ${W}x${H} @ ${FPS}fps"
for id in $IDS; do
  tag=$(printf "cena_%02d" "$id"); rm -rf "frames/${tag}_${W}x${H}"
  node render/render.js "$id" "$W" "$H" "$FPS"
done

echo "== 3/3 montagem"
python3 tools/build_av.py --w "$W" --h "$H" --fps "$FPS" --scenes $IDS --out "$OUT"
