# -*- coding: utf-8 -*-
"""build_grammar_map.py —— 从 48 单元 grammar.json 生成语法知识地图

输出: public/content/grammar-map.json
节点 id = grammar.json 的 grammarId(缺省为 id), 附阶段/单元/CEFR。
后续可把外部仓库(English-grammar-tree / Mental Map)的节点合并进来。
"""
import json
import os
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "public", "content")


def main():
    with open(os.path.join(CONTENT, "curriculum", "index.json"), encoding="utf-8") as f:
        idx = json.load(f)

    nodes = []
    for st in idx["stages"]:
        for u in st["units"]:
            gp = os.path.join(CONTENT, "curriculum", u["id"], "grammar.json")
            if not os.path.exists(gp):
                print("MISSING", gp)
                continue
            with open(gp, encoding="utf-8") as f:
                g = json.load(f)
            nodes.append({
                "id": g.get("grammarId") or g.get("id"),
                "name": g.get("title", u["title"]),
                "category": f"S{u['stage']} {st['name']}",
                "stage": u["stage"],
                "unitId": u["id"],
                "cefr": g.get("cefr"),
            })

    out = {"version": 1, "nodes": nodes}
    dest = os.path.join(CONTENT, "grammar-map.json")
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"grammar-map.json written: {len(nodes)} nodes")


if __name__ == "__main__":
    main()
