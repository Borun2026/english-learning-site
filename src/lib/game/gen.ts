// =====================================================================
// 词汇游戏通用纯函数(P5-3):洗牌/随机/日期种子/连词成句题库类型/每日计划
// 无 DOM 依赖,Node 可直测(scripts/selftest_game.mjs)
// =====================================================================

export interface GameWord {
  word: string
  cn: string
}

export interface OrderSentenceItem {
  id: string
  unitId: string
  stage: number
  text: string
  cn: string
  chunks: string[]
  distractors: string[]
}

export interface OrderSentenceBank {
  version: number
  type: string
  source: string
  count: number
  items: OrderSentenceItem[]
}

export interface DailyQuestion {
  kind: 'choice' | 'spell'
  word: string
  cn: string
  options?: string[]
}

/** 可复现的伪随机(seed → 0..1) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function pickMany<T>(arr: T[], n: number, rng: () => number = Math.random): T[] {
  return shuffle(arr, rng).slice(0, Math.max(0, n))
}

/** 每日挑战种子:YYYYMMDD(同一天题目一致) */
export function dateSeed(d = new Date()): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

/** 句子比较归一化:只保留字母数字,小写(忽略标点/大小写差异) */
export function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** 每日计划:8 道词义选择题 + 2 道拼写题(选项来自同批词的释义) */
export function buildDailyPlan(words: GameWord[], rng: () => number): DailyQuestion[] {
  const picked = shuffle(words, rng).slice(0, 10)
  const questions: DailyQuestion[] = picked.map((w, i) => {
    if (i % 5 === 4) return { kind: 'spell', word: w.word, cn: w.cn }
    const others = shuffle(picked.filter((x) => x.word !== w.word), rng).slice(0, 3)
    const options = shuffle([w.cn, ...others.map((o) => o.cn)], rng)
    return { kind: 'choice', word: w.word, cn: w.cn, options }
  })
  return questions
}
