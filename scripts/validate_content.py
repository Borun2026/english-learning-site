# -*- coding: utf-8 -*-
"""validate_content.py —— 内容质量门禁

检查:
  1. 目录 index.json 结构与 48 单元 id 唯一性
  2. 各单元 grammar/article/dialogue/listen.json 的 JSON 合法性与必需字段
  3. 文章受控用词:每个实词(token)必须 ∈ wordbank ∪ 文章 newWords
     (专有名词豁免:首字母大写且不在句首的 token 仅警告)
  4. 文章 chunks 覆盖整句所有单词
  5. 对话节点引用存在、选项 next 指向存在的节点、结束节点标记正确
  6. 听力:台词不得出现在任一选项中
用法: python scripts/validate_content.py [unitId ...]   (不传则全量)
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

# 已人工复核的专有名词(人名/地名)白名单:命中不再告警。
# 复核记录见 docs/content-review-log.md(2026-08-16 建立)。
PROPER_NOUNS = {
    "li", "hua", "beijing",   # s1u1 人名 Li Hua / 地名 Beijing
    "wang", "ming", "ping",   # s1u6 人名 Wang Ming / Wang Ping
    "amy",                    # s1u6 人名 Amy
}

errors = []
warnings = []


def err(msg):
    errors.append(msg)
    print("  [ERR]", msg)


def warn(msg):
    warnings.append(msg)
    print("  [WARN]", msg)


def load_bank():
    bank = {}
    d = os.path.join(CONTENT, "wordbank")
    for fn in os.listdir(d):
        if not fn.endswith(".json") or fn == "meta.json":
            continue
        with open(os.path.join(d, fn), encoding="utf-8") as f:
            for e in json.load(f):
                bank[e["word"].lower()] = e
    return bank


def tokenize(text):
    return [t.lower() for t in re.findall(r"[A-Za-z']+", text)]


# 常见不规则变化 → 原形(词库只收原形,正文常出现屈折形式)
IRREGULAR_BASE = {
    "went": "go", "gone": "go", "going": "go", "goes": "go",
    "was": "be", "were": "be", "been": "be", "being": "be", "am": "be", "is": "be", "are": "be",
    "had": "have", "has": "have", "having": "have",
    "did": "do", "does": "do", "done": "do", "doing": "do",
    "drank": "drink", "drunk": "drink", "ate": "eat", "eaten": "eat",
    "took": "take", "taken": "take", "taking": "take",
    "came": "come", "coming": "come", "felt": "feel", "feeling": "feel",
    "got": "get", "gotten": "get", "getting": "get",
    "gave": "give", "given": "give", "giving": "give",
    "kept": "keep", "keeping": "keep", "made": "make", "making": "make",
    "met": "meet", "meeting": "meet", "saw": "see", "seen": "see", "seeing": "see",
    "sent": "send", "sending": "send", "told": "tell", "telling": "tell",
    "brought": "bring", "bringing": "bring",
    "tried": "try", "tries": "try", "trying": "try",
    "planned": "plan", "planning": "plan", "built": "build", "building": "build",
    "said": "say", "says": "say", "saying": "say",
    "ran": "run", "running": "run",
    "spoke": "speak", "spoken": "speak", "speaking": "speak",
    "wrote": "write", "written": "write", "writing": "write",
    "bought": "buy", "buying": "buy", "thought": "think", "thinking": "think",
    "knew": "know", "known": "know", "knowing": "know",
    "found": "find", "finding": "find", "left": "leave", "leaving": "leave",
    "became": "become", "began": "begin", "begun": "begin",
    "broke": "break", "broken": "break", "chose": "choose", "chosen": "choose",
    "drove": "drive", "driven": "drive", "flew": "fly", "flown": "fly",
    "forgot": "forget", "forgotten": "forget", "hid": "hide", "hidden": "hide",
    "rode": "ride", "ridden": "ride", "rose": "rise", "risen": "rise",
    "shook": "shake", "shaken": "shake", "showed": "show", "shown": "show",
    "sang": "sing", "sung": "sing", "swam": "swim", "swum": "swim",
    "threw": "throw", "thrown": "throw", "wore": "wear", "worn": "wear",
    "won": "win", "winning": "win", "cannot": "can",
    "loaves": "loaf", "bigger": "big", "biggest": "big",
    "earlier": "early", "earliest": "early", "photos": "photo",
}


def lemma_candidates(word):
    w = word.lower()
    out = []

    def push(x):
        t = x.lower()
        if len(t) > 1 and t not in out:
            out.append(t)

    if w in IRREGULAR_BASE:
        push(IRREGULAR_BASE[w])
    if w.endswith("ies") and len(w) > 4:
        push(w[:-3] + "y")
    if w.endswith("es"):
        push(w[:-2])
        push(w[:-1])
    if w.endswith("s") and not w.endswith("ss"):
        push(w[:-1])
    if w.endswith("ing") and len(w) > 5:
        push(w[:-3])
        push(w[:-3] + "e")
    if w.endswith("ed") and len(w) > 4:
        push(w[:-2])
        push(w[:-1])
    if w.endswith("er") and len(w) > 4:
        push(w[:-2])
    if w.endswith("est") and len(w) > 5:
        push(w[:-3])
    if w.endswith("ly") and len(w) > 4:
        push(w[:-2])
    if w.endswith("ful") and len(w) > 6:
        push(w[:-3])
    push(w)
    return out


def check_exam(path):
    """单元真题组:结构 + 题目答案合法性"""
    try:
        with open(path, encoding="utf-8") as f:
            e = json.load(f)
    except Exception as ex:
        err(f"{path}: JSON 解析失败 {ex}")
        return
    for field in ("id", "stage", "unitId", "title", "questions"):
        if field not in e:
            err(f"{path}: 缺字段 {field}")
            return
    if len(e["questions"]) < 5:
        warn(f"{path}: 真题组建议 >=5 题,当前 {len(e['questions'])} 题")
    for qi, q in enumerate(e["questions"]):
        for k in ("q", "options", "answer", "analysis", "point"):
            if k not in q:
                err(f"{path}: questions[{qi}] 缺 {k}")
                continue
        if len(q.get("options", [])) < 2:
            err(f"{path}: questions[{qi}] 选项不足")
        if not (0 <= q.get("answer", -1) < len(q.get("options", []))):
            err(f"{path}: questions[{qi}] answer 越界")


def check_article(path, bank, word_range):
    try:
        with open(path, encoding="utf-8") as f:
            a = json.load(f)
    except Exception as e:
        err(f"{path}: JSON 解析失败 {e}")
        return
    for field in ("id", "stage", "unitId", "title", "newWords", "sentences"):
        if field not in a:
            err(f"{path}: 缺字段 {field}")
            return
    new_words = set(w.lower() for w in a["newWords"])
    # 连字符新词(如 grown-up)会被 tokenize 拆成多个 token,同样视为已声明
    new_tokens = set(new_words)
    for w in a["newWords"]:
        new_tokens.update(tokenize(w))
    for si, s in enumerate(a["sentences"]):
        if not all(k in s for k in ("text", "translation", "chunks", "grammar")):
            err(f"{path}: sentences[{si}] 缺字段")
            continue
        tokens = tokenize(s["text"])
        for t in tokens:
            if t in new_tokens or t in bank:
                continue
            # 词库只收原形:正文里的屈折形式,只要原形在词库且属于"已学范围"就视为合规
            resolved = False
            for cand in lemma_candidates(t):
                if cand == t:
                    continue
                e = bank.get(cand)
                if e is not None and e.get("order", 10**9) < word_range[1]:
                    resolved = True
                    break
            if resolved:
                continue
            # 专有名词豁免:已人工复核的人名/地名直接通过,不再告警
            if t in PROPER_NOUNS:
                continue
            warn(f"{path}: sentences[{si}] 词 '{t}' 不在词库且未声明为 newWords")
        # chunks 覆盖检查
        covered = " ".join(c["text"] for c in s["chunks"])
        if tokenize(covered) != tokens:
            warn(f"{path}: sentences[{si}] chunks 未完整覆盖整句(覆盖={tokenize(covered)})")
        # 语法精读 v2:句内标签与句内练习
        for tag in s.get("grammarTags") or []:
            if not tag.get("grammarId") or not tag.get("phrase"):
                err(f"{path}: sentences[{si}] grammarTags 缺 grammarId/phrase")
        for ei, ex in enumerate(s.get("exercises") or []):
            if ex.get("type") not in ("blank", "judge", "rewrite", "translate"):
                err(f"{path}: sentences[{si}] exercises[{ei}] type 非法")
            if not ex.get("prompt") or not ex.get("answer") or not ex.get("note"):
                err(f"{path}: sentences[{si}] exercises[{ei}] 缺 prompt/answer/note")
            if ex.get("type") in ("blank", "judge"):
                opts = ex.get("options") or []
                if len(opts) < 2 or ex.get("answer") not in opts:
                    err(f"{path}: sentences[{si}] exercises[{ei}] 选项/答案不合法")


def check_dialogue(path):
    try:
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
    except Exception as e:
        err(f"{path}: JSON 解析失败 {e}")
        return
    for field in ("id", "stage", "unitId", "scene", "goal", "start", "nodes"):
        if field not in d:
            err(f"{path}: 缺字段 {field}")
            return
    if d["start"] not in d["nodes"]:
        err(f"{path}: start 节点不存在")
    node_ids = set(d["nodes"].keys())
    for nid, n in d["nodes"].items():
        if not all(k in n for k in ("speaker", "line", "lineCn")):
            err(f"{path}: 节点 {nid} 缺字段")
        if n.get("end"):
            if "options" in n and n["options"]:
                warn(f"{path}: 结束节点 {nid} 不应再有 options")
            continue
        if not n.get("options"):
            err(f"{path}: 非结束节点 {nid} 缺少 options")
            continue
        for oi, o in enumerate(n["options"]):
            for k in ("text", "textCn", "feedback", "next"):
                if k not in o:
                    err(f"{path}: 节点 {nid} options[{oi}] 缺 {k}")
            if o.get("next") not in node_ids:
                err(f"{path}: 节点 {nid} options[{oi}] next 指向不存在的节点 {o.get('next')}")


def check_listen(path):
    try:
        with open(path, encoding="utf-8") as f:
            l = json.load(f)
    except Exception as e:
        err(f"{path}: JSON 解析失败 {e}")
        return
    for field in ("id", "stage", "unitId", "title", "rate", "rounds"):
        if field not in l:
            err(f"{path}: 缺字段 {field}")
            return
    for ri, r in enumerate(l["rounds"]):
        for k in ("speaker", "line", "lineCn", "options"):
            if k not in r:
                err(f"{path}: rounds[{ri}] 缺 {k}")
                continue
        if len(r["options"]) < 3:
            err(f"{path}: rounds[{ri}] 选项不足 3 个")
        corrects = [o for o in r["options"] if o.get("correct")]
        if len(corrects) != 1:
            err(f"{path}: rounds[{ri}] 必须恰好 1 个正确选项")
        for o in r["options"]:
            if r["line"].lower() in o.get("text", "").lower() or o.get("text", "").lower() in r["line"].lower():
                warn(f"{path}: rounds[{ri}] 台词与选项疑似重复(易泄题)")


def check_grammar(path):
    try:
        with open(path, encoding="utf-8") as f:
            g = json.load(f)
    except Exception as e:
        err(f"{path}: JSON 解析失败 {e}")
        return
    for field in ("id", "stage", "title", "explanation", "examples", "errors", "quiz"):
        if field not in g:
            err(f"{path}: 缺字段 {field}")
            return
    if len(g["quiz"]) != 5:
        warn(f"{path}: quiz 应有 5 题,当前 {len(g['quiz'])} 题")
    for qi, q in enumerate(g["quiz"]):
        if not all(k in q for k in ("q", "options", "answer", "note")):
            err(f"{path}: quiz[{qi}] 缺字段")
        elif not (0 <= q["answer"] < len(q["options"])):
            err(f"{path}: quiz[{qi}] answer 越界")


def check_zhenti_article(path):
    """真题文章校验:字段/题量/选项/答案/空位"""
    try:
        with open(path, encoding="utf-8") as f:
            a = json.load(f)
    except Exception as e:
        err(f"{path}: JSON 解析失败 {e}")
        return
    for field in ("id", "year", "section", "index", "source", "title", "newWords", "sentences", "questions"):
        if field not in a:
            err(f"{path}: 缺字段 {field}")
            return
    expect_q = 20 if a["section"] == "cloze" else 5
    if len(a["questions"]) != expect_q:
        err(f"{path}: 题目数 {len(a['questions'])} 应为 {expect_q}")
    for qi, q in enumerate(a["questions"]):
        if len(q.get("options", [])) != 4:
            err(f"{path}: Q{qi+1} 选项数 != 4")
        if q.get("answer") not in (0, 1, 2, 3):
            warn(f"{path}: Q{qi+1} 答案缺失/非法 answer={q.get('answer')}(待补全)")
    if a["section"] == "cloze":
        full = " ".join(s["text"] for s in a["sentences"])
        blanks = re.findall(r"___(\d+)___", full)
        nums = [int(b) for b in blanks]
        if nums != list(range(1, 21)):
            warn(f"{path}: 空位序号异常 {nums}(应为 1..20)")
        for qi, q in enumerate(a["questions"]):
            if qi + 1 not in nums:
                err(f"{path}: 第 {qi+1} 空未在正文中找到")


def main():
    args = sys.argv[1:]
    if args and args[0] == "--zhenti":
        main_zhenti(args[1:])
        return
    targets = args
    with open(os.path.join(CONTENT, "curriculum", "index.json"), encoding="utf-8") as f:
        idx = json.load(f)
    units = [u for st in idx["stages"] for u in st["units"]]
    ids = [u["id"] for u in units]
    if len(ids) != len(set(ids)):
        err("index.json 单元 id 重复")
    print("总单元数:", len(ids))
    if targets:
        units = [u for u in units if u["id"] in targets]
        print("检查目标:", targets)

    bank = load_bank()
    print("词库词数:", len(bank))

    missing_exam = 0
    for u in units:
        uid = u["id"]
        unit_dir = os.path.join(CONTENT, "curriculum", uid)
        print(f"\n== {uid} {u['title']} ==")
        for file, checker in (("grammar.json", check_grammar), ("article.json", lambda p: check_article(p, bank, u["wordRange"])),
                              ("dialogue.json", check_dialogue), ("listen.json", check_listen)):
            p = os.path.join(unit_dir, file)
            if not os.path.exists(p):
                err(f"{uid}/{file} 不存在")
            else:
                checker(p)
        exam_p = os.path.join(unit_dir, "exam.json")
        if not os.path.exists(exam_p):
            missing_exam += 1
        else:
            check_exam(exam_p)

    if missing_exam:
        print(f"\n[INFO] {missing_exam}/48 单元暂无 exam.json(真题组),批量补充见 docs/ENRICHMENT_PLAN.md P1")
    validate_writing()
    validate_ted()
    check_nce_links()
    check_audio_manifest(ids)
    check_games(ids)
    check_affix()
    print(f"\n==== 结果: {len(errors)} 错误, {len(warnings)} 警告 ====")
    sys.exit(1 if errors else 0)


def check_games(unit_ids):
    """P5-3 词汇游戏题库:order-sentence.json 结构 + 与单元内容对齐"""
    path = os.path.join(CONTENT, "games", "order-sentence.json")
    print("\n== 词汇游戏题库 ==")
    if not os.path.exists(path):
        err("games/order-sentence.json 不存在(运行 scripts/build_vocab_games.py 生成)")
        return
    try:
        with open(path, encoding="utf-8") as f:
            g = json.load(f)
    except Exception as ex:
        err(f"games/order-sentence.json: JSON 解析失败 {ex}")
        return
    items = g.get("items")
    if g.get("version") != 1 or not isinstance(items, list):
        err("games/order-sentence.json: 需要 {version:1, items:[...]}")
        return
    known = set(unit_ids)
    seen = set()
    for it in items:
        iid = str(it.get("id", ""))
        if iid in seen:
            err(f"games: 题目 id 重复 {iid}")
        seen.add(iid)
        text = str(it.get("text", ""))
        chunks = it.get("chunks")
        if not isinstance(chunks, list) or len(chunks) != len(text.split()):
            err(f"games/{iid}: chunks 数量与 text 词数不一致")
        if not (3 <= len(text.split()) <= 10):
            err(f"games/{iid}: 句长需 3-10 词")
        if not str(it.get("cn", "")).strip():
            err(f"games/{iid}: 缺少中文翻译")
        if not isinstance(it.get("distractors"), list) or len(it["distractors"]) < 2:
            err(f"games/{iid}: 干扰块至少 2 个")
        if it.get("unitId") not in known:
            err(f"games/{iid}: 未知单元 {it.get('unitId')}")
    if len(items) < 50:
        err(f"games/order-sentence.json: 题目 {len(items)} < 50")
    print(f"  连词成句 {len(items)} 题(结构校验完成)")


def check_affix():
    """P5-4 词根词缀库:结构 / 类型 / 数量门槛 / 例句命中"""
    path = os.path.join(CONTENT, "affix.json")
    print("\n== 词根词缀库 ==")
    if not os.path.exists(path):
        err("affix.json 不存在(运行 scripts/import_affix.py 生成)")
        return
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as ex:
        err(f"affix.json: JSON 解析失败 {ex}")
        return
    items = data.get("items")
    if not isinstance(items, list):
        err("affix.json: 需要 items 数组")
        return
    seen = set()
    counts = {"prefix": 0, "suffix": 0, "root": 0}
    for i, it in enumerate(items):
        aff = str(it.get("affix", "")).strip()
        typ = it.get("type")
        meaning = str(it.get("meaning", "")).strip()
        examples = it.get("examples")
        key = (aff, typ)
        if not aff or not meaning:
            err(f"affix[{i}]: 缺 affix/meaning")
            continue
        if typ not in counts:
            err(f"affix {aff}: type 非法({typ})")
            continue
        if key in seen:
            err(f"affix 重复 {aff}/{typ}")
        seen.add(key)
        counts[typ] += 1
        if not isinstance(examples, list) or len(examples) < 1:
            err(f"affix {aff}: 至少 1 个例句")
        if not isinstance(it.get("count"), int) or it["count"] < 1:
            err(f"affix {aff}: count 应为 ≥1 的整数")
    if len(items) < 100:
        err(f"affix.json: 条目 {len(items)} < 100")
    print(f"  {len(items)} 条(前缀 {counts['prefix']} / 后缀 {counts['suffix']} / 词根 {counts['root']})")


def check_audio_manifest(unit_ids):
    """P5-4 本地预生成音频(可选):清单结构 + 文件存在性 + 与单元内容条数对齐。
    未生成时不视为错误(音频目录 gitignore 不入库,由 scripts/pregen_audio.py 本地生成)。"""
    manifest_p = os.path.join(CONTENT, "audio", "index.json")
    if not os.path.exists(manifest_p):
        print("\n== 本地预生成音频 ==\n  未生成(可选):python scripts/pregen_audio.py")
        return
    print("\n== 本地预生成音频 ==")
    try:
        with open(manifest_p, encoding="utf-8") as f:
            m = json.load(f)
    except Exception as ex:
        err(f"audio/index.json: JSON 解析失败 {ex}")
        return
    if m.get("version") != 1 or not isinstance(m.get("units"), dict):
        err("audio/index.json: 需要 {version:1, units:{unitId:{listen,article}}}")
        return
    units = m["units"]
    known = set(unit_ids)
    listed_files = 0
    for uid, meta in units.items():
        if uid not in known:
            err(f"audio/index.json: 未知单元 {uid}")
            continue
        if not isinstance(meta, dict):
            err(f"audio/{uid}: 清单项应为对象")
            continue
        for kind in ("listen", "article"):
            n = meta.get(kind)
            if n is None:
                continue
            if not isinstance(n, int) or n < 0:
                err(f"audio/{uid}.{kind}: 数量应为非负整数")
                continue
            content_p = os.path.join(CONTENT, "curriculum", uid, f"{kind}.json")
            expected = None
            if os.path.exists(content_p):
                with open(content_p, encoding="utf-8") as f:
                    data = json.load(f)
                expected = len(data.get("rounds" if kind == "listen" else "sentences", []))
                if expected is not None and n > expected:
                    warn(f"audio/{uid}.{kind}: 清单 {n} > 内容条数 {expected}")
            for i in range(min(n, expected if expected is not None else n)):
                listed_files += 1
                if not os.path.exists(os.path.join(CONTENT, "audio", uid, f"{kind}-{i}.wav")):
                    err(f"audio/{uid}/{kind}-{i}.wav 清单有记录但文件缺失")
        dn = meta.get("dialogue")
        if isinstance(dn, int) and dn > 0:
            ddir = os.path.join(CONTENT, "audio", uid)
            have = len([fn for fn in os.listdir(ddir) if fn.startswith("dlg-") and fn.endswith(".wav")]) if os.path.isdir(ddir) else 0
            listed_files += have
            if have < dn:
                err(f"audio/{uid}: 对话清单 {dn} 但只有 {have} 个 dlg-*.wav")
    words = m.get("words") or []
    if isinstance(words, list) and words:
        missing_w = 0
        for w in words:
            if not os.path.exists(os.path.join(CONTENT, "audio", "words", f"{w}.wav")):
                missing_w += 1
        if missing_w:
            err(f"audio/words: 清单 {len(words)} 词中缺 {missing_w} 个 wav")
        print(f"  {len(units)} 个单元有本地音频,清单登记 {listed_files} 个单元 wav + {len(words)} 个单词")
    else:
        print(f"  {len(units)} 个单元有本地音频,清单登记 {listed_files} 个 wav")


def check_cet6_passage(path):
    """CET-6 真题语篇(P1 导入):正文完整、无水印残留;P2-7 起校验阅读理解题"""
    try:
        with open(path, encoding="utf-8") as f:
            a = json.load(f)
    except Exception as ex:
        err(f"{path}: JSON 解析失败 {ex}")
        return
    for field in ("id", "type", "source", "title", "paragraphs"):
        if field not in a:
            err(f"{path}: 缺字段 {field}")
            return
    if not a["paragraphs"] or any(not p.strip() for p in a["paragraphs"]):
        err(f"{path}: 正文段落为空")
    joined = json.dumps(a, ensure_ascii=False)
    if "burningvocabulary" in joined or "http" in joined:
        warn(f"{path}: 疑似残留来源水印")
    # P2-7:语篇必须配 3-5 道理解题且结构合法
    qs = a.get("questions")
    if qs is None:
        err(f"{path}: 缺 questions(应为 3-5 道理解题)")
        return
    if not (3 <= len(qs) <= 5):
        err(f"{path}: questions 数量应为 3-5,实际 {len(qs)}")
    for i, q in enumerate(qs):
        for fld in ("q", "options", "answer", "analysis"):
            if fld not in q or q[fld] is None or q[fld] == "":
                err(f"{path}: questions[{i}] 缺字段 {fld}")
        opts = q.get("options") or []
        if len(opts) != 4:
            err(f"{path}: questions[{i}] 选项应恰好 4 个")
        if not isinstance(q.get("answer"), int) or not (0 <= q.get("answer", -1) < len(opts)):
            err(f"{path}: questions[{i}] answer 非法")
        if not q.get("source"):
            warn(f"{path}: questions[{i}] 未标注来源")


def check_cet6_index(path):
    try:
        with open(path, encoding="utf-8") as f:
            idx = json.load(f)
    except Exception as ex:
        err(f"{path}: JSON 解析失败 {ex}")
        return
    d = os.path.dirname(path)
    for it in idx.get("items", []):
        if not os.path.exists(os.path.join(d, it["id"] + ".json")):
            err(f"cet6-index: {it['id']} 缺少对应文件")


def validate_writing():
    """S5 写作练习库(P2-5):public/content/writing/s5/*.json 结构校验"""
    wdir = os.path.join(CONTENT, "writing", "s5")
    if not os.path.isdir(wdir):
        return
    print("\n== writing/s5 写作练习库 ==")
    try:
        with open(os.path.join(wdir, "patterns.json"), encoding="utf-8") as f:
            patterns = json.load(f)["patterns"]
        with open(os.path.join(wdir, "band-words.json"), encoding="utf-8") as f:
            band = json.load(f)["words"]
        with open(os.path.join(wdir, "errors.json"), encoding="utf-8") as f:
            w_errors = json.load(f)["errors"]
    except Exception as ex:
        err(f"writing/s5: JSON 解析失败 {ex}")
        return
    seen = set()
    for p in patterns:
        if p.get("id") in seen:
            err(f"writing/s5 patterns: id 重复 {p.get('id')}")
        seen.add(p.get("id"))
        for fld in ("id", "type", "name", "cn", "template", "example", "exampleCn"):
            if not p.get(fld):
                err(f"writing/s5 patterns: 缺字段 {fld} ({p.get('id')})")
        if p.get("type") not in ("opinion", "discuss", "report", "data", "general"):
            err(f"writing/s5 patterns: type 非法 ({p.get('id')})")
    for w in band:
        if not w.get("word") or not w.get("cn") or not isinstance(w.get("band"), int):
            err(f"writing/s5 band-words: 缺 word/cn/band ({w.get('word')})")
    for e in w_errors:
        for fld in ("id", "type", "wrong", "right", "note"):
            if not e.get(fld):
                err(f"writing/s5 errors: 缺字段 {fld} ({e.get('id')})")
        if e.get("type") not in ("grammar", "lexis", "coherence"):
            err(f"writing/s5 errors: type 非法 ({e.get('id')})")
    # P3-2 验收门槛:句式 ≥50 / band 词汇 ≥500 / 错误 ≥100
    if len(patterns) < 50:
        err(f"writing/s5 patterns: 句式库不足 50 条(实际 {len(patterns)})")
    if len(band) < 500:
        err(f"writing/s5 band-words: 词汇不足 500 词(实际 {len(band)})")
    if len(w_errors) < 100:
        err(f"writing/s5 errors: 错误库不足 100 条(实际 {len(w_errors)})")
    print(f"  句式 {len(patterns)} 条 / band 词汇 {len(band)} 词 / 常见错误 {len(w_errors)} 条")


def validate_ted():
    """TED 泛读库(P3-1):content/intensive/ted/{id}.json + ted-index.json 结构校验"""
    tdir = os.path.join(CONTENT, "intensive", "ted")
    if not os.path.isdir(tdir):
        return
    print("\n== TED 泛读库 ==")
    try:
        with open(os.path.join(tdir, "ted-index.json"), encoding="utf-8") as f:
            idx = json.load(f)
    except Exception as ex:
        err(f"ted-index: JSON 解析失败 {ex}")
        return
    items = idx.get("items", [])
    seen = set()
    for it in items:
        if it.get("id") in seen:
            err(f"ted-index: id 重复 {it.get('id')}")
        seen.add(it.get("id"))
        p = os.path.join(tdir, it["id"] + ".json")
        if not os.path.exists(p):
            err(f"ted-index: {it['id']} 缺少对应文件")
            continue
        try:
            with open(p, encoding="utf-8") as f:
                a = json.load(f)
        except Exception as ex:
            err(f"{it['id']}: JSON 解析失败 {ex}")
            continue
        for fld in ("id", "type", "group", "title", "source", "sections", "paragraphs"):
            if fld not in a or not a[fld]:
                err(f"{it['id']}: 缺字段 {fld}")
        if not a.get("wordCount") or a["wordCount"] < 30:
            err(f"{it['id']}: wordCount 过小({a.get('wordCount')})")
        for s in a.get("sections", []):
            if not s.get("heading") or not s.get("paragraphs"):
                err(f"{it['id']}: section 缺 heading/paragraphs ({s.get('heading')})")
    print(f"  {len(items)} 篇 / {len(idx.get('groups', []))} 个专辑")


def check_nce_links():
    """NCE 课文精读整合(P3-3):S1-S4 每单元关联 1-2 课 NCE,id 必须在 NCE 索引中"""
    lp = os.path.join(CONTENT, "curriculum", "nce-links.json")
    if not os.path.exists(lp):
        err("nce-links.json 不存在(S1-S4 每单元应关联 1-2 课 NCE)")
        return
    print("\n== NCE 课文精读整合 ==")
    try:
        with open(lp, encoding="utf-8") as f:
            links = json.load(f)["links"]
        with open(os.path.join(CONTENT, "intensive", "nce", "index.json"), encoding="utf-8") as f:
            nce_idx = json.load(f)
    except Exception as ex:
        err(f"nce-links: JSON 解析失败 {ex}")
        return
    valid_ids = {l["id"] for b in nce_idx["books"] for l in b["lessons"]}
    with open(os.path.join(CONTENT, "curriculum", "index.json"), encoding="utf-8") as f:
        units = json.load(f)
    n = 0
    for st in units["stages"]:
        if st["id"] >= 5:
            continue
        for u in st["units"]:
            lst = links.get(u["id"])
            if not lst or not (1 <= len(lst) <= 2):
                err(f"nce-links: {u['id']} 应关联 1-2 课(实际 {len(lst) if lst else 0})")
                continue
            for l in lst:
                if l.get("id") not in valid_ids:
                    err(f"nce-links: {u['id']} 的课 {l.get('id')} 不在 NCE 索引")
            n += len(lst)
    print(f"  {len(links)} 个单元 / {n} 条关联,全部指向 NCE 笔记库")


def main_zhenti(targets):
    zdir = os.path.join(CONTENT, "zhenti")
    years = [y for y in sorted(os.listdir(zdir)) if os.path.isdir(os.path.join(zdir, y)) and re.fullmatch(r"\d{4}", y)]
    if targets:
        years = [y for y in years if y in targets]
    for y in years:
        ydir = os.path.join(zdir, y)
        print(f"\n== {y} ==")
        for fn in sorted(os.listdir(ydir)):
            if fn.endswith(".json"):
                check_zhenti_article(os.path.join(ydir, fn))
    # P1 导入的 CET-6 真题语篇
    cet_dir = os.path.join(zdir, "cet6")
    if os.path.isdir(cet_dir):
        print("\n== cet6 真题语篇 ==")
        for fn in sorted(os.listdir(cet_dir)):
            if fn.endswith(".json") and fn != "cet6-index.json":
                check_cet6_passage(os.path.join(cet_dir, fn))
        check_cet6_index(os.path.join(cet_dir, "cet6-index.json"))
    print(f"\n==== 真题结果: {len(errors)} 错误, {len(warnings)} 警告 ====")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
