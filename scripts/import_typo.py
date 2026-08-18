#!/usr/bin/env python3
"""typogrammar 素材导入(P3-2):提取 IELTS/TOEFL 句式、band 词汇、常见错误 → content/writing/s5/*.json

来源:
- raw_materials/typogrammar/*.pdf(typogrammar.com 免费学习 PDF,仅本地个人学习):
  Common_English_Grammar_Mistakes.pdf(95 组 WRONG/RIGHT/RULE 错误)
  IELTS_Writing_Task1_Master_Guide_2026.pdf(图表作文高分句式,启发式抽取)
  3000_Most_Common_English_Words.pdf(词频参考)
- 本平台既有素材:P2-5 种子库(12 句式 / 30 band 词 / 16 错误)、
  wordbank 雅思级(level=5)1458 词、grammar-reference.json 的 187 条常见错误。

验收目标:句式库 ≥50 条、band 词汇 ≥500 词、错误库 ≥100 条。
用法: python scripts/import_typo.py
"""
import json
import os
import re
import sys
import time
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw_materials", "typogrammar")
OUT = os.path.join(ROOT, "public", "content", "writing", "s5")
CONTENT = os.path.join(ROOT, "public", "content")

PDFS = {
    "Common_English_Grammar_Mistakes.pdf": "https://typogrammar.com/downloads/Common_English_Grammar_Mistakes.pdf",
    "IELTS_Writing_Task1_Master_Guide_2026.pdf": "https://typogrammar.com/downloads/IELTS_Writing_Task1_Master_Guide_2026.pdf",
    "3000_Most_Common_English_Words.pdf": "https://typogrammar.com/downloads/3000_Most_Common_English_Words.pdf",
}

SRC_TYPO = "typogrammar.com 免费 PDF(仅供本地个人学习)"


def ensure_pdfs():
    os.makedirs(RAW, exist_ok=True)
    for name, url in PDFS.items():
        dest = os.path.join(RAW, name)
        if os.path.exists(dest) and os.path.getsize(dest) > 100_000:
            continue
        print("下载", name)
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "english-learning-site-import"})
                with urllib.request.urlopen(req, timeout=180) as resp:
                    data = resp.read()
                with open(dest, "wb") as f:
                    f.write(data)
                break
            except Exception as e:
                print(f"  RETRY ({attempt + 1}): {e}")
                time.sleep(3 * (attempt + 1))
        if not os.path.exists(dest) or os.path.getsize(dest) < 100_000:
            raise RuntimeError(f"下载失败: {name}")


def pdf_text(name):
    from pypdf import PdfReader
    reader = PdfReader(os.path.join(RAW, name))
    return "\n".join(p.extract_text() or "" for p in reader.pages)


def extract_mistakes():
    """WRONG/RIGHT/RULE 三元组 → 错误条目(带章节分类)"""
    text = pdf_text("Common_English_Grammar_Mistakes.pdf")
    chapter_map = {}
    for m in re.finditer(r"Chapter \d+: ([A-Za-z -]+)", text):
        chapter_map[m.start()] = m.group(1).strip()
    starts = sorted(chapter_map)

    def kind_of(pos):
        cat = "grammar"
        for s in starts:
            if s <= pos:
                cat = chapter_map[s]
        if "Confused" in cat or "Preposition" in cat:
            return "lexis"
        if "Redundancy" in cat:
            return "coherence"
        return "grammar"

    out = []
    for i, m in enumerate(re.finditer(r"WRONG\s*\n(.*?)\nRIGHT\s*\n(.*?)\nRULE\s*\n(.*?)\nEXAMPLES", text, re.S), 1):
        wrong = m.group(1).strip().split("\n")[0].strip()
        right = m.group(2).strip().split("\n")[0].strip()
        rule = re.sub(r"\s+", " ", m.group(3)).strip()
        if not wrong or not right:
            continue
        out.append({
            "id": f"tg{kind_of(m.start())[:4].lower()}{i:02d}",
            "type": kind_of(m.start()),
            "wrong": wrong[:160],
            "right": right[:160],
            "note": (rule[:180] + "。") if rule else "按标准英语语法改正。",
        })
    return out


def extract_task1_patterns():
    """Task1 指南启发式抽取图表作文句式"""
    text = pdf_text("IELTS_Writing_Task1_Master_Guide_2026.pdf")
    patterns = []
    seen = set()
    # 典型 Task1 句式:图表开头/总体句/对比句/趋势句
    regexes = [
        r"The (?:bar|line|pie) chart (?:illustrates|shows|compares|depicts|presents) [^.]{10,120}\.",
        r"Overall, [^.]{10,120}\.",
        r"It is (?:clear|noticeable|evident|apparent) that [^.]{10,120}\.",
        r"In contrast, [^.]{10,120}\.",
        r"The figures? for [^.]{10,140}\.",
        r"A (?:significant|dramatic|steady|slight) (?:increase|decrease|rise|fall) [^.]{10,120}\.",
        r"(?:Meanwhile|Similarly|By comparison), [^.]{10,120}\.",
    ]
    for rx in regexes:
        for s in re.findall(rx, text):
            s = re.sub(r"\s+", " ", s).strip()
            key = s[:50].lower()
            if key in seen or len(s) < 30:
                continue
            seen.add(key)
            patterns.append({
                "id": f"pdf{len(patterns) + 1:02d}",
                "type": "data",
                "name": s[:64] + ("…" if len(s) > 64 else ""),
                "cn": "图表作文高分句式(typogrammar Task 1 指南)",
                "template": s,
                "example": s,
                "exampleCn": "见原句(图表作文示范句式)",
                "tips": ["Task 1 图表描述常用句式", "注意时态与数值表达准确"],
            })
    return patterns[:12]


# 人工整理写作句式(与 P2-5 种子库互补,达到 ≥50 条)
HAND_PATTERNS = [
    ("It is often argued that …", "人们常说……(引入争议话题)", "opinion",
     "It is often argued that young people spend too much time online.",
     "人们常说年轻人上网时间过多。", "开头段引入双边观点,常与 while others believe 搭配"),
    ("Some people claim that …, while others maintain that …", "有人主张……,而另一些人坚持……", "discuss",
     "Some people claim that money brings happiness, while others maintain that true joy comes from relationships.",
     "有人认为金钱带来幸福,而另一些人坚持真正的快乐来自人际关系。", "讨论类开头经典框架,两方观点都要概述"),
    ("From my perspective, …", "在我看来……", "opinion",
     "From my perspective, the benefits of urbanisation outweigh its drawbacks.",
     "在我看来,城市化的好处大于坏处。", "表明立场,比 in my opinion 更书面"),
    ("I am inclined to believe that …", "我倾向于认为……", "opinion",
     "I am inclined to believe that governments should invest more in public transport.",
     "我倾向于认为政府应加大对公共交通的投入。", "温和表达立场,论证型作文可用"),
    ("A case in point is …", "一个典型的例子是……", "general",
     "A case in point is the rapid growth of electric vehicles in China.",
     "一个典型例子是中国电动汽车的快速增长。", "引出具体例证,替代 for example"),
    ("This is particularly true when it comes to …", "在……方面尤其如此", "general",
     "This is particularly true when it comes to rural education.",
     "在乡村教育方面尤其如此。", "聚焦话题某一方面,段落过渡自然"),
    ("The advantages of … far outweigh the disadvantages", "……的好处远大于坏处", "discuss",
     "The advantages of telecommuting far outweigh the disadvantages for most knowledge workers.",
     "对多数知识工作者而言,远程办公利远大于弊。", "讨论类结论句,立场鲜明"),
    ("There is a growing body of evidence suggesting that …", "越来越多的证据表明……", "report",
     "There is a growing body of evidence suggesting that regular exercise boosts mental health.",
     "越来越多的证据表明,规律运动能促进心理健康。", "学术化证据引入,报告类作文高分句式"),
    ("X has become a matter of public concern", "X 已成为公众关注的问题", "report",
     "Air pollution has become a matter of public concern in many megacities.",
     "空气污染已成为许多特大城市公众关注的问题。", "报告类开头指出问题"),
    ("The underlying causes of this problem are threefold", "这一问题的深层原因有三", "report",
     "The underlying causes of this problem are threefold: poverty, poor infrastructure and weak governance.",
     "这一问题的深层原因有三:贫困、基础设施薄弱与治理不力。", "报告类主体段总起句"),
    ("Measures must be taken to address …", "必须采取措施应对……", "report",
     "Measures must be taken to address the rising cost of housing.",
     "必须采取措施应对不断上涨的住房成本。", "结尾段提出解决建议"),
    ("Only in this way can …", "只有这样……才能……", "general",
     "Only in this way can we achieve a truly sustainable society.",
     "只有这样,我们才能建成真正可持续的社会。", "倒装强调,结尾段收束有力"),
    ("It is high time that …", "现在正是……的时候了", "general",
     "It is high time that governments took decisive action on climate change.",
     "现在是各国政府对气候变化采取果断行动的时候了。", "注意从句用过去式(虚拟语气)"),
    ("The phenomenon can be explained by a combination of factors", "这一现象可由多种因素共同解释", "report",
     "The phenomenon can be explained by a combination of economic and cultural factors.",
     "这一现象可由经济与文化因素共同解释。", "报告类主体段总起"),
    ("A growing number of people are …", "越来越多的人在……", "general",
     "A growing number of people are choosing to work as freelancers.",
     "越来越多的人选择自由职业。", "数量趋势表达,替代 more and more"),
    ("It cannot be denied that …", "不可否认……", "opinion",
     "It cannot be denied that technology has transformed education.",
     "不可否认,技术已改变教育。", "承认对方观点,常后接 however 转折"),
    ("Whether … is a matter of heated debate", "……是否……是激烈争论的话题", "discuss",
     "Whether artificial intelligence will replace teachers is a matter of heated debate.",
     "人工智能是否会取代教师是激烈争论的话题。", "讨论类开头"),
    ("The trend towards … shows no sign of abating", "……的趋势没有减弱的迹象", "data",
     "The trend towards online shopping shows no sign of abating.",
     "网上购物的趋势没有减弱的迹象。", "趋势句,Task 1 结尾可用来预测"),
    ("X accounts for the largest proportion of …", "X 在……中占比最大", "data",
     "Private cars account for the largest proportion of urban emissions.",
     "私家车在城市排放中占比最大。", "图表作文占比表达"),
    ("The period between … and … witnessed a marked change in …", "从……到……期间,……发生了显著变化", "data",
     "The period between 2000 and 2020 witnessed a marked change in household energy use.",
     "2000 至 2020 年间,家庭能源使用发生了显著变化。", "witness 拟人化,Task 1 总述句"),
    ("There was a threefold increase in …", "……增长了三倍", "data",
     "There was a threefold increase in renewable energy capacity.",
     "可再生能源装机容量增长了三倍。", "倍数表达:threefold/twofold"),
    ("The majority of …, with the remainder …", "大多数……,其余……", "data",
     "The majority of commuters used private cars, with the remainder relying on public transport.",
     "大多数通勤者使用私家车,其余依赖公共交通。", "份额拆分表达"),
    ("By contrast, …", "相比之下,……", "general",
     "By contrast, spending on books remained almost unchanged.",
     "相比之下,购书支出几乎保持不变。", "对比转折,Task 1 分组描述"),
    ("A similar pattern can be observed in …", "在……中也能观察到相似模式", "data",
     "A similar pattern can be observed in the data for rural households.",
     "农村家庭的数据中也能观察到相似模式。", "Task 1 分组比较"),
    ("This can be largely attributed to …", "这在很大程度上可归因于……", "report",
     "This can be largely attributed to improved access to healthcare.",
     "这在很大程度上可归因于医疗服务可及性的提高。", "归因表达,学术语气"),
    ("It is worth noting that …", "值得注意的是……", "general",
     "It is worth noting that the figures do not include informal employment.",
     "值得注意的是,数据未包含非正规就业。", "提示重要细节,写作与图表均可"),
    ("The argument in favour of … rests on the assumption that …", "支持……的论点基于……的假设", "discuss",
     "The argument in favour of school uniforms rests on the assumption that they reduce inequality.",
     "支持校服的论点基于校服能减少不平等的假设。", "拆解对方论证的高阶句式"),
    ("Provided that …, there is no reason why …", "只要……,就没有理由不……", "general",
     "Provided that safety rules are followed, there is no reason why children should not cycle to school.",
     "只要遵守安全规则,就没有理由不让孩子们骑车上学。", "条件句 + 双重否定,语气强"),
    ("What matters most is not …, but …", "最重要的不是……,而是……", "general",
     "What matters most is not the quantity of homework, but its quality.",
     "最重要的不是作业的数量,而是质量。", "主语从句强调,观点句高分结构"),
    ("It is the responsibility of … to …", "……是……的责任", "opinion",
     "It is the responsibility of parents to guide their children's use of screens.",
     "引导孩子使用屏幕是父母的责任。", "责任归属表达"),
    ("Without …, it would be impossible to …", "没有……,就不可能……", "general",
     "Without international cooperation, it would be impossible to tackle climate change.",
     "没有国际合作,就不可能应对气候变化。", "虚拟语气论证必要性"),
    ("Far from being a threat, …", "……远非威胁,而是……", "discuss",
     "Far from being a threat, immigration has enriched the local economy.",
     "移民远非威胁,反而丰富了当地经济。", "反驳对立观点的高分开头"),
    ("The benefits of this approach are twofold", "这种方法的好处有二", "report",
     "The benefits of this approach are twofold: lower costs and higher efficiency.",
     "这种方法的好处有二:成本更低、效率更高。", "twofold/threefold 总分结构"),
    ("Admittedly, …", "诚然,……", "discuss",
     "Admittedly, space exploration is extremely expensive.",
     "诚然,太空探索极其昂贵。", "让步段开头,后接 however"),
    ("This raises the question of whether …", "这引出了……的问题", "general",
     "This raises the question of whether economic growth can be decoupled from emissions.",
     "这引出了经济增长能否与排放脱钩的问题。", "承上启下引出讨论"),
    ("In light of the above, …", "鉴于以上分析,……", "general",
     "In light of the above, the case for stricter regulation is compelling.",
     "鉴于以上分析,加强监管的理由很有说服力。", "结论段总起"),
    ("… is often cited as the main culprit", "……常被指为主要元凶", "report",
     "Car dependence is often cited as the main culprit behind urban congestion.",
     "对汽车的依赖常被指为城市拥堵的主要元凶。", "归因句,报告类常用"),
    ("The advantages are not confined to …", "好处不仅限于……", "general",
     "The advantages of bilingual education are not confined to language skills.",
     "双语教育的好处不仅限于语言能力。", "not confined to = 不局限于"),
    ("It is essential that …", "……至关重要", "opinion",
     "It is essential that every child have access to quality education.",
     "每个孩子都能接受优质教育至关重要。", "注意从句用原形(虚拟语气)"),
    ("The extent to which … remains a subject of debate", "……在多大程度上……仍存争议", "discuss",
     "The extent to which social media affects mental health remains a subject of debate.",
     "社交媒体在多大程度上影响心理健康仍存争议。", "学术讨论高阶句式"),
]


def hand_patterns(existing_ids):
    out = []
    for i, (name, cn, ptype, example, example_cn, tips) in enumerate(HAND_PATTERNS, 1):
        out.append({
            "id": f"h{i:02d}",
            "type": ptype,
            "name": name,
            "cn": cn,
            "template": name,
            "example": example,
            "exampleCn": example_cn,
            "tips": [tips],
        })
    return out


def load_existing():
    def read(name):
        with open(os.path.join(OUT, name), encoding="utf-8") as f:
            return json.load(f)
    return read("patterns.json"), read("band-words.json"), read("errors.json")


def build_band_words(existing):
    """现有 30 个 hand band 词 + 词库雅思级(level=5)词,band 取 7"""
    with open(os.path.join(CONTENT, "wordbank", "meta.json"), encoding="utf-8") as f:
        meta = json.load(f)
    dict_map = {}
    for ch in "abcdefghijklmnopqrstuvwxyz":
        with open(os.path.join(CONTENT, "dict", ch + ".json"), encoding="utf-8") as f:
            for e in json.load(f):
                dict_map.setdefault(e["word"].lower(), e)
    seen = {w["word"].lower() for w in existing["words"]}
    out = list(existing["words"])
    added = 0
    for ch in "abcdefghijklmnopqrstuvwxyz":
        p = os.path.join(CONTENT, "wordbank", ch + ".json")
        if not os.path.exists(p):
            continue
        for e in json.load(open(p, encoding="utf-8")):
            if e.get("level") != 5:
                continue
            w = e["word"].lower()
            if w in seen:
                continue
            seen.add(w)
            de = dict_map.get(w)
            trans = (de.get("trans") or [{}])[0] if de else {}
            sent = (de.get("sentences") or [{}])[0] if de else {}
            out.append({
                "word": e["word"],
                "cn": (trans.get("cn") or e.get("cn") or "").split("；")[0].split(";")[0][:24],
                "band": 7,
                "pos": trans.get("pos") or "",
                "replaceFor": "",
                "example": sent.get("en") or (e.get("example") or {}).get("en", ""),
                "exampleCn": sent.get("cn") or (e.get("example") or {}).get("cn", ""),
            })
            added += 1
    print(f"band 词汇:原有 {len(existing['words'])} + 词库雅思级 {added}")
    return out


def build_errors(existing):
    """现有 16 + typogrammar PDF 95 + 不足 100 时用 grammar-reference 补足"""
    out = list(existing["errors"])
    seen = {re.sub(r"[^a-z ]", "", e["wrong"].lower()).strip() for e in out}
    for e in extract_mistakes():
        key = re.sub(r"[^a-z ]", "", e["wrong"].lower()).strip()
        if key and key not in seen:
            seen.add(key)
            out.append(e)
    if len(out) < 100:
        with open(os.path.join(CONTENT, "grammar-reference.json"), encoding="utf-8") as f:
            ref = json.load(f)
        i = len(out)
        for lv in ref["levels"]:
            for c in lv["categories"]:
                for r in c["rules"]:
                    for m in r.get("mistakes") or []:
                        parts = re.split(r"\s*→\s*", m)
                        if len(parts) != 2:
                            continue
                        key = re.sub(r"[^a-z ]", "", parts[0].lower()).strip()
                        if not key or key in seen:
                            continue
                        seen.add(key)
                        i += 1
                        out.append({
                            "id": f"gr{i:03d}",
                            "type": "grammar",
                            "wrong": parts[0].strip()[:160],
                            "right": parts[1].strip()[:160],
                            "note": f"{r['text']}:按标准英语语法改正。",
                        })
    print(f"错误库:{len(out)} 条(PDF {len(extract_mistakes())} + 种子 {len(existing['errors'])} + 语法树补充)")
    return out


def build_patterns(existing):
    pdf = extract_task1_patterns()
    hand = hand_patterns(existing["patterns"])
    merged = list(existing["patterns"]) + pdf + hand
    seen = set()
    out = []
    for p in merged:
        key = p["name"][:40].lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    print(f"句式库:{len(out)} 条(种子 {len(existing['patterns'])} + PDF {len(pdf)} + 人工 {len(hand)})")
    return out


def main():
    ensure_pdfs()
    patterns, band, errors = load_existing()

    np_ = build_patterns(patterns)
    nb_ = build_band_words(band)
    ne_ = build_errors(errors)

    assert len(np_) >= 50, f"句式库不足 50({len(np_)})"
    assert len(nb_) >= 500, f"band 词汇不足 500({len(nb_)})"
    assert len(ne_) >= 100, f"错误库不足 100({len(ne_)})"

    os.makedirs(OUT, exist_ok=True)
    outs = {
        "patterns.json": {"version": 2, "type": "writing-patterns",
                          "source": f"P2-5 种子库 + {SRC_TYPO}(Task1 指南句式)+ 人工整理", "patterns": np_},
        "band-words.json": {"version": 2, "type": "writing-band-words",
                            "source": f"P2-5 种子库 + 本平台词库雅思级(level=5)+ 词典释义", "words": nb_},
        "errors.json": {"version": 2, "type": "writing-errors",
                        "source": f"P2-5 种子库 + {SRC_TYPO}(语法错误手册)+ grammar-reference 常见错误", "errors": ne_},
    }
    for name, data in outs.items():
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
            f.write("\n")
        print("写入", name)
    print(f"验收:句式 {len(np_)} / band 词汇 {len(nb_)} / 错误 {len(ne_)}")


if __name__ == "__main__":
    main()
