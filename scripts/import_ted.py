#!/usr/bin/env python3
"""导入 shizhengLi/Learning-English-With-TED 的中文标注笔记(P3-1 TED 泛读库)。

流程:
1. 经 GitHub API 列出仓库文件树,筛选三个专辑的 .md:
   Basketball(22 课)/ Books/The_Worlds_I_See(6 章)/ ChatGPT/A_book_of_American_Titans(9 章)
2. 下载原始 .md 到 raw_materials/ted/(仅本地个人学习);
3. 解析「## Opening Scene / 创世词汇 / Deep Dive / Listen & Learn」等小节
   (表格转文本行、引用/列表清洗)→ public/content/intensive/ted/{id}.json + ted-index.json。

用法: python scripts/import_ted.py
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw_materials", "ted")
OUT = os.path.join(ROOT, "public", "content", "intensive", "ted")

API = "https://api.github.com/repos/shizhengLi/Learning-English-With-TED"
RAW_BASE = "https://raw.githubusercontent.com/shizhengLi/Learning-English-With-TED/main/"

GROUPS = [
    ("bb", "Basketball", "Basketball", r"^Basketball/\d+ .+\.md$"),
    ("tws", "The Worlds I See", "Books", r"^Books/The_Worlds_I_See_Chapter_\d+.*\.md$"),
    ("tit", "American Titans", "ChatGPT/A_book_of_American_Titans", r"^ChatGPT/A_book_of_American_Titans/Chapter \d+ .+\.md$"),
]

SOURCE = "shizhengLi/Learning-English-With-TED 中文标注笔记(仅供本地个人学习)"


def http_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "english-learning-site-import"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def download(path, retries=3):
    dest = os.path.join(RAW, path.replace("/", os.sep))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 100:
        return dest
    url = RAW_BASE + urllib.parse.quote(path)
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "english-learning-site-import"})
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = resp.read()
            with open(dest, "wb") as f:
                f.write(data)
            return dest
        except Exception as e:
            print(f"  RETRY {path} ({attempt + 1}/{retries}): {e}")
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"下载失败: {path}")


def clean_line(line: str) -> str:
    line = line.replace("**", "").replace("`", "").strip()
    line = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", line)          # 图片
    line = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", line)      # 链接保留文字
    line = re.sub(r"<[^>]+>", "", line)                       # html
    line = re.sub(r"\s+", " ", line).strip()
    return line


def parse_md(text: str, fallback_title: str = ""):
    lines = text.split("\n")
    title = ""
    sections = []
    cur = None
    for raw in lines:
        line = raw.rstrip("\ufeff").strip()
        if line.startswith("# ") and not title:
            title = line[2:].strip()
            continue
        m = re.match(r"^##\s+(.*)$", line)
        if m:
            cur = {"heading": clean_line(m.group(1)), "paragraphs": []}
            sections.append(cur)
            continue
        # 「word: 中文释义」条目(书章节格式)单独成节
        wm = re.match(r"^([A-Za-z][A-Za-z '’\-/]{1,40}):\s*(.+)$", line)
        if wm and len(wm.group(2)) <= 60 and re.search(r"[\u4e00-\u9fff]", wm.group(2)):
            cur = {"heading": f"{wm.group(1)} · {wm.group(2).strip()}", "paragraphs": []}
            sections.append(cur)
            continue
        if not line or line.startswith("#"):
            continue
        if re.match(r"^\|?[\s:|-]+\|?$", line):  # 表格分隔行
            continue
        if cur is None:
            cur = {"heading": "正文", "paragraphs": []}
            sections.append(cur)
        if line.startswith("|"):
            cells = [clean_line(c) for c in line.split("|")[1:-1]]
            cells = [c for c in cells if c and c not in ("---", ":---", "---:", ":-:")]
            if cells:
                cur["paragraphs"].append(" · ".join(cells))
            continue
        if line.startswith(">"):
            cur["paragraphs"].append(clean_line(line[1:]))
            continue
        if re.match(r"^[-*]\s+", line):
            cur["paragraphs"].append("• " + clean_line(re.sub(r"^[-*]\s+", "", line)))
            continue
        p = clean_line(line)
        if p:
            cur["paragraphs"].append(p)
    if not title and fallback_title:
        title = fallback_title
    return title, [s for s in sections if s["paragraphs"]]


def word_count(sections):
    text = " ".join(p for s in sections for p in s["paragraphs"])
    return len(re.findall(r"[A-Za-z]+(?:['’][A-Za-z]+)?", text))


def main():
    tree = http_json(f"{API}/git/trees/main?recursive=1")
    blobs = {t["path"]: t.get("size", 0) for t in tree.get("tree", []) if t.get("type") == "blob"}
    paths = [p for p, size in blobs.items() if size > 0]

    selected = []
    for key, gname, prefix, pattern in GROUPS:
        group_files = sorted(p for p in paths if re.match(pattern, p))
        selected.append((key, gname, group_files))
        print(f"{gname}: {len(group_files)} 篇")

    total = sum(len(f) for _, _, f in selected)
    assert total >= 30, f"首批不足 30 篇({total})"
    os.makedirs(OUT, exist_ok=True)

    groups = []
    n = 0
    for key, gname, files in selected:
        items = []
        for idx, path in enumerate(files, 1):
            dest = download(path)
            with open(dest, encoding="utf-8") as f:
                text = f.read()
            fb = os.path.splitext(os.path.basename(path))[0].replace("_", " ")
            title, sections = parse_md(text, fallback_title=fb)
            assert title and sections, f"{path}: 解析为空"
            lid = f"ted-{key}-{idx:02d}"
            lesson = {
                "id": lid,
                "type": "ted-lesson",
                "group": gname,
                "title": title,
                "source": SOURCE,
                "wordCount": word_count(sections),
                "sections": sections,
                "paragraphs": [p for s in sections for p in s["paragraphs"]],
            }
            with open(os.path.join(OUT, lid + ".json"), "w", encoding="utf-8") as f:
                json.dump(lesson, f, ensure_ascii=False, indent=1)
                f.write("\n")
            items.append({"id": lid, "group": gname, "title": title, "source": SOURCE, "wordCount": lesson["wordCount"]})
            n += 1
        groups.append({"id": key, "title": gname, "items": items})

    index = {"version": 1, "type": "ted-lessons", "source": SOURCE, "groups": groups,
             "items": [it for g in groups for it in g["items"]]}
    with open(os.path.join(OUT, "ted-index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"\n完成: {n} 篇 → public/content/intensive/ted/ 与 ted-index.json")
    for g in groups:
        print(f"  {g['title']}: {len(g['items'])} 篇")


if __name__ == "__main__":
    main()
