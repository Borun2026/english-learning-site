#!/usr/bin/env python3
"""为 114 篇 CET-6 真题语篇生成 3 道阅读理解题(P2-7)。

背景:历史真题题目未随语篇源提供,本会话亦无可用 AI Key,故采用
「确定性规则生成」:每篇 3 题 = 词汇语境义 + 细节补全 + 主旨大意,
选项与解析全部来自原文/词典/文章标题,随机种子=文章 id(可复现)。

生成物标注 source: "程序生成待校对(基于原文与词典)"。
抽样人工校对记录见 docs/cet6-question-review-log.md。

用法: python scripts/gen_cet6_questions.py
"""
import json
import os
import random
import re
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CET_DIR = os.path.join(ROOT, "public", "content", "zhenti", "cet6")
DICT_DIR = os.path.join(ROOT, "public", "content", "dict")

SOURCE_TAG = "程序生成待校对(基于原文与词典)"

# 功能词/弱内容词黑名单(不做出题词与干扰项)
STOP = set("""
the a an and or but so if then than that this these those there here is are was were be been being
have has had do does did will would shall should can could may might must not no nor of in on at to
for with by from as it its they them their he she his her we our us you your i my me who whom which
what when where why how all any both each few more most other some such only own same very just also
too about into over under again further once out up down off one two three four five six seven eight
nine ten first second last new old much many little long short day year time way thing people world
make made makes making make known know said says say like use used using become becomes became many
get gets got give gives given take takes took taken see saw seen come came go went gone think thought
find found want wanted need needed put puts even still well back after before while because although
though however therefore thus yet already often usually always never ever per cent percent million
billion us another something someone everything nothing everyone every its their they them these those
itself himself herself myself yourself yourselves ourselves themselves
january february march april may june july august september october november december
monday tuesday wednesday thursday friday saturday sunday
""".split())

WORD_RE = re.compile(r"[A-Za-z][a-z]{4,}")


def load_dict():
    """word -> (pos, cn) 取完整词典第一条释义"""
    out = {}
    for fn in sorted(os.listdir(DICT_DIR)):
        if not fn.endswith(".json"):
            continue
        with open(os.path.join(DICT_DIR, fn), encoding="utf-8") as f:
            arr = json.load(f)
        for e in arr:
            w = e.get("word", "").lower()
            if not w:
                continue
            trans = e.get("trans") or []
            if trans and trans[0].get("cn"):
                out.setdefault(w, (trans[0].get("pos", ""), trans[0]["cn"]))
    return out


def clean_cn(cn: str) -> str:
    cn = re.split(r"[;；:：]", cn)[0].strip().strip("()()（） ")
    return cn[:24]


def sentences_of(text: str):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) >= 40]


def content_entries(text: str, dic):
    """正文中可作为出题词/干扰项的实词(唯一小写形式,按出现顺序)"""
    tokens = WORD_RE.findall(text)
    counts = Counter(t.lower() for t in tokens)
    seen = set()
    entries = []
    for t in tokens:
        w = t.lower()
        if w in seen or w in STOP or w not in dic:
            continue
        seen.add(w)
        cn = clean_cn(dic[w][1])
        if not (2 <= len(cn) <= 20):
            continue
        # 找包含该词的句子(大小写不敏感)
        sentence = next((s for s in sentences_of(text) if re.search(rf"\b{re.escape(t)}\b", s, re.I)), "")
        entries.append({"word": w, "display": t, "pos": dic[w][0], "cn": cn, "count": counts[w], "sentence": sentence})
    return entries


def vocab_question(rng: random.Random, text: str, dic):
    entries = content_entries(text, dic)
    # 优先选释义精炼(2-12 字)且低频的词,避免多义词干扰
    pool = [e for e in entries if 1 <= e["count"] <= 2 and len(e["sentence"]) <= 260 and 2 <= len(e["cn"]) <= 12]
    if not pool:
        pool = [e for e in entries if 1 <= e["count"] <= 2 and len(e["sentence"]) <= 260]
    if not pool:
        pool = [e for e in entries if len(e["sentence"]) <= 300]
    if not pool:
        return None
    target = pool[rng.randrange(len(pool))]
    same_pos = [e for e in entries if e["word"] != target["word"] and e["cn"] != target["cn"] and e["pos"][:1] == target["pos"][:1]]
    others = [e for e in entries if e["word"] != target["word"] and e["cn"] != target["cn"] and e not in same_pos]
    cands = same_pos + others
    rng.shuffle(cands)
    dist = []
    for e in cands:
        if len(dist) >= 3:
            break
        if not any(e["cn"] == d["cn"] for d in dist):
            dist.append(e)
    if len(dist) < 3:
        return None
    options = [target["cn"]] + [d["cn"] for d in dist]
    rng.shuffle(options)
    return {
        "q": f"文中 “{target['display']}” 最接近的意思是?",
        "options": options,
        "answer": options.index(target["cn"]),
        "analysis": f"“{target['display']}” 意为「{target['cn']}」。原文语境:{target['sentence'][:180]}",
        "source": SOURCE_TAG,
    }


def detail_question(rng: random.Random, text: str, dic, used_sentences):
    sents = [s for s in sentences_of(text) if 60 <= len(s) <= 260 and s not in used_sentences]
    if not sents:
        sents = [s for s in sentences_of(text) if s not in used_sentences]
    entries = content_entries(text, dic)
    words = {e["word"] for e in entries}
    rng.shuffle(sents)
    for sent in sents:
        words_in_sent = [t for t in WORD_RE.findall(sent) if t.lower() in words and t.lower() not in STOP]
        if not words_in_sent:
            continue
        # 仅保留全文出现 1 次的词,保证答案是原文唯一对应
        counts = Counter(w.lower() for w in WORD_RE.findall(text))
        once = [t for t in words_in_sent if counts[t.lower()] == 1]
        if not once:
            continue
        rng.shuffle(once)
        target = once[0]
        target_l = target.lower()
        t_entry = next((e for e in entries if e["word"] == target_l), None)
        same_pos = [e for e in entries if e["word"] != target_l and e["pos"][:1] == (t_entry["pos"][:1] if t_entry else "x")]
        others = [e for e in entries if e["word"] != target_l and e not in same_pos]
        rng.shuffle(same_pos)
        rng.shuffle(others)
        dist = []
        for e in same_pos + others:
            if len(dist) >= 3:
                break
            if e["word"][:1] == target_l[:1]:
                continue
            # 干扰项不能是题干句里已经出现的词(否则可凭排除法猜出)
            if re.search(rf"\b{re.escape(e['word'])}\b", sent, re.I):
                continue
            if not any(d["word"] == e["word"] for d in dist):
                dist.append(e)
        if len(dist) < 3:
            continue
        blanked = sent.replace(target, "___", 1)
        options = [target] + [d["display"] for d in dist]
        rng.shuffle(options)
        used_sentences.append(sent)
        return {
            "q": f"根据原文补全句子:{blanked}",
            "options": options,
            "answer": options.index(target),
            "analysis": f"原文原句为“{sent}”。空格处应填入 “{target}”。",
            "source": SOURCE_TAG,
        }
    return None


def clean_title(t: str) -> str:
    """清洗标题选项:去掉提取残留(替换字符/完形标记)与截断符"""
    t = t.replace("\ufffd", " ")
    t = re.sub(r"\s*\( ?[A-Za-z]{1,3} ?\)", "", t)
    t = re.sub(r"\s+", " ", t).strip().rstrip("….").strip()
    return t[:100]


def main_idea_question(rng: random.Random, passage, all_titles):
    title = clean_title(passage["title"])
    others = [t for t in all_titles if t[:40] != title[:40]]
    rng.shuffle(others)
    dist = []
    for t in others:
        if len(dist) >= 3:
            break
        if not any(t[:30] == d[:30] for d in dist):
            dist.append(t)
    if len(dist) < 3:
        dist += [f"第 {i + 1} 段落的细节描述" for i in range(3 - len(dist))]
    options = [title] + dist
    rng.shuffle(options)
    first = re.split(r"(?<=[.!?])\s+", re.sub(r"\s+", " ", passage["paragraphs"][0]).strip())[0][:160]
    return {
        "q": "本文的主旨大意是?",
        "options": options,
        "answer": options.index(title),
        "analysis": f"本文以“{first}”开篇并围绕该主题展开,正确选项即原文标题;其余选项为其他文章的标题。",
        "source": SOURCE_TAG,
    }


def main():
    dic = load_dict()
    print("词典词数:", len(dic))
    with open(os.path.join(CET_DIR, "cet6-index.json"), encoding="utf-8") as f:
        idx = json.load(f)
    all_titles = [clean_title(it["title"]) for it in idx["items"]]

    stats = {"passages": 0, "questions": 0, "vocab": 0, "detail": 0, "main": 0, "fallback_detail": 0}
    for it in idx["items"]:
        path = os.path.join(CET_DIR, it["id"] + ".json")
        with open(path, encoding="utf-8") as f:
            passage = json.load(f)
        text = " ".join(passage["paragraphs"])
        rng = random.Random(it["id"])

        questions = []
        used = []
        v = vocab_question(rng, text, dic)
        if v:
            questions.append(v)
            stats["vocab"] += 1
        d1 = detail_question(rng, text, dic, used)
        if d1:
            questions.append(d1)
            stats["detail"] += 1
        if len(questions) < 2:
            d2 = detail_question(rng, text, dic, used)
            if d2:
                questions.append(d2)
                stats["fallback_detail"] += 1
        m = main_idea_question(rng, passage, all_titles)
        questions.append(m)
        stats["main"] += 1

        # 结构断言
        assert len(questions) >= 3, f"{it['id']} 不足 3 题"
        for q in questions:
            assert len(q["options"]) == 4 and 0 <= q["answer"] <= 3
            assert q["analysis"], f"{it['id']} 缺解析"

        passage["questions"] = questions
        with open(path, "w", encoding="utf-8") as f:
            json.dump(passage, f, ensure_ascii=False, indent=1)
            f.write("\n")
        stats["passages"] += 1
        stats["questions"] += len(questions)

    print("完成:", stats)
    print("平均题数/篇:", round(stats["questions"] / stats["passages"], 2))


if __name__ == "__main__":
    main()
