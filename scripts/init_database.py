# -*- coding: utf-8 -*-
"""Build english_core.db + user_learning.db from site JSON and audio files."""
import argparse
import json
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

LETTERS = "abcdefghijklmnopqrstuvwxyz"
AUDIO_EXTS = {".mp3", ".wav", ".opus", ".m4a", ".ogg", ".flac", ".aac"}
_UP = Path(__file__).resolve().parent.parent.parent
HARDCODED_DATA = _UP / "data"
HARDCODED_AUDIO = _UP / "audio_assets"

CORE_SCHEMA = """
CREATE TABLE dict_entries (
    word TEXT PRIMARY KEY,
    phonetic_us TEXT,
    phonetic_uk TEXT,
    pos_json TEXT,
    phrases_json TEXT,
    synonyms_json TEXT,
    cognates_json TEXT,
    sentences_json TEXT,
    mnemonic TEXT,
    level INTEGER DEFAULT 0,
    freq_order INTEGER,
    affix_tags TEXT
);
CREATE VIRTUAL TABLE dict_fts USING fts5(word, tr);
CREATE TABLE audio_manifest (
    audio_key TEXT PRIMARY KEY,
    audio_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    duration_ms INTEGER,
    format TEXT DEFAULT 'mp3',
    file_size INTEGER
);
CREATE INDEX idx_audio_type ON audio_manifest(audio_type);
"""

USER_SCHEMA = """
CREATE TABLE IF NOT EXISTS user_word_states (
    word TEXT PRIMARY KEY,
    reps INTEGER DEFAULT 0,
    interval_days REAL DEFAULT 0,
    ef REAL DEFAULT 2.5,
    next_review_at INTEGER NOT NULL,
    status TEXT DEFAULT 'learning',
    box INTEGER DEFAULT 1,
    wrong_count INTEGER DEFAULT 0,
    sources_json TEXT,
    added_at INTEGER,
    last_review_at INTEGER
);
CREATE TABLE IF NOT EXISTS user_progress (
    module_id TEXT PRIMARY KEY,
    progress_json TEXT NOT NULL,
    updated_at INTEGER
);
CREATE TABLE IF NOT EXISTS user_notes_and_ai (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    target_key TEXT,
    content_json TEXT NOT NULL,
    created_at INTEGER
);
CREATE TABLE IF NOT EXISTS user_blob (
    id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
"""


def dumps(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def resolve_audio_root(site_root: Path, override):
    if override:
        p = Path(override)
        if not p.is_dir():
            raise SystemExit(f"audio root not found: {p}")
        return p
    for cand in (HARDCODED_AUDIO, site_root / "public" / "content" / "audio"):
        if cand.is_dir():
            return cand
    return None


def load_letter_arrays(folder: Path):
    out = {}
    for ch in LETTERS:
        p = folder / f"{ch}.json"
        if not p.exists():
            continue
        for item in load_json(p):
            w = (item.get("word") or "").strip().lower()
            if w and w not in out:
                out[w] = item
    return out


def affix_index(items):
    prefixes, suffixes, roots = [], [], []
    for it in items:
        body = re.sub(r"^-+|-+$", "", it.get("affix") or "")
        typ = it.get("type")
        if typ == "root":
            if len(body) < 3:
                continue
            roots.append((body, it.get("count") or 0, it.get("affix") or body))
        elif typ in ("prefix", "suffix"):
            if len(body) < 2:
                continue
            bucket = prefixes if typ == "prefix" else suffixes
            bucket.append((body, it.get("count") or 0, it.get("affix") or body))
    return prefixes, suffixes, roots


def affixes_of_word(w, prefixes, suffixes, roots):
    hits = []
    for body, count, affix in prefixes:
        if w.startswith(body) and len(w) > len(body) + 1:
            hits.append((count, affix))
    for body, count, affix in suffixes:
        if w.endswith(body) and len(w) > len(body) + 1:
            hits.append((count, affix))
    for body, count, affix in roots:
        if body in w and len(w) > len(body) + 1:
            hits.append((count, affix))
    hits.sort(key=lambda x: -x[0])
    seen, tags = set(), []
    for _, affix in hits:
        if affix in seen:
            continue
        seen.add(affix)
        tags.append(affix)
        if len(tags) == 4:
            break
    return ",".join(tags)


def fts_tr(trans, sentences):
    parts = []
    for t in trans or []:
        cn = (t.get("cn") or "").strip()
        en = (t.get("en") or "").strip()
        if cn:
            parts.append(cn)
        if en:
            parts.append(en)
    for s in sentences or []:
        cn = (s.get("cn") or "").strip()
        if cn:
            parts.append(cn)
    return " ".join(parts)


def build_rows(dict_map, bank_map, freq_map, prefixes, suffixes, roots):
    rows, tr_map = [], {}
    stubs = 0
    all_words = set(dict_map) | set(bank_map)
    for w in all_words:
        d = dict_map.get(w)
        b = bank_map.get(w)
        fi = freq_map.get(w) or {}
        rank = fi.get("rank") if isinstance(fi, dict) else None
        if d:
            trans = d.get("trans") or []
            sents = d.get("sentences") or []
            phon = d.get("phon") or ""
            phon_us = d.get("phonUs") or phon
            if b and not phon:
                phon = b.get("phon") or ""
                phon_us = phon_us or phon
            level = int(b["level"]) if b and b.get("level") is not None else 0
            row = (
                w,
                phon_us or None,
                phon or None,
                dumps(trans),
                dumps(d.get("phrases") or []),
                dumps(d.get("synos") or []),
                dumps(d.get("rels") or []),
                dumps(sents),
                d.get("mnemonic") or None,
                level,
                rank,
                affixes_of_word(w, prefixes, suffixes, roots) or None,
            )
            tr_map[w] = fts_tr(trans, sents)
        else:
            stubs += 1
            trans = [{"pos": "", "cn": b.get("cn") or "", "en": b.get("enDef")}]
            if trans[0]["en"] is None:
                trans[0].pop("en")
            ex = b.get("example")
            sents = [ex] if isinstance(ex, dict) and (ex.get("en") or ex.get("cn")) else []
            phon = b.get("phon") or ""
            level = int(b["level"]) if b.get("level") is not None else 0
            row = (
                w,
                phon or None,
                phon or None,
                dumps(trans),
                dumps([]),
                dumps([]),
                dumps([]),
                dumps(sents),
                None,
                level,
                rank,
                affixes_of_word(w, prefixes, suffixes, roots) or None,
            )
            tr_map[w] = fts_tr(trans, sents)
        rows.append(row)
    return rows, tr_map, stubs


def audio_record(rel: str, size: int):
    parts = rel.split("/")
    ext = Path(rel).suffix.lower().lstrip(".")
    stem = Path(parts[-1]).stem
    if len(parts) == 2 and parts[0] == "words":
        return (f"word:{stem}", "word", rel, None, ext, size)
    if len(parts) == 2:
        unit, name = parts[0], parts[1]
        if name.startswith("article-"):
            return (f"unit:{unit}:article:{stem[8:]}", "article", rel, None, ext, size)
        if name.startswith("listen-"):
            return (f"unit:{unit}:listen:{stem[7:]}", "listen", rel, None, ext, size)
        if name.startswith("dlg-"):
            return (f"unit:{unit}:dialogue:{stem[4:]}", "dialogue", rel, None, ext, size)
        return None
    if len(parts) == 3 and parts[0] == "extra":
        kind = parts[1]
        if "-" not in stem:
            return None
        eid, idx = stem.rsplit("-", 1)
        return (f"extra:{kind}:{eid}:{idx}", "extra", rel, None, ext, size)
    return None


def scan_audio(root: Path):
    rows = []
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if any(part == "_tmp" for part in p.relative_to(root).parts):
            continue
        if p.name == "index.json" or p.suffix.lower() not in AUDIO_EXTS:
            continue
        rel = p.relative_to(root).as_posix()
        rec = audio_record(rel, p.stat().st_size)
        if rec:
            rows.append(rec)
    return rows


def init_core(db_path: Path, rows, tr_map, audio_rows):
    if db_path.exists():
        db_path.unlink()
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=OFF")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.executescript(CORE_SCHEMA)
    conn.executemany(
        "INSERT INTO dict_entries(word,phonetic_us,phonetic_uk,pos_json,phrases_json,"
        "synonyms_json,cognates_json,sentences_json,mnemonic,level,freq_order,affix_tags)"
        " VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
        rows,
    )
    fts = [
        (rid, w, tr_map.get(w, ""))
        for rid, w in conn.execute("SELECT rowid, word FROM dict_entries")
    ]
    conn.executemany("INSERT INTO dict_fts(rowid, word, tr) VALUES(?,?,?)", fts)
    if audio_rows:
        conn.executemany(
            "INSERT OR REPLACE INTO audio_manifest(audio_key,audio_type,file_path,duration_ms,format,file_size)"
            " VALUES(?,?,?,?,?,?)",
            audio_rows,
        )
    conn.commit()
    apple = conn.execute("SELECT word, phonetic_us, level FROM dict_entries WHERE word=?", ("apple",)).fetchone()
    conn.close()
    return apple


def init_user(db_path: Path):
    conn = sqlite3.connect(str(db_path))
    conn.executescript(USER_SCHEMA)
    conn.commit()
    conn.close()


def main():
    t0 = time.perf_counter()
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description="Initialize english_core.db and user_learning.db")
    ap.add_argument("--site-root", default=str(here.parent))
    ap.add_argument("--data-dir", default=None)
    ap.add_argument("--audio-root", default=None)
    args = ap.parse_args()

    site_root = Path(args.site_root).resolve()
    if args.data_dir:
        data_dir = Path(args.data_dir)
    elif HARDCODED_DATA.parent.exists():
        data_dir = HARDCODED_DATA
    else:
        data_dir = (site_root / ".." / ".." / "data").resolve()
    data_dir.mkdir(parents=True, exist_ok=True)

    content = site_root / "public" / "content"
    dict_map = load_letter_arrays(content / "dict")
    bank_map = load_letter_arrays(content / "wordbank")
    freq_map = load_json(content / "freq.json") if (content / "freq.json").exists() else {}
    affix_file = load_json(content / "affix.json") if (content / "affix.json").exists() else {}
    prefixes, suffixes, roots = affix_index(affix_file.get("items") or [])

    rows, tr_map, stubs = build_rows(dict_map, bank_map, freq_map, prefixes, suffixes, roots)

    audio_root = resolve_audio_root(site_root, args.audio_root)
    audio_rows = scan_audio(audio_root) if audio_root else []

    apple = init_core(data_dir / "english_core.db", rows, tr_map, audio_rows)
    init_user(data_dir / "user_learning.db")

    elapsed = time.perf_counter() - t0
    print(f"dict rows: {len(rows)}")
    print(f"bank-only stubs: {stubs}")
    print(f"audio rows: {len(audio_rows)}")
    print(f"elapsed: {elapsed:.2f}s")
    print(f"audio root: {audio_root}")
    print(f"data dir: {data_dir}")
    if apple:
        print(f"sanity apple: {apple} ok")
    else:
        print("sanity apple: MISSING")
        sys.exit(1)


if __name__ == "__main__":
    main()
