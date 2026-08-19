// =====================================================================
// browser 引擎:浏览器内 Piper(@diffusionstudio/vits-web,MIT)
// 声音模型(.onnx)首次使用时下载并缓存到 OPFS,之后离线可用;
// 下载源:HuggingFace 官方 → hf-mirror.com 镜像自动回退(国内网络友好)。
// 推理所需 piper_phonemize / onnxruntime wasm 由库从 jsdelivr/cdnjs 加载,
// 两者均为 immutable 长缓存,首次加载后断网可用。
// 前置条件:安全上下文(localhost / HTTPS)才有 OPFS。
// =====================================================================

import { download, predict, remove, stored, type VoiceId } from '@diffusionstudio/vits-web'
import { loadData } from '../storage'
import { TtsUnavailableError, isCjkText, playAudioBlob, type CancelToken, type SpeakOptions } from './engine'

/** 预置三款声音(P5-1 契约:en_US-lessac / en_GB-alba / zh_CN-huayan,均 medium 档) */
export const BROWSER_VOICES = [
  { id: 'en_US-lessac-medium', label: 'Lessac · 美式英语(女声)', lang: 'en' },
  { id: 'en_GB-alba-medium', label: 'Alba · 英式英语(女声)', lang: 'en' },
  { id: 'zh_CN-huayan-medium', label: 'Huayan · 中文(女声)', lang: 'zh' },
] as const

export type BrowserVoiceId = (typeof BROWSER_VOICES)[number]['id']

/** 国内镜像;下载自动回退 */
const HF_MIRROR = 'https://hf-mirror.com/diffusionstudio/piper-voices/resolve/main'

/** 与 vits-web 内部映射一致的仓库相对路径(见其 voices 清单) */
const VOICE_PATHS: Record<BrowserVoiceId, string> = {
  'en_US-lessac-medium': 'en/en_US/lessac/medium/en_US-lessac-medium.onnx',
  'en_GB-alba-medium': 'en/en_GB/alba/medium/en_GB-alba-medium.onnx',
  'zh_CN-huayan-medium': 'zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx',
}

export function isBrowserVoiceId(v: string): v is BrowserVoiceId {
  return BROWSER_VOICES.some((x) => x.id === v)
}

/** 当前环境是否支持浏览器 Piper(需 OPFS = 安全上下文) */
export function browserAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function'
}

/**
 * 选择声音:中文文本自动用 zh_CN-huayan;英文用用户所选英音(默认 Lessac 美式)。
 * 这样设置页选中文音色后读英文单词不会发出怪音。
 */
export function pickBrowserVoiceId(text: string, saved: string): BrowserVoiceId {
  if (isCjkText(text)) return 'zh_CN-huayan-medium'
  if (saved === 'en_GB-alba-medium') return saved
  return 'en_US-lessac-medium'
}

export async function speakBrowser(text: string, opts: SpeakOptions, token?: CancelToken): Promise<void> {
  if (!browserAvailable()) {
    throw new TtsUnavailableError('browser', '当前环境不支持 OPFS(需 localhost 或 HTTPS 访问)')
  }
  try {
    const voiceId = pickBrowserVoiceId(text, opts.ttsOverride?.voiceId ?? loadData().tts.voiceId)
    // 首次使用先确保模型在 OPFS(官方源 → 镜像);失败抛错 → 路由层降级
    await ensureBrowserVoice(voiceId, (pct) => {
      if (pct === 25 || pct === 50 || pct === 75 || pct === 100) {
        console.info(`[tts] 下载声音模型 ${voiceId}: ${pct}%`)
      }
    })
    if (token?.cancelled()) return
    const blob = await predict({ text: text.trim(), voiceId })
    if (token?.cancelled()) return
    await playAudioBlob(blob, opts.rate ?? 1, { onStart: opts.onStart }, token)
  } catch (e) {
    if (token?.cancelled()) return
    if (e instanceof TtsUnavailableError) throw e
    throw new TtsUnavailableError('browser', `浏览器 Piper 合成失败: ${(e as Error)?.message ?? String(e)}`)
  }
}

export function stopBrowser() {
  // 音频由 engine.ts 的 stopCurrentAudio 统一停止;predict 阶段靠取消令牌让出
}

/* ---------------- 声音模型管理(设置页:预下载 / 删除 / 状态) ---------------- */

const inflight = new Map<string, Promise<void>>()

/**
 * 确保声音模型已进入 OPFS(文件名与 vits-web 内部契约一致,预测时直接命中缓存)。
 * 官方 HF 失败自动回退 hf-mirror.com 镜像。
 */
export async function ensureBrowserVoice(id: BrowserVoiceId, onProgress?: (percent: number) => void): Promise<void> {
  if (inflight.has(id)) return inflight.get(id)!
  if ((await listStoredBrowserVoices()).includes(id)) return
  if (inflight.has(id)) return inflight.get(id)!
  const p = (async () => {
    try {
      await download(id as VoiceId, (prog) => {
        onProgress?.(prog.total > 0 ? Math.min(100, Math.round((prog.loaded / prog.total) * 100)) : 0)
      })
      return
    } catch (e) {
      console.warn(`[tts] 官方源下载 ${id} 失败,尝试镜像:`, e instanceof Error ? e.message : e)
    }
    await storeBrowserVoiceFrom(HF_MIRROR, id, onProgress)
  })()
  inflight.set(id, p)
  try {
    await p
  } finally {
    inflight.delete(id)
  }
}

/** 从指定源把 {id}.onnx 与 {id}.onnx.json 写入 OPFS 的 piper 目录(与 vits-web 同名) */
async function storeBrowserVoiceFrom(base: string, id: BrowserVoiceId, onProgress?: (percent: number) => void): Promise<void> {
  const rel = VOICE_PATHS[id]
  const root = await navigator.storage.getDirectory()
  const dir = await root.getDirectoryHandle('piper', { create: true })
  const files: { url: string; name: string }[] = [
    { url: `${base}/${rel}.json`, name: `${id}.onnx.json` },
    { url: `${base}/${rel}`, name: `${id}.onnx` },
  ]
  let total = 0
  let loaded = 0
  for (const f of files) {
    const res = await fetch(f.url)
    if (!res.ok || !res.body) throw new Error(`下载 ${f.name} 失败: HTTP ${res.status}`)
    total += Number(res.headers.get('Content-Length') ?? 0)
    const reader = res.body.getReader()
    const handle = await dir.getFileHandle(f.name, { create: true })
    const w = await handle.createWritable()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        await w.write(value)
        loaded += value.byteLength
        onProgress?.(total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0)
      }
    } finally {
      await w.close()
    }
  }
}

export async function downloadBrowserVoice(id: string, onProgress?: (percent: number) => void): Promise<void> {
  if (!isBrowserVoiceId(id)) throw new Error(`未知声音模型: ${id}`)
  await ensureBrowserVoice(id, onProgress)
}

export async function removeBrowserVoice(id: string): Promise<void> {
  if (!isBrowserVoiceId(id)) return
  await remove(id as VoiceId)
}

/** 已在 OPFS 中的声音模型 id 列表(不含内部 JSON 元数据) */
export async function listStoredBrowserVoices(): Promise<BrowserVoiceId[]> {
  if (!browserAvailable()) return []
  try {
    return (await stored()).filter(isBrowserVoiceId)
  } catch {
    return []
  }
}
