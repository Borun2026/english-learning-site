# -*- coding: utf-8 -*-
"""export_anki.py —— 把生词列表导出为 Anki 可导入 txt(制表符分隔:单词\t释义\t例句)
用法: python scripts/export_anki.py words.txt > anki-import.txt
"""
import json
import os
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DICT_DIR = os.path.join(ROOT, "public", "content", "dict")
BANK_DIR = os.path.join(ROOT, "public", "content", "wordbank")


def lookup(word):
    letter = word[0].lower() if word and word[0].isalpha() else "x"
    dp = os.path.join(DICT_DIR, letter + ".json")
    if os.path.exists(dp):
        with open(dp, encoding="utf-8") as f:
            for e in json.load(f):
                if e["word"] == word.lower():
                    cn = "; ".join((t["pos"] + ". " if t["pos"] else "") + t["cn"] for t in e["trans"][:4])
                    ex = e["sentences"][0] if e["sentences"] else None
                    return cn, (ex["en"] + " " + ex["cn"]) if ex else ""
    bp = os.path.join(BANK_DIR, letter + ".json")
    if os.path.exists(bp):
        with open(bp, encoding="utf-8") as f:
            for e in json.load(f):
                if e["word"] == word.lower():
                    ex = e.get("example")
                    return e["cn"], (ex["en"] + " " + ex["cn"]) if ex else ""
    return "", ""


def main():
    if len(sys.argv) < 2:
        print("用法: python export_anki.py words.txt")
        return
    print("#separator:tab")
    with open(sys.argv[1], encoding="utf-8") as f:
        for line in f:
            w = line.strip().split("\t")[0].strip()
            if not w:
                continue
            cn, ex = lookup(w)
            print(f"{w}\t{cn}\t{ex}")


if __name__ == "__main__":
    main()
