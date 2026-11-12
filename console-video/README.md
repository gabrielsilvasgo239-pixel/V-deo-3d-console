# Como um console de video game é feito — vídeo 3D

Vídeo vertical 1080x1920 @ 30 fps gerado 100% por código: modelos procedurais (Three.js),
render quadro a quadro (Playwright/Chromium headless), narração por IA, legendas .ass e trilha sintetizada.

```bash
./render_all.sh --preview   # 540x960 @ 15 fps -> output/previa.mp4
./render_all.sh             # final            -> output/console_3d.mp4
SCENES="1" ./render_all.sh --preview   # só algumas cenas
```

| Pasta | Conteúdo |
|---|---|
| `ROTEIRO.md` | roteiro cena a cena (narração, visual, etiquetas) |
| `models/` | uma função por peça (`make_soc()`, `make_fan()`, `make_heatsink()`…) e `console.js` (montagem + vista explodida) |
| `scenes/` | `cena_NN.js`: coreografia de câmera, explosão, etiquetas e efeitos de cada cena |
| `render/` | motor (estúdio, luzes, reflexo, DOF, etiquetas) e capturador de quadros |
| `tools/` | `tts.py` (voz + timeline), `build_av.py` (legendas, trilha, cliques, MP4) |
| `audio/`, `frames/`, `build/`, `output/` | gerados |

Voz: ElevenLabs se `ELEVENLABS_API_KEY` existir; `TTS_ENGINE=edge` usa edge-tts (pt-BR-AntonioNeural, +5%);
padrão offline: espeak-ng + MBROLA `br4`.

Blender não estava disponível no ambiente, por isso a stack é Three.js + Playwright + ffmpeg
(as cenas ficam em `.js` em vez de `.py`).
