// =====================================================================
// TTS 路由层(P5-1)
// 引擎链:local(本地 Piper 服务)→ browser(浏览器 Piper vits-web)→ system(Web Speech)
// - 引擎不可用/合成失败自动降级到下一档,全程无未捕获异常;
// - 单词/句子朗读走 speak();全文朗读走 speakSentences()(逐句队列);
// - 词级边界高亮只有 system 引擎提供,浏览器/本地引擎为句级高亮。
// =====================================================================

import { loadData } from './storage'
import type { TtsConfig, TtsEngineKind } from './types'
import {
  TtsUnavailableError,
  playAudioUrl,
  stopCurrentAudio,
  type CancelToken,
  type SpeakOptions,
} from './tts/engine'
import { speakBrowser } from './tts/ttsBrowser'
import { speakLocal } from './tts/ttsLocal'
import {
  getSystemVoices,
  getSystemVoiceName,
  initSystemSpeech,
  onSystemVoicesChanged,
  speakSystem,
  stopSystem,
} from './tts/ttsSystem'

export {
  BROWSER_VOICES,
  browserAvailable,
  downloadBrowserVoice,
  isBrowserVoiceId,
  listStoredBrowserVoices,
  removeBrowserVoice,
} from './tts/ttsBrowser'
export { DEFAULT_PIPER_BASE, listLocalVoices, testLocalPiper, type LocalPiperVoice } from './tts/ttsLocal'
export { initSystemSpeech, onSystemVoicesChanged as onVoicesChanged, getSystemVoices as getVoices, getSystemVoiceName as getVoiceName }

/* ---------------- 会话管理 ---------------- */

let sessionId = 0
let speakingFlag = false
let activeStop: (() => void) | null = null

function cancelActive() {
  const fn = activeStop
  activeStop = null
  if (fn) fn()
}

function makeStop(): () => void {
  return () => {
    stopCurrentAudio()
    stopSystem()
  }
}

function tokenOf(id: number): CancelToken {
  return { cancelled: () => sessionId !== id }
}

function chainFor(cfg: TtsConfig): TtsEngineKind[] {
  if (cfg.engine === 'local') return ['local', 'browser', 'system']
  if (cfg.engine === 'browser') return ['browser', 'system']
  return ['system']
}

type EngineSpeak = (
  text: string,
  opts: SpeakOptions,
  token?: CancelToken,
) => Promise<void>

const ENGINES: Record<TtsEngineKind, { available: () => boolean; speak: EngineSpeak }> = {
  local: { available: () => true, speak: speakLocal },
  browser: { available: () => typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function', speak: speakBrowser },
  system: { available: () => typeof window !== 'undefined' && !!window.speechSynthesis, speak: speakSystem },
}

/**
 * 在给定引擎链上尝试朗读;失败降级;被取消则直接退出。
 * 全部失败也调用 onDone,保证调用方的 UI(加载态等)能收敛。
 */
async function runWithFallback(
  id: number,
  chain: TtsEngineKind[],
  text: string,
  opts: SpeakOptions,
  onDone: () => void,
) {
  let lastError: unknown = null
  // P5-4:本地预生成 WAV 优先(最高优先级);404/损坏 → 回退引擎链
  if (opts.audioUrl) {
    try {
      await playAudioUrl(
        opts.audioUrl,
        opts.rate ?? 1,
        {
          onStart: () => {
            if (sessionId !== id) return
            speakingFlag = true
            opts.onStart?.()
          },
        },
        tokenOf(id),
      )
      if (sessionId !== id) return
      onDone()
      return
    } catch (e) {
      if (sessionId !== id) return
      console.info('[tts] 本地预生成音频不可用,回退在线引擎:', e instanceof Error ? e.message : e)
    }
  }
  for (const kind of chain) {
    if (sessionId !== id) return
    const engine = ENGINES[kind]
    if (!engine.available()) {
      lastError = new TtsUnavailableError(kind, '引擎前置条件不满足')
      continue
    }
    try {
      await engine.speak(text, {
        rate: opts.rate,
        onStart: () => {
          if (sessionId !== id) return
          speakingFlag = true
          opts.onStart?.()
        },
        onBoundary: kind === 'system' ? opts.onBoundary : undefined,
      }, tokenOf(id))
      if (sessionId !== id) return
      onDone()
      return
    } catch (e) {
      if (sessionId !== id) return
      lastError = e
      console.warn(`[tts] ${kind} 引擎失败,尝试下一档:`, e instanceof Error ? e.message : e)
    }
  }
  if (lastError) console.warn('[tts] 三档引擎均失败:', lastError instanceof Error ? lastError.message : lastError)
  if (sessionId === id) onDone()
}

/* ---------------- 公共 API ---------------- */

/** 初始化系统音色列表(Chrome 异步加载;浏览器 Piper 无需初始化) */
export function initSpeech() {
  initSystemSpeech()
}

/** 朗读一段文本(单词 / 例句 / 句子 / AI 台词通用入口) */
export function speak(text: string, opts: SpeakOptions = {}) {
  if (!text.trim()) return
  cancelActive()
  const id = ++sessionId
  const cfg = opts.ttsOverride ?? loadData().tts
  activeStop = makeStop()
  runWithFallback(
    id,
    chainFor(cfg),
    text,
    {
      ...opts,
      rate: opts.rate ?? cfg.rate,
    },
    () => {
      if (sessionId !== id) return
      speakingFlag = false
      activeStop = null
      opts.onEnd?.()
    },
  )
}

/** 逐句朗读队列(全文朗读):每句开始触发 onSentence(句级高亮);audioUrls 与句子一一对应(本地预生成优先) */
export function speakSentences(
  sentences: string[],
  opts: SpeakOptions & { onSentence?: (index: number) => void; audioUrls?: (string | undefined)[] } = {},
) {
  cancelActive()
  const id = ++sessionId
  const cfg = opts.ttsOverride ?? loadData().tts
  const rate = opts.rate ?? cfg.rate
  let index = 0
  activeStop = makeStop()

  const next = () => {
    if (sessionId !== id) return
    if (index >= sentences.length) {
      speakingFlag = false
      activeStop = null
      opts.onEnd?.()
      return
    }
    const i = index++
    opts.onSentence?.(i)
    runWithFallback(
      id,
      chainFor(cfg),
      sentences[i],
      {
        rate,
        onStart: () => {
          speakingFlag = true
          opts.onStart?.()
        },
        onBoundary: opts.onBoundary,
        audioUrl: opts.audioUrls?.[i],
      },
      () => next(),
    )
  }
  next()
}

export function stopSpeech() {
  // 递增会话号:正在进行的引擎链(含正在播放的本地/合成音频)在 catch 中识别到会话已变,立即让出、不再降级
  sessionId++
  cancelActive()
  stopCurrentAudio()
  stopSystem()
  speakingFlag = false
}

export function isSpeaking(): boolean {
  return speakingFlag
}
