# -*- coding: utf-8 -*-
"""build_wordbank.py —— 构建有序分级词库 + 生成 curriculum/index.json(48 单元定义)

输出:
  public/content/wordbank/{a..z}.json   有序词库(全局 order 升序=由易到难)
  public/content/wordbank/meta.json     统计信息
  public/content/curriculum/index.json  五阶段 48 单元目录
"""
import json
import os
import sys
import zipfile
from io import TextIOWrapper

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public", "content")
WORD_DIR = os.path.join(os.path.dirname(ROOT), "01_词库")
ZIP_DIR = os.path.join(WORD_DIR, "kajweb-dict", "book")
JSONL_DIR = os.path.join(WORD_DIR, "词库jsonl")

# 词书 id -> (阶段 level 0-5, 是否从 zip 提取)
BOOKS = [
    ("ChuZhong_2", 0), ("ChuZhong_3", 0), ("ChuZhongluan_2", 0),
    ("GaoZhong_2", 1), ("GaoZhong_3", 1), ("GaoZhongluan_2", 1),
]
JSONL_BOOKS = [("四级", 2), ("六级", 3), ("考研", 4), ("雅思", 5)]

# ---------------- 48 单元定义 ----------------
UNITS = [
    (1, [("基本句型与 be 动词", "问候与自我介绍"), ("一般现在时", "谈论日常生活"), ("一般过去时", "讲述周末经历"),
         ("一般将来时", "计划一次旅行"), ("冠词与名词复数", "购物买水果"), ("代词与物主", "介绍家人朋友"),
         ("形容词与副词基础", "描述城市与天气"), ("情态动词入门", "请求帮助与建议")]),
    (2, [("进行时", "咖啡馆点餐"), ("现在完成时", "聊人生经历"), ("过去完成时", "讲述错过火车"),
         ("不定式 to do", "谈论计划与目标"), ("动名词 doing", "谈论爱好"), ("被动语态", "参观工厂讲解"),
         ("定语从句", "描述理想公寓"), ("比较级与最高级", "比较手机型号"), ("情态动词推测", "猜测包裹去向"),
         ("连词与状语从句", "解释迟到原因"), ("will 与 be going to", "天气预报讨论"), ("介词基础", "问路指路")]),
    (3, [("if 条件句", "讨论学习计划"), ("wish 虚拟语气", "懊悔与愿望"), ("非谓语作定语", "描述新闻事件"),
         ("非谓语作状语", "讲述奋斗故事"), ("名词性从句", "表达观点"), ("倒装句", "正式演讲"),
         ("强调句", "澄清误解"), ("分词作状语", "描述事故经过"), ("时态综合", "复盘项目进度"),
         ("短语动词", "日常事务处理"), ("介词进阶", "商务邮件沟通"), ("限定词与数量词", "数据分析讨论")]),
    (4, [("长难句拆解法", "考研复试自我介绍"), ("从句嵌套", "导师学术交流"), ("非谓语综合与独立主格", "论文咨询"),
         ("省略与指代", "学术讲座问答"), ("英译汉技巧", "翻译实践讨论"), ("阅读题型方法论", "备考策略交流"),
         ("完形与新题型技巧", "复习经验分享"), ("考研作文句式", "写作批改讨论"), ("翻译实战", "文献翻译协作"),
         ("真题长难句精讲", "答辩演练")]),
    (5, [("学术写作句式", "学术演讲"), ("同义替换策略", "论文答辩"), ("图表描述", "数据讨论会"),
         ("观点论述框架", "观点辩论"), ("学术词汇搭配", "学术会议社交"), ("口语流利表达", "职场谈判")]),
]
STAGE_DESC = {1: "入门 · 简单句与日常对话", 2: "四级 · 常见从句与时态", 3: "六级 · 复杂语法与书面表达",
              4: "考研 · 长难句与真题实战", 5: "雅思 · 学术表达与图表"}


def get(obj, *path):
    cur = obj
    for p in path:
        if isinstance(cur, dict):
            cur = cur.get(p)
        else:
            return None
    return cur


def read_zip_jsonl(zip_path, book_id):
    with zipfile.ZipFile(zip_path) as zf:
        name = book_id + ".json"
        if name not in zf.namelist():
            return []
        with zf.open(name) as f:
            lines = TextIOWrapper(f, encoding="utf-8").read().splitlines()
    return lines


def parse_line(line):
    try:
        return json.loads(line)
    except Exception:
        return None


def extract_entry(d, level):
    w = (d.get("headWord") or "").strip().lower()
    if not w:
        return None
    wc = get(d, "content", "word", "content") or {}
    phon = get(wc, "ukphone") or get(wc, "usphone") or ""
    trans = get(wc, "trans") or []
    if not trans:
        return None
    cn = trans[0].get("tranCn") or ""
    en_def = ""
    for t in trans:
        if t.get("tranOther"):
            en_def = t["tranOther"]
            break
    example = None
    for s in get(wc, "sentence", "sentences") or []:
        if s.get("sContent"):
            example = {"en": s["sContent"], "cn": s.get("sCn") or ""}
            break
    rank = d.get("wordRank")
    return {
        "word": w, "phon": phon, "cn": cn, "enDef": en_def, "example": example,
        "level": level, "wordRank": rank if isinstance(rank, int) else None,
    }


def main():
    os.makedirs(os.path.join(PUBLIC, "wordbank"), exist_ok=True)
    os.makedirs(os.path.join(PUBLIC, "curriculum"), exist_ok=True)

    best = {}  # word -> entry(保留最低 level,同 level 保留最小 wordRank)
    for book_id, level in BOOKS:
        zips = [f for f in os.listdir(ZIP_DIR)
                if len(f.split("_", 1)) == 2 and f.split("_", 1)[1] == book_id + ".zip"]
        if not zips:
            print("MISSING ZIP", book_id)
            continue
        zpath = os.path.join(ZIP_DIR, zips[0])
        cnt = 0
        for line in read_zip_jsonl(zpath, book_id):
            d = parse_line(line)
            if not d:
                continue
            e = extract_entry(d, level)
            if not e:
                continue
            w = e["word"]
            old = best.get(w)
            if old is None or e["level"] < old["level"] or (e["level"] == old["level"] and (e["wordRank"] or 10**9) < (old["wordRank"] or 10**9)):
                best[w] = e
            cnt += 1
        print(book_id, "raw", cnt)

    for fn, level in JSONL_BOOKS:
        p = os.path.join(JSONL_DIR, fn + ".jsonl")
        if not os.path.exists(p):
            print("MISSING JSONL", p)
            continue
        cnt = 0
        with open(p, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                d = parse_line(line)
                if not d:
                    continue
                e = extract_entry(d, level)
                if not e:
                    continue
                w = e["word"]
                old = best.get(w)
                if old is None or e["level"] < old["level"] or (e["level"] == old["level"] and (e["wordRank"] or 10**9) < (old["wordRank"] or 10**9)):
                    best[w] = e
                cnt += 1
        print(fn, "raw", cnt)

    ordered = sorted(best.values(), key=lambda e: (e["level"], e["wordRank"] if e["wordRank"] is not None else 10**9))
    for i, e in enumerate(ordered):
        e["order"] = i
        if e.get("example") is None:
            e.pop("example", None)

    by_letter = {}
    level_counts = {str(k): 0 for k in range(6)}
    for e in ordered:
        letter = e["word"][0] if e["word"][0].isalpha() else "x"
        by_letter.setdefault(letter, []).append(e)
        level_counts[str(e["level"])] += 1

    for letter in sorted(by_letter):
        out = os.path.join(PUBLIC, "wordbank", letter + ".json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(by_letter[letter], f, ensure_ascii=False, separators=(",", ":"))

    # level 边界(全局 order)
    ranges = {}
    start = 0
    for lv in range(6):
        c = level_counts[str(lv)]
        ranges[str(lv)] = [start, start + c]
        start += c
    meta = {"total": len(ordered), "levelCounts": level_counts, "levelRanges": ranges}
    with open(os.path.join(PUBLIC, "wordbank", "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False)

    # 阶段池:S1=level0+1,S2=level2,S3=level3,S4=level4,S5=level5
    stage_pools = {
        1: [ranges["0"][0], ranges["1"][1]],
        2: ranges["2"],
        3: ranges["3"],
        4: ranges["4"],
        5: ranges["5"],
    }

    stages = []
    for sid, unit_list in UNITS:
        lo, hi = stage_pools[sid]
        n = len(unit_list)
        size = (hi - lo) / n
        units = []
        for i, (title, scene) in enumerate(unit_list):
            s = int(lo + round(size * i))
            e = int(lo + round(size * (i + 1)))
            units.append({
                "id": f"s{sid}u{i + 1}",
                "stage": sid,
                "title": title,
                "grammarTopic": title,
                "scene": scene,
                "wordRange": [s, e],
            })
        stages.append({"id": sid, "name": STAGE_DESC[sid].split(" · ")[0], "desc": STAGE_DESC[sid], "units": units})

    with open(os.path.join(PUBLIC, "curriculum", "index.json"), "w", encoding="utf-8") as f:
        json.dump({"version": 1, "stages": stages}, f, ensure_ascii=False, indent=1)

    print("total words:", len(ordered))
    print("levelCounts:", level_counts)
    print("units:", sum(len(u) for _, u in UNITS))
    print("index.json written")


if __name__ == "__main__":
    main()
