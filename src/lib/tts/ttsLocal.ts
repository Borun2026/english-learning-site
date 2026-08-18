// =====================================================================
// local 引擎:本地 Piper HTTP 服务(piper 官方 http_server,默认 5000 端口)
// 官方服务无 CORS 头 → 开发走 Vite 内置 /__piper_proxy,生产可走
// scripts/ai-proxy-server.mjs 的 /piper(仅放行 localhost/127.0.0.1 的 http)。
// 兼容两种端点:POST /(官方,请求体为纯文本)与 POST /synthesize(第三方封装)。
// =====================================================================

import { isCompanionUp, probeCompanion } from '../companion'
import { loadData } from '../storage'
import { TtsUnavailableError, playAudioBlob, type CancelToken, type SpeakOptions } from './engine'

export const DEFAULT_PIPER_BASE = 'http://127.0.0.1:5000'

export interface LocalPiperVoice {
  key: string
  name: string
}

function storedPiperBase(): string {
  const b = loadData().tts.piperBase?.trim()
  return b || DEFAULT_PIPER_BASE
}

/** 是否 RIFF(WAV)文件头 */
async function isWavBlob(blob: Blob): Promise<boolean> {
  if (blob.type.startsWith('audio')) return true
  try {
    const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
    return head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46
  } catch {
    return false
  }
}

/**
 * 统一传输:
 * - 开发:POST /__piper_proxy(Vite 中间件,JSON {url, method, body})
 * - 生产且配置了独立代理:POST {proxyBase}/piper(同一协议)
 * - 生产直连:GET 直接 fetch / POST 纯文本(需服务自带 CORS)
 */
async function localRequest(
  path: string,
  base: string,
  method: 'GET' | 'POST',
  body?: string,
): Promise<Response> {
  const url = `${base.replace(/\/+$/, '')}${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), method === 'GET' ? 5000 : 20000)
  try {
    if (import.meta.env.DEV) {
      return await fetch('/__piper_proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method, body: body ?? '' }),
        signal: controller.signal,
      })
    }
    const proxy = loadData().aiConfig.proxyBase?.trim()
    if (proxy) {
      return await fetch(`${proxy.replace(/\/+$/, '')}/piper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method, body: body ?? '' }),
        signal: controller.signal,
      })
    }
    if (isCompanionUp() || (await probeCompanion())) {
      return await fetch('/piper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method, body: body ?? '' }),
        signal: controller.signal,
      })
    }
    if (method === 'GET') return await fetch(url, { signal: controller.signal })
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: body ?? '',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

export function localAvailable(): boolean {
  // 服务可达性无法同步判断,由 speak 失败后路由层降级
  return true
}

/** 依次尝试三种 Piper HTTP 协议,返回第一个能拿到 WAV 的音频 Blob */
async function synthRequest(base: string, text: string): Promise<Blob> {
  const attempts: { path: string; body: string }[] = [
    // piper 1.7+:POST /synthesize,请求体为 JSON {"text": ...}
    { path: '/synthesize', body: JSON.stringify({ text: text.trim() }) },
    // piper master 官方:POST / 纯文本
    { path: '/', body: text.trim() },
    // 第三方封装:POST /synthesize 纯文本
    { path: '/synthesize', body: text.trim() },
  ]
  let lastErr: unknown = null
  for (const a of attempts) {
    let res: Response
    try {
      res = await localRequest(a.path, base, 'POST', a.body)
    } catch (e) {
      lastErr = e
      continue
    }
    if (!res.ok) {
      lastErr = new Error(`HTTP ${res.status}`)
      continue
    }
    const blob = await res.blob()
    if (!(await isWavBlob(blob))) {
      lastErr = new Error('响应不是 WAV 音频')
      continue
    }
    return blob
  }
  throw new TtsUnavailableError('local', `本地 Piper 合成失败: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`)
}

export async function speakLocal(text: string, opts: SpeakOptions, token?: CancelToken): Promise<void> {
  const base = (opts.ttsOverride?.piperBase?.trim() || storedPiperBase()).replace(/\/+$/, '')
  let blob: Blob
  try {
    blob = await synthRequest(base, text)
  } catch (e) {
    if (token?.cancelled()) return
    if (e instanceof TtsUnavailableError) throw e
    throw new TtsUnavailableError('local', `无法连接本地 Piper 服务: ${(e as Error)?.message ?? String(e)}`)
  }
  if (token?.cancelled()) return
  await playAudioBlob(blob, opts.rate ?? 1, { onStart: opts.onStart }, token)
}

export function stopLocal() {
  // 音频由 engine.ts 的 stopCurrentAudio 统一停止
}

/* ---------------- 设置页:声音列表 / 连接测试 ---------------- */

/** 获取本地服务声音列表:兼容 piper 1.7 的 {id: config} 字典与封装服务的 {voices:[...]} 列表 */
export async function listLocalVoices(base: string): Promise<{ ok: boolean; voices: LocalPiperVoice[]; error?: string }> {
  try {
    const res = await localRequest('/voices', base, 'GET')
    if (!res.ok) return { ok: false, voices: [], error: `HTTP ${res.status}(该服务可能不支持 /voices)` }
    const data: unknown = await res.json()
    const voices: LocalPiperVoice[] = []
    const add = (item: unknown, keyHint?: string) => {
      const v = item as Record<string, unknown>
      const key = String(keyHint ?? v?.key ?? v?.id ?? v?.name ?? '')
      if (key) voices.push({ key, name: String(v?.name ?? key) })
    }
    if (Array.isArray(data)) {
      for (const item of data) add(item)
    } else if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>
      if (Array.isArray(obj.voices)) {
        for (const item of obj.voices) add(item)
      } else if (obj.voices && typeof obj.voices === 'object') {
        for (const [k, v] of Object.entries(obj.voices as Record<string, unknown>)) add(v, k)
      } else {
        // piper 1.7:{voiceId: config}
        for (const [k, v] of Object.entries(obj)) add(v, k)
      }
    }
    return { ok: true, voices }
  } catch (e) {
    return { ok: false, voices: [], error: (e as Error)?.message ?? String(e) }
  }
}

/** 测试本地 Piper:先查 /voices,不支持则实际合成一句 "Hello." 验证返回 WAV */
export async function testLocalPiper(base: string): Promise<{ ok: boolean; voices: LocalPiperVoice[]; error?: string }> {
  const list = await listLocalVoices(base)
  if (list.ok) return list
  try {
    const blob = await synthRequest(base, 'Hello.')
    return { ok: true, voices: [], error: `合成通过(${Math.round(blob.size / 1024)}KB WAV)` }
  } catch (e) {
    return { ok: false, voices: [], error: (e as Error)?.message ?? String(e) }
  }
}
