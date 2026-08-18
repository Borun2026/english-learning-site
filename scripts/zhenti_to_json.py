# -*- coding: utf-8 -*-
"""zhenti_to_json.py —— zhenti_raw -> public/content/zhenti/{year}/reading-{n}.json | cloze.json + index.json

输入: zhenti_raw/{year}/cloze.txt, reading-{1..4}.txt, answers_raw.txt
输出: public/content/zhenti/{year}/reading-{1..4}.json(阅读)
      public/content/zhenti/{year}/cloze.json(完形)
      public/content/zhenti/index.json
    sentences: 仅填充 text(+完形空位),translation/chunks/grammar 留空数组(由 WG-Z3 标注)
    questions: 从题目解析 + 答案解析填充(答案/解析)
"""
import json
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(SITE_ROOT, "zhenti_raw")
OUT = os.path.join(SITE_ROOT, "public", "content", "zhenti")
YEARS = list(range(2005, 2021))


def parse_questions_text(txt):
    """zhenti_raw 的 == QUESTIONS == 段 -> {no: {q, options[4]}}
    支持: 题干行 '21. x'、选项行 '[A] a'、同行多选项 '[A] a [B] b [C] c [D] d'"""
    qs = {}
    if "== QUESTIONS ==" not in txt:
        return qs
    body = txt.split("== QUESTIONS ==", 1)[1]
    cur_no = None
    for line in body.split("\n"):
        s = line.strip()
        if not s:
            continue
        m = re.match(r"^(\d{1,2})\.?\s*(.*)$", s)
        if m:
            no = int(m.group(1))
            if 1 <= no <= 40:
                cur_no = no
                qs.setdefault(no, {"no": no, "q": "", "options": ["", "", "", ""]})
                rest = m.group(2).strip()
                if rest:
                    if not rest.startswith("["):
                        # 题干行可能内联 [BJ [CJ [DJ 选项
                        if re.search(r"\[[ABCD]J?\]", rest):
                            qtext = rest.split("[")[0].strip()
                            if qtext:
                                qs[no]["q"] = qtext
                            for om in re.finditer(r"\[([ABCD])J?\]?\s*([^\[\]]*)", rest):
                                val = om.group(2).strip()
                                if val:
                                    qs[no]["options"][ord(om.group(1)) - ord("A")] = val
                        else:
                            qs[no]["q"] = rest
                continue
        if cur_no is None:
            continue
        # 行内多选项: [A] a [B] b [C] c [D] d (兼容 [BJ [CJ 变体)
        if s.startswith("[") and re.search(r"\[[BCD]J?\]", s):
            for om in re.finditer(r"\[([ABCD])J?\]?\s*([^\[\]]*)", s):
                val = om.group(2).strip()
                if val:
                    qs[cur_no]["options"][ord(om.group(1)) - ord("A")] = val
            continue
        om = re.match(r"^\[([ABCD])J?\]?\s*(.*)$", s)
        if om:
            val = om.group(2).strip()
            if val:
                qs[cur_no]["options"][ord(om.group(1)) - ord("A")] = val
    return {no: q for no, q in qs.items() if any(o.strip() for o in q["options"])}


def parse_answers(year):
    """answers_raw.txt -> {no: {answer: 0-3, analysis}}
    锚点: '^N.' 行首题号;块(到下个锚)必须含【答案】才认定为题目,过滤正文段落"""
    path = os.path.join(RAW, str(year), "answers_raw.txt")
    result = {}
    if not os.path.exists(path):
        return result, []
    txt = open(path, encoding="utf-8").read()
    # 全角转半角(答案文件来自 PDF,未做 clean)
    for fw, hw in zip("０１２３４５６７８９，．？：；（）［］", "0123456789,.?:;()[]"):
        txt = txt.replace(fw, hw)

    # 候选锚:行首 'N.' 或 'N、'(1-40)
    cands = []
    for m in re.finditer(r"(?m)^(\d{1,2})[.、]\s*", txt):
        no = int(m.group(1))
        if 1 <= no <= 40:
            cands.append((m.start(), no))
    # 过滤:块内必须含【答案】(正文段落无【答案】)
    anchors = []
    for i, (pos, no) in enumerate(cands):
        end = cands[i + 1][0] if i + 1 < len(cands) else len(txt)
        if "【答案】" in txt[pos:end]:
            anchors.append((pos, no))

    for i, (pos, no) in enumerate(anchors):
        end = anchors[i + 1][0] if i + 1 < len(anchors) else len(txt)
        block = txt[pos:end]
        am = re.search(r"【答案】\s*([ABCD])", block)
        if am:
            result.setdefault(no, {"answer": None, "analysis": ""})
            result[no]["answer"] = ord(am.group(1)) - ord("A")
        dm = re.search(r"【解析】\s*(.*?)(?=【|^\d{1,2}\.|\Z)", block, re.S | re.M)
        if dm:
            result.setdefault(no, {"answer": None, "analysis": ""})
            result[no]["analysis"] = dm.group(1).strip()[:600]

    # 全文翻译(供标注参考,不入 json)
    trans_paras = []
    m = re.search(r"(?:二、全文翻译|全文翻译)\s*\n(.*?)(?=三、|试题详解|语篇精读|【答案】)", txt, re.S)
    if m:
        body = m.group(1)
        trans_paras = [p.strip() for p in body.split("\n") if p.strip()]
    return result, trans_paras


def sentences_from_passage(passage):
    """完形/阅读正文 -> [{text}]。完形保留 ___N___ 标记,按句子切分"""
    out = []
    for para in passage.split("\n"):
        para = para.strip()
        if not para:
            continue
        # 按 .!? 切句(保留数字/缩写)
        parts = re.split(r"(?<=[.!?])\s+", para)
        for p in parts:
            p = p.strip()
            if p:
                out.append({"text": p, "translation": "", "chunks": [], "grammar": []})
    return out


def main():
    index_years = []
    for year in YEARS:
        ydir = os.path.join(RAW, str(year))
        if not os.path.isdir(ydir):
            continue
        outdir = os.path.join(OUT, str(year))
        os.makedirs(outdir, exist_ok=True)
        answers, trans_paras = parse_answers(year)
        items = []

        # 完形
        cp = os.path.join(ydir, "cloze.txt")
        if os.path.exists(cp):
            raw_txt = open(cp, encoding="utf-8").read()
            passage = raw_txt.split("== QUESTIONS ==")[0].strip()
            qs_map = parse_questions_text(raw_txt)
            questions = []
            for no in range(1, 21):
                q = qs_map.get(no, {"no": no, "q": "", "options": ["", "", "", ""]})
                a = answers.get(no, {})
                questions.append({
                    "q": q.get("q", ""),
                    "options": q["options"],
                    "answer": a.get("answer", -1),
                    "analysis": a.get("analysis", ""),
                })
            article = {
                "id": f"z{year}-cloze-0",
                "year": year,
                "section": "cloze",
                "index": 0,
                "source": f"{year}年全国硕士研究生招生考试英语(一)",
                "title": "完形填空",
                "newWords": [],
                "sentences": sentences_from_passage(passage),
                "questions": questions,
            }
            with open(os.path.join(outdir, "cloze.json"), "w", encoding="utf-8") as f:
                json.dump(article, f, ensure_ascii=False, indent=1)
            items.append({"id": f"z{year}-cloze-0", "section": "cloze", "title": "完形填空"})

        # 阅读 1-4
        for n in range(1, 5):
            rp = os.path.join(ydir, f"reading-{n}.txt")
            if not os.path.exists(rp):
                continue
            raw_txt = open(rp, encoding="utf-8").read()
            passage = raw_txt.split("== QUESTIONS ==")[0].strip()
            qs_map = parse_questions_text(raw_txt)
            questions = []
            for no in range(21 + (n - 1) * 5, 21 + n * 5):
                q = qs_map.get(no, {"no": no, "q": "", "options": ["", "", "", ""]})
                a = answers.get(no, {})
                questions.append({
                    "q": q.get("q", ""),
                    "options": q["options"],
                    "answer": a.get("answer", -1),
                    "analysis": a.get("analysis", ""),
                })
            article = {
                "id": f"z{year}-reading-{n}",
                "year": year,
                "section": "reading",
                "index": n,
                "source": f"{year}年全国硕士研究生招生考试英语(一)",
                "title": f"Reading Text {n}",
                "newWords": [],
                "sentences": sentences_from_passage(passage),
                "questions": questions,
            }
            with open(os.path.join(outdir, f"reading-{n}.json"), "w", encoding="utf-8") as f:
                json.dump(article, f, ensure_ascii=False, indent=1)
            items.append({"id": f"z{year}-reading-{n}", "section": "reading", "title": f"Reading Text {n}"})

        index_years.append({"year": year, "items": items})
        missing = [no for no in range(1, 41) if no not in answers or answers[no]["answer"] is None]
        print(f"{year}: 阅读={len(items)-1} 完形=1 无答案题={missing}")

    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"years": index_years}, f, ensure_ascii=False, indent=1)
    print("index.json written")


if __name__ == "__main__":
    main()
