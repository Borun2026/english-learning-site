import type { ReadingIndex, ReadingPassage, ZhentiArticle, ZhentiIndex } from './types'
import { fetchJson } from './fetchJson'

const BASE = import.meta.env.BASE_URL + 'content/zhenti/'

let indexCache: ZhentiIndex | null = null

export async function loadZhentiIndex(): Promise<ZhentiIndex> {
  if (indexCache) return indexCache
  const idx: ZhentiIndex = await fetchJson(`${BASE}index.json`)
  indexCache = idx
  return idx
}

export async function loadZhentiArticle(id: string): Promise<ZhentiArticle | null> {
  try {
    // id 形如 z2019-reading-1 / z2019-cloze-0
    // 文件命名: reading-{1..4}.json / cloze.json(注意完形文件名没有 -0 后缀)
    const m = id.match(/^z(\d{4})-(reading-(\d)|cloze-0)$/)
    if (!m) return null
    const year = m[1]
    const file = m[2] === 'cloze-0' ? 'cloze' : m[2]
    return await fetchJson<ZhentiArticle>(`${BASE}${year}/${file}.json`)
  } catch {
    return null
  }
}

let freqCache: Record<string, { rank: number; freq: number }> | null = null

export async function loadFreq(): Promise<Record<string, { rank: number; freq: number }> | null> {
  if (freqCache) return freqCache
  try {
    freqCache = await fetchJson(import.meta.env.BASE_URL + 'content/freq.json')
    return freqCache
  } catch {
    return null
  }
}

/* ---------------- CET-6 真题语篇(P1 导入) ---------------- */

let cet6Index: ReadingIndex | null = null
export async function loadCet6Index(): Promise<ReadingIndex> {
  if (cet6Index) return cet6Index
  cet6Index = await fetchJson<ReadingIndex>(import.meta.env.BASE_URL + 'content/zhenti/cet6/cet6-index.json')
  return cet6Index
}

let cet6Cache = new Map<string, ReadingPassage>()
export async function loadCet6Passage(id: string): Promise<ReadingPassage> {
  const hit = cet6Cache.get(id)
  if (hit) return hit
  const a = await fetchJson<ReadingPassage>(import.meta.env.BASE_URL + `content/zhenti/cet6/${id}.json`)
  cet6Cache.set(id, a)
  return a
}
