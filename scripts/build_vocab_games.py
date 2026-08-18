#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P5-3 连词成句题库生成(纯本地,确定性,无 AI):
从 48 单元的 dialogue.json / listen.json 提取台词,按词拆块 + 同阶段干扰词块,
输出 public/content/games/order-sentence.json(入库随仓库分发,离线可玩)。
"""
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CURRICULUM_DIR = ROOT / "public" / "content" / "curriculum"
OUT_DIR = ROOT / "public" / "content" / "games"
OUT_PATH = OUT_DIR / "order-sentence.json"

MIN_WORDS = 3
MAX_WORDS = 10


def norm(text: str) -> str:
    return "".join(c.lower() for c in text if c.isalnum())


def main() -> int:
    index = json.loads((CURRICULUM_DIR / "index.json").read_text(encoding="utf-8"))
    units = [u for st in index["stages"] for u in st["units"]]

    # 每阶段先收集"其他句子"的词,作为同难度干扰块池
    stage_texts: dict[int, list[list[str]]] = {}
    stage_lines: dict[int, list[str]] = {}
    unit_data: list[tuple[dict, dict | None, dict | None]] = []
    for u in units:
        dlg_path = CURRICULUM_DIR / u["id"] / "dialogue.json"
        lis_path = CURRICULUM_DIR / u["id"] / "listen.json"
        dlg = json.loads(dlg_path.read_text(encoding="utf-8")) if dlg_path.exists() else None
        lis = json.loads(lis_path.read_text(encoding="utf-8")) if lis_path.exists() else None
        unit_data.append((u, dlg, lis))
        for line, cn in collect_lines(dlg, lis):
            toks = line.split()
            if MIN_WORDS <= len(toks) <= MAX_WORDS:
                stage_texts.setdefault(u["stage"], []).append(toks)
                stage_lines.setdefault(u["stage"], []).append(line)

    items = []
    seen = set()
    for u, dlg, lis in unit_data:
        for line, cn in collect_lines(dlg, lis):
            toks = line.split()
            if not (MIN_WORDS <= len(toks) <= MAX_WORDS):
                continue
            key = norm(line)
            if not key or key in seen:
                continue
            seen.add(key)
            # 同阶段其他句子的词做干扰块(不含本句已有词,长度 ≥2)
            pool = [
                t for other in stage_texts.get(u["stage"], []) if norm(" ".join(other)) != key
                for t in other
                if norm(t) and norm(t) not in {norm(x) for x in toks} and len(norm(t)) >= 2
            ]
            rng = random.Random(u["id"] + ":" + key)
            distractors = rng.sample(pool, 2) if len(pool) >= 2 else []
            if not distractors:
                continue
            items.append(
                {
                    "id": f"os-{u['id']}-{len(items) + 1}",
                    "unitId": u["id"],
                    "stage": u["stage"],
                    "text": line,
                    "cn": cn,
                    "chunks": toks,
                    "distractors": distractors,
                }
            )

    if len(items) < 50:
        print(f"错误:题目不足({len(items)}),检查 curriculum 内容")
        return 1

    out = {
        "version": 1,
        "type": "order-sentence",
        "source": "48 单元 dialogue/listen 台词自动拆块(确定性,无 AI)",
        "count": len(items),
        "items": items,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    by_stage = {}
    for it in items:
        by_stage[it["stage"]] = by_stage.get(it["stage"], 0) + 1
    print(f"连词成句题库已生成: {OUT_PATH.relative_to(ROOT)}")
    print(f"  共 {len(items)} 题;各阶段: " + ", ".join(f"S{s}={n}" for s, n in sorted(by_stage.items())))
    return 0


def collect_lines(dlg, lis):
    out = []
    if dlg:
        for node in dlg.get("nodes", {}).values():
            line = str(node.get("line", "")).strip()
            cn = str(node.get("lineCn", "")).strip()
            if line and cn:
                out.append((line, cn))
    if lis:
        for r in lis.get("rounds", []):
            line = str(r.get("line", "")).strip()
            cn = str(r.get("lineCn", "")).strip()
            if line and cn:
                out.append((line, cn))
    return out


if __name__ == "__main__":
    sys.exit(main())
