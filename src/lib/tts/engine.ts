// =====================================================================
// TTS 引擎公共层(P5-1)
// 三种引擎:system(Web Speech 兜底)/ browser(浏览器 Piper vits-web,默认)
// / local(本地 Piper HTTP 服务)。路由与降级见 ../speech.ts。
// =====================================================================

import type { TtsConfig, TtsEngineKind } from '../types'

/** 朗读通用回调参数 */
export interface SpeakOptions {
  rate?: number
  onStart?: () => void
  onEnd?: () => void
  /** 词级边界(仅 system 引擎支持;浏览器/本地引擎无此事件) */
  onBoundary?: (charIndex: number) => void
  /** P5-4:本地预生成 WAV 优先(404/损坏时路由层自动回退到引擎链) */
  audioUrl?: string
  /** 设置页草稿试听:临时覆盖当前已应用的 TTS 配置,不写 localStorage */
  ttsOverride?: TtsConfig
}

/** 取消令牌:引擎在异步阶段(下载/合成/播放)前后检查,及时让出 */
export interface CancelToken {
  cancelled(): boolean
}

/** 引擎不可用(不满足前置条件 / 合成失败),路由层据此降级到下一档 */
export class TtsUnavailableError extends Error {
  constructor(
    public engine: TtsEngineKind,
    message: string,
  ) {
    super(message)
    this.name = 'TtsUnavailableError'
  }
}

export interface TtsEngine {
  kind: TtsEngineKind
  /** 同步判断前置条件(本地服务可达性在 speak 时才知道) */
  available(): boolean
  speak(text: string, opts: SpeakOptions, token?: CancelToken): Promise<void>
  stop(): void
}

/** 语速夹到 [0.5, 1.5],与全局语速滑杆(0.6-1.2)兼容 */
export function clampRate(rate: number | undefined, fallback = 1): number {
  const r = typeof rate === 'number' && Number.isFinite(rate) ? rate : fallback
  return Math.min(1.5, Math.max(0.5, r))
}

/** 是否含中日韩文字(用于自动切换中文 Piper 音色) */
export function isCjkText(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(text)
}

/* ---------------- WAV/二进制音频播放(浏览器与本地引擎共用) ---------------- */

let currentAudio: HTMLAudioElement | null = null
let currentAudioReject: ((e: Error) => void) | null = null

/** 播放合成好的音频 Blob;resolve = 自然播完,reject = 停止/播放失败 */
export function playAudioBlob(
  blob: Blob,
  rate: number,
  opts: { onStart?: () => void },
  token?: CancelToken,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (token?.cancelled()) {
      reject(new Error('朗读已取消'))
      return
    }
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    const clear = () => {
      if (currentAudio === audio) {
        currentAudio = null
        currentAudioReject = null
      }
      URL.revokeObjectURL(url)
    }
    currentAudio = audio
    currentAudioReject = reject
    audio.playbackRate = clampRate(rate)
    audio.onended = () => {
      clear()
      resolve()
    }
    audio.onerror = () => {
      clear()
      reject(new Error('音频播放失败'))
    }
    audio.play().then(
      () => {
        if (token?.cancelled()) {
          stopCurrentAudio()
        } else {
          opts.onStart?.()
        }
      },
      () => {
        clear()
        reject(new Error('音频播放被浏览器拦截(请先点击页面)'))
      },
    )
  })
}

/** 停止当前正在播放的合成音频(本地/浏览器引擎共用) */
export function stopCurrentAudio() {
  const audio = currentAudio
  const reject = currentAudioReject
  currentAudio = null
  currentAudioReject = null
  if (audio) {
    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.src = ''
  }
  reject?.(new Error('朗读已停止'))
}

/** 播放本地预生成 WAV(P5-4 音频优先):404/损坏 → reject,由路由层回退到在线引擎 */
export function playAudioUrl(
  url: string,
  rate: number,
  opts: { onStart?: () => void },
  token?: CancelToken,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (token?.cancelled()) {
      reject(new Error('朗读已取消'))
      return
    }
    const audio = new Audio(url)
    const clear = () => {
      if (currentAudio === audio) {
        currentAudio = null
        currentAudioReject = null
      }
    }
    currentAudio = audio
    currentAudioReject = reject
    audio.playbackRate = clampRate(rate)
    audio.onended = () => {
      clear()
      resolve()
    }
    audio.onerror = () => {
      clear()
      reject(new Error('本地音频加载失败(文件缺失或不可播放)'))
    }
    audio.play().then(
      () => {
        if (token?.cancelled()) {
          stopCurrentAudio()
        } else {
          opts.onStart?.()
        }
      },
      () => {
        clear()
        reject(new Error('音频播放被浏览器拦截(请先点击页面)'))
      },
    )
  })
}
