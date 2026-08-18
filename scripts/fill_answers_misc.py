# -*- coding: utf-8 -*-
"""fill_answers_misc.py —— 补 12 个零星缺题(来源:m2kar 答案解析 PDF 提取)"""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(SITE_ROOT, "public", "content", "zhenti")

FIXES = [
    # (year, file, 文件内题号(1-based), answer_letter, analysis)
    (2005, "cloze", 14, "C", "大脑让所有接收器一直工作是一种低效率(inefficient)的方式,故嗅觉不敏感。"),
    (2005, "reading-1", 4, "C", "与人类一样,卷尾猴只有感到自己未受欺骗时合作才稳定,故'觉得受骗就不合作'。"),
    (2006, "reading-2", 3, "C", "Stratford cries poor 实为'哭穷'传统——镇上宾馆纷纷扩建,并非真缺钱。"),
    (2006, "reading-3", 2, "A", "老渔场大型捕食动物的物种资源已减少约90%,而非渔场数量减半。"),
    (2007, "reading-2", 3, "A", "现在智商计分方式已改变,故无人再能获得莎凡那么高的分数。"),
    (2007, "reading-3", 2, "B", "布什社保改革改为储蓄账户模式,使退休人员养老金取决于投资、风险更大。"),
    (2008, "cloze", 6, "A", "at the thought of:即将要做的事只能'想到',不能'看到'或'冒风险'。"),
    (2008, "reading-1", 2, "D", "耶胡达的研究表明女性承受的压力更多,而非不能调节压力。"),
    (2011, "reading-2", 1, "B", "McGee 离职时解释 surprisingly straight up,态度坦率。"),
    (2015, "reading-2", 3, "A", "翻看他人手机内容相当于进入其住宅(getting into one's residence)。"),
    (2015, "reading-3", 1, "B", "Science 杂志给同行评审加统计检查,表明各大期刊正在加强统计核查。"),
    (2015, "reading-4", 1, "A", "Elizabeth 不安的根源是当前分类机制(sorting mechanism)的后果。"),
]


def main():
    for year, fn, qi, letter, analysis in FIXES:
        p = os.path.join(BASE, str(year), fn + ".json")
        a = json.load(open(p, encoding="utf-8"))
        q = a["questions"][qi - 1]
        q["answer"] = ord(letter) - ord("A")
        q["analysis"] = analysis
        json.dump(a, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"{year}/{fn} 题{qi} -> {letter} ✓")


if __name__ == "__main__":
    main()
