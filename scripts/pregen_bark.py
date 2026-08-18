# -*- coding: utf-8 -*-
"""用 Bark 预生成单元情景对话 NPC 台词(P5-TTS,最后一步)。

缺 bark 包时打印安装命令并退出 0。默认只跑 S1;全量加 --all。
已存在 wav 跳过。实时 AI 对话不要走本脚本。
"""
import json
import os
import sys
import wave

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "public", "content")
AUDIO = os.path.join(CONTENT, "audio")
MANIFEST = os.path.join(AUDIO, "index.json")


def load_manifest():
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            return json.load(f)
    return {"version": 1, "source": "bark", "units": {}, "words": []}


def save_manifest(m):
    os.makedirs(AUDIO, exist_ok=True)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False, indent=2)


def valid_wav(path):
    try:
        with wave.open(path, "rb") as w:
            return w.getnframes() > 0
    except Exception:
        return False


def main():
    try:
        from bark import SAMPLE_RATE, generate_audio, preload_models
        from scipy.io.wavfile import write as write_wav
    except Exception:
        print("未安装 Bark。安装: pip install git+https://github.com/suno-ai/bark.git scipy")
        print("仓库: https://github.com/suno-ai/bark")
        print("本脚本跳过,情景对话继续用 Piper / 系统语音。")
        return 0

    only_s1 = "--s1" in sys.argv
    print("预加载 Bark 模型…")
    preload_models()
    man = load_manifest()
    man.setdefault("units", {})

    with open(os.path.join(CONTENT, "curriculum", "index.json"), encoding="utf-8") as f:
        idx = json.load(f)
    units = [u for st in idx["stages"] for u in st["units"]]
    if only_s1:
        units = [u for u in units if u["id"].startswith("s1")]

    for u in units:
        uid = u["id"]
        dlg_p = os.path.join(CONTENT, "curriculum", uid, "dialogue.json")
        if not os.path.exists(dlg_p):
            continue
        with open(dlg_p, encoding="utf-8") as f:
            dlg = json.load(f)
        udir = os.path.join(AUDIO, uid)
        os.makedirs(udir, exist_ok=True)
        n = 0
        for nid, node in (dlg.get("nodes") or {}).items():
            line = (node.get("line") or "").strip()
            if not line:
                continue
            out = os.path.join(udir, f"dlg-{nid}.wav")
            if not (os.path.exists(out) and valid_wav(out)):
                audio = generate_audio(line)
                write_wav(out, SAMPLE_RATE, audio)
            n += 1
        man["units"].setdefault(uid, {"listen": 0, "article": 0})
        man["units"][uid]["dialogue"] = n
        print("  unit", uid, "dialogue", n)
        save_manifest(man)
    print("完成", MANIFEST)
    return 0


if __name__ == "__main__":
    sys.exit(main())
