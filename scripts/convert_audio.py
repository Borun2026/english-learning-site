# -*- coding: utf-8 -*-
"""Optional MP3→Opus conversion. Source audio is already MP3; skipped unless --run."""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"}
DEFAULT_OUT = Path(__file__).resolve().parent.parent.parent / "audio_assets"


def iter_src(src_root: Path):
    for p in src_root.rglob("*"):
        if not p.is_file():
            continue
        if any(part == "_tmp" for part in p.relative_to(src_root).parts):
            continue
        if p.name == "index.json" or p.suffix.lower() not in AUDIO_EXTS:
            continue
        yield p


def convert_one(src: Path, dst: Path, ffmpeg: str, force: bool, dry: bool):
    if dst.exists() and not force:
        return "skip"
    if dry:
        return "dry"
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(src),
        "-c:a", "libopus", "-b:a", "48k", "-ac", "1", "-ar", "24000",
        str(dst),
    ]
    r = subprocess.run(cmd)
    if r.returncode != 0:
        return "fail"
    return "ok"


def main():
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description="Convert site audio to Opus (off by default)")
    ap.add_argument("--site-root", default=str(here.parent))
    ap.add_argument("--out-dir", default=str(DEFAULT_OUT))
    ap.add_argument("--run", action="store_true", help="actually convert; default is skip")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    if not args.run:
        print("Source audio is already MP3 (~832MB). Conversion skipped.")
        print("Re-encode to Opus only if needed: python scripts/convert_audio.py --run")
        print("Options: --force --dry-run --limit N --out-dir PATH")
        return 0

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("ffmpeg not found on PATH.")
        print("Install: winget install Gyan.FFmpeg")
        print("Or: https://ffmpeg.org/download.html")
        return 1

    src_root = Path(args.site_root).resolve() / "public" / "content" / "audio"
    out_root = Path(args.out_dir)
    if not src_root.is_dir():
        print(f"source audio dir not found: {src_root}")
        return 1

    files = list(iter_src(src_root))
    if args.limit:
        files = files[: args.limit]

    stats = {"ok": 0, "skip": 0, "dry": 0, "fail": 0}
    for src in files:
        rel = src.relative_to(src_root)
        dst = (out_root / rel).with_suffix(".opus")
        st = convert_one(src, dst, ffmpeg, args.force, args.dry_run)
        stats[st] += 1
        if st == "fail":
            print(f"FAIL {rel.as_posix()}")

    print(f"src={src_root}")
    print(f"out={out_root}  (same layout, not words/a/)")
    print(f"total={len(files)} ok={stats['ok']} skip={stats['skip']} dry={stats['dry']} fail={stats['fail']}")
    return 1 if stats["fail"] else 0


if __name__ == "__main__":
    sys.exit(main())
