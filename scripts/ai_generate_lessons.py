# -*- coding: utf-8 -*-
"""按 48 单元词池批量生成连词成句补充题(P5-7)。

无 OPENAI_API_KEY / ELS_API_KEY 时打印用法并退出 0,不阻断门禁。
有 Key 时请求 OpenAI 兼容接口,输出 public/content/games/order-sentence-ai.json
(标注 source=AI 生成待校对)。可重复运行覆盖。
"""
import json
import os
import sys
import urllib.error
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "public", "content")
OUT = os.path.join(CONTENT, "games", "order-sentence-ai.json")


def usage():
    print("用法: 设置 ELS_API_KEY + 可选 ELS_BASE_URL / ELS_MODEL 后运行")
    print("  例: set ELS_API_KEY=sk-... && python scripts/ai_generate_lessons.py")
    print("无 Key 时跳过(不视为失败)。")


def main():
    key = os.environ.get("ELS_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""
    if not key:
        usage()
        return 0
    base = (os.environ.get("ELS_BASE_URL") or "https://api.deepseek.com/v1").rstrip("/")
    model = os.environ.get("ELS_MODEL") or "deepseek-chat"
    idx_p = os.path.join(CONTENT, "curriculum", "index.json")
    with open(idx_p, encoding="utf-8") as f:
        idx = json.load(f)
    units = [u for st in idx["stages"] for u in st["units"]][:8]  # 默认先 S1,全量加 --all
    if "--all" in sys.argv:
        units = [u for st in idx["stages"] for u in st["units"]]
    items = []
    for u in units:
        art_p = os.path.join(CONTENT, "curriculum", u["id"], "article.json")
        if not os.path.exists(art_p):
            continue
        with open(art_p, encoding="utf-8") as f:
            art = json.load(f)
        words = art.get("newWords") or []
        prompt = {
            "model": model,
            "temperature": 0.4,
            "messages": [
                {"role": "system", "content": "Output JSON only."},
                {
                    "role": "user",
                    "content": (
                        f"用这些词造 2 句 4-8 词的简单英语陈述句,并给中文。"
                        f"词:{', '.join(words[:12]) or u['title']}\n"
                        'JSON:{"items":[{"text":"I like tea","cn":"我喜欢茶","chunks":["I","like","tea"],"distractors":["hate","coffee"]}]}'
                    ),
                },
            ],
        }
        req = urllib.request.Request(
            base + "/chat/completions",
            data=json.dumps(prompt).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": "Bearer " + key},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = json.loads(resp.read().decode("utf-8"))
            text = raw["choices"][0]["message"]["content"]
            start, end = text.find("{"), text.rfind("}")
            data = json.loads(text[start : end + 1])
            for i, it in enumerate(data.get("items") or []):
                chunks = it.get("chunks") or str(it.get("text", "")).split()
                items.append(
                    {
                        "id": f"ai-{u['id']}-{i}",
                        "unitId": u["id"],
                        "stage": u["stage"],
                        "text": it.get("text", ""),
                        "cn": it.get("cn", ""),
                        "chunks": chunks,
                        "distractors": it.get("distractors") or ["not", "very"],
                        "source": "AI 生成待校对",
                    }
                )
            print("  ok", u["id"], len(data.get("items") or []))
        except Exception as ex:
            print("  skip", u["id"], ex)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"version": 1, "type": "order-sentence", "source": "AI 生成待校对", "count": len(items), "items": items}, f, ensure_ascii=False, indent=1)
    print("写入", OUT, "共", len(items), "题")
    return 0


if __name__ == "__main__":
    sys.exit(main())
