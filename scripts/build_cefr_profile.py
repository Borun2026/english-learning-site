#!/usr/bin/env python3
"""生成 public/content/cefr-profile.json(AI 教练用的 CEFR 能力画像)。

数据来源:
- A0-C2 各级别的总体描述/进出标准/学习模块:按 CEFR 官方能力描述编写(本平台本地整理);
- focus(语法重点)/ruleCount/categoryCount:统计自 public/content/grammar-reference.json。

注意:raw_materials/llm_tutor 未随仓库下载,本文件不依赖它,教练提示词只读本生成物。
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public", "content")
REF_PATH = os.path.join(PUBLIC, "grammar-reference.json")
OUT_PATH = os.path.join(PUBLIC, "cefr-profile.json")

# 手写的级别画像(A0-C2 的 can/entry/exit 与 blocks/microGoals)
HAND = [
    {
        "id": "A0", "name": "零基础",
        "can": "能听懂并回应极简单的问候(Hi / Thank you),以单词、短语交流,几乎无法组句。",
        "entry": "零基础,或只认识字母和少量单词。",
        "exit": "能用 be 动词和 100-200 个高频词造简单句,完成自我介绍。",
        "blocks": [
            {"name": "字母与音标", "microGoals": ["认读 26 个字母与 48 个音标", "掌握常见拼读规则", "能拼读简单单词"]},
            {"name": "生存词汇", "microGoals": ["问候与告别用语", "数字、颜色、家庭成员", "课堂与日常物品"]},
        ],
    },
    {
        "id": "A1", "name": "初级入门",
        "can": "能介绍自己与他人,就住址、购物、时间等话题进行简单问答,用简单句表达现在与日常。",
        "entry": "掌握约 200-500 个高频词,能造 be 动词简单句。",
        "exit": "能正确使用 be / 一般现在时 / 情态动词 can 组句,听懂清晰慢速英语并完成日常对话。",
        "blocks": [
            {"name": "基础句法", "microGoals": ["be 动词与主谓一致", "There be 与基本语序", "一般现在时与频度副词"]},
            {"name": "日常沟通", "microGoals": ["自我介绍与询问信息", "购物、问路、点餐", "礼貌请求与建议"]},
        ],
    },
    {
        "id": "A2", "name": "基础进阶",
        "can": "能谈论过去经历与将来计划,进行比较与推测,应对旅行等常见场景的交流。",
        "entry": "能就日常话题用简单句交流,掌握约 800-1500 词。",
        "exit": "能正确使用一般过去/将来/进行时与比较级,写出有连接词的小短文。",
        "blocks": [
            {"name": "时态扩展", "microGoals": ["一般过去时与不规则动词", "一般将来时 will / be going to", "现在进行时"]},
            {"name": "表达扩展", "microGoals": ["比较级与最高级", "情态动词推测", "简单连词连接句"]},
        ],
    },
    {
        "id": "B1", "name": "独立使用",
        "can": "能就熟悉话题连贯表达观点、复述事件与经历,应对旅行中的多数情况,理解广播/文章要点。",
        "entry": "掌握约 2000-3000 词,能正确使用基础时态。",
        "exit": "能正确使用现在完成时、被动语态与关系从句,围绕观点展开 2-3 句论证。",
        "blocks": [
            {"name": "完成时与语态", "microGoals": ["现在完成时与 since/for", "被动语态", "过去完成时初步"]},
            {"name": "连贯表达", "microGoals": ["关系从句", "if 条件句", "连接词与段落连贯"]},
        ],
    },
    {
        "id": "B2", "name": "中高级",
        "can": "能就广泛话题清晰论证、写出结构完整的文本,听懂讲座与讨论要点并参与辩论。",
        "entry": "能就熟悉话题进行连贯交流,偶有语法错误但不影响理解。",
        "exit": "能使用复杂从句、情态推测与非谓语结构,写出有明确论证结构的小论文。",
        "blocks": [
            {"name": "复杂结构", "microGoals": ["过去完成时与叙事顺序", "情态动词对过去的推测", "非谓语动词"]},
            {"name": "论证输出", "microGoals": ["观点论证与让步", "摘要与改写", "正式邮件与信函"]},
        ],
    },
    {
        "id": "C1", "name": "高级",
        "can": "能灵活、准确地表达复杂思想,处理学术与专业内容,理解隐含意义与长难句。",
        "entry": "能就广泛话题清晰表达,语法错误较少且不影响精确性。",
        "exit": "能使用倒装、强调、混合条件等高级结构,完成学术报告与专业演讲。",
        "blocks": [
            {"name": "精确与高级结构", "microGoals": ["倒装与强调句", "混合条件句", "名词化与正式语域"]},
            {"name": "学术运用", "microGoals": ["学术报告写作", "专业演讲与答辩", "批判性阅读与综述"]},
        ],
    },
    {
        "id": "C2", "name": "精通",
        "can": "接近母语水平:能理解精微差别与地道习语,进行复杂论证与修辞表达,几乎无需协助。",
        "entry": "能就专业话题精确表达,仅偶有母语痕迹。",
        "exit": "能自由切换语域与文体,完成论文级写作与高难度谈判。",
        "blocks": [
            {"name": "精微表达", "microGoals": ["习语与隐喻", "语域与文体切换", "修辞与言外之意"]},
            {"name": "专业输出", "microGoals": ["论文级学术写作", "复杂谈判与斡旋", "同声传译式概括"]},
        ],
    },
]


def load_reference():
    with open(REF_PATH, encoding="utf-8") as f:
        return json.load(f)


def build():
    ref = load_reference()
    stats = {}
    for lv in ref.get("levels", []):
        cats = lv.get("categories", [])
        rules = [r for c in cats for r in c.get("rules", [])]
        named = []
        for r in rules:
            t = (r.get("text") or "").strip()
            if not t or re.match(r"^Rule [a-z]\d+_\d+$", t, re.I):
                continue
            named.append(t)
        for c in cats:
            if (c.get("name") or "").strip():
                named.append("模块:" + c["name"].strip())
        focus = list(dict.fromkeys(named))[:8]
        stats[lv["id"]] = {
            "ruleCount": len(rules),
            "categoryCount": len(cats),
            "focus": focus,
        }

    levels = []
    for h in HAND:
        s = stats.get(h["id"], {"ruleCount": 0, "categoryCount": 0, "focus": []})
        levels.append({**h, **s})

    out = {
        "version": 1,
        "source": "CEFR 官方能力描述(本平台整理)+ grammar-reference.json 规则统计;由 scripts/build_cefr_profile.py 生成",
        "levels": levels,
    }
    os.makedirs(PUBLIC, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"已生成 {OUT_PATH}: {len(levels)} 个级别")
    for lv in levels:
        print(f"  {lv['id']} {lv['name']}: {lv['ruleCount']} 规则 / {len(lv['focus'])} 重点")


if __name__ == "__main__":
    build()
