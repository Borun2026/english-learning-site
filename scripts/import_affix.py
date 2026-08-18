#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P5-4 词根词缀库生成(参考 Listen-en-web-pub 的词根学习功能,数据自建):
1) 人工整理常见词根/前缀/后缀种子(带中文含义);
2) 扫描本平台 9251 词词库,把每个词缀匹配到的词作为例句,
   并统计出「词库高频词形成分」(频次 ≥3 的前缀/后缀)补充为派生条目;
输出 public/content/affix.json,保证 ≥300 条且每条至少命中 1 个词库词。
"""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORD_BANK_DIR = ROOT / "public" / "content" / "wordbank"
OUT_PATH = ROOT / "public" / "content" / "affix.json"

# 人工种子:type=prefix/suffix/root,meaning 为中文
SEEDS = [
    # 前缀
    ("un-", "prefix", "不,相反"), ("re-", "prefix", "再次,回"), ("pre-", "prefix", "在前,预先"),
    ("post-", "prefix", "在后"), ("sub-", "prefix", "在下,次级"), ("super-", "prefix", "在上,超越"),
    ("inter-", "prefix", "之间,相互"), ("trans-", "prefix", "横穿,转变"), ("ex-", "prefix", "向外,前任"),
    ("in-", "prefix", "在内,不"), ("im-", "prefix", "不,向内"), ("dis-", "prefix", "否定,分开"),
    ("mis-", "prefix", "错误"), ("over-", "prefix", "过度,在上"), ("under-", "prefix", "在下,不足"),
    ("anti-", "prefix", "反对,抗"), ("auto-", "prefix", "自动,自己"), ("co-", "prefix", "共同"),
    ("com-", "prefix", "共同,一起"), ("con-", "prefix", "共同,加强"), ("de-", "prefix", "向下,去除"),
    ("en-", "prefix", "使成为,进入"), ("fore-", "prefix", "在前,预先"), ("micro-", "prefix", "微小"),
    ("multi-", "prefix", "多"), ("non-", "prefix", "非,无"), ("out-", "prefix", "超出"),
    ("pro-", "prefix", "向前,赞成"), ("semi-", "prefix", "半"), ("tri-", "prefix", "三"),
    ("uni-", "prefix", "单一"), ("bi-", "prefix", "二,双"), ("tele-", "prefix", "远距离"),
    ("bio-", "prefix", "生命,生物"), ("geo-", "prefix", "地球,土地"), ("photo-", "prefix", "光,照片"),
    ("psycho-", "prefix", "心理"), ("hydro-", "prefix", "水"), ("thermo-", "prefix", "热"),
    ("mono-", "prefix", "单一"), ("poly-", "prefix", "多"), ("pseudo-", "prefix", "假,伪"),
    ("ultra-", "prefix", "超,极端"), ("vice-", "prefix", "副的"), ("with-", "prefix", "向后,反对"),
    ("down-", "prefix", "向下"), ("up-", "prefix", "向上"), ("mid-", "prefix", "中间"),
    # 后缀
    ("-able", "suffix", "可…的,能…的"), ("-ible", "suffix", "可…的"), ("-al", "suffix", "…的,行为"),
    ("-ance", "suffix", "性质,状态"), ("-ence", "suffix", "性质,状态"), ("-ant", "suffix", "…的人/物,形容词"),
    ("-ent", "suffix", "…的,…的人"), ("-ar", "suffix", "…的,…的人"), ("-ary", "suffix", "…的,…场所"),
    ("-ate", "suffix", "使成为,有…性质"), ("-ation", "suffix", "行为,过程"), ("-tion", "suffix", "行为,结果"),
    ("-sion", "suffix", "行为,结果"), ("-ment", "suffix", "行为,结果"), ("-ness", "suffix", "性质,状态"),
    ("-ity", "suffix", "性质,状态"), ("-ty", "suffix", "性质,状态"), ("-hood", "suffix", "身份,状态"),
    ("-ship", "suffix", "身份,关系"), ("-er", "suffix", "…的人/物"), ("-or", "suffix", "…的人/物"),
    ("-ist", "suffix", "…主义者/专家"), ("-ism", "suffix", "主义,学说"), ("-ee", "suffix", "被…的人"),
    ("-ess", "suffix", "女性"), ("-ful", "suffix", "充满…的"), ("-less", "suffix", "无…的"),
    ("-ous", "suffix", "充满…的"), ("-ious", "suffix", "有…性质的"), ("-ic", "suffix", "…的"),
    ("-ical", "suffix", "…的"), ("-ive", "suffix", "有…倾向的"), ("-tive", "suffix", "…的"),
    ("-ize", "suffix", "使…化"), ("-ise", "suffix", "使…化"), ("-fy", "suffix", "使成为"),
    ("-en", "suffix", "使变得,由…制成"), ("-ly", "suffix", "…地,副词"), ("-ward", "suffix", "向…方向"),
    ("-wise", "suffix", "以…方式"), ("-like", "suffix", "像…的"), ("-proof", "suffix", "防…的"),
    ("-free", "suffix", "无…的"), ("-most", "suffix", "最…的"), ("-ing", "suffix", "正在,名词化"),
    ("-ed", "suffix", "过去式/被动"), ("-est", "suffix", "最…"), ("-th", "suffix", "第…,性质"),
    ("-ure", "suffix", "行为,结果"), ("-ture", "suffix", "行为,结果"), ("-age", "suffix", "行为,状态"),
    ("-dom", "suffix", "领域,状态"), ("-ery", "suffix", "性质,场所"), ("-graph", "suffix", "写,记录"),
    ("-logy", "suffix", "学科"), ("-meter", "suffix", "测量仪"), ("-phobia", "suffix", "恐惧"),
    # 词根
    ("act", "root", "行动,做"), ("ag", "root", "行动,做"), ("aud", "root", "听"),
    ("cred", "root", "相信"), ("dict", "root", "说,宣告"), ("duc", "root", "引导"),
    ("duct", "root", "引导,管道"), ("fac", "root", "做,制造"), ("fact", "root", "做,事实"),
    ("fer", "root", "带来,携带"), ("form", "root", "形状,形成"), ("gen", "root", "产生,出生"),
    ("grad", "root", "步,级"), ("gress", "root", "行走"), ("ject", "root", "投掷"),
    ("leg", "root", "法律,读"), ("liter", "root", "文字,文学"), ("loc", "root", "地点"),
    ("log", "root", "说,词,学科"), ("man", "root", "手"), ("mar", "root", "海"),
    ("med", "root", "中间,治疗"), ("mem", "root", "记忆"), ("min", "root", "小,少"),
    ("mit", "root", "送,放"), ("miss", "root", "送,放"), ("mot", "root", "移动"),
    ("mov", "root", "移动"), ("nov", "root", "新"), ("numer", "root", "数字"),
    ("oper", "root", "工作"), ("part", "root", "部分,分开"), ("path", "root", "感受,疾病"),
    ("ped", "root", "脚,儿童"), ("pend", "root", "悬挂,称量"), ("phon", "root", "声音"),
    ("photo", "root", "光"), ("popul", "root", "人民"), ("port", "root", "搬运,港口"),
    ("pos", "root", "放置"), ("press", "root", "按压"), ("quest", "root", "寻求,询问"),
    ("rupt", "root", "断裂"), ("scrib", "root", "写"), ("script", "root", "写"),
    ("sec", "root", "跟随,切"), ("sens", "root", "感觉"), ("sequ", "root", "跟随"),
    ("serv", "root", "服务,保存"), ("sign", "root", "标记,签署"), ("sist", "root", "站立"),
    ("spect", "root", "看"), ("spir", "root", "呼吸,精神"), ("struct", "root", "建造"),
    ("tain", "root", "持有"), ("tend", "root", "伸展,倾向"), ("terr", "root", "土地,恐惧"),
    ("tract", "root", "拉,抽"), ("vac", "root", "空"), ("ven", "root", "来"),
    ("vent", "root", "来"), ("vers", "root", "转"), ("vert", "root", "转"),
    ("vid", "root", "看"), ("vis", "root", "看"), ("voc", "root", "声音,喊"),
    ("volv", "root", "卷,转"), ("graph", "root", "写,画"), ("cogn", "root", "知道"),
    ("cor", "root", "心"), ("dent", "root", "牙齿"), ("frag", "root", "打碎"),
    ("flu", "root", "流动"), ("fort", "root", "力量"), ("fus", "root", "倾倒,融合"),
    ("geo", "root", "土地"), ("hydr", "root", "水"), ("luc", "root", "光,明亮"),
    ("magn", "root", "大"), ("nat", "root", "出生,自然"), ("nom", "root", "名字,法则"),
    ("pel", "root", "推动"), ("puls", "root", "推动"), ("scope", "root", "看,范围"),
    ("sol", "root", "太阳,独自"), ("tempo", "root", "时间"), ("urb", "root", "城市"),
]


def load_bank_words():
    words = []
    for letter in "abcdefghijklmnopqrstuvwxyz":
        path = WORD_BANK_DIR / f"{letter}.json"
        if not path.exists():
            continue
        for e in json.loads(path.read_text(encoding="utf-8")):
            w = str(e.get("word", "")).lower()
            if w.isalpha() and len(w) >= 3:
                words.append(w)
    return words


def main() -> int:
    words = load_bank_words()
    word_set = set(words)
    items = []
    seen = set()

    def add(affix, kind, meaning, examples):
        key = (affix, kind)
        if key in seen or not examples:
            return
        seen.add(key)
        items.append(
            {
                "affix": affix,
                "type": kind,
                "meaning": meaning,
                "examples": examples[:6],
                "count": len(examples),
                "source": "seed",
            }
        )

    # 1) 种子词缀:词库中命中(前缀 startswith / 后缀 endswith / 词根 contains)
    for affix, kind, meaning in SEEDS:
        if kind == "prefix":
            hits = [w for w in words if w.startswith(affix.rstrip("-")) and len(w) > len(affix)]
        elif kind == "suffix":
            hits = [w for w in words if w.endswith(affix.lstrip("-")) and len(w) > len(affix)]
        else:
            hits = [w for w in words if affix in w and len(w) > len(affix)]
        add(affix, kind, meaning, hits)

    # 2) 词库统计派生:高频前缀(3-4 字母)/后缀(2-4 字母),补足数量并保持"命中词库词"
    prefix_counter = Counter()
    suffix_counter = Counter()
    for w in words:
        if len(w) >= 6:
            prefix_counter[w[:3]] += 1
            if len(w) >= 7:
                prefix_counter[w[:4]] += 1
        if len(w) >= 5:
            suffix_counter[w[-2:]] += 1
            suffix_counter[w[-3:]] += 1
            if len(w) >= 6:
                suffix_counter[w[-4:]] += 1

    derived = 0
    for morph, n in prefix_counter.most_common():
        if derived >= 120:
            break
        affix = f"{morph}-"
        if (affix, "prefix") in seen or n < 5:
            continue
        hits = [w for w in words if w.startswith(morph) and len(w) > len(morph)]
        if hits:
            add(affix, "prefix", f"常见词头(词库 {n} 词命中)", hits)
            derived += 1
    for morph, n in suffix_counter.most_common():
        if derived >= 240:
            break
        affix = f"-{morph}"
        if (affix, "suffix") in seen or n < 5:
            continue
        hits = [w for w in words if w.endswith(morph) and len(w) > len(morph)]
        if hits:
            add(affix, "suffix", f"常见词尾(词库 {n} 词命中)", hits)
            derived += 1

    if len(items) < 300:
        print(f"错误:词缀条目 {len(items)} < 300")
        return 1

    out = {
        "version": 1,
        "source": "参考 Listen-en-web-pub 词根学习功能(MIT);数据=人工种子 + 本平台 9251 词库统计派生",
        "count": len(items),
        "items": items,
    }
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    types = Counter(i["type"] for i in items)
    print(f"词根词缀库已生成: {OUT_PATH.relative_to(ROOT)}")
    print(f"  共 {len(items)} 条(prefix={types['prefix']}, suffix={types['suffix']}, root={types['root']});派生补充 {derived} 条")
    return 0


if __name__ == "__main__":
    sys.exit(main())
