#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P5-4 本地 Piper 音频预生成(48 单元听力 + 文章逐句)

依赖:本机已运行 Piper HTTP 服务(官方 http_server,默认 127.0.0.1:5000):
    python -m piper.http_server --model en_US-lessac-medium.onnx

用法:
    python scripts/pregen_audio.py                       # 全量生成 48 单元
    python scripts/pregen_audio.py --units s1u1,s2u3     # 指定单元
    python scripts/pregen_audio.py --kinds listen        # 只生成听力
    python scripts/pregen_audio.py --host 127.0.0.1 --port 5000
    python scripts/pregen_audio.py --dry-run             # 只统计任务量不合成
    python scripts/pregen_audio.py --force               # 覆盖已生成文件

输出:
    public/content/audio/{unitId}/listen-{i}.wav   每轮盲听台词
    public/content/audio/{unitId}/article-{i}.wav  文章逐句
    public/content/audio/index.json                清单(前端据此判断本地音频是否可用)

音频目录已被 .gitignore 忽略,不随仓库分发;声音模型本身也不入库。
"""
import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CURRICULUM_DIR = ROOT / "public" / "content" / "curriculum"
AUDIO_DIR = ROOT / "public" / "content" / "audio"
MANIFEST_PATH = AUDIO_DIR / "index.json"

TASK_KINDS = ("listen", "article", "words", "dialogue")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="用本地 Piper 服务批量生成单元听力/文章音频")
    p.add_argument("--host", default="127.0.0.1", help="Piper 服务地址(默认 127.0.0.1)")
    p.add_argument("--port", type=int, default=5000, help="Piper 服务端口(默认 5000)")
    p.add_argument("--units", default="", help="逗号分隔的单元 id(如 s1u1,s2u3);留空=全部 48 单元")
    p.add_argument("--kinds", default="listen,article,words,dialogue", help="逗号分隔:listen,article,words,dialogue")
    p.add_argument("--word-limit", type=int, default=800, help="词库补充上限(课内新词会全部生成)")
    p.add_argument("--timeout", type=int, default=120, help="单次合成超时秒数(默认 120)")
    p.add_argument("--force", action="store_true", help="覆盖已存在的 wav")
    p.add_argument("--dry-run", action="store_true", help="只统计任务量并测试服务,不写文件")
    return p.parse_args()


def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def iter_units(index: dict, only: set[str]):
    for stage in index.get("stages", []):
        for unit in stage.get("units", []):
            uid = str(unit.get("id", ""))
            if only and uid not in only:
                continue
            yield uid


def is_wav(data: bytes) -> bool:
    return len(data) > 44 and data[:4] == b"RIFF" and data[8:12] == b"WAVE"


class PiperClient:
    """兼容三种 Piper HTTP 协议:
    1. piper 1.7+:POST /synthesize,JSON {"text": ...}
    2. piper master 官方:POST / 纯文本
    3. 第三方封装:POST /synthesize 纯文本
    """

    def __init__(self, host: str, port: int, timeout: int):
        self.base = f"http://{host}:{port}"
        self.timeout = timeout

    def _post(self, path: str, body: str, as_json: bool) -> bytes:
        data = json.dumps({"text": body.strip()}) if as_json else body.strip().encode("utf-8")
        req = urllib.request.Request(
            self.base + path,
            data=data.encode("utf-8") if isinstance(data, str) else data,
            method="POST",
            headers={"Content-Type": "application/json" if as_json else "text/plain; charset=utf-8"},
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            return resp.read()

    def synthesize(self, text: str) -> bytes:
        attempts = [
            ("/synthesize", text, True),
            ("/", text, False),
            ("/synthesize", text, False),
        ]
        last_err = None
        for path, body, as_json in attempts:
            try:
                data = self._post(path, body, as_json)
                if is_wav(data):
                    return data
                last_err = RuntimeError(f"{path} 返回内容不是有效 WAV({len(data)} 字节)")
            except urllib.error.HTTPError as e:
                last_err = RuntimeError(f"{path}: HTTP {e.code}")
            except Exception as e:
                last_err = e
        raise RuntimeError(f"合成失败: {last_err}")

    def test(self) -> str:
        data = self.synthesize("Hello.")
        return f"测试合成通过({len(data)} 字节 WAV)"


def main() -> int:
    args = parse_args()
    kinds = [k.strip() for k in args.kinds.split(",") if k.strip() in TASK_KINDS]
    if not kinds:
        print("错误:--kinds 至少包含 listen / article / words")
        return 2
    only = {u.strip() for u in args.units.split(",") if u.strip()} if args.units else set()
    do_words = "words" in kinds
    do_dialogue = "dialogue" in kinds
    kinds_unit = [k for k in kinds if k not in ("words", "dialogue")]

    index = load_json(CURRICULUM_DIR / "index.json")
    unit_ids = list(iter_units(index, only))
    if not unit_ids:
        print("错误:没有匹配的单元(检查 --units 拼写,如 s1u1)")
        return 2

    # 1) 统计任务
    tasks: list[tuple[str, str, str, str]] = []  # (unitId, kind, idx, text)
    missing_units = []
    for uid in unit_ids:
        for kind in kinds_unit:
            path = CURRICULUM_DIR / uid / f"{kind}.json"
            if not path.exists():
                missing_units.append(f"{uid}/{kind}")
                continue
            data = load_json(path)
            if kind == "listen":
                texts = [str(r.get("line", "")).strip() for r in data.get("rounds", [])]
            else:
                texts = [str(s.get("text", "")).strip() for s in data.get("sentences", [])]
            for i, text in enumerate(texts):
                if text:
                    tasks.append((uid, kind, str(i), text))
    word_tasks: list[str] = []
    if do_words:
        lesson = set()
        for uid in unit_ids:
            ap = CURRICULUM_DIR / uid / "article.json"
            if ap.exists():
                for w in load_json(ap).get("newWords") or []:
                    ww = str(w).lower().strip()
                    if ww.isascii() and ww.isalpha():
                        lesson.add(ww)
        extra = []
        wb = ROOT / "public" / "content" / "wordbank"
        bank = []
        if wb.exists():
            for fn in sorted(wb.iterdir()):
                if fn.suffix == ".json" and fn.name != "meta.json":
                    bank.extend(load_json(fn))
        bank.sort(key=lambda e: e.get("order", 99999))
        for e in bank:
            w = str(e.get("word", "")).lower().strip()
            if w and w not in lesson and w.isascii() and w.isalpha():
                extra.append(w)
            if len(extra) >= max(0, args.word_limit):
                break
        word_tasks = sorted(lesson) + extra
    dlg_tasks: list[tuple[str, str, str]] = []
    if do_dialogue:
        for uid in unit_ids:
            dp = CURRICULUM_DIR / uid / "dialogue.json"
            if not dp.exists():
                continue
            nodes = load_json(dp).get("nodes") or {}
            for nid, node in nodes.items():
                line = str((node or {}).get("line") or "").strip()
                if line:
                    dlg_tasks.append((uid, str(nid), line))
    total_bytes_hint = (len(tasks) + len(word_tasks) + len(dlg_tasks)) * 60
    print(f"任务统计: {len(unit_ids)} 单元 × {','.join(kinds_unit) or '-'} = {len(tasks)} 段 + 单词 {len(word_tasks)} + 对话 {len(dlg_tasks)}(粗估 ~{total_bytes_hint // 1024} KB)")
    for m in missing_units:
        print(f"  ⚠ 跳过缺失文件: {m}")

    if args.dry_run:
        print("dry-run 模式:不写文件")
        return 0

    # 2) 测试服务
    client = PiperClient(args.host, args.port, args.timeout)
    try:
        print(f"连接 Piper: {client.base} ...")
        print(f"  {client.test()}")
    except Exception as e:
        print(f"错误:无法使用本地 Piper 服务: {e}")
        print("请先启动: python -m piper.http_server --model en_US-lessac-medium.onnx")
        return 1

    # 3) 逐段合成(顺序执行,全量约 850 段,视本机速度需数分钟到数十分钟)
    start = time.time()
    done = 0
    skipped = 0
    failed: list[str] = []
    # 合并上一次清单:分批(--units/--kinds)多次运行时,不会丢掉其他单元/类型的记录
    generated: dict[str, dict[str, int]] = {}
    if MANIFEST_PATH.exists():
        try:
            old = json.loads(MANIFEST_PATH.read_text(encoding="utf-8")).get("units", {})
            for uid, meta in old.items():
                if isinstance(meta, dict):
                    generated[uid] = {k: int(v) for k, v in meta.items() if k in ("listen", "article", "dialogue") and isinstance(v, int)}
        except Exception:
            generated = {}
    old_words = []
    if MANIFEST_PATH.exists():
        try:
            old_words = list(json.loads(MANIFEST_PATH.read_text(encoding="utf-8")).get("words") or [])
        except Exception:
            old_words = []
    for uid in {t[0] for t in tasks}:
        for kind in kinds_unit:
            generated.setdefault(uid, {})[kind] = 0
    for uid, kind, idx, text in tasks:
        out_dir = AUDIO_DIR / uid
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{kind}-{idx}.wav"
        if out_path.exists() and not args.force:
            skipped += 1
            generated.setdefault(uid, {}).setdefault(kind, 0)
            generated[uid][kind] += 1
            continue
        try:
            data = client.synthesize(text)
            out_path.write_bytes(data)
            generated.setdefault(uid, {}).setdefault(kind, 0)
            generated[uid][kind] += 1
            done += 1
        except Exception as e:
            failed.append(f"{uid}/{kind}-{idx}: {e}")
        if (done + skipped) % 25 == 0 and (done + skipped):
            el = time.time() - start
            print(f"  进度 {done + skipped}/{len(tasks)} 新生成 {done} 用时 {el:.0f}s")

    words_ok = list(old_words)
    if do_words:
        wdir = AUDIO_DIR / "words"
        wdir.mkdir(parents=True, exist_ok=True)
        have = set(words_ok)
        for i, w in enumerate(word_tasks):
            out_path = wdir / f"{w}.wav"
            if out_path.exists() and not args.force:
                skipped += 1
                have.add(w)
                continue
            try:
                data = client.synthesize(w)
                out_path.write_bytes(data)
                have.add(w)
                done += 1
            except Exception as e:
                failed.append(f"word/{w}: {e}")
            if (i + 1) % 50 == 0:
                print(f"  单词 {i + 1}/{len(word_tasks)} 新生成 {done} 用时 {time.time() - start:.0f}s")
        words_ok = sorted(have)

    if do_dialogue:
        for uid, nid, line in dlg_tasks:
            out_dir = AUDIO_DIR / uid
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / f"dlg-{nid}.wav"
            generated.setdefault(uid, {}).setdefault("dialogue", 0)
            if out_path.exists() and not args.force:
                skipped += 1
                generated[uid]["dialogue"] += 1
                continue
            try:
                data = client.synthesize(line)
                out_path.write_bytes(data)
                generated[uid]["dialogue"] += 1
                done += 1
            except Exception as e:
                failed.append(f"{uid}/dlg-{nid}: {e}")
        print(f"  对话完成,累计新生成 {done} 用时 {time.time() - start:.0f}s")

    # 4) 写清单(失败项不进清单;前端按清单条数判断本地音频可用)
    manifest = {
        "version": 1,
        "source": f"local piper http://{args.host}:{args.port}",
        "generatedAt": int(time.time()),
        "kinds": kinds,
        "units": generated,
        "words": words_ok,
    }
    if not args.dry_run:
        AUDIO_DIR.mkdir(parents=True, exist_ok=True)
        MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    el = time.time() - start
    print(f"完成: 新生成 {done} / 复用 {skipped} / 失败 {len(failed)} 段,用时 {el:.0f}s")
    for f in failed[:20]:
        print(f"  ❌ {f}")
    if len(failed) > 20:
        print(f"  … 其余 {len(failed) - 20} 条失败省略")
    if not args.dry_run and done:
        print(f"清单已写: {MANIFEST_PATH.relative_to(ROOT)}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
