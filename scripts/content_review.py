#!/usr/bin/env python3
"""P3-4 内容质量加固:生成人工复核所需数据清单 → docs/p3-4-review-data.md

内容:
A. 264 个 newWords 词池不一致清单(按单元分组,含 order/词池区间/是否超出词池)
B. 26 条「超出词池」明细 + 原文语境句
C. S4 真题组(10 组)结构概览与首尾题抽样
D. 940 道句内练习抽样(每 20 题取 1,约 47 题)

用法: python scripts/content_review.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "public", "content")
OUT_DOC = os.path.join(ROOT, "docs", "p3-4-review-data.md")

LEMMA = {
    "went": "go", "gone": "go", "going": "go", "goes": "go", "was": "be", "were": "be", "been": "be",
    "being": "be", "am": "be", "is": "be", "are": "be", "had": "have", "has": "have", "having": "have",
    "did": "do", "does": "do", "done": "do", "doing": "do", "drank": "drink", "drunk": "drink",
    "ate": "eat", "eaten": "eat", "took": "take", "taken": "take", "taking": "take", "came": "come",
    "coming": "come", "felt": "feel", "feeling": "feel", "got": "get", "gotten": "get", "getting": "get",
    "gave": "give", "given": "give", "giving": "give", "kept": "keep", "keeping": "keep", "made": "make",
    "making": "make", "met": "meet", "meeting": "meet", "saw": "see", "seen": "see", "seeing": "see",
    "sent": "send", "sending": "send", "told": "tell", "telling": "tell", "brought": "bring", "bringing": "bring",
    "tried": "try", "tries": "try", "trying": "try", "planned": "plan", "planning": "plan", "built": "build",
    "building": "build", "said": "say", "says": "say", "saying": "say", "ran": "run", "running": "run",
    "spoke": "speak", "spoken": "speak", "speaking": "speak", "wrote": "write", "written": "write", "writing": "write",
    "bought": "buy", "buying": "buy", "thought": "think", "thinking": "think", "knew": "know", "known": "know",
    "knowing": "know", "found": "find", "finding": "find", "left": "leave", "leaving": "leave",
    "became": "become", "began": "begin", "begun": "begin", "broke": "break", "broken": "break",
    "chose": "choose", "chosen": "choose", "drove": "drive", "driven": "drive", "flew": "fly", "flown": "fly",
    "forgot": "forget", "forgotten": "forget", "hid": "hide", "hidden": "hide", "rode": "ride", "ridden": "ride",
    "rose": "rise", "risen": "rise", "shook": "shake", "shaken": "shake", "showed": "show", "shown": "show",
    "sang": "sing", "sung": "sing", "swam": "swim", "swum": "swim", "threw": "throw", "thrown": "throw",
    "wore": "wear", "worn": "wear", "won": "win", "winning": "win", "cannot": "can", "loaves": "loaf",
    "bigger": "big", "biggest": "big", "earlier": "early", "earliest": "early", "photos": "photo",
}


def lemmas(w):
    """与 scripts/audit_content.js 的 lemmas() 完全一致"""
    out = []

    def add(x):
        if len(x) > 1 and x != w and x not in out:
            out.append(x)

    if w in LEMMA:
        add(LEMMA[w])
    if w.endswith("ies") and len(w) > 4:
        add(w[:-3] + "y")
    if w.endswith("es"):
        add(w[:-2])
        add(w[:-1])
    if w.endswith("s") and not w.endswith("ss"):
        add(w[:-1])
    if w.endswith("ing") and len(w) > 5:
        add(w[:-3])
        add(w[:-3] + "e")
    if w.endswith("ed") and len(w) > 4:
        add(w[:-2])
        add(w[:-1])
    if w.endswith("er") and len(w) > 4:
        add(w[:-2])
    if w.endswith("est") and len(w) > 5:
        add(w[:-3])
    if w.endswith("ly") and len(w) > 4:
        add(w[:-2])
    if w.endswith("ful") and len(w) > 6:
        add(w[:-3])
    return out


def bank_base(bank, key):
    """与 audit 一致:exact 优先,否则取 lemmas 命中的最小 order"""
    if key in bank:
        return bank[key]
    cands = [bank[c] for c in lemmas(key) if c in bank]
    if not cands:
        return None
    return sorted(cands, key=lambda e: e["order"])[0]


def main():
    bank = {}
    for ch in "abcdefghijklmnopqrstuvwxyz":
        p = os.path.join(CONTENT, "wordbank", ch + ".json")
        if os.path.exists(p):
            for e in json.load(open(p, encoding="utf-8")):
                bank[e["word"].lower()] = e

    with open(os.path.join(CONTENT, "curriculum", "index.json"), encoding="utf-8") as f:
        units_index = json.load(f)
    units = [u for st in units_index["stages"] for u in st["units"]]

    lines = ["# P3-4 内容复核数据清单(脚本生成)", "",
             f"> 生成时间:2026-08-16 · 生成器:scripts/content_review.py · 人工结论见 docs/content-review-log.md", ""]

    # A + B
    lines += ["## A. newWords 词池不一致清单(按单元)", ""]
    total_mismatch = 0
    too_late_rows = []
    for u in units:
        art = json.load(open(os.path.join(CONTENT, "curriculum", u["id"], "article.json"), encoding="utf-8"))
        rows = []
        for w in art["newWords"]:
            key = w.lower()
            e = bank_base(bank, key)
            if not e:
                continue
            o = e["order"]
            lo, hi = u["wordRange"]
            if lo <= o < hi:
                continue
            total_mismatch += 1
            flag = "超出词池" if o >= hi else "早于词池"
            rows.append((w, o, lo, hi, flag))
            if flag == "超出词池":
                ctx = next((s["text"] for s in art["sentences"] if re.search(rf"\b{re.escape(w)}\b", s["text"], re.I)), "")
                too_late_rows.append((u["id"], w, o, hi, ctx))
        if rows:
            lines.append(f"### {u['id']} {u['title']}(词池 [{u['wordRange'][0]},{u['wordRange'][1]}))")
            lines.append("")
            lines.append("| newWord | order | 判定 |")
            lines.append("|---|---|---|")
            for w, o, lo, hi, flag in rows:
                lines.append(f"| {w} | {o} | {flag} |")
            lines.append("")
    lines += [f"**合计:{total_mismatch} 条(其中超出词池 {len(too_late_rows)} 条)**", ""]

    lines += ["## B. 超出词池明细与原文语境", ""]
    lines.append("| 单元 | 词 | order | 词池上界 | 语境句(截取) |")
    lines.append("|---|---|---|---|---|")
    for uid, w, o, hi, ctx in too_late_rows:
        lines.append(f"| {uid} | {w} | {o} | {hi} | {ctx[:100].replace('|', '/')} |")
    lines.append("")

    # C. S4 真题组
    lines += ["## C. S4 真题组概览(人工抽检用)", ""]
    for u in units:
        if u["stage"] != 4:
            continue
        p = os.path.join(CONTENT, "curriculum", u["id"], "exam.json")
        if not os.path.exists(p):
            lines.append(f"- {u['id']}: 无 exam.json")
            continue
        ex = json.load(open(p, encoding="utf-8"))
        qs = ex["questions"]
        lines.append(f"### {u['id']} {ex['title']}({len(qs)} 题)")
        for qi in [0, len(qs) - 1]:
            q = qs[qi]
            lines.append(f"- Q{qi + 1}: {q['q'][:90]} | 选项 {q['options']} | 答案 {q['answer']}({q['options'][q['answer']][:20]}) | point={q['point']}")
        lines.append("")

    # D. 练习抽样
    lines += ["## D. 句内练习抽样(每 20 题取 1)", ""]
    lines.append("| 单元 | 句 | 类型 | 题干(截取) | 答案(截取) | 选项数 |")
    lines.append("|---|---|---|---|---|---|")
    n = 0
    sample_n = 0
    for u in units:
        art = json.load(open(os.path.join(CONTENT, "curriculum", u["id"], "article.json"), encoding="utf-8"))
        for si, s in enumerate(art["sentences"]):
            for ei, ex in enumerate(s.get("exercises") or []):
                n += 1
                if n % 20 == 1:
                    sample_n += 1
                    lines.append(
                        f"| {u['id']} | {si} | {ex['type']} | {ex['prompt'][:50].replace('|', '/')} "
                        f"| {ex['answer'][:30].replace('|', '/')} | {len(ex.get('options') or [])} |"
                    )
    lines += [f"**练习总数 {n},抽样 {sample_n} 题**", ""]

    with open(OUT_DOC, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"已生成 {OUT_DOC}")
    print(f"A: {total_mismatch} 条(超出 {len(too_late_rows)}) | C: S4 10 组 | D: {n} 题抽样 {sample_n}")


if __name__ == "__main__":
    main()
