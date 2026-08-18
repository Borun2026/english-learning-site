#!/usr/bin/env python3
"""生成 public/content/writing/s5/ 写作练习库(P2-5):句式库 / band 词汇 / 常见错误。

说明:ROADMAP 原计划从 raw_materials/ 的 typogrammar PDF 提取(import_typo.py);
该 PDF 未随仓库存在,本脚本先以人工整理的种子数据生成三库,
后续 P3-2 拿到 PDF 后可替换/扩充这三个文件(契约见 src/lib/types.ts)。
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "content", "writing", "s5")

PATTERNS = [
    # 观点类
    {"id": "p01", "type": "opinion", "name": "It is widely believed that …", "cn": "人们普遍认为……(观点引入)",
     "template": "It is widely believed that + 从句",
     "example": "It is widely believed that higher education plays a decisive role in career development.",
     "exampleCn": "人们普遍认为,高等教育在职业发展中起着决定性作用。",
     "tips": ["适合开头段引入普遍观点", "后文可接 However/While 引出自己的立场"]},
    {"id": "p02", "type": "opinion", "name": "There is no doubt that …", "cn": "毫无疑问……(强调)",
     "template": "There is no doubt that + 从句",
     "example": "There is no doubt that traffic congestion has become a pressing urban issue.",
     "exampleCn": "毫无疑问,交通拥堵已成为一个紧迫的城市问题。",
     "tips": ["语气强,观点立场必须站得住", "注意 doubt 后接 that 从句(肯定句中也可用 whether)"]},
    {"id": "p03", "type": "discuss", "name": "One compelling argument in favour of … is that …", "cn": "支持……的一个有力论点是……(论证)",
     "template": "One compelling argument in favour of / against + 名词 is that + 从句",
     "example": "One compelling argument in favour of remote work is that it gives employees greater flexibility.",
     "exampleCn": "支持远程办公的一个有力论点是它给了员工更大的灵活性。",
     "tips": ["主体段首句展开分论点", "argument 后可换 benefit/drawback"]},
    {"id": "p04", "type": "discuss", "name": "While it is true that …, it must be acknowledged that …", "cn": "虽然……没错,但也必须承认……(让步反驳)",
     "template": "While it is true that + 从句, it must be acknowledged that + 从句",
     "example": "While it is true that technology saves time, it must be acknowledged that it can also be a source of distraction.",
     "exampleCn": "虽然技术确实节省时间,但也必须承认它可能让人分心。",
     "tips": ["讨论双边题型的高分句式", "两半句用逗号连接,不用 but"]},
    # 报告类
    {"id": "p05", "type": "report", "name": "The primary reason for this is that …", "cn": "其首要原因是……(归因)",
     "template": "The primary reason for + 名词 is that + 从句",
     "example": "The primary reason for this trend is that young people now value experiences over possessions.",
     "exampleCn": "这一趋势的首要原因是,年轻人如今更看重体验而非物质。",
     "tips": ["reason for 后接名词/动名词", "可替换 primary → key/main"]},
    {"id": "p06", "type": "report", "name": "This can be attributed to …", "cn": "这可以归因于……(学术归因)",
     "template": "This (phenomenon/trend) can be attributed to + 名词/动名词",
     "example": "The sharp decline in birth rates can be attributed to rising living costs.",
     "exampleCn": "出生率的急剧下降可归因于不断上升的生活成本。",
     "tips": ["attribute A to B:A 被归因于 B", "被动语态是学术写作高频结构"]},
    # 数据类(小作文)
    {"id": "p07", "type": "data", "name": "In contrast to A, B …", "cn": "与 A 相比,B……(对比)",
     "template": "In contrast to + 名词, + 名词 + 谓语",
     "example": "In contrast to urban areas, rural regions saw a modest rise of only 2%.",
     "exampleCn": "与城市地区相比,农村地区仅小幅上升了 2%。",
     "tips": ["也可用 By contrast, 开头", "对比项必须同类可比"]},
    {"id": "p08", "type": "data", "name": "The figure rose dramatically from … to …", "cn": "数字从……急剧上升到……(趋势描述)",
     "template": "The figure rose/fell dramatically from + 数值 to + 数值 over the period.",
     "example": "The figure for car ownership rose dramatically from 40% to 78% over the period.",
     "exampleCn": "汽车拥有率在此期间从 40% 急剧上升到 78%。",
     "tips": ["dramatically 可换 sharply/significantly/slightly", "over the period 呼应图表时间跨度"]},
    {"id": "p09", "type": "data", "name": "X is expected to witness a steady increase", "cn": "预计 X 将迎来稳步增长(预测)",
     "template": "X is expected/predicted to witness + 趋势名词",
     "example": "Online sales are expected to witness a steady increase over the next decade.",
     "exampleCn": "预计未来十年网络销售额将稳步增长。",
     "tips": ["witness 拟人化写法,图表作文加分", "主语一般不是人"]},
    # 通用高分结构
    {"id": "p10", "type": "general", "name": "Only by doing X can we …", "cn": "只有通过做 X,我们才能……(倒装强调)",
     "template": "Only by + doing + 助动词/情态动词 + 主语 + 动词原形",
     "example": "Only by raising public awareness can we reverse this worrying trend.",
     "exampleCn": "只有提高公众意识,我们才能扭转这一令人担忧的趋势。",
     "tips": ["Only 开头+状语 → 主句部分倒装", "倒装后语序:can we / will they / does it"]},
    {"id": "p11", "type": "general", "name": "Not only does X …, but it also …", "cn": "X 不仅……,而且……(递进倒装)",
     "template": "Not only + 助动词 + 主语 + 动词原形, but + 主语 + also + 谓语",
     "example": "Not only does regular exercise improve health, but it also relieves stress.",
     "exampleCn": "规律运动不仅能改善健康,还能缓解压力。",
     "tips": ["Not only 置于句首 → 前半句部分倒装", "后半句用正常语序"]},
    {"id": "p12", "type": "general", "name": "Provided that …, X will …", "cn": "只要……,X 就会……(条件)",
     "template": "Provided that + 从句, + 主句",
     "example": "Provided that proper supervision is in place, children can benefit greatly from the internet.",
     "exampleCn": "只要有适当的监管,儿童就能从互联网中大大受益。",
     "tips": ["provided that ≈ as long as ≈ if", "书面语气比 if 更强,注意从句用一般现在时表将来"]},
]

BAND_WORDS = [
    {"word": "demonstrate", "cn": "证明;表明", "band": 7, "pos": "v.", "replaceFor": "show",
     "example": "The survey demonstrates a clear link between sleep and productivity.",
     "exampleCn": "该调查表明睡眠与效率之间存在明显关联。"},
    {"word": "significant", "cn": "显著的;重要的", "band": 7, "pos": "adj.", "replaceFor": "big / important",
     "example": "There has been a significant increase in online education.",
     "exampleCn": "在线教育出现了显著增长。"},
    {"word": "consequently", "cn": "因此", "band": 7, "pos": "adv.", "replaceFor": "so / therefore",
     "example": "Demand fell; consequently, prices dropped sharply.",
     "exampleCn": "需求下降,因此价格大幅下跌。"},
    {"word": "moreover", "cn": "此外", "band": 7, "pos": "adv.", "replaceFor": "also / besides",
     "example": "The policy is fair; moreover, it is easy to implement.",
     "exampleCn": "该政策公平,而且易于实施。"},
    {"word": "nevertheless", "cn": "然而;尽管如此", "band": 8, "pos": "adv.", "replaceFor": "however / but",
     "example": "The plan is costly; nevertheless, it is worth pursuing.",
     "exampleCn": "该计划成本高昂,尽管如此仍值得推进。"},
    {"word": "alleviate", "cn": "缓解;减轻", "band": 8, "pos": "v.", "replaceFor": "reduce / relieve",
     "example": "Better public transport can alleviate traffic congestion.",
     "exampleCn": "更好的公共交通可以缓解交通拥堵。"},
    {"word": "enhance", "cn": "提高;增强", "band": 7, "pos": "v.", "replaceFor": "improve",
     "example": "Reading widely can enhance critical thinking skills.",
     "exampleCn": "广泛阅读能提高批判性思维能力。"},
    {"word": "facilitate", "cn": "促进;使便利", "band": 8, "pos": "v.", "replaceFor": "help / promote",
     "example": "The internet facilitates communication across borders.",
     "exampleCn": "互联网促进了跨境交流。"},
    {"word": "advocate", "cn": "提倡;主张", "band": 7, "pos": "v.", "replaceFor": "support",
     "example": "Many experts advocate a gradual transition to clean energy.",
     "exampleCn": "许多专家主张逐步过渡到清洁能源。"},
    {"word": "detrimental", "cn": "有害的", "band": 8, "pos": "adj.", "replaceFor": "harmful",
     "example": "Excessive screen time is detrimental to children's eyesight.",
     "exampleCn": "过度使用屏幕对儿童视力有害。"},
    {"word": "prevalent", "cn": "普遍的;流行的", "band": 7, "pos": "adj.", "replaceFor": "common / popular",
     "example": "Obesity has become increasingly prevalent among teenagers.",
     "exampleCn": "肥胖在青少年中变得越来越普遍。"},
    {"word": "surge", "cn": "激增", "band": 7, "pos": "n./v.", "replaceFor": "rise sharply",
     "example": "The city witnessed a surge in tourism last summer.",
     "exampleCn": "去年夏天该市旅游业激增。"},
    {"word": "plummet", "cn": "暴跌", "band": 7, "pos": "v.", "replaceFor": "fall sharply",
     "example": "Shares plummeted after the scandal was exposed.",
     "exampleCn": "丑闻曝光后股价暴跌。"},
    {"word": "fluctuate", "cn": "波动", "band": 7, "pos": "v.", "replaceFor": "change repeatedly",
     "example": "Oil prices fluctuated considerably between 2010 and 2020.",
     "exampleCn": "2010 至 2020 年间油价大幅波动。"},
    {"word": "proportion", "cn": "比例", "band": 7, "pos": "n.", "replaceFor": "percentage / part",
     "example": "A large proportion of graduates now work remotely.",
     "exampleCn": "如今很大比例的毕业生远程办公。"},
    {"word": "considerable", "cn": "相当大的", "band": 7, "pos": "adj.", "replaceFor": "a lot of / large",
     "example": "The project requires considerable investment.",
     "exampleCn": "该项目需要相当大的投资。"},
    {"word": "substantial", "cn": "大量的;实质的", "band": 8, "pos": "adj.", "replaceFor": "large / major",
     "example": "Substantial progress has been made in renewable energy.",
     "exampleCn": "可再生能源领域取得了实质性进展。"},
    {"word": "comprehensive", "cn": "全面的", "band": 8, "pos": "adj.", "replaceFor": "complete / thorough",
     "example": "A comprehensive survey was conducted across 30 cities.",
     "exampleCn": "在 30 个城市开展了全面调查。"},
    {"word": "feasible", "cn": "可行的", "band": 7, "pos": "adj.", "replaceFor": "possible / practical",
     "example": "Building more cycle lanes is both cheap and feasible.",
     "exampleCn": "修建更多自行车道既便宜又可行。"},
    {"word": "implement", "cn": "实施;执行", "band": 7, "pos": "v.", "replaceFor": "carry out / do",
     "example": "The government plans to implement the reform next year.",
     "exampleCn": "政府计划明年实施这项改革。"},
    {"word": "sustainable", "cn": "可持续的", "band": 8, "pos": "adj.", "replaceFor": "lasting / green",
     "example": "Sustainable development requires long-term planning.",
     "exampleCn": "可持续发展需要长远规划。"},
    {"word": "controversy", "cn": "争议", "band": 7, "pos": "n.", "replaceFor": "debate / argument",
     "example": "The proposal has sparked considerable controversy.",
     "exampleCn": "该提案引发了相当大的争议。"},
    {"word": "consensus", "cn": "共识", "band": 8, "pos": "n.", "replaceFor": "agreement",
     "example": "There is a growing consensus that early education matters.",
     "exampleCn": "越来越多的人达成共识:早期教育很重要。"},
    {"word": "notwithstanding", "cn": "尽管;虽然", "band": 9, "pos": "prep./adv.", "replaceFor": "despite",
     "example": "Notwithstanding the cost, the benefits are undeniable.",
     "exampleCn": "尽管成本高昂,其好处不可否认。"},
    {"word": "paradigm", "cn": "范式;模式", "band": 9, "pos": "n.", "replaceFor": "model / pattern",
     "example": "Remote work represents a paradigm shift in employment.",
     "exampleCn": "远程办公代表了就业模式的转变。"},
    {"word": "mitigate", "cn": "减轻;缓和", "band": 8, "pos": "v.", "replaceFor": "reduce / soften",
     "example": "Tree planting can mitigate the effects of heat waves.",
     "exampleCn": "植树可以减轻热浪的影响。"},
    {"word": "incentive", "cn": "激励;动力", "band": 7, "pos": "n.", "replaceFor": "motivation / reward",
     "example": "Tax breaks give firms a strong incentive to innovate.",
     "exampleCn": "税收减免给企业提供了强大的创新动力。"},
    {"word": "correlation", "cn": "相关性", "band": 8, "pos": "n.", "replaceFor": "connection / link",
     "example": "Studies show a strong correlation between diet and health.",
     "exampleCn": "研究表明饮食与健康存在强相关性。"},
    {"word": "viable", "cn": "可行的;能存续的", "band": 7, "pos": "adj.", "replaceFor": "workable",
     "example": "Solar power is now a viable alternative to coal.",
     "exampleCn": "太阳能如今已是煤炭的可行替代品。"},
    {"word": "account for", "cn": "占(比例);解释", "band": 7, "pos": "phr.", "replaceFor": "make up / explain",
     "example": "Private cars account for roughly 60% of urban emissions.",
     "exampleCn": "私家车约占城市排放的 60%。"},
]

ERRORS = [
    {"id": "e01", "type": "grammar", "wrong": "every students", "right": "every student / all students",
     "note": "every 后接可数名词单数;复数要用 all。"},
    {"id": "e02", "type": "grammar", "wrong": "people is", "right": "people are",
     "note": "people 是集合名词,本身表复数,谓语用 are。"},
    {"id": "e03", "type": "grammar", "wrong": "more easier", "right": "much easier / easier",
     "note": "比较级前用 much/far 加强,不能再用 more 叠加。"},
    {"id": "e04", "type": "grammar", "wrong": "Although …, but …", "right": "Although …, …(去掉 but)",
     "note": "although 与 but 都是连词,一个从句只能用一个。"},
    {"id": "e05", "type": "grammar", "wrong": "Because …, so …", "right": "Because …, … / …, so …",
     "note": "because 与 so 不能同句连用,二选一。"},
    {"id": "e06", "type": "grammar", "wrong": "the number of people are increasing", "right": "the number of people is increasing",
     "note": "the number of 强调数量本身,谓语用单数;a number of 才接复数。"},
    {"id": "e07", "type": "grammar", "wrong": "can be able to", "right": "can / be able to",
     "note": "can 与 be able to 语义重复,二选一。"},
    {"id": "e08", "type": "grammar", "wrong": "many informations / knowledges", "right": "much information / much knowledge",
     "note": "information、knowledge、advice 等不可数,不用复数。"},
    {"id": "e09", "type": "lexis", "wrong": "discuss about the problem", "right": "discuss the problem",
     "note": "discuss 是及物动词,直接接宾语,不加 about。"},
    {"id": "e10", "type": "lexis", "wrong": "In my opinion, I think …", "right": "In my opinion, … / I think …",
     "note": "两种表达语义重复,保留一个即可。"},
    {"id": "e11", "type": "lexis", "wrong": "a lot of people", "right": "a large number of people / many people",
     "note": "学术写作尽量用 many/a great number of/a considerable number of 替换 a lot of。"},
    {"id": "e12", "type": "lexis", "wrong": "very important", "right": "crucial / vital / essential",
     "note": "用高阶同义词替换 very + 形容词,是提 band 的捷径。"},
    {"id": "e13", "type": "coherence", "wrong": "Last but not least, …", "right": "Finally, … / A further point is that …",
     "note": "模板痕迹重,考官易反感;用自然衔接词。"},
    {"id": "e14", "type": "coherence", "wrong": "On the one hand … On the other hand …(内容不构成对比)", "right": "改用 Firstly/Secondly 或真正对立的对比",
     "note": "on the other hand 要求真正的对立关系,不能只当列举用。"},
    {"id": "e15", "type": "grammar", "wrong": "depend on do sth", "right": "depend on doing sth / depend on + 名词",
     "note": "depend on 是介词短语,后接动名词或名词。"},
    {"id": "e16", "type": "grammar", "wrong": "suggest sb to do sth", "right": "suggest doing sth / suggest that sb (should) do sth",
     "note": "suggest 不接不定式复合结构,注意动词句型。"},
]


def write(name, data):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return p


def main():
    source = "本平台人工整理种子库(typogrammar PDF 未随仓库,后续 P3-2 可替换扩充)"
    patterns = {"version": 1, "type": "writing-patterns", "source": source, "patterns": PATTERNS}
    band = {"version": 1, "type": "writing-band-words", "source": source, "words": BAND_WORDS}
    errors = {"version": 1, "type": "writing-errors", "source": source, "errors": ERRORS}
    for name, data in [("patterns.json", patterns), ("band-words.json", band), ("errors.json", errors)]:
        print("生成", write(name, data))
    assert len(PATTERNS) >= 10 and len(BAND_WORDS) >= 30 and len(ERRORS) >= 15
    print(f"句式 {len(PATTERNS)} 条 / band 词汇 {len(BAND_WORDS)} 词 / 常见错误 {len(ERRORS)} 条")


if __name__ == "__main__":
    main()
