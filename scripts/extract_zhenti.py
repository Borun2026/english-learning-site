# -*- coding: utf-8 -*-
"""extract_zhenti.py —— 提取 2005-2020 考研英语一真题(Word COM + PyPDF2) + 答案解析

输出 zhenti_raw/{year}/
  cloze.txt        完形:含 ___1___..___20___ 的文章 + == QUESTIONS == 后 20 题
  reading-1..4.txt 阅读:文章 + == QUESTIONS == 后对应 5 题
  answers_raw.txt  答案解析原文(如可提取)
  raw_full.txt     2020 等 PDF 原始文本
"""
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARENT = os.path.dirname(SITE_ROOT)
RAW_DIR = os.path.join(SITE_ROOT, "zhenti_raw")
DOC_DIR = os.path.join(PARENT, "02_真题", "考研英语", "KaoYan-English", "真题集（纯真题可直接打印）英语一")
ANSWER_DIR = os.path.join(PARENT, "02_真题", "考研英语", "KaoYan-English", "答案解析")
KAOYANZ_PDF_DIR = os.path.join(PARENT, "02_真题", "考研英语", "kaoyanzhenti", "公共课", "英语真题", "英语一")


def word_extract(path):
    import win32com.client as win32
    word = win32.Dispatch("Word.Application")
    word.Visible = False
    try:
        doc = word.Documents.Open(path, ReadOnly=True)
        text = doc.Content.Text
        doc.Close(False)
        return text
    finally:
        word.Quit()


def clean_text(t):
    # 全角 -> 半角
    t = t.replace("\u3000", " ")
    for fw, hw in zip("０１２３４５６７８９，．？！：；＂＇（）［］", "0123456789, .?!:;\"'()[]"):
        t = t.replace(fw, hw)
    t = t.replace("\r", "\n").replace("\xa0", " ")
    t = t.replace("\x0b", "\n").replace("\x0c", "\n")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{2,}", "\n\n", t)

    def fix(m):
        prev = t[max(0, m.start() - 1): m.start()]
        nxt = t[m.end(): m.end() + 1]
        if prev and prev[-1].isdigit():
            return "."
        if prev and nxt and prev[-1].isalnum() and nxt[0].isalnum():
            return "'"
        return '"'

    t = re.sub("\ufffd\\?", fix, t)
    t = t.replace("\ufffd", "'")
    return t


YEAR_RE = re.compile(r"(19\d{2}|20\d{2})\s*年?全国硕士研究生")


def split_years(text):
    matches = list(YEAR_RE.finditer(text))
    parts = {}
    for i, m in enumerate(matches):
        year = int(m.group(1))
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        parts[year] = text[m.start(): end]
    return parts


def convert_spaced_blanks(passage):
    """把完形正文中的空位(多种形态)统一为 ___N___。
    1) 下划线变体: _1_ / __1__ / ___1___ -> ___1___
    2) 孤数字: ' 1 ' / '1,' / '2animals' 等 1-20 递增序列 -> ___N___
    兜底规则必须保守:只有首次出现的数字序列恰好按 1..20 递增时才转换,
    否则正文里的普通数字(如 "nearly 19 million"、"By 1830")会被误吞。"""
    if re.search(r"_+\d{1,2}_+", passage):
        passage = re.sub(r"_+(\d{1,2})_+", r"___\1___", passage)
        return passage
    nums = []
    for m in re.finditer(r"\d{1,2}", passage):
        n = int(m.group(0))
        if 1 <= n <= 20:
            nums.append((m.start(), m.end(), n))
    if len(nums) < 20:
        return passage
    seq = []
    seen = set()
    for s, e, n in nums:
        if n not in seen:
            seq.append((s, e, n))
            seen.add(n)
        if len(seen) == 20:
            break
    if [n for _, _, n in seq] != list(range(1, 21)):
        print("  [WARN] 完形正文无下划线空位,且裸数字不构成 1..20 递增序列,拒绝自动转换(需人工处理)")
        return passage
    out = []
    prev = 0
    for s, e, n in sorted(seq):
        out.append(passage[prev:s])
        out.append(f"___{n}___")
        prev = e
    out.append(passage[prev:])
    return "".join(out)


def parse_questions(qtext):
    """按题号分组: '21.' 起新题,到下一个 'NN.' 为止的文本归该题。
    从组内提取题干(题号行剩余部分)与 [A]-[D] 选项。
    返回 [{no, q, options[4]}] 按 no 排序"""
    lines = qtext.split("\n")
    groups = {}  # no -> [lines]
    order = []
    cur_no = None
    for line in lines:
        s = line.strip()
        if not s:
            continue
        m = re.match(r"^(\d{1,2})\.?\s*(.*)$", s)
        if m:
            no = int(m.group(1))
            if 1 <= no <= 40:
                cur_no = no
                groups.setdefault(no, [])
                order.append(no)
                rest = m.group(2).strip()
                if rest:
                    groups[no].append(rest)
                continue
        if cur_no is not None:
            groups[cur_no].append(s)

    qs = []
    for no in dict.fromkeys(order):
        body = groups[no]
        opts = ["", "", "", ""]
        q_parts = []
        for line in body:
            om = re.match(r"^\[([ABCD])J?\]?\s*(.*)$", line)
            if om:
                if re.search(r"\[[BCD]J?\]", line):
                    for om2 in re.finditer(r"\[([ABCD])J?\]?\s*([^\[\]]*)", line):
                        val2 = om2.group(2).strip()
                        if val2:
                            opts[ord(om2.group(1)) - ord("A")] = val2
                else:
                    val = om.group(2).strip()
                    if val:
                        opts[ord(om.group(1)) - ord("A")] = val
            else:
                # 题干行可能内联 [BJ [CJ [DJ:拆出题干与选项
                if "[" in line and re.search(r"\[[A-D]J?\]", line):
                    qtext = line.split("[")[0].strip()
                    if qtext:
                        q_parts.append(qtext)
                    for om2 in re.finditer(r"\[([ABCD])J?\]?\s*([^\[\]]*)", line):
                        val2 = om2.group(2).strip()
                        if val2:
                            opts[ord(om2.group(1)) - ord("A")] = val2
                elif line and not line.startswith(("[A]", "[B]", "[C]", "[D]")):
                    q_parts.append(line)
        qs.append({"no": no, "q": " ".join(q_parts), "options": opts})
    return [q for q in qs if any(o.strip() for o in q["options"])]


def extract_year(year, text):
    os.makedirs(os.path.join(RAW_DIR, str(year)), exist_ok=True)

    m1 = re.search(r"Use\s*of\s*English", text)
    m2 = re.search(r"Reading\s*Comprehension", text)
    m3 = re.search(r"Part\s*B", text)

    cloze_block = text[m1.end(): m2.start()] if m1 and m2 else ""
    cloze_qm = re.search(r"^\s*\d{1,2}\.?\s*(\[[ABCD]\]|[A-Z])", cloze_block, re.M)
    cloze_qs = []
    if cloze_qm:
        cloze_passage = cloze_block[: cloze_qm.start()]
        cloze_qs = parse_questions(cloze_block[cloze_qm.start():])
    else:
        cloze_passage = cloze_block
    cloze_passage = re.sub(r"Directions:.*?\(10 points\)", "", cloze_passage, flags=re.S).strip()
    cloze_passage = convert_spaced_blanks(cloze_passage)
    with open(os.path.join(RAW_DIR, str(year), "cloze.txt"), "w", encoding="utf-8") as f:
        f.write(cloze_passage + "\n\n== QUESTIONS ==\n")
        for q in cloze_qs:
            f.write(f"{q['no']}. {q['q']}\n" + "\n".join(f"[{chr(65+i)}] {q['options'][i]}" for i in range(4)) + "\n")

    read_block = text[m2.end(): m3.start()] if m2 and m3 else (text[m2.end():] if m2 else "")
    texts = {}
    for n in range(1, 5):
        start = re.search(rf"Text\s*{n}\b", read_block)
        if not start:
            continue
        end_m = re.search(rf"Text\s*{n+1}\b", read_block[start.end():])
        end = start.end() + end_m.start() if end_m else len(read_block)
        texts[n] = read_block[start.end(): end].strip()

    q_block = ""
    qm = re.search(r"\n\s*21\.?\s*[A-Z\[]", read_block)
    if qm:
        q_block = read_block[qm.start():].strip()
    all_qs = parse_questions(q_block)

    for n in range(1, 5):
        no_start = 21 + (n - 1) * 5
        qs = [q for q in all_qs if no_start <= q["no"] < no_start + 5]
        with open(os.path.join(RAW_DIR, str(year), f"reading-{n}.txt"), "w", encoding="utf-8") as f:
            f.write(texts.get(n, "(未提取到正文)") + "\n\n== QUESTIONS ==\n")
            for q in qs:
                f.write(f"{q['no']}. {q['q']}\n" + "\n".join(f"[{chr(65+i)}] {q['options'][i]}" for i in range(4)) + "\n")

    print(f"{year}: cloze_qs={len(cloze_qs)} reading_qs={len(all_qs)} texts={sorted(texts.keys())} blanks={len(re.findall(r'___\d+___', cloze_passage))}")


def extract_answers(year):
    cands = [f for f in os.listdir(ANSWER_DIR) if str(year) in f and f.lower().endswith(".pdf")]
    if not cands:
        print(f"  answers: {year} 解析文件不存在")
        return ""
    fn = os.path.join(ANSWER_DIR, cands[0])
    try:
        from PyPDF2 import PdfReader
        r = PdfReader(fn)
        text = "\n".join((p.extract_text() or "") for p in r.pages)
        if not text.strip():
            print(f"  answers: {year} PDF 无文本(扫描版)")
            return ""
        out = os.path.join(RAW_DIR, str(year), "answers_raw.txt")
        with open(out, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"  answers: {year} OK chars={len(text)}")
        return text
    except Exception as e:
        print(f"  answers: {year} ERR {str(e)[:80]}")
        return ""


def pdf_extract(path):
    from PyPDF2 import PdfReader
    r = PdfReader(path)
    return "\n".join((p.extract_text() or "") for p in r.pages)


def main():
    doc_files = [
        (range(2005, 2017), os.path.join(DOC_DIR, "2005—2016年历年考研英语真题集.doc")),
        (range(2017, 2018), os.path.join(DOC_DIR, "2017考研英语（一)真题.doc")),
        (range(2018, 2019), os.path.join(DOC_DIR, "2018考研英语（一)真题.doc")),
        (range(2019, 2020), os.path.join(DOC_DIR, "2019考研英语（一)真题.doc")),
    ]
    seen = set()
    for yr_range, path in doc_files:
        if not os.path.exists(path):
            print("MISSING", path)
            continue
        print("提取", os.path.basename(path))
        raw = word_extract(path)
        text = clean_text(raw)
        parts = split_years(text)
        print("  年份:", sorted(parts.keys()))
        for year in yr_range:
            if year in seen or year not in parts:
                if year not in parts:
                    print(f"  {year}: 未找到")
                continue
            seen.add(year)
            extract_year(year, parts[year])
            extract_answers(year)

    for year in [2020]:
        cands = [f for f in os.listdir(KAOYANZ_PDF_DIR) if f.startswith(str(year)) and "英语一" in f and f.endswith(".pdf")]
        if not cands:
            print(f"{year}: kaoyanzhenti 无对应文件")
        else:
            fn = os.path.join(KAOYANZ_PDF_DIR, cands[0])
            try:
                text = clean_text(pdf_extract(fn))
                print(f"{year} PDF chars={len(text)}")
                os.makedirs(os.path.join(RAW_DIR, str(year)), exist_ok=True)
                with open(os.path.join(RAW_DIR, str(year), "raw_full.txt"), "w", encoding="utf-8") as f:
                    f.write(text)
                extract_year(year, text)
            except Exception as e:
                print(f"{year} PDF ERR {str(e)[:80]}")
        extract_answers(2020)

    print("DONE")


if __name__ == "__main__":
    main()
