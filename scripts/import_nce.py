# -*- coding: utf-8 -*-
"""import_nce.py —— 解析 protogenesis/New-Concept-English 的 NCE1-4 语法笔记

输出: public/content/intensive/nce/{nce1..nce4}/lesson-XX.json + index.json
笔记来源仓库: https://github.com/protogenesis/New-Concept-English (仅供本地个人学习)
"""
import json
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw_materials", "nce")
OUT = os.path.join(ROOT, "public", "content", "intensive", "nce")

BOOKS = [
    ("nce1", "NCE1.md", "新概念英语第一册"),
    ("nce2", "NCE2.md", "新概念英语第二册"),
    ("nce3", "NCE3.md", "新概念英语第三册"),
    ("nce4", "NCE4.md", "新概念英语第四册"),
]

LESSON_RE = re.compile(r"^#\s*[Ll]esson\s*(\d+)(?:&(\d+))?")


def lesson_slug(title):
    m = LESSON_RE.match(title)
    if not m:
        return None
    if m.group(2):
        return f"lesson-{m.group(1)}-{m.group(2)}"
    return f"lesson-{int(m.group(1)):02d}"


def parse_book(book_id, path):
    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()

    lessons = []
    cur = None
    mode = None  # None | 'knowledge' | section heading
    for line in lines:
        m = LESSON_RE.match(line)
        if m:
            if cur:
                lessons.append(cur)
            cur = {"title": line[2:].strip(), "mainKnowledge": [], "sections": [], "notes": [], "raw": [line]}
            mode = None
            continue
        if cur is None:
            continue
        cur["raw"].append(line)
        if line.startswith("#### ") and line.strip().lower().startswith("#### main knowledge"):
            mode = "knowledge"
            continue
        if line.startswith("##### ") or line.startswith("###### "):
            mode = {"heading": line.lstrip("#").strip(), "content": []}
            cur["sections"].append(mode)
            continue
        s = line.strip()
        if not s:
            continue
        if isinstance(mode, dict):
            mode["content"].append(s)
        elif mode == "knowledge" and s.startswith("+"):
            cur["mainKnowledge"].append(s.lstrip("+ ").strip())
        else:
            cur["notes"].append(s)
    if cur:
        lessons.append(cur)

    result = []
    for l in lessons:
        slug = lesson_slug("# " + l["title"])
        if not slug:
            continue
        result.append({
            "id": f"{book_id}-{slug}",
            "book": book_id,
            "title": l["title"],
            "mainKnowledge": l["mainKnowledge"],
            "sections": l["sections"],
            "notes": l["notes"],
            "raw": "\n".join(l["raw"]),
        })
    return result


def main():
    os.makedirs(OUT, exist_ok=True)
    index_books = []
    total = 0
    for book_id, fn, name in BOOKS:
        src = os.path.join(RAW, fn)
        if not os.path.exists(src):
            print("MISSING", src)
            continue
        lessons = parse_book(book_id, src)
        book_dir = os.path.join(OUT, book_id)
        os.makedirs(book_dir, exist_ok=True)
        for l in lessons:
            dest = os.path.join(book_dir, l["id"].split("-", 1)[1] + ".json")
            with open(dest, "w", encoding="utf-8") as f:
                json.dump(l, f, ensure_ascii=False, indent=1)
        index_books.append({
            "id": book_id,
            "title": name,
            "source": "protogenesis/New-Concept-English",
            "lessons": [{"id": l["id"], "title": l["title"], "points": len(l["mainKnowledge"]) + len(l["sections"])} for l in lessons],
        })
        total += len(lessons)
        print(f"{book_id}: {len(lessons)} lessons")

    index = {"version": 1, "type": "nce-notes", "source": "protogenesis/New-Concept-English(仅供本地个人学习)", "books": index_books}
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
    print(f"index.json: {total} lessons total")


if __name__ == "__main__":
    main()
