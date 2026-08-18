# -*- coding: utf-8 -*-
"""fill_answers_2011_2018.py —— 从官方答案解析 PDF 补齐 2011/2018 共 50 题缺失答案

数据源: 02_真题/考研英语/KaoYan-English/答案解析/{year}年考研英语真题答案及解析.pdf
仅填充 answer 为 null 的题;analysis 为空时一并填充(截断 600 字符)。
"""
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(SITE)
ANS_DIR = os.path.join(ROOT, "02_真题", "考研英语", "KaoYan-English", "答案解析")
OUT = os.path.join(SITE, "public", "content", "zhenti")


def extract_pdf_text(year):
    cands = [f for f in os.listdir(ANS_DIR) if str(year) in f and f.lower().endswith(".pdf")]
    if not cands:
        raise FileNotFoundError(f"未找到 {year} 答案解析 PDF")
    from PyPDF2 import PdfReader
    path = os.path.join(ANS_DIR, cands[0])
    print(f"读取 {cands[0]}")
    r = PdfReader(path)
    text = "\n".join((page.extract_text() or "") for page in r.pages)
    for fw, hw in zip("０１２３４５６７８９，．？：；（）［］", "0123456789,.?:;()[]"):
        text = text.replace(fw, hw)
    return text


def parse_answers(text):
    """以每个【答案】为锚,向前找最近的题号 token;返回 {题号: (letter, analysis)}

    2011 格式: "1.[A]…[B]…[C]…[D]… 【答案】[C] 【考点】… 【解析】…"
    2018 格式: "1、【答案】[C]for 【解析】…"
    """
    num_tokens = [(m.start(), int(m.group(1)))
                  for m in re.finditer(r"(?<!\d)(\d{1,2})[.、](?!\d)", text)
                  if 1 <= int(m.group(1)) <= 40]
    ans_tokens = [(m.start(), m.group(1)) for m in re.finditer(r"【答案】\s*\[?([ABCD])\]?", text)]

    result = {}
    used = set()
    for i, (apos, letter) in enumerate(ans_tokens):
        # 最近的、未使用的题号 token(题目头)
        prev = [t for t in num_tokens if t[0] < apos and t[1] not in used]
        if not prev:
            continue
        hpos, no = prev[-1]
        used.add(no)
        next_pos = ans_tokens[i + 1][0] if i + 1 < len(ans_tokens) else len(text)
        # 该题的解析 = 【解析】之后到下一题题号头之前
        block = text[apos:next_pos]
        dm = re.search(r"【解析】\s*(.*)", block, re.S)
        analysis = dm.group(1).strip()[:600] if dm else ""
        result[no] = (letter, analysis, hpos)
    return result


def extract_header_options(text, hpos, apos):
    """2011 格式:从题号头到【答案】之间解析 [A]..[D] 选项文本"""
    seg = text[hpos:apos]
    opts = {}
    for om in re.finditer(r"\[([ABCD])\]\s*([^\[\]]*)", seg):
        opts[om.group(1)] = om.group(2).strip()
    return opts


def norm(s):
    return re.sub(r"\s+", "", s or "").lower()


def apply(year, mapping, text):
    files = {
        2011: {"cloze": range(1, 21)},
        2018: {"cloze": range(1, 21), "reading-2": range(26, 28), "reading-3": range(31, 36), "reading-4": range(36, 41)},
    }[year]
    filled = skipped = 0
    for fn, nos in files.items():
        p = os.path.join(OUT, str(year), fn + ".json")
        a = json.load(open(p, encoding="utf-8"))
        for qi, no in enumerate(nos):
            q = a["questions"][qi]
            if no not in mapping:
                print(f"  !! {year}/{fn} 题{no} 在 PDF 中未解析出答案")
                skipped += 1
                continue
            letter, analysis, hpos = mapping[no]
            # 交叉校验:PDF 题干里的 [A]-[D] 选项必须与 JSON 选项一致(2011)
            if year == 2011:
                am = re.search(r"【答案】\s*\[?[ABCD]\]?", text[hpos:])
                hdr = extract_header_options(text, hpos, hpos + am.start() if am else hpos)
                if hdr and len(hdr) == 4:
                    for idx, want in enumerate(q["options"]):
                        got = hdr.get(chr(65 + idx), "")
                        if norm(want) != norm(got):
                            print(f"  !! {year}/{fn} 题{no} 选项[{chr(65+idx)}]不一致: JSON={want!r} PDF={got!r}")
            if q.get("answer") is not None and isinstance(q.get("answer"), int) and q["answer"] >= 0:
                continue  # 已有答案,不动
            if not q["options"] or not q["options"][ord(letter) - ord("A")]:
                print(f"  !! {year}/{fn} 题{no} 解析答案为 {letter} 但 JSON 该选项为空")
                skipped += 1
                continue
            q["answer"] = ord(letter) - ord("A")
            if not q.get("analysis"):
                q["analysis"] = analysis
            filled += 1
            print(f"  {year}/{fn} 题{no} -> {letter} ({q['options'][q['answer']]})")
        json.dump(a, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{year}: 填充 {filled} 题,跳过 {skipped} 题")
    return skipped == 0


def main():
    for year in (2011, 2018):
        print("=" * 60)
        text = extract_pdf_text(year)
        mapping = parse_answers(text)
        print(f"解析到 {len(mapping)} 题答案")
        ok = apply(year, mapping, text)
        if not ok:
            sys.exit(1)
    print("完成")


if __name__ == "__main__":
    main()
