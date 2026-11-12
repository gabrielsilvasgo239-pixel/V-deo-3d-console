#!/usr/bin/env python3
"""Monta o vídeo: legendas .ass + trilha/efeitos + voz + quadros -> MP4.

uso: python3 tools/build_av.py --w 1080 --h 1920 --fps 30 [--scenes 1 2 3] [--out output/console_3d.mp4]
"""
import argparse, json, math, os, re, subprocess, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
SR = 48000
CYAN_ASS = "&H00FFC42E&"   # #2EC4FF em BGR
WHITE_ASS = "&H00FFFFFF&"


# ---------------------------------------------------------------- legendas
def ass_time(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


NO_END = {"de", "do", "da", "dos", "das", "um", "uma", "a", "o", "e", "em", "no", "na", "por", "com", "como",
          "que", "se", "video", "mais", "para", "pra", "os", "as"}


def chunk_words(words, max_words=4, max_chars=24):
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        text = " ".join(x["w"] for x in cur)
        bare = re.sub(r"\W", "", w["w"]).lower()
        hard = re.search(r"[.!?…,]$", w["w"])
        soft = (len(cur) >= max_words or len(text) >= max_chars) and bare not in NO_END and not w["hl"]
        if hard or soft or len(cur) >= max_words + 2:
            chunks.append(cur); cur = []
    if cur: chunks.append(cur)
    return chunks


def make_ass(scenes, starts, path):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Leg,Inter,68,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,6,2,2,90,90,380,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for sc, st in zip(scenes, starts):
        chunks = chunk_words(sc["words"])
        for i, ch in enumerate(chunks):
            a = st + ch[0]["t"]
            b = st + (chunks[i + 1][0]["t"] if i + 1 < len(chunks) else min(ch[-1]["end"] + 0.35, sc["duration"]))
            parts = []
            for w in ch:
                parts.append(f"{{\\c{CYAN_ASS}}}{w['w']}{{\\c{WHITE_ASS}}}" if w["hl"] else w["w"])
            pop = "{\\fscx88\\fscy88\\t(0,90,\\fscx100\\fscy100)}"
            lines.append(f"Dialogue: 0,{ass_time(a)},{ass_time(b)},Leg,,0,0,0,,{pop}{' '.join(parts)}")
    Path(path).write_text(head + "\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- áudio
def read_wav(p):
    out = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
    return np.frombuffer(out, dtype=np.float32).astype(np.float64)


def write_wav(p, x):
    x = np.clip(x, -1, 1)
    st = np.stack([x, x], 1) if x.ndim == 1 else x
    with wave.open(str(p), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


def lowpass(x, fc):
    a = math.exp(-2 * math.pi * fc / SR); y = np.empty_like(x); z = 0.0
    # filtro de 1 polo vetorizado em blocos é complicado; usa lfilter simples via cumsum aproximado
    for i in range(len(x)):
        z = (1 - a) * x[i] + a * z; y[i] = z
    return y


def onepole(x, fc):
    try:
        from scipy.signal import lfilter
        a = math.exp(-2 * math.pi * fc / SR)
        return lfilter([1 - a], [1, -a], x)
    except ImportError:
        return lowpass(x, fc)


def music(n, seed=1):
    """Ambiente eletrônico suave: pads com acordes, sub e arpejo discreto (estéreo)."""
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    bpm = 96; beat = 60 / bpm; bar = beat * 4
    # Am9 - Fmaj7 - Cadd9 - G6  (frequências MIDI)
    prog = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 69], [48, 55, 60, 62, 64], [55, 59, 62, 64, 67]]
    f = lambda m: 440 * 2 ** ((m - 69) / 12)
    L = np.zeros(n); R = np.zeros(n)
    for ci in range(int(t[-1] / (bar * 2)) + 2):
        notes = prog[ci % 4]; t0 = ci * bar * 2; t1 = t0 + bar * 2
        i0 = int(t0 * SR); i1 = min(n, int((t1 + 1.5) * SR))
        if i0 >= n: break
        tt = t[i0:i1] - t0
        env = np.minimum(1, tt / 1.2) * np.clip((bar * 2 + 1.5 - tt) / 1.5, 0, 1)
        for k, m in enumerate(notes):
            for det, pan in ((-0.07, 0.8), (0.07, 0.2)):
                fr = f(m) * 2 ** (det / 12)
                w = np.sin(2 * np.pi * fr * tt) + 0.3 * np.sin(4 * np.pi * fr * tt + 0.5) + 0.12 * np.sin(6 * np.pi * fr * tt)
                L[i0:i1] += w * env * pan * 0.06; R[i0:i1] += w * env * (1 - pan) * 0.06
        # sub
        sub = np.sin(2 * np.pi * f(notes[0] - 12) * tt) * env * 0.12
        L[i0:i1] += sub; R[i0:i1] += sub
    # arpejo pluck
    step = beat / 2
    for si in range(int(t[-1] / step) + 1):
        ts = si * step; ci = int(ts / (bar * 2)) % 4
        m = prog[ci][[0, 2, 4, 3, 1, 3, 2, 4][si % 8]] + 12
        i0 = int(ts * SR); i1 = min(n, i0 + int(0.6 * SR))
        if i0 >= n: break
        tt = np.arange(i1 - i0) / SR
        w = np.sin(2 * np.pi * f(m) * tt) * np.exp(-tt * 7) * 0.05
        pan = 0.5 + 0.35 * math.sin(si * 0.7)
        L[i0:i1] += w * pan; R[i0:i1] += w * (1 - pan)
    L = onepole(L, 2400); R = onepole(R, 2400)
    # eco simples
    d = int(beat * 0.75 * SR)
    L[d:] += 0.3 * R[:-d]; R[d:] += 0.3 * L[:-d]
    fade = np.minimum(1, t / 2.0) * np.minimum(1, (t[-1] - t) / 2.5)
    return np.stack([L * fade, R * fade], 1)


def sfx(kind, rng):
    if kind == "click":     # encaixe: transiente + "tick" metálico + thump
        n = int(0.12 * SR); tt = np.arange(n) / SR
        x = rng.normal(0, 1, n) * np.exp(-tt * 900) * 0.6
        x += np.sin(2 * np.pi * 2900 * tt) * np.exp(-tt * 70) * 0.35
        x += np.sin(2 * np.pi * 140 * tt) * np.exp(-tt * 45) * 0.5
        return x * 0.8
    if kind == "whoosh":
        n = int(1.1 * SR); tt = np.arange(n) / SR
        noise = rng.normal(0, 1, n)
        env = np.sin(np.pi * np.clip(tt / 1.1, 0, 1)) ** 2
        x = onepole(noise, 900) * 3 - onepole(noise, 120) * 3
        return x * env * 0.35
    if kind == "boom":
        n = int(1.6 * SR); tt = np.arange(n) / SR
        fr = 70 * np.exp(-tt * 1.2) + 30
        ph = 2 * np.pi * np.cumsum(fr) / SR
        return np.sin(ph) * np.exp(-tt * 2.4) * 0.8
    return np.zeros(1)


def rms(x):
    return math.sqrt(float(np.mean(x ** 2)) + 1e-12)


def make_audio(scenes, starts, total, path):
    n = int(total * SR) + SR
    voice = np.zeros(n); fx = np.zeros(n)
    rng = np.random.default_rng(7)
    for sc, st in zip(scenes, starts):
        v = read_wav(ROOT / "audio" / f"{sc['tag']}.wav")
        i = int(st * SR); voice[i:i + len(v)] += v[: n - i]
        ev = BUILD / f"events_{sc['tag']}.json"
        for e in (json.loads(ev.read_text()) if ev.exists() else []):
            s = sfx(e["type"], rng); i = int((st + e["t"]) * SR)
            if i < n: fx[i:i + len(s)] += s[: n - i]
    mus = music(n)
    vr = rms(voice[np.abs(voice) > 0.01]) if np.any(np.abs(voice) > 0.01) else 0.1
    mus *= (vr * 10 ** (-22 / 20)) / max(rms(mus), 1e-6)       # trilha 22 dB abaixo da voz
    fx *= (vr * 10 ** (-10 / 20)) / max(rms(fx[np.abs(fx) > 1e-4]) if np.any(np.abs(fx) > 1e-4) else 1, 1e-6)
    mix = mus + np.stack([voice + fx, voice + fx], 1)
    peak = np.max(np.abs(mix)); mix *= min(1, 0.95 / peak)
    write_wav(path, mix[: int(total * SR)])


# ---------------------------------------------------------------- montagem
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--w", type=int, default=1080); ap.add_argument("--h", type=int, default=1920)
    ap.add_argument("--fps", type=int, default=30); ap.add_argument("--scenes", type=int, nargs="*")
    ap.add_argument("--out", default="output/console_3d.mp4")
    a = ap.parse_args()
    tl = json.loads((BUILD / "timeline.json").read_text())
    scenes = [s for s in tl["scenes"] if not a.scenes or s["id"] in a.scenes]
    # início de cada cena em quadros inteiros (evita deriva entre áudio e vídeo)
    seq = BUILD / f"seq_{a.w}x{a.h}"
    if seq.exists():
        for f in seq.iterdir(): f.unlink()
    seq.mkdir(parents=True, exist_ok=True)
    starts, k = [], 0
    for sc in scenes:
        starts.append(k / a.fps)
        fdir = ROOT / "frames" / f"{sc['tag']}_{a.w}x{a.h}"
        nf = round(sc["duration"] * a.fps)
        files = sorted(fdir.glob("*.png"))
        assert len(files) >= nf, f"{sc['tag']}: faltam quadros ({len(files)}/{nf}) em {fdir}"
        for f in files[:nf]:
            (seq / f"{k:06d}.png").symlink_to(f.resolve()); k += 1
    total = k / a.fps
    ass = BUILD / "legendas.ass"; make_ass(scenes, starts, ass)
    wav = BUILD / "mix.wav"; make_audio(scenes, starts, total, wav)
    out = ROOT / a.out; out.parent.mkdir(exist_ok=True)
    fonts = os.environ.get("FONT_DIR", "/usr/share/fonts/opentype/inter")
    subprocess.run(["ffmpeg", "-v", "error", "-stats", "-y", "-framerate", str(a.fps), "-i", str(seq / "%06d.png"),
                    "-i", str(wav), "-vf", f"ass={ass}:fontsdir={fonts}",
                    "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", str(out)], check=True)
    print(f"OK: {out}  ({total:.2f}s, {k} quadros)")


if __name__ == "__main__":
    main()
