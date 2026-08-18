# -*- coding: utf-8 -*-
"""中文专有名词/地标/人名读音纠偏映射库 (Phonetic Corrections)。
针对英语 Neural TTS 在朗读中文拼音地名、人名及中国文化特色专有名词时的发音矫正。
"""
import re

# 正则匹配与替换字典
# 优先进行完整词匹配，避免部分误伤
PHONETIC_RULES = [
    # 典型高频人名
    (r"\bLi Hua\b", "Lee Hwah"),
    (r"\bLi Ming\b", "Lee Ming"),
    (r"\bXiao Ming\b", "She-ow Ming"),
    (r"\bXiao Hua\b", "She-ow Hwah"),
    (r"\bWang Wei\b", "Wahng Way"),
    (r"\bZhang San\b", "Jahng Sahn"),
    (r"\bLi Si\b", "Lee Sih"),
    (r"\bWang Ping\b", "Wahng Ping"),
    (r"\bLiu Mei\b", "Lee-oh May"),
    (r"\bChen Jie\b", "Chun Jee-eh"),
    (r"\bWu Yifan\b", "Woo Ee-fahn"),
    (r"\bSarah\b", "Sarah"),
    (r"\bMike\b", "Mike"),
    (r"\bJohn\b", "John"),
    (r"\bAmy\b", "Amy"),
    (r"\bJack\b", "Jack"),
    (r"\bTom\b", "Tom"),
    
    # 典型高频中国地名/高校/名胜
    (r"\bBeijing\b", "Beijing"),
    (r"\bShanghai\b", "Shanghai"),
    (r"\bGuangzhou\b", "Guangzhou"),
    (r"\bShenzhen\b", "Shenzhen"),
    (r"\bHaidian\b", "Haidian"),
    (r"\bChaoyang\b", "Chaoyang"),
    (r"\bTsinghua\b", "Tsing-hwa"),
    (r"\bPeking\b", "Peking"),
    (r"\bNanjing\b", "Nanjing"),
    (r"\bHangzhou\b", "Hangzhou"),
    (r"\bChengdu\b", "Chengdu"),
    (r"\bWuhan\b", "Wuhan"),
    (r"\bXi'an\b", "Shee-ahn"),
    (r"\bXian\b", "Shee-ahn"),
    (r"\bTian'anmen\b", "Tian-an-men"),
    (r"\bTiananmen\b", "Tian-an-men"),
    (r"\bForbidden City\b", "Forbidden City"),
    (r"\bGreat Wall\b", "Great Wall"),
    (r"\bSummer Palace\b", "Summer Palace"),
    (r"\bTemple of Heaven\b", "Temple of Heaven"),
    (r"\bYangtze River\b", "Yangtze River"),
    (r"\bYellow River\b", "Yellow River"),
    
    # 拼音特殊发音纠偏 (针对 TTS 容易念成特殊音的单拼音/双拼音)
    (r"\bXinhua\b", "Shin-hwa"),
    (r"\bZhongguo\b", "Jong-gwo"),
    (r"\bPutonghua\b", "Poo-tong-hwa"),
    (r"\bKung Fu\b", "Koong Foo"),
    (r"\bTai Chi\b", "Tie Chee"),
    (r"\bFeng Shui\b", "Fung Shway"),
]


def clean_text_for_tts(text: str) -> str:
    """清洗文本，去除 markdown 标记与多余特殊符号，并应用专有名词发音矫正。"""
    if not text:
        return ""
    # 去除 Markdown 格式如 **加粗**, *斜体*, `代码`, [链接](url)
    t = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    t = re.sub(r"[*_`#~]", "", t)
    # 去除填空题下划线
    t = re.sub(r"_{2,}", "blank", t)
    # 去除多余空格与空白
    t = re.sub(r"\s+", " ", t).strip()

    # 应用发音规则纠偏
    for pattern, repl in PHONETIC_RULES:
        t = re.sub(pattern, repl, t, flags=re.IGNORECASE)

    return t
