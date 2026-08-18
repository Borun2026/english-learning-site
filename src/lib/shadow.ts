// =====================================================================
// 跟读评测(P5-5):转写对照原文,按词重合率打 0-100。纯函数可测。
// =====================================================================

const STOP = new Set(['a', 'an', 'the', 'to', 'of', 'and', 'in', 'on', 'at', 'for'])

export function tokenizeEn(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z'\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
}

export interface ShadowScore {
  score: number
  hit: number
  total: number
  missed: string[]
}

/** 词袋重合率 * 100;原文无实词时给 0 */
export function scoreShadow(origin: string, said: string): ShadowScore {
  const src = tokenizeEn(origin)
  const hyp = new Set(tokenizeEn(said))
  if (src.length === 0) return { score: 0, hit: 0, total: 0, missed: [] }
  const missed = src.filter((w) => !hyp.has(w))
  const hit = src.length - missed.length
  return {
    score: Math.round((hit / src.length) * 100),
    hit,
    total: src.length,
    missed: [...new Set(missed)].slice(0, 8),
  }
}

export function canShadow(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}
