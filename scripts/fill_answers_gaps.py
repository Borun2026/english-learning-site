# -*- coding: utf-8 -*-
"""fill_answers_gaps.py —— 补 5 处内容缺失(2010/2014 整题、2016 cloze14 D、2020 r4 Q37)"""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(SITE_ROOT, "public", "content", "zhenti")


def load(year, fn):
    p = os.path.join(BASE, str(year), fn + ".json")
    return json.load(open(p, encoding="utf-8")), p


def save(a, p):
    json.dump(a, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


# 1. 2010 reading-3 题1(=全局31):整题补
a, p = load(2010, "reading-3")
q = a["questions"][0]
q["q"] = "By citing the book The Tipping Point, the author intends to ______."
q["options"] = [
    "analyze the consequences of social epidemics",
    "discuss influentials' function in spreading ideas",
    "exemplify people's intuitive response to social epidemics",
    "describe the essential characteristics of influentials",
]
q["answer"] = 1
q["analysis"] = "引用《引爆点》一书是为了引出并讨论 influentials(意见领袖)在观点传播中的作用。"
save(a, p)
print("2010/reading-3 Q1 补全 ✓")

# 2. 2014 reading-4 题1(=全局36):整题补
a, p = load(2014, "reading-4")
q = a["questions"][0]
q["q"] = "According to Paragraph 1, what is the author's attitude toward the AAAS's report?"
q["options"] = ["Critical", "Appreciative", "Contemptuous", "Tolerant"]
q["answer"] = 0
q["analysis"] = "作者对 AAAS 报告持批评态度(Critical),认为其避重就轻。"
save(a, p)
print("2014/reading-4 Q1 补全 ✓")

# 3. 2016 cloze 题14 D 选项
a, p = load(2016, "cloze")
a["questions"][13]["options"][3] = "avoid"
save(a, p)
print("2016/cloze Q14 D 选项补全 ✓")

# 4. 2020 reading-4 题2(=全局37):题干+选项修复
a, p = load(2020, "reading-4")
q = a["questions"][1]
q["q"] = "It can be learned from Paragraph 2 that the digital services tax ______."
q["options"] = [
    "may trigger countermeasures against France.",
    "is apt to arouse criticism at home and abroad.",
    "aims to ease international trade tensions.",
    "will prompt the tech giants to quit France.",
]
q["answer"] = 0
save(a, p)
print("2020/reading-4 Q2 修复 ✓")
