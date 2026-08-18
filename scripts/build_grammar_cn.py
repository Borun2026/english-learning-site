#!/usr/bin/env python3
"""生成语法树中文讲解手册 public/content/grammar-cn.json

内容:
- rules: 每条有意义规则文本的中文名称 + 一句话讲解(约 50 条)
- cefr:  A1-C2 每个小节的中文名 + 讲解(命名小节手工撰写;
         "Grammar/—" 等综合小节按内部规则自动生成导读)
- murphy: EL/INT/ADV 三册每个章节的中文名 + 讲解(对照 Murphy 原著
         章节主题撰写,标注 Unit 范围,可作查阅手册)

用法: python scripts/build_grammar_cn.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "public", "content")
OUT = os.path.join(CONTENT, "grammar-cn.json")

# ---------- 规则级中文讲解 ----------
RULE_CN = {
    "am / is / are": ("be 动词", "am 用于 I,is 用于第三人称单数,are 用于 you/we/they;构成主系表句型。"),
    "Present Simple": ("一般现在时", "表示习惯、事实与普遍真理;第三人称单数动词加 -s/-es。"),
    "Stative verbs": ("状态动词", "表示状态而非动作(如 know/like/want),通常不用进行时。"),
    "This / that / these / those": ("指示代词", "this/these 指近处,that/those 指远处;单数 this/that,复数 these/those。"),
    "There is / there are": ("There be 句型", "表示某处存在某物;is 接单数/不可数,are 接复数。"),
    "can / can't": ("情态动词 can", "表示能力、允许与可能性;否定 can't,could 是其过去式。"),
    "Past Simple": ("一般过去时", "表示过去已结束的动作;规则动词加 -ed,不规则动词需单独记忆。"),
    "was / were": ("be 的过去式", "was 用于 I/he/she/it,were 用于 you/we/they。"),
    "will": ("一般将来 will", "表示预测、承诺或临时决定;后接动词原形。"),
    "going to": ("be going to 将来", "表示计划打算或有迹象将要发生的事。"),
    "Present Continuous: am/is/are + V-ing": ("现在进行时", "表示此刻正在进行的动作或临时安排。"),
    "Present Simple vs Present Continuous": ("一般现在时 vs 现在进行时", "习惯/事实用一般现在时;此刻正在发生用进行时。"),
    "should / shouldn't": ("should 建议", "表示建议与义务;否定 shouldn't。"),
    "must / mustn't": ("must 必须/禁止", "must 表强烈义务,mustn't 表禁止。"),
    "have to": ("have to 不得不", "表示客观必须;第三人称用 has to。"),
    "could": ("could 能力/可能", "can 的过去式,也用于委婉请求与推测。"),
    "some / any": ("some / any", "some 用于肯定句,any 用于否定与疑问。"),
    "much / many / a lot of / a few / a littl": ("数量词", "much+不可数,many+可数复数;a lot of 通用;a few/a little 表少量肯定。"),
    "for / since / ago": ("时间介词", "for+时间段,since+起点,ago 用于一般过去时。"),
    "have got": ("have got 拥有", "英式口语表拥有;疑问与否定用 Have you got…?"),
    "Present Perfect": ("现在完成时", "have/has+过去分词;表示经历或对现在的影响。"),
    "ever / never / already / yet / just": ("完成时标志词", "ever 曾经,never 从未,already 已经(肯定),yet 还(否定/疑问),just 刚刚。"),
    "Present Perfect vs Past Simple": ("现在完成 vs 一般过去", "时间明确用过去时;侧重现在结果用完成时。"),
    "Present Perfect Continuous: have been + ": ("现在完成进行时", "强调动作持续到现在;have/has been doing。"),
    "Past Continuous: was/were + V-ing": ("过去进行时", "表示过去某时刻正在进行的动作,常作背景。"),
    "Past Simple vs Past Continuous": ("一般过去 vs 过去进行", "长动作背景用进行时,短动作打断用一般过去。"),
    "Passive Voice": ("被动语态", "be+过去分词;强调承受者或不知施动者。"),
    "Reported Speech": ("间接引语", "转述他人话语;时态一般后退一格,人称时间地点相应调整。"),
    "Reported questions": ("间接疑问句", "转述疑问用陈述语序;if/whether 引导一般疑问。"),
    "used to": ("used to 过去习惯", "表示过去经常但现在不再;后接动词原形。"),
    "Future Continuous: will be + V-ing": ("将来进行时", "表示将来某时刻正在进行的动作。"),
    "Future Perfect: will have + V3": ("将来完成时", "到将来某时已完成的动作;常与 by+时间连用。"),
    "Past Perfect Simple: had + V3": ("过去完成时", "表示「过去的过去」;had+过去分词。"),
    "Past Perfect Continuous: had been + V-in": ("过去完成进行时", "过去某时前一直持续的动作;had been doing。"),
    "must have + V3": ("对过去推测(肯定)", "几乎肯定过去发生:must have done。"),
    "can't have + V3": ("对过去推测(否定)", "几乎肯定过去没发生:can't have done。"),
    "should have + V3": ("本该做而未做", "should have done 表遗憾或责备。"),
    "might / could have + V3": ("过去可能性", "过去可能发生但不确定。"),
    "Causative have/get: have something done": ("使役结构", "让别人做某事:have/get sth done。"),
    "Passive reporting verbs: It is said that": ("被动转述结构", "It is said/believed/reported that… 据说/据报道。"),
    "remember / forget + V-ing vs to-inf": ("remember/forget 双宾语", "+doing 指已做,+to do 指将做。"),
    "stop / regret / mean + V-ing vs to-inf": ("stop/regret/mean 辨析", "stop doing 停止做;stop to do 停下来去做;regret/mean 类似区分。"),
    "wish + Past Simple": ("wish 对现在虚拟", "希望现在不同:wish+过去式。"),
    "wish + Past Perfect": ("wish 对过去虚拟", "后悔过去:wish+had done。"),
    "wish + would": ("wish 对他人抱怨", "希望他人改变习惯:wish+would。"),
    "be used to / get used to + V-ing": ("习惯于", "be/get used to+doing 表习惯;区别于 used to do 过去习惯。"),
    "Future in the Past: would / was going to": ("过去将来时", "从过去角度看将来:would/was going to do。"),
    "be to": ("be to 正式安排", "表官方计划/命令:be to do。"),
    "ought to": ("ought to 义务", "与 should 相近,语气更正式。"),
    "need": ("need 需要", "可作实义动词或情态动词;needn't 表不必。"),
    "dare": ("dare 敢于", "可作情态动词或实义动词,多用于否定/疑问。"),
    "It-cleft: It was John who called.": ("强调句(It 分裂句)", "It is/was+被强调部分+that/who…,强调主语宾语状语。"),
    "Wh-cleft: What surprised me was the pric": ("强调句(Wh 分裂句)", "What+从句+be+表语,强调信息。"),
    "It's high time + Past Simple": ("早该做某事", "It's (high) time+过去式,表虚拟:早该……了。"),
    "I think so / I hope so / I'm afraid so": ("替代从句的 so", "so 代替上文从句;否定用 I don't think so / I hope not。"),
    "Suppose / supposing / what if": ("假设表达", "提出假设:Suppose/Supposing/What if+从句。"),
    "Future Perfect Continuous: will have bee": ("将来完成进行时", "到将来某时已持续多久:will have been doing。"),
}

# ---------- CEFR 命名小节手工讲解 ----------
CEFR_CAT = {
    ("A1", "to be"): ("be 动词", "本小节讲 be 动词的肯定、否定与疑问(am/is/are)及主系表句型,是本平台 s1u1「基本句型与 be 动词」的核心语法。"),
    ("A1", "Present Simple"): ("一般现在时", "讲一般现在时的构成、第三人称单数变化,以及表示状态的状态动词(stative verbs),对应 s1u2。"),
    ("A2", "Past Simple"): ("一般过去时", "讲过去式构成(规则与不规则动词)、was/were 用法,对应 s1u3「一般过去时」。"),
    ("A2", "Future"): ("将来时", "will 与 be going to 的用法与区别,对应 s1u4 与 s2u11。"),
    ("A2", "Present Continuous"): ("现在进行时", "进行时构成、与一般现在时的区别,对应 s2u1「进行时」。"),
    ("A2", "have / have got"): ("have / have got", "表示拥有的两种说法及其疑问、否定形式。"),
    ("A2", "A2"): ("A2 综合", "A2 级别的综合语法条目,建议用于查缺补漏。"),
    ("B1", "Present Perfect"): ("现在完成时", "完成时构成、标志词、与一般过去时的对比及完成进行时,对应 s2u2「现在完成时」。"),
    ("B1", "(Passive)"): ("被动语态", "被动语态的构成与常用时态被动,对应 s2u6「被动语态」。"),
    ("B2", "Past Perfect"): ("过去完成时", "过去完成与过去完成进行时的用法,对应 s2u3「过去完成时」。"),
    ("B2", "Wish"): ("wish 虚拟", "wish 对现在/过去/将来的三种虚拟表达,对应 s3u2「wish 虚拟语气」。"),
    ("B2", "Future in the Past"): ("过去将来时", "从过去视角看将来(would/was going to),以及 be to/ought to/need/dare 等半情态动词。"),
    ("C1", "(Inversion)"): ("倒装句", "否定词、only 等前置引起的高级倒装结构,对应 s3u6「倒装句」。"),
    ("C2", "Future Perfect Continuous"): ("将来完成进行时", "will have been doing 的构成与「到将来某时已持续」的语义。"),
}

# ---------- Murphy 三册章节手工讲解(对照原著章节主题) ----------
MURPHY_CAT = {
    ("EL", "Present"): ("现在时总览(Unit 1-9)", "am/is/are、一般现在时与现在进行时的构成、疑问与否定,红书入门核心;对照本平台 s1u1-s1u2 与 s2u1 学习。"),
    ("EL", "Past"): ("过去时(Unit 10-14)", "was/were、规则与不规则过去式、过去进行时;对照 s1u3。"),
    ("EL", "Present Perfect Present Perfect Continuous"): ("现在完成时(Unit 15-20)", "完成时构成、标志词与完成进行时;对照 s2u2。"),
    ("EL", "(Passive)"): ("被动语态(Unit 21-22)", "基本被动结构 is/was done;对照 s2u6。"),
    ("EL", "Grammar"): ("be/have/do 综合(Unit 23-24)", "be/have/do 三种基本动词在时态、疑问与否定中的综合运用;建议对照 s1u1-s1u3 复习。"),
    ("EL", "Future"): ("将来时(Unit 25-27)", "will/be going to 与现在时表将来;对照 s1u4 与 s2u11。"),
    ("EL", "(Modal Verbs)"): ("情态动词(Unit 28-36)", "can/could/must/may/might/should 表能力、许可、义务与推测;对照 s1u8 与 s2u9。"),
    ("EL", "(Word Order)"): ("语序一(Unit 37-43)", "句子基本语序、副词位置与 there is/it is 结构。"),
    ("EL", "(Questions)"): ("疑问句(Unit 44-49)", "一般/特殊疑问句、who/what/which 与反意疑问句基础。"),
    ("EL", "(Reported Speech)"): ("间接引语(Unit 50)", "said that 与 told sb 的转述基础。"),
    ("EL", "(Infinitive & Gerund)"): ("不定式与动名词(Unit 51-54)", "to do 与 doing 的常见动词搭配;对照 s2u4-s2u5。"),
    ("EL", "(Pronouns)"): ("代词一(Unit 59-64)", "人称/物主/反身代词与 one/ones;对照 s1u6。"),
    ("EL", "A THE"): ("冠词(Unit 65-73)", "a/an/the 的基本用法与不用冠词的情形;对照 s1u5。"),
    ("EL", "(Adjectives & Adverbs)"): ("形容词与副词(Unit 85-92)", "形容词位置、副词构成与比较级基础;对照 s1u7、s2u8。"),
    ("EL", "(Conjunctions)"): ("连词(Unit 97-102)", "and/but/or/so/because/when/if 的句间连接;对照 s2u10。"),
    ("EL", "(Prepositions)"): ("介词(Unit 103-113)", "时间/地点介词与常用搭配;对照 s2u12、s3u11。"),
    ("EL", "(Phrasal Verbs)"): ("短语动词(Unit 114-115)", "go out/turn on 等高频短语动词入门。"),
    ("INT", "Present Simple Present Continuous"): ("现在时(Unit 1-4)", "一般现在时与现在进行时的对比、状态动词与临时状态。"),
    ("INT", "Past Simple Past Continuous"): ("过去时(Unit 5-6)", "两种过去时在叙述中的配合。"),
    ("INT", "Present Perfect Present Perfect Continuous"): ("现在完成(Unit 7-14)", "完成时与完成进行时、与过去时的边界;对照 s2u2。"),
    ("INT", "Past Perfect Past Perfect Continuous"): ("过去完成(Unit 15-16)", "「过去的过去」;对照 s2u3。"),
    ("INT", "have got used to"): ("have got / used to(Unit 17-18)", "have got 表拥有与 used to 表过去习惯。"),
    ("INT", "Grammar"): ("将来与情态(Unit 19-25)", "现在时表将来、will/shall 与 be going to,以及 can/may/might 基础。"),
    ("INT", "(Modal Verbs)"): ("情态动词(Unit 26-37)", "can/could/must/may/might/should/would/have to 的完整用法;对照 s2u9。"),
    ("INT", "I wish"): ("wish 与条件(Unit 38-41)", "I wish 虚拟、if I do / if I did 条件句;对照 s3u1-s3u2。"),
    ("INT", "(Passive Voice)"): ("被动语态(Unit 42-46)", "各时态被动、It is said that 结构;对照 s2u6。"),
    ("INT", "(Reported Speech)"): ("间接引语(Unit 47-48)", "转述陈述与疑问的时态后退规则。"),
    ("INT", "(Questions)"): ("疑问句(Unit 49-52)", "特殊疑问、否定疑问与附加疑问句。"),
    ("INT", "(Infinitive & Gerund)"): ("不定式与动名词(Unit 53-68)", "to do/doing/prefer/would like 等大量动词句型;对照 s2u4-s2u5。"),
    ("INT", "A / THE"): ("冠词与名词(Unit 69-79)", "可数与不可数名词、a/an/the 的进阶用法;对照 s1u5。"),
    ("INT", "(Pronouns)"): ("代词(Unit 82-91)", "反身代词、it/there、one/ones 与复合代词;对照 s1u6。"),
    ("INT", "(Relative Clauses)"): ("定语从句(Unit 92-97)", "who/which/that 与介词+which;对照 s2u7。"),
    ("INT", "(Adjectives & Adverbs)"): ("形容词与副词(Unit 98-112)", "比较级最高级、so/such、quite/rather;对照 s2u8、s3u8。"),
    ("INT", "(Conjunctions & Prepositions)"): ("连词与介词(Unit 113-136)", "时间/地点介词、连词衔接与从句;对照 s2u10、s2u12、s3u11。"),
    ("INT", "(Phrasal Verbs)"): ("短语动词(Unit 137-145)", "常用短语动词系统表与辨析。"),
    ("ADV", "Present and Past Tenses"): ("现在与过去时高级(Unit 1-8)", "时态的精细化选择、进行时与状态动词的例外;对照 s3u9。"),
    ("ADV", "The Future"): ("将来时高级(Unit 9-14)", "will/be to/be about to、将来进行与将来完成。"),
    ("ADV", "Modals and Semi-modals"): ("情态与半情态(Unit 15-20)", "can/could/may/might/must 的推测层级与 dare/need/ought to。"),
    ("ADV", "Linking Verbs, Passives, Questions"): ("系动词/被动/疑问(Unit 21-27)", "系动词选择、复杂被动与疑问结构;对照 s2u6、s3u6。"),
    ("ADV", "Verb Complementation"): ("动词补足成分(Unit 28-31)", "接 doing/to do 的动词分类与使役结构;对照 s2u4-s2u5、s3u3。"),
    ("ADV", "Reporting"): ("引述(Unit 32-39)", "间接引语的时态/语用细节与转述动词;对照 s3u10。"),
    ("ADV", "Nouns and Agreement"): ("名词与一致(Unit 40-43)", "集合名词与主谓一致的疑难情形。"),
    ("ADV", "Articles, Determiners and Quantifiers"): ("冠词/限定词/数量词(Unit 44-52)", "冠词省略、限定词与数量词的精确用法;对照 s3u12。"),
    ("ADV", "Relative Clauses"): ("关系从句(Unit 53-65)", "限定/非限定从句、介词+关系代词与省略;对照 s2u7、s4u2。"),
    ("ADV", "Adjectives and Adverbs"): ("形容词与副词(Unit 66-78)", "比较结构、程度副词与语序;对照 s3u8。"),
    ("ADV", "Adverbial Clauses"): ("状语从句(Unit 79-87)", "时间/条件/让步/原因状语从句;对照 s2u10、s3u1。"),
    ("ADV", "Prepositions"): ("介词(Unit 88-94)", "介词与名词/形容词/动词的固定搭配;对照 s3u11。"),
    ("ADV", "Organizing Information"): ("信息组织(Unit 95-100)", "there is/it is、省略与替代、强调与语篇衔接;对照 s4u4、s3u7。"),
}


def norm(name):
    return re.sub(r"[\s(—)（）\-–]+$", "", name).strip()


def auto_cefr_guide(rules):
    names = []
    mapped = []
    for r in rules:
        hit = RULE_CN.get(r["text"])
        names.append(hit[0] if hit else r["text"])
        if r.get("unitId"):
            mapped.append(f"{r['unitId']}「{r.get('topicCn', '')}」")
    names = list(dict.fromkeys(names))
    guide = (f"综合语法模块:{len(rules)} 条规则。本小节覆盖:{'、'.join(names[:8])}"
             f"{' 等' if len(names) > 8 else ''}。")
    guide += "学习建议:逐条点开查看英文规则、例句与易错对照,已映射的规则可直接打开中文语法课。"
    if mapped:
        guide += f" 命中本平台单元:{'、'.join(mapped[:4])}。"
    return "综合语法模块", guide


def main():
    with open(os.path.join(CONTENT, "grammar-reference.json"), encoding="utf-8") as f:
        ref = json.load(f)

    cefr = {}
    for lv in ref["levels"]:
        sections = []
        for c in lv["categories"]:
            key = (lv["id"], norm(c["name"]))
            hit = CEFR_CAT.get(key) or CEFR_CAT.get((lv["id"], c["name"]))
            if hit:
                cn, guide = hit
            else:
                cn, guide = auto_cefr_guide(c["rules"])
            sections.append({"category": c["name"], "cn": cn, "guide": guide, "rules": len(c["rules"])})
        cefr[lv["id"]] = sections

    murphy = {}
    for lv in ref["murphy"]:
        sections = []
        for c in lv["categories"]:
            key = (lv["id"], norm(c["name"]))
            hit = MURPHY_CAT.get(key)
            if hit:
                cn, guide = hit
            else:
                cn = f"{norm(c['name'])}"
                guide = f"本章收录 Unit 合集,共 {len(c['rules'])} 条;逐条点开对照原著学习。"
            sections.append({"category": c["name"], "cn": cn, "guide": guide, "rules": len(c["rules"])})
        murphy[lv["id"]] = sections

    out = {
        "version": 1,
        "source": "本平台整理:Murphy 章节对照原著主题,CEFR 规则按原文条目注释;由 scripts/build_grammar_cn.py 生成",
        "rules": RULE_CN,
        "cefr": cefr,
        "murphy": murphy,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    named_cefr = sum(1 for sections in cefr.values() for v in sections if v["cn"] != "综合语法模块")
    print(f"已生成 {OUT}")
    print(f"CEFR 小节 {sum(len(v) for v in cefr.values())} 个(手写讲解 {named_cefr},自动导读其余)")
    print(f"Murphy 章节 {sum(len(v) for v in murphy.values())} 个")
    print(f"规则中文讲解 {len(RULE_CN)} 条")


if __name__ == "__main__":
    main()
