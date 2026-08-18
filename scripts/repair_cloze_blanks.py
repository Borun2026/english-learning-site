# -*- coding: utf-8 -*-
"""repair_cloze_blanks.py —— 修复 2006-2018 完形 JSON 中被错误转换的空位

根因: 早期某版提取脚本的 convert_spaced_blanks 兜底逻辑把正文中的普通数字
(如 "nearly 19 million"、"By 1830"、"12-15 points") 当成了空位,污染了
public/content/zhenti/{year}/cloze.json 的 sentences。
zhenti_raw/{year}/cloze.txt 是干净的正确文本(空位 1..20 顺序正确),
且真题 JSON 尚无人工标注,因此直接按 zhenti_to_json.py 的切句逻辑从 raw 重建
sentences(不动 questions/answers)。
"""
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(SITE, "zhenti_raw")
OUT = os.path.join(SITE, "public", "content", "zhenti")

DIRECTIONS = ("read the following text", "choose the best word", "directions:")


def is_directions(s):
    t = s.strip().lower()
    if t == "directions:" or re.fullmatch(r"\(?\s*10\s*points\s*\)?", t):
        return True
    return any(k in t for k in DIRECTIONS)


def sentences_from_passage(passage):
    out = []
    for para in passage.split("\n"):
        para = para.strip()
        if not para:
            continue
        for p in re.split(r"(?<=[.!?])(?:\s+|(?=[A-Z]))", para):
            p = p.strip()
            if p and not is_directions(p):
                out.append({"text": p, "translation": "", "chunks": [], "grammar": []})
    return out


def rebuild(year):
    raw_p = os.path.join(RAW, str(year), "cloze.txt")
    json_p = os.path.join(OUT, str(year), "cloze.json")
    if not os.path.exists(raw_p) or not os.path.exists(json_p):
        print(year, "缺少文件,跳过")
        return False
    passage = open(raw_p, encoding="utf-8").read().split("== QUESTIONS ==")[0].strip()
    sentences = sentences_from_passage(passage)
    full = " ".join(s["text"] for s in sentences)
    nums = [int(b) for b in re.findall(r"___(\d+)___", full)]
    if nums != list(range(1, 21)):
        print(year, f"重建后空位异常: {nums}")
        return False
    # 空位标记与前后词之间补空格,便于前端渲染
    for s in sentences:
        s["text"] = re.sub(r"(?<=[^\s])(___\d+___)", r" \1", s["text"])
        s["text"] = re.sub(r"(___\d+___)(?=[^\s])", r"\1 ", s["text"]).strip()
    a = json.load(open(json_p, encoding="utf-8"))
    a["sentences"] = sentences
    with open(json_p, "w", encoding="utf-8") as f:
        json.dump(a, f, ensure_ascii=False, indent=1)
    print(year, f"重建 {len(sentences)} 句,空位顺序 OK")
    return True


def main():
    years = [2006, 2007, 2008, 2010, 2011, 2012, 2015, 2016, 2018]
    ok = True
    for y in years:
        ok = rebuild(y) and ok
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
