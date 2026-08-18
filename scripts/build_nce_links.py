#!/usr/bin/env python3
"""生成单元 ↔ NCE 笔记课关联(P3-3):public/content/curriculum/nce-links.json

规则:阶段 S1→NCE1 / S2→NCE2 / S3→NCE3 / S4→NCE4;每单元按书内顺序取
最多 2 课(NCE4 共 12 课,S4 10 个单元按 2,2,1,1… 分配),保证 S1-S4
每单元 1-2 课。课文原文仅本地个人学习,UI 必须标注版权。

用法: python scripts/build_nce_links.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "public", "content")

STAGE_BOOK = {1: "nce1", 2: "nce2", 3: "nce3", 4: "nce4"}


def main():
    with open(os.path.join(CONTENT, "curriculum", "index.json"), encoding="utf-8") as f:
        units_index = json.load(f)
    with open(os.path.join(CONTENT, "intensive", "nce", "index.json"), encoding="utf-8") as f:
        nce_index = json.load(f)

    books = {b["id"]: b for b in nce_index["books"]}
    links = {}
    stats = {}
    for stage in [1, 2, 3, 4]:
        book_id = STAGE_BOOK[stage]
        lessons = list(books[book_id]["lessons"])
        units = [u for st in units_index["stages"] if st["id"] == stage for u in st["units"]]
        # 每单元最多 2 课;课不足时均匀分配(前 (课数-单元数) 个单元 2 课,其余 1 课)
        per_unit = [2] * len(units)
        if len(lessons) < 2 * len(units):
            extra = max(0, len(lessons) - len(units))
            per_unit = [2 if i < extra else 1 for i in range(len(units))]
        pos = 0
        for u, take in zip(units, per_unit):
            if pos + take > len(lessons):
                raise RuntimeError(f"{u['id']} 无可用 NCE 课({book_id} 池已耗尽)")
            links[u["id"]] = [
                {"id": l["id"], "book": book_id, "title": l["title"]} for l in lessons[pos:pos + take]
            ]
            pos += take
        stats[book_id] = f"{len(units)} 单元 / {pos} 课"

    # S5 不要求(可留空)
    out = {
        "version": 1,
        "source": "本平台 NCE 语法笔记库(190 课,仅本地个人学习)",
        "links": links,
    }
    os.makedirs(os.path.join(CONTENT, "curriculum"), exist_ok=True)
    with open(os.path.join(CONTENT, "curriculum", "nce-links.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("已生成 nce-links.json:", len(links), "个单元")
    for k, v in stats.items():
        print(" ", k, v)


if __name__ == "__main__":
    main()
