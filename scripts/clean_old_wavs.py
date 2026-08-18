# -*- coding: utf-8 -*-
"""清理旧格式 .wav 语音文件，为全面升级至高保真 MP3 音频库做准备。"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = os.path.join(ROOT, "public", "content", "audio")

def clean_old_wavs():
    if not os.path.exists(AUDIO_DIR):
        print("音频目录不存在，无需清理。")
        return

    removed_count = 0
    removed_bytes = 0
    for root, dirs, files in os.walk(AUDIO_DIR):
        for f in files:
            if f.endswith(".wav"):
                p = os.path.join(root, f)
                try:
                    sz = os.path.getsize(p)
                    os.remove(p)
                    removed_count += 1
                    removed_bytes += sz
                except Exception as e:
                    print(f"删除失败 {p}: {e}")

    print(f"清理旧 WAV 完成: 共清理 {removed_count} 个文件, 释放空间 {removed_bytes / (1024*1024):.2f} MB")

if __name__ == "__main__":
    clean_old_wavs()
