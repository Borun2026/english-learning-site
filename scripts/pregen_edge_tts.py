# -*- coding: utf-8 -*-
"""分模块生成脚本入口，支持按模块范围与并行度生成 MP3。
模块范围包含:
- curriculum: 48单元课文(article)、听力(listen)、情景对话(dialogue)
- words: 核心词汇库
- extra_grammar_writing: 语法例句与写作句式
- extra_zhenti: 历年考研真题
- extra_reading: 拓展精读 (CET6, 经济学人/外刊, TED 演讲精读)
"""
import argparse
import asyncio
import json
import os
import re
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

from edge_tts_engine import (
    VOICE_FEMALE_PRIMARY,
    VOICE_MALE_PRIMARY,
    VOICE_FEMALE_LIVELY,
    VOICE_MALE_CLEAR,
    VOICE_EXAM_CLEAR,
    batch_generate_tasks,
)

CONTENT = os.path.join(ROOT, "public", "content")
AUDIO = os.path.join(CONTENT, "audio")


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def is_en(text: str) -> bool:
    if not text or not text.strip():
        return False
    letters = re.findall(r"[A-Za-z]", text)
    cjk = re.findall(r"[\u4e00-\u9fff]", text)
    if len(letters) < 4:
        return False
    return len(letters) > len(cjk) * 1.5


def collect_curriculum_tasks():
    tasks = []
    idx_path = os.path.join(CONTENT, "curriculum", "index.json")
    if not os.path.exists(idx_path):
        return tasks
    idx = load_json(idx_path)
    units = [u for st in idx.get("stages", []) for u in st.get("units", [])]

    for u in units:
        uid = u["id"]
        d = os.path.join(CONTENT, "curriculum", uid)

        # 课文逐句 (主线 Ava 自然流利女声)
        art_path = os.path.join(d, "article.json")
        if os.path.exists(art_path):
            art = load_json(art_path)
            for i, s in enumerate(art.get("sentences") or []):
                t = (s.get("text") or "").strip()
                if t:
                    out = os.path.join(AUDIO, uid, f"article-{i}.mp3")
                    tasks.append(("curriculum", uid, f"article-{i}.mp3", t, VOICE_FEMALE_PRIMARY, out))

        # 听力台词 (中性清晰 Ava 考试发音)
        lis_path = os.path.join(d, "listen.json")
        if os.path.exists(lis_path):
            lis = load_json(lis_path)
            for i, r in enumerate(lis.get("rounds") or []):
                t = (r.get("line") or "").strip()
                if t:
                    out = os.path.join(AUDIO, uid, f"listen-{i}.mp3")
                    tasks.append(("curriculum", uid, f"listen-{i}.mp3", t, VOICE_EXAM_CLEAR, out))

        # 情景对话 (根据角色性别/身份多声线对手戏)
        dlg_path = os.path.join(d, "dialogue.json")
        if os.path.exists(dlg_path):
            dlg = load_json(dlg_path)
            for nid, node in (dlg.get("nodes") or {}).items():
                t = (node.get("line") or "").strip()
                speaker = (node.get("speaker") or "").lower()
                # 角色分配: 男声 vs 女声
                if any(k in speaker for k in ["jack", "mike", "tom", "john", "mr.", "father", "waiter", "interviewer", "boss", "david"]):
                    voice = VOICE_MALE_PRIMARY
                elif any(k in speaker for k in ["sarah", "amy", "lucy", "lily", "ms.", "mrs.", "mother", "waitress", "emma"]):
                    voice = VOICE_FEMALE_LIVELY
                else:
                    # 按照节点 ID 单双轮流对换，营造真实多角色对话交互
                    voice = VOICE_MALE_PRIMARY if (hash(nid) % 2 == 0) else VOICE_FEMALE_PRIMARY

                if t:
                    out = os.path.join(AUDIO, uid, f"dlg-{nid}.mp3")
                    tasks.append(("curriculum", uid, f"dlg-{nid}.mp3", t, voice, out))

    return tasks


def collect_word_tasks():
    tasks = []
    idx_path = os.path.join(CONTENT, "curriculum", "index.json")
    units = []
    if os.path.exists(idx_path):
        idx = load_json(idx_path)
        units = [u for st in idx.get("stages", []) for u in st.get("units", [])]

    words_set = set()
    for u in units:
        art_path = os.path.join(CONTENT, "curriculum", u["id"], "article.json")
        if os.path.exists(art_path):
            art = load_json(art_path)
            for w in art.get("newWords") or []:
                ww = str(w).lower().strip()
                if ww.isascii() and ww.isalpha():
                    words_set.add(ww)

    wb = os.path.join(CONTENT, "wordbank")
    bank = []
    if os.path.isdir(wb):
        for fn in os.listdir(wb):
            if fn.endswith(".json") and fn != "meta.json":
                try:
                    bank.extend(load_json(os.path.join(wb, fn)))
                except Exception:
                    pass
    bank.sort(key=lambda e: e.get("order", 99999))
    for e in bank:
        w = str(e.get("word", "")).lower().strip()
        if w and w not in words_set and w.isascii() and w.isalpha():
            words_set.add(w)
        if len(words_set) >= 1600:
            break

    for w in sorted(words_set):
        out = os.path.join(AUDIO, "words", f"{w}.mp3")
        tasks.append(("words", "words", f"{w}.mp3", w, VOICE_FEMALE_PRIMARY, out))

    return tasks


def collect_grammar_writing_tasks():
    tasks = []
    # 语法例句
    idx_path = os.path.join(CONTENT, "curriculum", "index.json")
    if os.path.exists(idx_path):
        idx = load_json(idx_path)
        units = [u for st in idx.get("stages", []) for u in st.get("units", [])]
        for u in units:
            uid = u["id"]
            gp = os.path.join(CONTENT, "curriculum", uid, "grammar.json")
            if os.path.exists(gp):
                gr = load_json(gp)
                for i, ex in enumerate(gr.get("examples") or []):
                    t = (ex.get("en") or "").strip()
                    if t:
                        out = os.path.join(AUDIO, "extra", "grammar", f"{uid}-{i}.mp3")
                        tasks.append(("extra", "grammar", f"{uid}-{i}.mp3", t, VOICE_FEMALE_PRIMARY, out))

    # 写作句式
    wp = os.path.join(CONTENT, "writing", "s5", "patterns.json")
    if os.path.exists(wp):
        for p in load_json(wp).get("patterns") or []:
            t = (p.get("example") or "").strip()
            pid = p.get("id") or "p"
            if is_en(t):
                out = os.path.join(AUDIO, "extra", "writing", f"{pid}-.mp3")
                tasks.append(("extra", "writing", f"{pid}-.mp3", t, VOICE_FEMALE_PRIMARY, out))

    return tasks


def collect_zhenti_tasks():
    tasks = []
    zdir = os.path.join(CONTENT, "zhenti")
    if not os.path.isdir(zdir):
        return tasks

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
                    out = os.path.join(AUDIO, "extra", "zhenti", f"{pid}-{i}.mp3")
                    tasks.append(("extra", "zhenti", f"{pid}-{i}.mp3", t, VOICE_EXAM_CLEAR, out))

    return tasks


def collect_reading_tasks():
    tasks = []

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
                            out = os.path.join(AUDIO, "extra", kind, f"{pid}-{idx}.mp3")
                            tasks.append(("extra", kind, f"{pid}-{idx}.mp3", t, VOICE_FEMALE_PRIMARY, out))
            else:
                for i, p in enumerate(data.get("paragraphs") or []):
                    t = (p or "").strip()
                    if is_en(t):
                        out = os.path.join(AUDIO, "extra", kind, f"{pid}-{i}.mp3")
                        tasks.append(("extra", kind, f"{pid}-{i}.mp3", t, VOICE_FEMALE_PRIMARY, out))

    add_passages(os.path.join(CONTENT, "intensive", "reading", "magazine"), "mag")
    add_passages(os.path.join(CONTENT, "zhenti", "cet6"), "cet6")
    add_passages(os.path.join(CONTENT, "intensive", "ted"), "ted", use_sections=True)

    return tasks


async def main():
    parser = argparse.ArgumentParser(description="生成神经大模型高质量 MP3 语音库")
    parser.add_argument(
        "--module",
        choices=["all", "curriculum", "words", "grammar_writing", "zhenti", "reading"],
        default="all",
        help="指定生成的子模块",
    )
    parser.add_argument("--concurrency", type=int, default=12, help="异步并发协程数")
    args = parser.parse_args()

    tasks = []
    if args.module in ["all", "curriculum"]:
        tasks.extend(collect_curriculum_tasks())
    if args.module in ["all", "words"]:
        tasks.extend(collect_word_tasks())
    if args.module in ["all", "grammar_writing"]:
        tasks.extend(collect_grammar_writing_tasks())
    if args.module in ["all", "zhenti"]:
        tasks.extend(collect_zhenti_tasks())
    if args.module in ["all", "reading"]:
        tasks.extend(collect_reading_tasks())

    print(f"=== 模块 [{args.module}] 任务收集完成: 共 {len(tasks)} 条音频 ===", flush=True)
    t0 = time.time()
    succ, skip, fail = await batch_generate_tasks(tasks, concurrency=args.concurrency)
    print(f"=== 模块 [{args.module}] 执行完成: 成功 {succ}, 跳过 {skip}, 失败 {fail}, 耗时 {time.time()-t0:.1f}s ===", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
