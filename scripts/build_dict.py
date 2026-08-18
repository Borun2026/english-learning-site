# -*- coding: utf-8 -*-
"""build_dict.py —— 从合并词库构建查词弹层词典 public/content/dict/{a..z}.json"""
import json
import os
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(os.path.dirname(SITE_ROOT), "01_词库", "词库jsonl")
OUT_DIR = os.path.join(SITE_ROOT, "public", "content", "dict")
FILES = ["四级.jsonl", "六级.jsonl", "考研.jsonl", "雅思.jsonl"]


def get(obj, *path):
    cur = obj
    for p in path:
        if isinstance(cur, dict):
            cur = cur.get(p)
        else:
            return None
    return cur


def _s(v):
    return (v or "").strip()


def merge_word(store, rec):
    w = _s(rec.get("headWord")).lower()
    if not w:
        return False
    wc = get(rec, "content", "word", "content") or {}

    incoming_trans = []
    seen_t = set()
    for t in get(wc, "trans") or []:
        if not isinstance(t, dict):
            continue
        cn = _s(t.get("tranCn"))
        if not cn:
            continue
        pos = _s(t.get("pos"))
        key = (pos.lower(), cn)
        if key in seen_t:
            continue
        seen_t.add(key)
        item = {"pos": pos, "cn": cn}
        en = _s(t.get("tranOther"))
        if en:
            item["en"] = en
        incoming_trans.append(item)
    if not incoming_trans:
        return False

    uk = _s(get(wc, "ukphone"))
    us = _s(get(wc, "usphone"))

    incoming_sents = []
    seen_s = set()
    for s in get(wc, "sentence", "sentences") or []:
        if not isinstance(s, dict):
            continue
        en = _s(s.get("sContent"))
        if not en or en in seen_s:
            continue
        seen_s.add(en)
        incoming_sents.append({"en": en, "cn": _s(s.get("sCn"))})

    incoming_ph = []
    seen_p = set()
    for ph in get(wc, "phrase", "phrases") or []:
        if not isinstance(ph, dict):
            continue
        p = _s(ph.get("pContent"))
        if not p or p in seen_p:
            continue
        seen_p.add(p)
        incoming_ph.append({"p": p, "cn": _s(ph.get("pCn"))})

    incoming_synos = []
    seen_sy = set()
    for sy in get(wc, "syno", "synos") or []:
        if not isinstance(sy, dict):
            continue
        pos = _s(sy.get("pos"))
        cn = _s(sy.get("tran"))
        key = (pos.lower(), cn)
        if not cn or key in seen_sy:
            continue
        seen_sy.add(key)
        words = []
        seen_w = set()
        for h in sy.get("hwds") or []:
            ww = _s(h.get("w") if isinstance(h, dict) else None)
            if not ww or ww in seen_w:
                continue
            seen_w.add(ww)
            words.append(ww)
            if len(words) >= 6:
                break
        incoming_synos.append({"pos": pos, "cn": cn, "words": words})

    incoming_rels = []
    rel_by_pos = {}
    for rel in get(wc, "relWord", "rels") or []:
        if not isinstance(rel, dict):
            continue
        pos = _s(rel.get("pos"))
        if pos not in rel_by_pos:
            rel_by_pos[pos] = {"pos": pos, "words": [], "_seen": set()}
            incoming_rels.append(rel_by_pos[pos])
        bucket = rel_by_pos[pos]
        for rw in rel.get("words") or []:
            if not isinstance(rw, dict):
                continue
            ww = _s(rw.get("hwd"))
            if not ww or ww in bucket["_seen"]:
                continue
            bucket["_seen"].add(ww)
            bucket["words"].append({"w": ww, "cn": _s(rw.get("tran"))})
            if len(bucket["words"]) >= 8:
                break

    mnemonic = _s(get(wc, "remMethod", "val"))

    if w not in store:
        entry = {
            "word": w,
            "_uk": uk,
            "_us": us,
            "trans": incoming_trans[:8],
            "sentences": incoming_sents[:3],
            "phrases": incoming_ph[:5],
            "synos": incoming_synos[:6],
            "rels": incoming_rels[:6],
        }
        if mnemonic:
            entry["mnemonic"] = mnemonic
        store[w] = entry
        return True

    e = store[w]
    if uk and not e["_uk"]:
        e["_uk"] = uk
    if us and not e["_us"]:
        e["_us"] = us

    have_t = {(x["pos"].strip().lower(), x["cn"].strip()) for x in e["trans"]}
    for t in incoming_trans:
        if len(e["trans"]) >= 8:
            break
        key = (t["pos"].strip().lower(), t["cn"].strip())
        if key in have_t:
            continue
        have_t.add(key)
        e["trans"].append(t)

    have_s = {x["en"] for x in e["sentences"]}
    for s in incoming_sents:
        if len(e["sentences"]) >= 3:
            break
        if s["en"] in have_s:
            continue
        have_s.add(s["en"])
        e["sentences"].append(s)

    have_p = {x["p"] for x in e["phrases"]}
    for ph in incoming_ph:
        if len(e["phrases"]) >= 5:
            break
        if ph["p"] in have_p:
            continue
        have_p.add(ph["p"])
        e["phrases"].append(ph)

    have_sy = {(x["pos"].strip().lower(), x["cn"].strip()) for x in e["synos"]}
    for sy in incoming_synos:
        if len(e["synos"]) >= 6:
            break
        key = (sy["pos"].strip().lower(), sy["cn"].strip())
        if key in have_sy:
            continue
        have_sy.add(key)
        e["synos"].append(sy)

    have_rel = {x["pos"]: x for x in e["rels"]}
    for rel in incoming_rels:
        if rel["pos"] in have_rel:
            bucket = have_rel[rel["pos"]]
            seen_rw = {x["w"] for x in bucket["words"]}
            for rw in rel["words"]:
                if len(bucket["words"]) >= 8:
                    break
                if rw["w"] in seen_rw:
                    continue
                seen_rw.add(rw["w"])
                bucket["words"].append(rw)
        else:
            if len(e["rels"]) >= 6:
                continue
            e["rels"].append(rel)
            have_rel[rel["pos"]] = rel

    if mnemonic and not e.get("mnemonic"):
        e["mnemonic"] = mnemonic
    return True


def finalize(entry):
    phon = entry["_uk"] or entry["_us"]
    phon_us = entry["_us"]
    out = {"word": entry["word"]}
    if phon:
        out["phon"] = phon
    if phon_us and phon_us != phon:
        out["phonUs"] = phon_us
    out["trans"] = entry["trans"]
    out["sentences"] = entry["sentences"]
    out["phrases"] = entry["phrases"]
    if entry["synos"]:
        out["synos"] = [{k: v for k, v in sy.items() if k != "_seen"} for sy in entry["synos"]]
    if entry["rels"]:
        rels = []
        for rel in entry["rels"]:
            item = {"pos": rel["pos"], "words": rel["words"][:8]}
            if item["words"]:
                rels.append(item)
        if rels:
            out["rels"] = rels
    if entry.get("mnemonic"):
        out["mnemonic"] = entry["mnemonic"]
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    store = {}
    raw = 0
    for fn in FILES:
        p = os.path.join(SRC_DIR, fn)
        if not os.path.exists(p):
            print("MISSING", p)
            continue
        with open(p, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    d = json.loads(line)
                except Exception:
                    continue
                if merge_word(store, d):
                    raw += 1

    by_letter = {}
    for w, entry in store.items():
        letter = w[0] if "a" <= w[0] <= "z" else "x"
        by_letter.setdefault(letter, []).append(finalize(entry))

    for letter in sorted(by_letter):
        by_letter[letter].sort(key=lambda e: e["word"])
        out = os.path.join(OUT_DIR, letter + ".json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(by_letter[letter], f, ensure_ascii=False, separators=(",", ":"))

    unique = len(store)
    poly = 0
    with_en = 0
    with_syno = 0
    for e in store.values():
        if len(e["trans"]) > 1:
            poly += 1
        if any(t.get("en") for t in e["trans"]):
            with_en += 1
        if e["synos"]:
            with_syno += 1
    print(
        "dict entries:", raw,
        "/ unique words:", unique,
        "/ letters:", len(by_letter),
        "/ 多义项:", poly,
        "/ 有英英:", with_en,
        "/ 有近义:", with_syno,
    )


if __name__ == "__main__":
    main()
