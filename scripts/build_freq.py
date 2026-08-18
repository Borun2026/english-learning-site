# -*- coding: utf-8 -*-
"""build_freq.py —— 从考研词频表生成 public/content/freq.json
输入: D:\英语单词资料\01_词库\考研词频表\netem_full_list.json
输出: public/content/freq.json { word: {rank, freq} }
"""
import json
import os
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(os.path.dirname(SITE_ROOT), "01_词库", "考研词频表", "netem_full_list.json")
OUT = os.path.join(SITE_ROOT, "public", "content", "freq.json")


def main():
    data = json.load(open(SRC, encoding="utf-8"))
    # 顶层是对象: {"5530考研词汇词频排序版": [...]} 或类似
    entries = []
    for v in data.values():
        if isinstance(v, list):
            entries = v
            break
    if not entries:
        print("未找到词条列表,顶层 keys:", list(data.keys())[:5])
        return
    freq = {}
    for e in entries:
        w = (e.get("单词") or "").strip().lower()
        if not w:
            continue
        freq[w] = {"rank": e.get("序号"), "freq": e.get("词频")}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(freq, f, ensure_ascii=False, separators=(",", ":"))
    print("freq.json:", len(freq), "词")


if __name__ == "__main__":
    main()
