# -*- coding: utf-8 -*-
"""enrich_units.py —— P1 批量增厚 48 单元(不覆盖已有 v2 字段,不覆盖已有 exam.json)

对每个单元:
  1. article.json 增加(缺省时):
     - sentences[].grammarTags: 每条语法点挂到主 chunk 短语,grammarId 指向本单元语法课
     - sentences[].exercises: 由语法点生成仿写/回译句内练习(每题带解析)
     - lessonGrammar: 全篇语法速览(去重,最多 5 条,附原文例句)
  2. exam.json 生成(缺省时):
     - S4 优先匹配真实考研真题题(与文章 newWords/语法主题有词重叠)
     - 其余/不足部分用本单元 grammar.json 的 quiz + errors 生成(判断题为"正确/错误"选项)
用法:
  python scripts/enrich_units.py --dry-run   # 只报告,不写文件
  python scripts/enrich_units.py             # 执行
"""
import json
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "public", "content")
CURR = os.path.join(CONTENT, "curriculum")
ZHENTI = os.path.join(CONTENT, "zhenti")

DRY = "--dry-run" in sys.argv
REDO_EXAMS = "--redo-exams" in sys.argv


def tokenize_en(text):
    return [t.lower() for t in re.findall(r"[a-z']+", text or "")]


def load_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save_json(p, obj):
    if DRY:
        return
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def load_zhenti_questions():
    """全部考研真题题,附带年份/文章 id"""
    qs = []
    for year in os.listdir(ZHENTI):
        ydir = os.path.join(ZHENTI, year)
        if not os.path.isdir(ydir) or not re.fullmatch(r"\d{4}", year):
            continue
        for fn in os.listdir(ydir):
            if not fn.endswith(".json"):
                continue
            a = load_json(os.path.join(ydir, fn))
            for qi, q in enumerate(a.get("questions", [])):
                qs.append({"year": year, "articleId": a.get("id"), "qi": qi, "q": q})
    return qs


def match_zhenti(new_words, zhenti_qs, used, limit=6):
    """按文章 newWords 与题干/解析的词重叠给真题打分,取 top-N(同分优先短题干;全局去重)"""
    vocab = set(tokenize_en(" ".join(new_words)))
    scored = []
    for z in zhenti_qs:
        key = f"zhenti:{z['articleId']}:q{z['qi'] + 1}"
        if key in used:
            continue
        q = z["q"]
        text = tokenize_en((q.get("q") or "") + " " + (q.get("analysis") or ""))
        if not text:
            continue
        overlap = len(set(text) & vocab)
        if overlap > 0:
            scored.append((overlap, -(len(q.get("q") or "")), z))
    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
    picked = []
    for _, _, z in scored[:limit]:
        key = f"zhenti:{z['articleId']}:q{z['qi'] + 1}"
        used.add(key)
        picked.append(z)
    return picked


def exam_from_grammar(grammar, unit_id, stage):
    qs = []
    for q in grammar.get("quiz", []):
        qs.append({
            "q": q["q"], "options": q["options"], "answer": q["answer"],
            "analysis": q.get("note", ""), "point": grammar.get("grammarId") or grammar.get("id"),
            "source": "本单元语法课练习",
        })
    for e in grammar.get("errors", []):
        qs.append({
            "q": f"判断对错:{e['wrong']}", "options": ["正确", "错误"], "answer": 1,
            "analysis": f"应改为:{e['right']}。{e.get('note', '')}",
            "point": grammar.get("grammarId") or grammar.get("id"),
            "source": "本单元常见错误改编",
        })
    return qs


def exam_from_zhenti(matched, unit_id, stage):
    qs = []
    for z in matched:
        q = z["q"]
        qs.append({
            "q": q.get("q") or "(完形填空,见原文空位)",
            "options": q.get("options", []),
            "answer": q.get("answer", 0),
            "analysis": q.get("analysis", ""),
            "point": f"zhenti:{z['articleId']}:q{z['qi'] + 1}",
            "source": f"{z['year']} 考研英语一真题",
        })
    return qs


def main():
    with open(os.path.join(CURR, "index.json"), encoding="utf-8") as f:
        idx = json.load(f)
    units = [u for st in idx["stages"] for u in st["units"]]
    zhenti_qs = load_zhenti_questions()
    used_zhenti = set()

    stats = {"tags": 0, "exercises": 0, "lessons": 0, "exams": 0, "realQuestions": 0, "skippedExam": 0}
    for u in units:
        uid = u["id"]
        adir = os.path.join(CURR, uid)
        ap = os.path.join(adir, "article.json")
        gp = os.path.join(adir, "grammar.json")
        ep = os.path.join(adir, "exam.json")
        a = load_json(ap)
        g = load_json(gp)
        grammar_id = g.get("grammarId") or g.get("id")
        changed = False

        # ---- 语法标签 ----
        for s in a["sentences"]:
            if s.get("grammarTags"):
                continue
            tags = []
            for pt in s.get("grammar", []):
                # 取最长 chunk 作为标签短语(主干通常最长)
                phrase = max((c["text"] for c in s.get("chunks", [])), key=len, default=s["text"])
                tags.append({"grammarId": grammar_id, "phrase": phrase, "name": pt["name"]})
            if tags:
                s["grammarTags"] = tags
                stats["tags"] += len(tags)
                changed = True

        # ---- 句内练习(每句最多 2 题:有例句→回译,无例句→仿写) ----
        for s in a["sentences"]:
            if s.get("exercises"):
                continue
            exs = []
            for pt in s.get("grammar", []):
                if pt.get("example"):
                    exs.append({
                        "type": "translate",
                        "prompt": f"回译:{pt.get('exampleCn') or '参考中文'}",
                        "answer": pt["example"],
                        "note": pt.get("note", ""),
                        "point": pt["name"],
                    })
                else:
                    exs.append({
                        "type": "rewrite",
                        "prompt": f"仿写本句(替换主语或表语):{s['text']}",
                        "answer": s["text"],
                        "note": pt.get("note", ""),
                        "point": pt["name"],
                    })
                if len(exs) >= 2:
                    break
            if exs:
                s["exercises"] = exs
                stats["exercises"] += len(exs)
                changed = True

        # ---- 本课语法速览 ----
        if not a.get("lessonGrammar"):
            seen = set()
            summary = []
            for s in a["sentences"]:
                for pt in s.get("grammar", []):
                    if pt["name"] in seen:
                        continue
                    seen.add(pt["name"])
                    summary.append({
                        "grammarId": grammar_id,
                        "name": pt["name"],
                        "note": pt.get("note", ""),
                        "sourceExample": s["text"],
                        "sourceExampleCn": s.get("translation", ""),
                    })
                    if len(summary) >= 5:
                        break
                if len(summary) >= 5:
                    break
            if summary:
                a["lessonGrammar"] = summary
                stats["lessons"] += len(summary)
                changed = True

        if changed:
            save_json(ap, a)

        # ---- exam.json ----
        if os.path.exists(ep):
            if not (REDO_EXAMS and uid != "s1u1"):
                stats["skippedExam"] += 1
                continue

        questions = []
        if u["stage"] == 4:
            matched = match_zhenti(a.get("newWords", []), zhenti_qs, used_zhenti, limit=6)
            questions = exam_from_zhenti(matched, uid, u["stage"])
            stats["realQuestions"] += len(questions)
        if len(questions) < 6:
            fill = exam_from_grammar(g, uid, u["stage"])
            questions.extend(fill)
        questions = questions[:6]
        if len(questions) < 5:
            print(f"  [WARN] {uid}: 仅生成 {len(questions)} 题")
        exam = {
            "id": f"e-{uid}",
            "stage": u["stage"],
            "unitId": uid,
            "title": f"真题演练 · {u['grammarTopic']}",
            "hint": f"本组题目按本单元语法点与词池生成/匹配;答错后点击「回溯语法课」复习 {u['grammarTopic']}。",
            "questions": questions,
        }
        save_json(ep, exam)
        stats["exams"] += 1
        real = sum(1 for q in questions if str(q["source"]).endswith("真题"))
        print(f"{uid}: article v2 补全 | exam.json {len(questions)} 题(其中真实真题 {real})")

    print("\n== 统计 ==")
    print(json.dumps(stats, ensure_ascii=False))
    if DRY:
        print("dry-run: 未写任何文件")


if __name__ == "__main__":
    main()
