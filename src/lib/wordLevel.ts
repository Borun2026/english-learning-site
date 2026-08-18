import { useEffect, useState } from 'react'
import type { FreqData, WordBankEntry } from './types'
import { fetchJson } from './fetchJson'
import { lemmaCandidates, loadBankLetter } from './dict'

const BASE = import.meta.env.BASE_URL + 'content/'

/** 考研真题高频 TOP 阈值:rank ≤ FREQ_TOP 显示「🔥 高频」徽章 */
export const FREQ_TOP = 1000

export const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'as',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'and', 'or', 'but', 'if', 'so', 'not', 'no', 'nor', 'yet',
  'do', 'does', 'did', 'have', 'has', 'had',
  'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'this', 'that', 'these', 'those',
  'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'me', 'him', 'us', 'them',
  'who', 'whom', 'whose', 'which', 'what',
  'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall',
  'than', 'then', 'too', 'very', 'just', 'also', 'only',
  'into', 'onto', 'upon', 'about', 'over', 'under', 'after', 'before',
  'out', 'up', 'down', 'off', 'all', 'any', 'each', 'both', 'some',
])

/** 词级徽章名称(词库 level 语义:2 四级 / 3 六级 / 4 考研 / 5 雅思;0/1 初中/高中不显示) */
export const LEVEL_NAMES: Record<number, string> = {
  2: '四级',
  3: '六级',
  4: '考研',
  5: '雅思',
}

/** 单个词的级别徽章信息 */
export interface WordLevelMark {
  /** 词库考试级别(2-5) */
  level?: number
  /** 考研真题词频排名(越小越高频,仅 rank ≤ FREQ_TOP 时返回) */
  freqRank?: number
}

function normWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z']/g, '')
}

function letterOf(w: string): string {
  const ch = w.trim().charAt(0).toLowerCase()
  return /[a-z]/.test(ch) ? ch : 'x'
}

/* ---------------- 词频(懒加载,只拉一次,约 180KB) ---------------- */

let freqData: FreqData | null = null
let freqLoading: Promise<FreqData | null> | null = null

export function loadFreq(): Promise<FreqData | null> {
  if (freqData) return Promise.resolve(freqData)
  if (!freqLoading) {
    freqLoading = fetchJson<FreqData>(`${BASE}freq.json`)
      .then((d) => {
        freqData = d
        return d
      })
      .catch(() => {
        freqData = {}
        return {}
      })
  }
  return freqLoading
}

/* ---------------- 词库级别(复用 dict.ts 按字母缓存) ---------------- */

/** 字母 → 词条映射,基于 dict.ts 的 bankCache 二次索引,仍只加载用到的字母文件 */
const bankMaps = new Map<string, Record<string, WordBankEntry>>()

async function loadBankMap(letter: string): Promise<Record<string, WordBankEntry>> {
  const key = letter.toLowerCase()
  const hit = bankMaps.get(key)
  if (hit) return hit
  const arr = await loadBankLetter(key)
  const map: Record<string, WordBankEntry> = {}
  for (const e of arr) map[e.word.toLowerCase()] = e
  bankMaps.set(key, map)
  return map
}

/**
 * 一次性计算文本中所有单词的级别/词频徽章。
 * 步骤:去重 → 按字母分组 → 并行懒加载所需字母文件(含屈折原形所在字母)→ 查词库 level → 查考研词频 TOP。
 * 结果 Map 交给 WordText 同步查表,切换渲染 <1s。
 */
export async function computeWordLevelMarks(texts: string[]): Promise<Map<string, WordLevelMark>> {
  const words = new Set<string>()
  for (const t of texts) {
    for (const raw of t.split(/\s+/)) {
      const w = normWord(raw)
      if (w.length > 1 && /[a-z]/.test(w) && !STOP_WORDS.has(w)) words.add(w)
    }
  }

  const letters = new Set<string>()
  for (const w of words) {
    for (const cand of lemmaCandidates(w)) letters.add(letterOf(cand))
  }
  await Promise.all([...letters].map((l) => loadBankMap(l)))

  const fq = await loadFreq()
  const marks = new Map<string, WordLevelMark>()
  for (const w of words) {
    const mark: WordLevelMark = {}
    for (const cand of lemmaCandidates(w)) {
      if (mark.level === undefined) {
        const map = await loadBankMap(letterOf(cand)) // 已缓存,瞬时返回
        const e = map[cand]
        if (e) mark.level = e.level
      }
      const f = fq?.[cand]
      if (f && f.rank <= FREQ_TOP && (mark.freqRank === undefined || f.rank < mark.freqRank)) {
        mark.freqRank = f.rank
      }
    }
    if (mark.level !== undefined || mark.freqRank !== undefined) marks.set(w, mark)
  }
  return marks
}

/* ---------------- React hook:开关驱动的懒加载徽章表 ---------------- */

export function useWordLevelMarks(text: string, enabled: boolean) {
  const [marks, setMarks] = useState<Map<string, WordLevelMark> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    if (!enabled) {
      setMarks(null)
      setLoading(false)
      return
    }
    setLoading(true)
    computeWordLevelMarks([text])
      .then((m) => {
        if (!alive) return
        setMarks(m)
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setMarks(new Map())
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [text, enabled])

  return { marks, loading }
}
