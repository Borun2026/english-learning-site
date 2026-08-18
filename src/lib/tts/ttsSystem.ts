// =====================================================================
// system 引擎:Web Speech API(P5-1 三档中的最后兜底)
// 词级边界事件(onBoundary)只有本引擎支持,用于阅读器词级高亮。
// =====================================================================

import { loadData } from '../storage'
import { TtsUnavailableError, clampRate, type SpeakOptions } from './engine'

let voices: SpeechSynthesisVoice[] = []
let defaultVoice: SpeechSynthesisVoice | null = null
const voiceListeners = new Set<() => void>()

/** 订阅音色列表变化(Chrome 等浏览器异步加载音色),返回取消订阅函数 */
export function onSystemVoicesChanged(cb: () => void): () => void {
  voiceListeners.add(cb)
  return () => {
    voiceListeners.delete(cb)
  }
}

function pickDefault(): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const preferLangs = ['en-US', 'en-GB']
  const naturalNames = /Google|Natural|Microsoft|Online|Aria|Jenny|Samantha|Daniel|Libby|Sonia|Ryan/i
  for (const lang of preferLangs) {
    const v =
      voices.find((x) => x.lang === lang && naturalNames.test(x.name)) ||
      voices.find((x) => x.lang === lang && /female/i.test(x.name)) ||
      voices.find((x) => x.lang === lang)
    if (v) return v
  }
  return voices.find((x) => x.lang.startsWith('en')) ?? null
}

function currentVoice(): SpeechSynthesisVoice | null {
  const saved = loadData().tts.voiceId
  if (saved) {
    const v = voices.find((x) => x.voiceURI === saved || x.name === saved)
    if (v) return v
  }
  return defaultVoice
}

export function initSystemSpeech() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  voices = window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    voices = window.speechSynthesis.getVoices()
    defaultVoice = pickDefault()
    voiceListeners.forEach((cb) => cb())
  }
  defaultVoice = pickDefault()
}

export function getSystemVoices(): SpeechSynthesisVoice[] {
  return voices
}

export function getSystemVoiceName(): string {
  const v = currentVoice()
  return v ? v.name : '系统默认'
}

export function systemAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}

/** Web Speech 引擎 speak:结束/出错都 resolve(它是最后一档,不再降级) */
export function speakSystem(text: string, opts: SpeakOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    if (!synth) {
      reject(new TtsUnavailableError('system', '浏览器不支持 Web Speech 合成'))
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    const v = currentVoice()
    u.lang = v?.lang ?? 'en-US'
    if (v) u.voice = v
    u.rate = clampRate(opts.rate ?? loadData().tts.rate, 1)
    u.onstart = () => opts.onStart?.()
    u.onend = () => resolve()
    u.onerror = () => resolve()
    u.onboundary = (e) => {
      if (e.name === 'word' || e.charIndex != null) opts.onBoundary?.(e.charIndex)
    }
    synth.speak(u)
  })
}

export function stopSystem() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}
