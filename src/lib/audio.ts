// =====================================================================
// 本地预生成高保真神经大模型音频(Neural TTS MP3/WAV, 由 scripts/pregen_edge_tts.py 生成)
// 前端通过清单判断某单元是否有本地音频;有则播放本地高保真自然原声,无则走在线引擎。
// =====================================================================

import { companionUrl, isCompanionUp, probeCompanion } from './companion.ts'

export interface AudioUnitMeta {
  listen: number
  article: number
  dialogue?: number
}

export interface AudioManifest {
  version: number
  source?: string
  format?: string
  generatedAt?: number
  units: Record<string, AudioUnitMeta>
  words?: string[]
  extra?: Record<string, number>
}

let cache: AudioManifest | null | undefined = undefined

/** 加载本地音频清单;未生成/文件缺失返回 null(不抛错、不打扰用户) */
export async function loadAudioManifest(): Promise<AudioManifest | null> {
  if (cache !== undefined) return cache
  try {
    const res = await fetch((import.meta.env.BASE_URL || '/') + 'content/audio/index.json')
    if (!res.ok) {
      cache = null
      return null
    }
    const data = (await res.json()) as AudioManifest
    cache = data && typeof data === 'object' && typeof data.units === 'object' ? data : null
    return cache
  } catch {
    cache = null
    return null
  }
}

const AUDIO_BASE = (import.meta.env.BASE_URL || '/') + 'content/audio/'

/** 默认采用高保真体积更优的 mp3 格式，若清单指定 format 或旧格式则兼容 */
function getExt(): string {
  return cache?.format === 'wav' ? '.wav' : '.mp3'
}

export function wordKey(w: string): string {
  return `word:${w.toLowerCase()}`
}

export function unitKey(unitId: string, kind: 'article' | 'listen' | 'dialogue', id: string): string {
  return `unit:${unitId}:${kind}:${id}`
}

export function extraKey(kind: string, id: string, idx: number | string): string {
  return `extra:${kind}:${id}:${idx}`
}

export function streamUrl(key: string): string {
  return companionUrl('/api/audio/stream?key=' + encodeURIComponent(key))
}

export function localListenUrl(unitId: string, idx: number): string {
  if (isCompanionUp()) return streamUrl(unitKey(unitId, 'listen', String(idx)))
  return `${AUDIO_BASE}${encodeURIComponent(unitId)}/listen-${idx}${getExt()}`
}

export function localArticleUrl(unitId: string, idx: number): string {
  if (isCompanionUp()) return streamUrl(unitKey(unitId, 'article', String(idx)))
  return `${AUDIO_BASE}${encodeURIComponent(unitId)}/article-${idx}${getExt()}`
}

/** 该单元已生成的听力音频数量(清单为准) */
export async function localListenCount(unitId: string): Promise<number> {
  const m = await loadAudioManifest()
  return m?.units?.[unitId]?.listen ?? 0
}

/** 该单元已生成的文章音频数量(清单为准) */
export async function localArticleCount(unitId: string): Promise<number> {
  const m = await loadAudioManifest()
  return m?.units?.[unitId]?.article ?? 0
}

/** 听力的逐轮本地音频 URL 数组(缺失轮为 undefined,由路由层回退在线合成) */
export async function listenWavUrls(unitId: string, rounds: number): Promise<(string | undefined)[]> {
  if (await probeCompanion()) {
    return Array.from({ length: rounds }, (_, i) => localListenUrl(unitId, i))
  }
  const count = await localListenCount(unitId)
  return Array.from({ length: rounds }, (_, i) => (i < count ? localListenUrl(unitId, i) : undefined))
}

/** 文章逐句本地音频 URL 数组(缺失句为 undefined) */
export async function articleWavUrls(unitId: string, sentences: number): Promise<(string | undefined)[]> {
  if (await probeCompanion()) {
    return Array.from({ length: sentences }, (_, i) => localArticleUrl(unitId, i))
  }
  const count = await localArticleCount(unitId)
  return Array.from({ length: sentences }, (_, i) => (i < count ? localArticleUrl(unitId, i) : undefined))
}

export function localDialogueUrl(unitId: string, nodeId: string): string {
  if (isCompanionUp()) return streamUrl(unitKey(unitId, 'dialogue', nodeId))
  return `${AUDIO_BASE}${encodeURIComponent(unitId)}/dlg-${encodeURIComponent(nodeId)}${getExt()}`
}

export function localWordUrl(word: string): string {
  if (isCompanionUp()) return streamUrl(wordKey(word))
  return `${AUDIO_BASE}words/${encodeURIComponent(word.toLowerCase())}${getExt()}`
}

/** 情景对话某节点本地音频;清单未登记则 undefined */
export async function dialogueWavUrl(unitId: string, nodeId: string): Promise<string | undefined> {
  if (await probeCompanion()) return localDialogueUrl(unitId, nodeId)
  const m = await loadAudioManifest()
  if (!m?.units?.[unitId]?.dialogue) return undefined
  return localDialogueUrl(unitId, nodeId)
}

/** 单词预生成音频;清单未收录则 undefined */
export async function wordWavUrl(word: string): Promise<string | undefined> {
  const w = word.toLowerCase()
  if (await probeCompanion()) return localWordUrl(w)
  const m = await loadAudioManifest()
  if (!m?.words?.includes(w)) return undefined
  return localWordUrl(w)
}

export function extraWavUrl(kind: string, id: string, idx: number | string): string {
  if (isCompanionUp()) return streamUrl(extraKey(kind, id, idx))
  return `${AUDIO_BASE}extra/${encodeURIComponent(kind)}/${encodeURIComponent(id)}-${idx}${getExt()}`
}

/** 资料库/真题/语法例句预生成音频;文件缺失时播放层自动回退 */
export function passageWavUrl(kind: 'mag' | 'cet6' | 'ted' | 'zhenti' | 'grammar' | 'writing', id: string, idx: number | string): string {
  return extraWavUrl(kind, id, idx)
}
