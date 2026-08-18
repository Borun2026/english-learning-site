# -*- coding: utf-8 -*-
"""Edge-TTS 多声线高保真批量生成核心框架。
支持多声线分配 (AvaMultilingual/AndrewMultilingual/Jenny/Guy等)、专有名词注音纠偏、高并发异步抓取与安全重试。
"""
import asyncio
import os
import sys
import time
from typing import Optional
import edge_tts
from phonetic_corrections import clean_text_for_tts

# 推荐多角色声线配置
VOICE_FEMALE_PRIMARY = "en-US-AvaMultilingualNeural"   # 主线女性/叙述/课文朗读，富含情感与高自然度
VOICE_MALE_PRIMARY = "en-US-AndrewMultilingualNeural"  # 主线男性/对话对手/深沉自然美音
VOICE_FEMALE_LIVELY = "en-US-JennyNeural"              # 活泼女性
VOICE_MALE_CLEAR = "en-US-GuyNeural"                   # 清晰考试/考官男性
VOICE_EXAM_CLEAR = "en-US-AvaMultilingualNeural"       # 听力与真题发音


async def generate_single_audio(
    text: str,
    output_path: str,
    voice: str = VOICE_FEMALE_PRIMARY,
    rate: str = "+0%",
    pitch: str = "+0Hz",
    max_retries: int = 3,
    retry_delay: float = 0.5,
) -> bool:
    """合成单条语音为高保真 MP3 文件。"""
    cleaned = clean_text_for_tts(text)
    if not cleaned:
        return False

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    temp_path = output_path + ".tmp"

    # 动态超时：对于较长文本按长度分配超时时间（基础30s + 每1000字符15s）
    call_timeout = max(30.0, 30.0 + (len(cleaned) / 1000.0) * 15.0)

    for attempt in range(1, max_retries + 1):
        try:
            communicate = edge_tts.Communicate(cleaned, voice=voice, rate=rate, pitch=pitch)
            await asyncio.wait_for(communicate.save(temp_path), timeout=call_timeout)
            if os.path.exists(temp_path) and os.path.getsize(temp_path) > 100:
                if os.path.exists(output_path):
                    try:
                        os.remove(output_path)
                    except Exception:
                        pass
                os.replace(temp_path, output_path)
                return True
        except Exception as e:
            if attempt == max_retries:
                # print(f"  [ERROR] 合成失败 ({voice}) -> {output_path}: {e}")
                pass
            await asyncio.sleep(retry_delay * attempt)
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
    return False


async def batch_generate_tasks(
    tasks: list[tuple[str, str, str, str, str]],  # (group, sub, filename, text, voice)
    concurrency: int = 8,
    report_interval: int = 20,
) -> tuple[int, int, int]:
    """批量异步并发生成音频任务清单。
    返回: (成功数, 跳过数, 失败数)
    """
    semaphore = asyncio.Semaphore(concurrency)
    success_count = 0
    skipped_count = 0
    failed_count = 0
    total = len(tasks)
    start_time = time.time()
    last_report = time.time()

    async def _worker(task_info):
        nonlocal success_count, skipped_count, failed_count, last_report
        group, sub, filename, text, voice, out_path = task_info
        if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
            skipped_count += 1
            return

        async with semaphore:
            ok = await generate_single_audio(text, out_path, voice=voice)
            if ok:
                success_count += 1
            else:
                failed_count += 1

            done = success_count + skipped_count + failed_count
            if time.time() - last_report > 3.0 or done == total:
                last_report = time.time()
                elapsed = time.time() - start_time
                speed = done / elapsed if elapsed > 0 else 0
                print(
                    f"进度: [{done}/{total}] {done/total*100:.1f}% | 成功: {success_count} | 已跳过: {skipped_count} | 失败: {failed_count} | 速率: {speed:.1f}条/s",
                    flush=True,
                )

    wrapped_tasks = [_worker(item) for item in tasks]
    await asyncio.gather(*wrapped_tasks)

    return success_count, skipped_count, failed_count
