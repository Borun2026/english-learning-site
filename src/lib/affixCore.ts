// =====================================================================
// 词根词缀纯函数(P5-4):出题 / 类型标签,无 DOM / fetch 依赖,Node 可直测
// =====================================================================

import { mulberry32, shuffle } from './game/gen.ts'

export interface AffixItem {
  affix: string
  type: 'prefix' | 'suffix' | 'root'
  meaning: string
  examples: string[]
  count: number
  source?: string
}

export interface AffixQuestion {
  affix: string
  meaning: string
  options: string[]
  examples: string[]
  type: AffixItem['type']
}

const TYPE_LABEL: Record<AffixItem['type'], string> = {
  prefix: '前缀',
  suffix: '后缀',
  root: '词根',
}

export function affixTypeLabel(t: AffixItem['type']): string {
  return TYPE_LABEL[t] ?? t
}

/** 纯函数出题:n 道「词缀 → 四选一含义」,干扰项来自其他词缀。题库 <5 返回空 */
export function makeAffixQuiz(items: AffixItem[], n: number, seed = Date.now()): AffixQuestion[] {
  if (items.length < 5) return []
  const rng = mulberry32(seed)
  const picked = shuffle(items, rng).slice(0, Math.min(n, items.length))
  return picked.map((it) => {
    const distractors = shuffle(
      items.filter((x) => x.meaning !== it.meaning),
      rng,
    ).slice(0, 3)
    return {
      affix: it.affix,
      meaning: it.meaning,
      options: shuffle([it.meaning, ...distractors.map((d) => d.meaning)], rng),
      examples: it.examples.slice(0, 3),
      type: it.type,
    }
  })
}
