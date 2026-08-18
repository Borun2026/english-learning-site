// =====================================================================
// 词根词缀库(P5-4):public/content/affix.json,由 scripts/import_affix.py 生成
// (人工种子 + 词库统计派生,参考 Listen-en-web-pub 的词根学习功能)
// =====================================================================

import { fetchJson } from './fetchJson'
import { type AffixItem, makeAffixQuiz } from './affixCore'

export type { AffixItem, AffixQuestion } from './affixCore'
export { affixTypeLabel, makeAffixQuiz } from './affixCore'

const BASE = import.meta.env.BASE_URL + 'content/'

export interface AffixFile {
  version: number
  source: string
  count: number
  items: AffixItem[]
}

let cache: AffixFile | null | undefined = undefined

export async function loadAffixFile(): Promise<AffixFile | null> {
  if (cache !== undefined) return cache
  try {
    const data = await fetchJson<AffixFile>(`${BASE}affix.json`)
    cache = Array.isArray(data.items) ? data : null
    return cache
  } catch {
    cache = null
    return null
  }
}

/** 一个词命中的词根词缀(前缀 startswith / 后缀 endswith / 词根包含),按命中词数取前 4 */
export async function affixesOfWord(word: string): Promise<AffixItem[]> {
  const file = await loadAffixFile()
  if (!file) return []
  const w = word.toLowerCase()
  const out: AffixItem[] = []
  for (const it of file.items) {
    const body = it.affix.replace(/^-+|-+$/g, '')
    if (it.type === 'root' && body.length < 3) continue
    if ((it.type === 'prefix' || it.type === 'suffix') && body.length < 2) continue
    const hit = it.type === 'prefix' ? w.startsWith(body) && w.length > body.length + 1 : it.type === 'suffix' ? w.endsWith(body) && w.length > body.length + 1 : w.includes(body) && w.length > body.length + 1
    if (hit) out.push(it)
  }
  return out.sort((a, b) => b.count - a.count).slice(0, 4)
}

/** 词根小测验:n 道「词缀 → 四选一含义」,干扰项来自其他词缀 */
export async function buildAffixQuiz(n: number, seed = Date.now()) {
  const file = await loadAffixFile()
  if (!file) return []
  return makeAffixQuiz(file.items, n, seed)
}
