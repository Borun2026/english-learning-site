# -*- coding: utf-8 -*-
"""fetch_external.py —— 下载 10 个外部仓库中可整合的原始素材(仅供本地个人学习)

输出目录: raw_materials/
用法: python scripts/fetch_external.py [--only grammar_tree|nce|mental_map|reading_data|llm_tutor|95grammar]
"""
import os
import sys
import time
import urllib.request

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "raw_materials")

SOURCES = {
    "grammar_tree": [
        ("https://raw.githubusercontent.com/Nikola-Ver/English-grammar-tree/master/app/data/grammar.ts",
         "grammar_tree/grammar.ts"),
        ("https://raw.githubusercontent.com/Nikola-Ver/English-grammar-tree/master/app/data/murphy/levels.ts",
         "grammar_tree/murphy_levels.ts"),
        ("https://raw.githubusercontent.com/Nikola-Ver/English-grammar-tree/master/app/data/murphy/index.ts",
         "grammar_tree/murphy_index.ts"),
        ("https://raw.githubusercontent.com/Nikola-Ver/English-grammar-tree/master/app/data/tenseComparisons.ts",
         "grammar_tree/tenseComparisons.ts"),
        ("https://raw.githubusercontent.com/Nikola-Ver/English-grammar-tree/master/app/data/tenses.ts",
         "grammar_tree/tenses.ts"),
    ],
    "nce": [
        ("https://raw.githubusercontent.com/protogenesis/New-Concept-English/master/NCE1.md", "nce/NCE1.md"),
        ("https://raw.githubusercontent.com/protogenesis/New-Concept-English/master/NCE2.md", "nce/NCE2.md"),
        ("https://raw.githubusercontent.com/protogenesis/New-Concept-English/master/NCE3.md", "nce/NCE3.md"),
        ("https://raw.githubusercontent.com/protogenesis/New-Concept-English/master/NCE4.md", "nce/NCE4.md"),
    ],
    "mental_map": [
        ("https://raw.githubusercontent.com/guilherme-reis/English-Grammar-Mental-Map-In-Markdown/main/English-Grammar-Mental-Map.md",
         "mental_map/English-Grammar-Mental-Map.md"),
    ],
    "reading_data": [
        ("https://raw.githubusercontent.com/wangqiyue26-lab/english-reading/main/android/app/src/main/assets/js/data.js",
         "english_reading/data.js"),
    ],
    "llm_tutor": [
        ("https://raw.githubusercontent.com/murasamadsp/llm-english-tutor/main/data/curriculum/cefr_blocks.md",
         "llm_tutor/cefr_blocks.md"),
        ("https://raw.githubusercontent.com/murasamadsp/llm-english-tutor/main/algorithms/generate_drills.md",
         "llm_tutor/generate_drills.md"),
        ("https://raw.githubusercontent.com/murasamadsp/llm-english-tutor/main/algorithms/analyze_errors.md",
         "llm_tutor/analyze_errors.md"),
        ("https://raw.githubusercontent.com/murasamadsp/llm-english-tutor/main/algorithms/system_teacher.md",
         "llm_tutor/system_teacher.md"),
    ],
    "95grammar": [
        ("https://raw.githubusercontent.com/chihyungchang/95PercentEnglishGrammar/main/src/components/pages/TableOfContents.jsx",
         "95grammar/TableOfContents.jsx"),
    ]
    + [
        (f"https://raw.githubusercontent.com/chihyungchang/95PercentEnglishGrammar/main/src/components/pages/Page{i}.jsx",
         f"95grammar/Page{i}.jsx")
        for i in range(1, 21)
    ],
}


def download(url, rel, retries=3):
    dest = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "english-learning-site-fetch"})
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = resp.read()
            with open(dest, "wb") as f:
                f.write(data)
            print(f"OK  {rel}  {len(data):,} bytes")
            return True
        except Exception as e:
            print(f"RETRY {rel} ({attempt + 1}/{retries}): {e}")
            time.sleep(2 * (attempt + 1))
    print(f"FAIL {rel}")
    return False


def main():
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]
    ok = fail = 0
    for group, items in SOURCES.items():
        if only and group != only:
            continue
        for url, rel in items:
            if download(url, rel):
                ok += 1
            else:
                fail += 1
    print(f"\ndone: {ok} ok, {fail} fail")
    with open(os.path.join(OUT, "README.txt"), "w", encoding="utf-8") as f:
        f.write("外部学习资料原始素材(仅供本地个人学习使用,请勿公开发布)\n来源见 docs/ENRICHMENT_PLAN.md 第 1 节。\n")
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
