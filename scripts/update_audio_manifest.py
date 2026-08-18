# -*- coding: utf-8 -*-
"""更新全量音频资源索引 manifest (public/content/audio/index.json)。"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, "public", "content", "audio")
MANIFEST = os.path.join(AUDIO, "index.json")


def update_audio_manifest():
    if not os.path.exists(AUDIO):
        print("音频目录不存在")
        return

    units_data = {}
    words_list = []
    extra_data = {}

    for entry in os.listdir(AUDIO):
        p = os.path.join(AUDIO, entry)
        if not os.path.isdir(p):
            continue

        if entry.startswith("s") and "u" in entry:
            # 单元音频: article, listen, dialogue
            fs = os.listdir(p)
            art_count = len([f for f in fs if f.startswith("article-") and (f.endswith(".mp3") or f.endswith(".wav"))])
            lis_count = len([f for f in fs if f.startswith("listen-") and (f.endswith(".mp3") or f.endswith(".wav"))])
            dlg_count = len([f for f in fs if f.startswith("dlg-") and (f.endswith(".mp3") or f.endswith(".wav"))])
            units_data[entry] = {
                "article": art_count,
                "listen": lis_count,
                "dialogue": dlg_count,
            }
        elif entry == "words":
            # 核心词汇
            fs = os.listdir(p)
            for f in fs:
                if f.endswith(".mp3") or f.endswith(".wav"):
                    w = os.path.splitext(f)[0].lower()
                    words_list.append(w)
        elif entry == "extra":
            # 拓展资源
            for sub in os.listdir(p):
                sub_p = os.path.join(p, sub)
                if os.path.isdir(sub_p):
                    sub_fs = os.listdir(sub_p)
                    c = len([f for f in sub_fs if f.endswith(".mp3") or f.endswith(".wav")])
                    extra_data[sub] = c

    words_list.sort()
    manifest = {
        "version": 2,
        "source": "Microsoft Neural Edge TTS (AvaMultilingual & AndrewMultilingual & Jenny)",
        "format": "mp3",
        "generatedAt": int(time.time()),
        "units": units_data,
        "words": words_list,
        "extra": extra_data,
    }

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"Manifest 更新成功: 包含 {len(units_data)} 个单元, {len(words_list)} 个单词, {len(extra_data)} 个拓展库。")


if __name__ == "__main__":
    update_audio_manifest()
