# -*- coding: utf-8 -*-
"""用 Coqui TTS 预生成长文逐句 + 单词读音(P5-TTS,最后一步)。

缺 TTS 包时打印安装命令并退出 0,不阻断站点。
已存在 wav 默认跳过。生成物写入 public/content/audio/ 并合并 index.json。
实时 AI 对话不要走本脚本。
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
    return {"version": 1, "source": "coqui-tts", "units": {}, "words": []}


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
        from TTS.api import TTS
    except Exception:
        print("未安装 Coqui TTS。安装: pip install TTS")
        print("仓库: https://github.com/coqui-ai/TTS")
        print("本脚本跳过,站点继续用 Piper / 系统语音。")
        return 0

    units_filter = None
    do_words = True
    only_s1 = False
    for a in sys.argv[1:]:
        if a.startswith("--units="):
            units_filter = set(a.split("=", 1)[1].split(","))
        if a == "--no-words":
            do_words = False
        if a == "--s1":
            only_s1 = True

    print("加载 Coqui 模型 tts_models/en/ljspeech/tacotron2-DDC …")
    tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False, gpu=False)
    man = load_manifest()
    man.setdefault("units", {})
    man.setdefault("words", [])

    with open(os.path.join(CONTENT, "curriculum", "index.json"), encoding="utf-8") as f:
        idx = json.load(f)
    units = [u for st in idx["stages"] for u in st["units"]]
    if units_filter:
        units = [u for u in units if u["id"] in units_filter]
    elif only_s1:
        units = [u for u in units if u["id"].startswith("s1")]

    for u in units:
        uid = u["id"]
        udir = os.path.join(AUDIO, uid)
        os.makedirs(udir, exist_ok=True)
        meta = man["units"].setdefault(uid, {"listen": 0, "article": 0})
        art_p = os.path.join(CONTENT, "curriculum", uid, "article.json")
        if os.path.exists(art_p):
            with open(art_p, encoding="utf-8") as f:
                art = json.load(f)
            n = 0
            for i, s in enumerate(art.get("sentences") or []):
                out = os.path.join(udir, f"article-{i}.wav")
                if not (os.path.exists(out) and valid_wav(out)):
                    tts.tts_to_file(text=s.get("text") or "hello", file_path=out)
                n += 1
            meta["article"] = n
        lis_p = os.path.join(CONTENT, "curriculum", uid, "listen.json")
        if os.path.exists(lis_p):
            with open(lis_p, encoding="utf-8") as f:
                lis = json.load(f)
            n = 0
            for i, r in enumerate(lis.get("rounds") or []):
                out = os.path.join(udir, f"listen-{i}.wav")
                if not (os.path.exists(out) and valid_wav(out)):
                    tts.tts_to_file(text=r.get("line") or "hello", file_path=out)
                n += 1
            meta["listen"] = n
        print("  unit", uid, meta)
        save_manifest(man)

    if do_words:
        wdir = os.path.join(AUDIO, "words")
        os.makedirs(wdir, exist_ok=True)
        bank = []
        wb = os.path.join(CONTENT, "wordbank")
        for fn in sorted(os.listdir(wb)):
            if not fn.endswith(".json") or fn == "meta.json":
                continue
            with open(os.path.join(wb, fn), encoding="utf-8") as f:
                bank.extend(json.load(f))
        bank.sort(key=lambda e: e.get("order", 99999))
        # 课内新词优先,再补词库前 800 个高频词
        lesson = set()
        for u in units:
            ap = os.path.join(CONTENT, "curriculum", u["id"], "article.json")
            if os.path.exists(ap):
                with open(ap, encoding="utf-8") as f:
                    for w in json.load(f).get("newWords") or []:
                        lesson.add(w.lower())
        extra = [e["word"].lower() for e in bank if e["word"].lower() not in lesson][:800]
        picked = sorted(lesson) + extra
        have = set(man.get("words") or [])
        for w in picked:
            out = os.path.join(wdir, f"{w}.wav")
            if not (os.path.exists(out) and valid_wav(out)):
                tts.tts_to_file(text=w, file_path=out)
            have.add(w)
        man["words"] = sorted(have)
        print("  words", len(man["words"]))
        save_manifest(man)
    print("完成", MANIFEST)
    return 0


if __name__ == "__main__":
    sys.exit(main())
