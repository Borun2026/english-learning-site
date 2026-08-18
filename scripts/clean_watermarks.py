#!/usr/bin/env python3
"""P3-4 内容质量加固:清除考研真题解析中的来源水印残留。

水印形态: " 淘宝店铺:https://shop249445206.taobao.com/  掌柜旺旺:新一文化"
覆盖:public/content/zhenti/**/*.json 与 public/content/curriculum/*/exam.json
(仅删水印串,不动其他文本;NCE 笔记中作为词汇示例的 "Taobao 淘宝" 不受影响)

用法: python scripts/clean_watermarks.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "public", "content")

WATERMARK = re.compile(
    r"\s*淘宝店铺:https://shop249445206\.taobao\.com/\s*掌柜旺旺:新一文化"
    r"|\s*淘宝店铺:https://shop249445206\S*"
)


def clean_str(s):
    return WATERMARK.sub("", s)


def clean_value(v):
    if isinstance(v, str):
        return clean_str(v)
    if isinstance(v, list):
        return [clean_value(x) for x in v]
    if isinstance(v, dict):
        return {k: clean_value(x) for k, x in v.items()}
    return v


def process(path):
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    if "shop249445206" not in raw and "掌柜旺旺" not in raw:
        return 0
    data = json.loads(raw)
    cleaned = clean_value(data)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=1)
        f.write("\n")
    n = raw.count("掌柜旺旺")
    return n


def main():
    total_files = 0
    total = 0
    for base, dirs, files in os.walk(os.path.join(CONTENT, "zhenti")):
        for fn in files:
            if fn.endswith(".json"):
                n = process(os.path.join(base, fn))
                if n:
                    total_files += 1
                    total += n
                    print(f"  {os.path.relpath(os.path.join(base, fn), CONTENT)}: {n} 处")
    for fn in os.listdir(os.path.join(CONTENT, "curriculum")):
        p = os.path.join(CONTENT, "curriculum", fn, "exam.json")
        if os.path.exists(p):
            n = process(p)
            if n:
                total_files += 1
                total += n
                print(f"  curriculum/{fn}/exam.json: {n} 处")
    print(f"\n完成:{total_files} 个文件 / {total} 处水印已清除")


if __name__ == "__main__":
    main()
