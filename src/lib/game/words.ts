// =====================================================================
// 词汇游戏词源(P5-3):优先词汇池(学习/复习中,到期在前),
// 不足时按字母随机补充词库(离线),全部带中文释义。
// =====================================================================

import { loadBankLetter, lookupWord } from '../dict'
import { fetchJson } from '../fetchJson'
import { mulberry32, shuffle, type GameWord, type OrderSentenceBank } from './gen'

const BASE = import.meta.env.BASE_URL + 'content/'

/** 连词成句题库(public/content/games/order-sentence.json,脚本生成、随仓库分发) */
export async function loadOrderSentenceBank(): Promise<OrderSentenceBank> {
  return fetchJson<OrderSentenceBank>(`${BASE}games/order-sentence.json`)
}

function cnOf(word: string): Promise<string> {
  return lookupWord(word).then(({ dict, bank }) => {
    if (dict) return dict.trans.map((t) => (t.pos ? t.pos + '. ' : '') + t.cn).join('; ')
    if (bank) return bank.cn
    return ''
  })
}

/** 从词库字母文件随机补充 n 个词(3-12 字母、有中文释义) */
async function sampleFromBank(n: number, seed: number): Promise<GameWord[]> {
  const rng = mulberry32(seed)
  const letters = shuffle('abcdefghijklmnopqrstuvwxyz'.split(''), rng)
  const out: GameWord[] = []
  const seen = new Set<string>()
  for (const letter of letters) {
    if (out.length >= n) break
    const arr = await loadBankLetter(letter)
    for (const e of shuffle(arr, rng)) {
      if (out.length >= n) break
      const w = e.word
      if (seen.has(w)) continue
      if (w.length < 3 || w.length > 12 || /[^a-z]/i.test(w)) continue
      if (!e.cn) continue
      seen.add(w)
      out.push({ word: w, cn: e.cn })
    }
  }
  return out
}

/**
 * 采样 n 个游戏用词:
 * 1) 词汇池中 learning/reviewing 的词(今日到期优先) —— 游戏同时是复习
 * 2) 不足则从词库按种子随机补足(保证离线可玩)
 */
export async function sampleGameWords(n: number, seed = Date.now()): Promise<GameWord[]> {
  const { dueTodayWords, allWordStates } = await import('../vocab')
  const pool = allWordStates().filter((s) => s.status !== 'mastered')
  const due = new Set(dueTodayWords().map((s) => s.word))
  pool.sort((a, b) => (due.has(b.word) ? 1 : 0) - (due.has(a.word) ? 1 : 0) || a.next - b.next)
  const out: GameWord[] = []
  const seen = new Set<string>()
  for (const s of pool) {
    if (out.length >= n) break
    if (seen.has(s.word)) continue
    const cn = await cnOf(s.word)
    if (!cn) continue
    seen.add(s.word)
    out.push({ word: s.word, cn })
  }
  if (out.length < n) {
    for (const g of await sampleFromBank(n - out.length, seed)) {
      if (seen.has(g.word)) continue
      seen.add(g.word)
      out.push(g)
      if (out.length >= n) break
    }
  }
  return out
}
