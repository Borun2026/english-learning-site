// =====================================================================
// 跟读评测(P5-5):转写对照原文。数字归一化 + 发音代理(fuzzy/accuracy)。
// =====================================================================

const STOP = new Set(['a', 'an', 'the', 'to', 'of', 'and', 'in', 'on', 'at', 'for'])

const ONES: Record<string, number> = {
  zero: 0, oh: 0, nought: 0,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
}

const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}

export function wordToNum(w: string): number | null {
  if (/^\d+$/.test(w)) return Number(w)
  if (w in ONES) return ONES[w]
  if (w in TENS) return TENS[w]
  if (w === 'hundred') return 100
  if (w === 'thousand') return 1000
  for (const [tens, tv] of Object.entries(TENS)) {
    if (w.startsWith(tens)) {
      const rest = w.slice(tens.length)
      if (rest in ONES) return tv + ONES[rest]
    }
  }
  return null
}

export function foldNumberTokens(tokens: string[]): string[] {
  const out: string[] = []
  let i = 0
  while (i < tokens.length) {
    let n = wordToNum(tokens[i])
    if (n == null) {
      out.push(tokens[i])
      i++
      continue
    }
    i++
    while (i < tokens.length) {
      const m = wordToNum(tokens[i])
      if (m == null) break
      if (n >= 20 && n < 100 && n % 10 === 0 && m > 0 && m < 10) {
        n += m
        i++
        continue
      }
      if (n > 0 && n < 100 && m === 100) {
        n *= 100
        i++
        continue
      }
      if (n > 0 && n < 1000 && m === 1000) {
        n *= 1000
        i++
        continue
      }
      if (n >= 100 && m > 0 && m < 100) {
        n += m
        i++
        continue
      }
      break
    }
    out.push(String(n))
  }
  return out
}

const ORDINALS: Record<string, string> = {
  '1st': 'first', first: 'first',
  '2nd': 'second', second: 'second',
  '3rd': 'third', third: 'third',
  '4th': 'fourth', fourth: 'fourth',
  '5th': 'fifth', fifth: 'fifth',
  '6th': 'sixth', sixth: 'sixth',
  '7th': 'seventh', seventh: 'seventh',
  '8th': 'eighth', eighth: 'eighth',
  '9th': 'ninth', ninth: 'ninth',
  '10th': 'tenth', tenth: 'tenth',
  '11th': 'eleventh', eleventh: 'eleventh',
  '12th': 'twelfth', twelfth: 'twelfth',
}

function expandSpoken(s: string): string {
  return s
    .toLowerCase()
    .replace(/(\d+):(\d+)/g, '$1 $2')
    .replace(/\$(\d+(?:\.\d+)?)/g, '$1 dollars')
    .replace(/(\d+(?:\.\d+)?)%/g, '$1 percent')
    .replace(/\b(\d+)(st|nd|rd|th)\b/g, (_, n, suf) => ORDINALS[n + suf] ?? n)
}

export function tokenizeEn(s: string): string[] {
  const raw = expandSpoken(s)
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .map((w) => ORDINALS[w] ?? w)
    .filter((w) => {
      if (!w) return false
      if (wordToNum(w) != null) return true
      return w.length > 1 && !STOP.has(w)
    })
  return foldNumberTokens(raw)
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const prev = new Array<number>(n + 1)
  const cur = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j]
  }
  return prev[n]
}

export function isFuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length < 3 || b.length < 3) return false
  const d = editDistance(a, b)
  if (d <= 1) return true
  return d / Math.max(a.length, b.length) <= 0.25
}

export interface ShadowScore {
  score: number
  accuracy: number
  fuzzy: number
  hit: number
  total: number
  missed: string[]
}

const EMPTY: ShadowScore = { score: 0, accuracy: 0, fuzzy: 0, hit: 0, total: 0, missed: [] }

/** accuracy=精确重合; fuzzy=允许近音/近形; score=二者均值。原文无实词时给 0 */
export function scoreShadow(origin: string, said: string): ShadowScore {
  const src = tokenizeEn(origin)
  const hyp = tokenizeEn(said)
  if (src.length === 0) return EMPTY
  const used = new Array<boolean>(hyp.length).fill(false)
  let hit = 0
  let fuzzyHit = 0
  const missed: string[] = []
  const pending: string[] = []
  for (const w of src) {
    const idx = hyp.findIndex((h, i) => !used[i] && h === w)
    if (idx >= 0) {
      used[idx] = true
      hit++
      fuzzyHit++
    } else {
      pending.push(w)
    }
  }
  for (const w of pending) {
    const idx = hyp.findIndex((h, i) => !used[i] && isFuzzyMatch(w, h))
    if (idx >= 0) {
      used[idx] = true
      fuzzyHit++
    } else {
      missed.push(w)
    }
  }
  const accuracy = Math.round((hit / src.length) * 100)
  const fuzzy = Math.round((fuzzyHit / src.length) * 100)
  return {
    score: Math.round((accuracy + fuzzy) / 2),
    accuracy,
    fuzzy,
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
