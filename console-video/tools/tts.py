#!/usr/bin/env python3
"""Gera a narração de cada cena e o build/timeline.json.

Motores (em ordem de preferência, ou force com TTS_ENGINE=elevenlabs|edge|offline):
  - ElevenLabs   se ELEVENLABS_API_KEY estiver definida
  - edge-tts     pt-BR-AntonioNeural, rate +5% (precisa de speech.platform.bing.com)
  - offline      espeak-ng + MBROLA (voz br4)

Cada cena é sintetizada frase por frase para obter tempos de frase exatos;
o tempo de cada palavra dentro da frase é estimado proporcionalmente ao nº de letras.
Duração da cena = duração do áudio + 0,6 s.
"""
import json, os, re, subprocess, sys, tempfile, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "audio"
BUILD = ROOT / "build"
TAIL = 0.6
SR = 48000

# Ajustes de pronúncia (só para a voz; a legenda usa o texto original)
PRON = {
    r"\bvideo game\b": "videoguêime",
    r"\bvideogame\b": "videoguêime",
    r"\+?1\.000\b": "mil",
    r"\bSoC\b": "esse ó cê",
    r"\bGPU\b": "gê pê u",
    r"\bCPU\b": "cê pê u",
    r"\bSSD\b": "ésse ésse dê",
    r"\bRAM\b": "rã",
}


def parse_roteiro(path):
    text = Path(path).read_text(encoding="utf-8")
    scenes = []
    for block in re.split(r"^## ", text, flags=re.M)[1:]:
        head, _, body = block.partition("\n")
        m = re.match(r"Cena\s+(\d+)\s*[—-]\s*(.*)", head.strip())
        if not m:
            continue
        def field(name):
            f = re.search(rf"\*\*{name}:\*\*\s*(.+)", body)
            return f.group(1).strip() if f else ""
        scenes.append({
            "id": int(m.group(1)),
            "title": m.group(2).strip(),
            "narration_md": field("Narração"),
            "visual": field("Visual"),
            "labels": [s.strip() for s in field("Etiqueta").split("|") if s.strip()],
        })
    return scenes


def split_sentences(md):
    parts = re.findall(r"[^.!?…]+(?:[.!?…]+|$)", md)
    return [p.strip() for p in parts if p.strip()]


def plain(md):
    return md.replace("**", "")


def for_voice(s):
    s = plain(s)
    for pat, rep in PRON.items():
        s = re.sub(pat, rep, s, flags=re.I)
    return s.replace("…", "...")


def ffdur(p):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "csv=p=0", str(p)])
    return float(out)


def synth_offline(text, out_wav):
    voice = os.environ.get("OFFLINE_VOICE", "mb-br4")
    speed = os.environ.get("OFFLINE_SPEED", "160")  # ~ +5%
    raw = out_wav.with_suffix(".raw.wav")
    subprocess.run(["espeak-ng", "-v", voice, "-s", speed, "-p", "45", "-w", str(raw), text],
                   check=True, stderr=subprocess.DEVNULL)
    # limpa silêncio inicial/final e normaliza formato
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af",
                    "silenceremove=start_periods=1:start_threshold=-45dB,"
                    "areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                    "highpass=f=70,acompressor=threshold=-18dB:ratio=3:attack=5:release=80,"
                    "loudnorm=I=-16:TP=-1.5",
                    "-ar", str(SR), "-ac", "1", str(out_wav)], check=True)
    raw.unlink()


def synth_edge(text, out_wav):
    mp3 = out_wav.with_suffix(".edge.mp3")
    subprocess.run(["edge-tts", "--voice", os.environ.get("EDGE_VOICE", "pt-BR-AntonioNeural"),
                    "--rate=+5%", "--text", text, "--write-media", str(mp3)], check=True)
    to_wav(mp3, out_wav)


def synth_eleven(text, out_wav):
    voice = os.environ.get("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        data=json.dumps({"text": text, "model_id": "eleven_multilingual_v2"}).encode(),
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json",
                 "Accept": "audio/mpeg"})
    mp3 = out_wav.with_suffix(".11l.mp3")
    mp3.write_bytes(urllib.request.urlopen(req).read())
    to_wav(mp3, out_wav)


def to_wav(src, out_wav):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", "loudnorm=I=-16:TP=-1.5",
                    "-ar", str(SR), "-ac", "1", str(out_wav)], check=True)
    src.unlink()


def pick_engine():
    e = os.environ.get("TTS_ENGINE")
    if e:
        return e
    if os.environ.get("ELEVENLABS_API_KEY"):
        return "elevenlabs"
    return "offline"


ENGINES = {"offline": synth_offline, "edge": synth_edge, "elevenlabs": synth_eleven}


def main():
    only = {int(a) for a in sys.argv[1:]}
    engine = pick_engine()
    synth = ENGINES[engine]
    AUDIO.mkdir(exist_ok=True); BUILD.mkdir(exist_ok=True)
    scenes = parse_roteiro(ROOT / "ROTEIRO.md")
    timeline = {"engine": engine, "tail": TAIL, "scenes": []}
    start = 0.0
    for sc in scenes:
        if only and sc["id"] not in only:
            continue
        tag = f"cena_{sc['id']:02d}"
        tmp = Path(tempfile.mkdtemp())
        sentences = split_sentences(sc["narration_md"])
        pieces, words, t = [], [], 0.0
        gap = 0.25  # pausa entre frases
        for i, s in enumerate(sentences):
            w = tmp / f"s{i}.wav"
            synth(for_voice(s), w)
            d = ffdur(w)
            # palavras com tempo proporcional ao tamanho
            toks = re.findall(r"\*\*.+?\*\*|\S+", s)
            flat = []
            for tok in toks:
                if tok.startswith("**"):
                    inner = tok[2:-2].split()
                    for j, x in enumerate(inner):
                        flat.append((x, True))
                elif re.fullmatch(r"[^\w]+", tok) and flat:
                    flat[-1] = (flat[-1][0] + tok, flat[-1][1])
                else:
                    flat.append((tok, False))
            weights = [max(2, len(re.sub(r"\W", "", x))) + 1 for x, _ in flat]
            tot = sum(weights); acc = 0
            for (x, hl), wgt in zip(flat, weights):
                words.append({"w": x, "hl": hl, "t": round(t + d * acc / tot, 3),
                              "end": round(t + d * (acc + wgt) / tot, 3)})
                acc += wgt
            pieces.append(w)
            t += d
            if i < len(sentences) - 1:
                g = 0.6 if s.endswith("…") else gap
                sil = tmp / f"g{i}.wav"
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i",
                                f"anullsrc=r={SR}:cl=mono", "-t", str(g), str(sil)], check=True)
                pieces.append(sil); t += g
        lst = tmp / "list.txt"
        lst.write_text("".join(f"file '{p}'\n" for p in pieces))
        wav = AUDIO / f"{tag}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
                        "-c", "copy", str(wav)], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-b:a", "192k",
                        str(AUDIO / f"{tag}.mp3")], check=True)
        adur = ffdur(AUDIO / f"{tag}.mp3")
        dur = round(adur + TAIL, 3)
        timeline["scenes"].append({**sc, "tag": tag, "audio": f"audio/{tag}.mp3",
                                   "audio_dur": round(adur, 3), "duration": dur,
                                   "start": round(start, 3), "words": words})
        print(f"{tag}: áudio {adur:.2f}s -> cena {dur:.2f}s  [{engine}]")
        start += dur
    timeline["total"] = round(start, 3)
    (BUILD / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1))
    print(f"TOTAL: {start:.2f}s ({int(start // 60)}min{start % 60:04.1f}s)")


if __name__ == "__main__":
    main()
