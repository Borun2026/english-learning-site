# -*- coding: utf-8 -*-
"""fill_answers_2020.py —— 把 2020 年答案+解析写入 public/content/zhenti/2020/*.json
答案来源:中公/高顿/新东方交叉验证(2020 考研英语一)"""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(SITE_ROOT, "public", "content", "zhenti", "2020")

CLOZE_ANS = ["C", "A", "B", "D", "A", "B", "D", "A", "D", "C",
             "C", "A", "B", "D", "C", "B", "A", "B", "C", "D"]
CLOZE_NOTE = [
    "On 与具体某一天搭配(a cold winter's day),表示'在'。",
    "match 比得上,前文说这是 great traditions,很少有快乐能与之匹敌。",
    "enjoyment 是对上文 pleasures 的同义复现。",
    "guaranteed to damage 注定损害健康,与 guilty pleasure 语义衔接。",
    "issued 与 a public warning 搭配,表示'正式发布'。",
    "at high temperatures 在高温下,固定搭配。",
    "avoid 避免,高温烹饪有害,所以应避免把土豆烤焦。",
    "partially 部分地,与 and 并列的'只烤半分熟'语义相近。",
    "While 表让步'尽管',小鼠有损证据 vs 人类无致癌证据形成对比。",
    "conclusive 决定性的,no conclusive evidence 无确凿证据。",
    "likely 很可能,but 前说可能致癌、后说无硬证据,语义相反。",
    "On the basis of 基于,基于预防原则可认为应听从 FSA 建议。",
    "advisable 明智可取的,基于预防原则听从建议是明智的。",
    "After all 毕竟,呼应吸烟与癌症的传闻先于证据。",
    "connection 联系,smoking-cancer 联系在证据出现前已被谣传。",
    "served up 上菜,固定搭配,一片煮牛肉被端上桌。",
    "To be fair 公平地说,FSA 并非禁吃烤食只是减量。",
    "entirely 完全地,but 转折:不是完全不吃,而是减少摄入。",
    "campaign 运动/活动,但 FSA 的这场运动风险在于没人听。",
    "end up 以…告终,健康恐慌最终以无人理会告终。",
]
READING_ANS = [
    ["C", "B", "C", "A", "C"],
    ["A", "D", "B", "D", "C"],
    ["A", "C", "D", "C", "B"],
    ["C", "A", "B", "C", "B"],
]
READING_NOTE = [
    ["attracting funding and creating jobs → 经济实力的提升。",
     "第二段认为英国无能力再申请更高头衔,是自我庆祝(self-deceiving attempt)。",
     "真正成功的称号持有者做的远不止办活动,是把地方艺术带到台前。",
     "But 引出 Glasgow 例子,与前文论点形成对比(contrasting case)。",
     "尾段 honouring/supporting 表明作者态度正面(Favourable)。"],
    ["出版业'印钱许可',因获取内容几乎不花钱(学者无偿供稿)。",
     "爱思唯尔主要靠大学图书馆订阅赚钱(thrived on university libraries)。",
     "作者认为合法生态失去合法性,是担忧(Concerned)。",
     "开放获取条款允许出版商在公开前先盈利(allow publishers some room)。",
     "少数大公司赚取巨额利润,即'少数靠多数供养'(The few feed on the many)。"],
    ["法案对减少性别偏见帮助甚微(does little to help average people)。",
     "该措施可能违宪(probably unconstitutional)。",
     "例证题:质疑政府干预的必要性(needlessness of government interventions)。",
     "挪威配额制导致不称职者进入董事会(less experienced boards)。",
     "主旨:政策制定应把可行性放在首位(Feasibility)。"],
    ["法国参议院通过数字服务税,即向科技跨国公司征税(impose a levy)。",
     "可能招致对法国的反制措施(trade sanctions against France)。",
     "各国认为现行国际税收体系需升级(failed to keep up)。",
     "OECD 当前工作前景不明(questions about the future)。",
     "主旨题:法国引领数字税(leads the charge on Digital Tax)。"],
]


def main():
    # 完形
    p = os.path.join(OUT, "cloze.json")
    a = json.load(open(p, encoding="utf-8"))
    for i, q in enumerate(a["questions"]):
        q["answer"] = ord(CLOZE_ANS[i]) - ord("A")
        q["analysis"] = CLOZE_NOTE[i]
    json.dump(a, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("cloze 补全:", sum(1 for q in a["questions"] if q["answer"] != -1), "/ 20")

    # 阅读 1-4
    for n in range(1, 5):
        p = os.path.join(OUT, f"reading-{n}.json")
        a = json.load(open(p, encoding="utf-8"))
        for i, q in enumerate(a["questions"]):
            q["answer"] = ord(READING_ANS[n - 1][i]) - ord("A")
            q["analysis"] = READING_NOTE[n - 1][i]
        json.dump(a, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"reading-{n} 补全:", sum(1 for q in a["questions"] if q["answer"] != -1), "/ 5")


if __name__ == "__main__":
    main()
