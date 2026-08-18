# -*- coding: utf-8 -*-
"""OCR 词库导入骨架(P5-7,可选)。

把图片/docx 目录里的词表抽成 JSON 契约,需 Vision 兼容 Key。
无 Key / 无输入目录时打印用法并退出 0,不阻断门禁。
输出: public/content/ocr/{stem}.json  [{word, cn, phon?}]
"""
import json
import os
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "content", "ocr")


def main():
    key = os.environ.get("ELS_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""
    src = None
    for a in sys.argv[1:]:
        if not a.startswith("-"):
            src = a
            break
    if not key or not src or not os.path.exists(src):
        print("用法: set ELS_API_KEY=sk-... && python scripts/ocr_vocab_import.py <图片或docx目录>")
        print("无 Key / 无输入时跳过。输出契约: [{word, cn, phon?}]")
        return 0
    print("OCR 管线骨架已就位。请按 Vision API 接入后补识别逻辑;本次未调用网络。")
    os.makedirs(OUT_DIR, exist_ok=True)
    sample = os.path.join(OUT_DIR, "sample.json")
    if not os.path.exists(sample):
        with open(sample, "w", encoding="utf-8") as f:
            json.dump([{"word": "example", "cn": "例子", "phon": "/ɪɡˈzɑːmpl/"}], f, ensure_ascii=False, indent=2)
        print("已写示例", sample)
    return 0


if __name__ == "__main__":
    sys.exit(main())
