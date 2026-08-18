# -*- coding: utf-8 -*-
"""用 Coqui Tacotron2-DDC 全量预生成并覆盖入库(除 AI 实时对话)。

覆盖: 单元文章/听力/对话/单词 + 外刊/CET6/TED英文段/真题逐句/语法例句/写作句式。
已存在且 --no-force 时跳过;默认 --force 覆盖旧 Piper,换自然音。
"""
import json
import os
import re
import sys
import time
import wave

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "public", "content")
AUDIO = os.path.join(CONTENT, "audio")
MANIFEST = os.path.join(AUDIO, "index.json")
FORCE = "--no-force" not in sys.argv


def is_en(text: str) -> bool:
    if not text or not text.strip():
        return False
    letters = re.findall(r"[A-Za-z]", text)
    cjk = re.findall(r"[\u4e00-\u9fff]", text)
    if len(letters) < 8:
        return False
    return len(letters) > len(cjk) * 2


def valid_wav(path: str) -> bool:
    try:
        with wave.open(path, "rb") as w:
            return w.getnframes() > 100
    except Exception:
        return False


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_man():
    if os.path.exists(MANIFEST):
        try:
            return load_json(MANIFEST)
        except Exception:
            pass
    return {"version": 1, "source": "coqui tacotron2-DDC", "units": {}, "words": [], "extra": {}}


def save_man(m):
    os.makedirs(AUDIO, exist_ok=True)
    m["source"] = "coqui tacotron2-DDC"
    m["generatedAt"] = int(time.time())
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False, indent=2)


def collect_tasks():
    tasks = []
    idx = load_json(os.path.join(CONTENT, "curriculum", "index.json"))
    units = [u for st in idx["stages"] for u in st["units"]]

    for u in units:
        uid = u["id"]
        d = os.path.join(CONTENT, "curriculum", uid)
        art = load_json(os.path.join(d, "article.json"))
        for i, s in enumerate(art.get("sentences") or []):
            t = (s.get("text") or "").strip()
            if t:
                tasks.append(("unit", uid, f"article-{i}.wav", t, ("units", uid, "article")))
        lis = load_json(os.path.join(d, "listen.json"))
        for i, r in enumerate(lis.get("rounds") or []):
            t = (r.get("line") or "").strip()
            if t:
                tasks.append(("unit", uid, f"listen-{i}.wav", t, ("units", uid, "listen")))
        dlg = load_json(os.path.join(d, "dialogue.json"))
        for nid, node in (dlg.get("nodes") or {}).items():
            t = (node.get("line") or "").strip()
            if t:
                tasks.append(("unit", uid, f"dlg-{nid}.wav", t, ("units", uid, "dialogue")))
        gp = os.path.join(d, "grammar.json")
        if os.path.exists(gp):
            gr = load_json(gp)
            for i, ex in enumerate(gr.get("examples") or []):
                t = (ex.get("en") or "").strip()
                if t:
                    tasks.append(("extra", "grammar", f"{uid}-{i}.wav", t, ("extra", "grammar", f"{uid}-{i}")))

    # words from existing manifest or rebuild
    man = load_man()
    words = list(man.get("words") or [])
    if not words:
        lesson = set()
        for u in units:
            art = load_json(os.path.join(CONTENT, "curriculum", u["id"], "article.json"))
            for w in art.get("newWords") or []:
                ww = str(w).lower().strip()
                if ww.isascii() and ww.isalpha():
                    lesson.add(ww)
        bank = []
        wb = os.path.join(CONTENT, "wordbank")
        for fn in os.listdir(wb):
            if fn.endswith(".json") and fn != "meta.json":
                bank.extend(load_json(os.path.join(wb, fn)))
        bank.sort(key=lambda e: e.get("order", 99999))
        extra = []
        for e in bank:
            w = str(e.get("word", "")).lower().strip()
            if w and w not in lesson and w.isascii() and w.isalpha():
                extra.append(w)
            if len(extra) >= 800:
                break
        words = sorted(lesson) + extra
    for w in words:
        tasks.append(("words", "", f"{w}.wav", w, ("words", w, None)))

    def add_passages(folder, kind, use_sections=False):
        if not os.path.isdir(folder):
            return
        for fn in os.listdir(folder):
            if not fn.endswith(".json") or "index" in fn:
                continue
            data = load_json(os.path.join(folder, fn))
            pid = data.get("id") or fn[:-5]
            if use_sections and data.get("sections"):
                for si, sec in enumerate(data["sections"]):
                    for pi, p in enumerate(sec.get("paragraphs") or []):
                        t = (p or "").strip()
                        if is_en(t):
                            idx = si * 1000 + pi
                            tasks.append(("extra", kind, f"{pid}-{idx}.wav", t, ("extra", kind, f"{pid}-{idx}")))
            else:
                for i, p in enumerate(data.get("paragraphs") or []):
                    t = (p or "").strip()
                    if is_en(t):
                        tasks.append(("extra", kind, f"{pid}-{i}.wav", t, ("extra", kind, f"{pid}-{i}")))

    add_passages(os.path.join(CONTENT, "intensive", "reading", "magazine"), "mag")
    add_passages(os.path.join(CONTENT, "zhenti", "cet6"), "cet6")
    add_passages(os.path.join(CONTENT, "intensive", "ted"), "ted", use_sections=True)

    zdir = os.path.join(CONTENT, "zhenti")
    for y in os.listdir(zdir):
        yd = os.path.join(zdir, y)
        if not (os.path.isdir(yd) and y.isdigit()):
            continue
        for fn in os.listdir(yd):
            if not fn.endswith(".json"):
                continue
            data = load_json(os.path.join(yd, fn))
            pid = data.get("id") or fn[:-5]
            for i, s in enumerate(data.get("sentences") or []):
                t = (s.get("text") or "").strip()
                if is_en(t):
                    tasks.append(("extra", "zhenti", f"{pid}-{i}.wav", t, ("extra", "zhenti", f"{pid}-{i}")))

    wp = os.path.join(CONTENT, "writing", "s5", "patterns.json")
    if os.path.exists(wp):
        for p in load_json(wp).get("patterns") or []:
            t = (p.get("example") or "").strip()
            pid = p.get("id") or "p"
            if is_en(t):
                tasks.append(("extra", "writing", f"{pid}-.wav", t, ("extra", "writing", pid)))

    return tasks, words


def out_path(kind_group, sub, name):
    if kind_group == "unit":
        return os.path.join(AUDIO, sub, name)
    if kind_group == "words":
        return os.path.join(AUDIO, "words", name)
    return os.path.join(AUDIO, "extra", sub, name)


def main():
    try:
        from TTS.api import TTS
    except Exception as e:
        print("无法导入 Coqui TTS:", e)
        print("请先: pip install torch torchaudio coqui-tts[codec]")
        return 1

    print("收集任务…", flush=True)
    tasks, words = collect_tasks()
    print(f"共 {len(tasks)} 段 (force={FORCE})", flush=True)
    print("加载 tacotron2-DDC…", flush=True)
    tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False, gpu=False)
    print("模型就绪", flush=True)

    man = load_man()
    man.setdefault("units", {})
    man.setdefault("extra", {})
    man["words"] = list(words)

    done = skipped = failed = 0
    t0 = time.time()
    for i, (g, sub, name, text, tag) in enumerate(tasks, 1):
        path = out_path(g, sub, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if (not FORCE) and valid_wav(path):
            skipped += 1
        else:
            try:
                tts.tts_to_file(text=text[:400], file_path=path)
                if not valid_wav(path):
                    raise RuntimeError("empty wav")
                done += 1
            except Exception as e:
                failed += 1
                print(f"  fail {g}/{sub}/{name}: {e}", flush=True)
        # update counts lazily
        if g == "unit":
            uid = sub
            man["units"].setdefault(uid, {})
            if name.startswith("article-"):
                man["units"][uid]["article"] = man["units"][uid].get("article", 0)
            elif name.startswith("listen-"):
                man["units"][uid]["listen"] = man["units"][uid].get("listen", 0)
            elif name.startswith("dlg-"):
                man["units"][uid]["dialogue"] = man["units"][uid].get("dialogue", 0)
        if i % 25 == 0 or i == len(tasks):
            print(f"  {i}/{len(tasks)} 新生成 {done} 跳过 {skipped} 失败 {failed} 用时 {time.time()-t0:.0f}s", flush=True)
        if i % 50 == 0:
            # recount unit files for accurate manifest
            for uid in list(man["units"].keys()):
                ud = os.path.join(AUDIO, uid)
                if not os.path.isdir(ud):
                    continue
                fs = os.listdir(ud)
                man["units"][uid]["article"] = len([f for f in fs if f.startswith("article-") and f.endswith(".wav")])
                man["units"][uid]["listen"] = len([f for f in fs if f.startswith("listen-") and f.endswith(".wav")])
                man["units"][uid]["dialogue"] = len([f for f in fs if f.startswith("dlg-") and f.endswith(".wav")])
            save_man(man)

    for uid in os.listdir(AUDIO):
        ud = os.path.join(AUDIO, uid)
        if not os.path.isdir(ud) or uid in ("words", "extra", "_tmp"):
            continue
        fs = os.listdir(ud)
        man["units"].setdefault(uid, {})
        man["units"][uid]["article"] = len([f for f in fs if f.startswith("article-") and f.endswith(".wav")])
        man["units"][uid]["listen"] = len([f for f in fs if f.startswith("listen-") and f.endswith(".wav")])
        man["units"][uid]["dialogue"] = len([f for f in fs if f.startswith("dlg-") and f.endswith(".wav")])
    extra = {}
    extra_root = os.path.join(AUDIO, "extra")
    if os.path.isdir(extra_root):
        for kind in os.listdir(extra_root):
            kd = os.path.join(extra_root, kind)
            if os.path.isdir(kd):
                extra[kind] = len([f for f in os.listdir(kd) if f.endswith(".wav")])
    man["extra"] = extra
    save_man(man)
    print(f"完成 新生成 {done} 跳过 {skipped} 失败 {failed} 用时 {time.time()-t0:.0f}s", flush=True)
    return 0 if failed == 0 else 0


if __name__ == "__main__":
    sys.exit(main())
