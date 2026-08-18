import type { DictEntry, WordBankEntry, WordBankMeta } from './types'
import { companionFetch } from './companion.ts'
import { fetchJson } from './fetchJson.ts'

const BASE = (import.meta.env?.BASE_URL || '/') + 'content/'

const dictCache = new Map<string, Record<string, DictEntry>>()
const bankCache = new Map<string, WordBankEntry[]>()

function firstLetter(word: string): string {
  const ch = word.trim().charAt(0).toLowerCase()
  return /[a-z]/.test(ch) ? ch : 'x'
}

/** 常见不规则变化 → 原形 */
const IRREGULAR_BASE: Record<string, string> = {
  went: 'go', gone: 'go', going: 'go', goes: 'go',
  was: 'be', were: 'be', been: 'be', being: 'be', am: 'be', is: 'be', are: 'be',
  had: 'have', has: 'have', having: 'have',
  did: 'do', does: 'do', done: 'do', doing: 'do',
  drank: 'drink', drunk: 'drink',
  ate: 'eat', eaten: 'eat',
  took: 'take', taken: 'take', taking: 'take',
  came: 'come', coming: 'come',
  felt: 'feel', feeling: 'feel',
  got: 'get', gotten: 'get', getting: 'get',
  gave: 'give', given: 'give', giving: 'give',
  kept: 'keep', keeping: 'keep',
  made: 'make', making: 'make',
  met: 'meet', meeting: 'meet',
  saw: 'see', seen: 'see', seeing: 'see',
  sent: 'send', sending: 'send',
  told: 'tell', telling: 'tell',
  brought: 'bring', bringing: 'bring',
  tried: 'try', tries: 'try', trying: 'try',
  planned: 'plan', planning: 'plan',
  built: 'build', building: 'build',
  said: 'say', says: 'say', saying: 'say',
  ran: 'run', running: 'run',
  spoke: 'speak', spoken: 'speak', speaking: 'speak',
  wrote: 'write', written: 'write', writing: 'write',
  bought: 'buy', buying: 'buy',
  thought: 'think', thinking: 'think',
  knew: 'know', known: 'know', knowing: 'know',
  found: 'find', finding: 'find',
  left: 'leave', leaving: 'leave',
  became: 'become', began: 'begin', begun: 'begin',
  broke: 'break', broken: 'break',
  chose: 'choose', chosen: 'choose',
  drove: 'drive', driven: 'drive',
  flew: 'fly', flown: 'fly',
  forgot: 'forget', forgotten: 'forget',
  hid: 'hide', hidden: 'hide',
  rode: 'ride', ridden: 'ride',
  rose: 'rise', risen: 'rise',
  shook: 'shake', shaken: 'shake',
  showed: 'show', shown: 'show',
  sang: 'sing', sung: 'sing',
  swam: 'swim', swum: 'swim',
  threw: 'throw', thrown: 'throw',
  wore: 'wear', worn: 'wear',
  won: 'win', winning: 'win',
  cannot: 'can',
  loaves: 'loaf',
  bigger: 'big', biggest: 'big',
  earlier: 'early', earliest: 'early',
  photos: 'photo',
}

/** 生成候选原形:原词 → 不规则表 → 规则剥缀 */
export function lemmaCandidates(word: string): string[] {
  const w = word.toLowerCase()
  const out: string[] = []
  const push = (x: string) => {
    const t = x.toLowerCase()
    if (t.length > 1 && !out.includes(t)) out.push(t)
  }
  push(w)
  const ir = IRREGULAR_BASE[w]
  if (ir) push(ir)
  if (w.endsWith('ies') && w.length > 4) push(w.slice(0, -3) + 'y')
  if (w.endsWith('es')) {
    push(w.slice(0, -2))
    push(w.slice(0, -1))
  }
  if (w.endsWith('s') && !w.endsWith('ss')) push(w.slice(0, -1))
  if (w.endsWith('ing') && w.length > 5) {
    const stem = w.slice(0, -3)
    push(stem)
    push(stem + 'e')
    if (stem.length >= 2 && stem[stem.length - 1] === stem[stem.length - 2]) push(stem.slice(0, -1))
  }
  if (w.endsWith('ed') && w.length > 4) {
    const stem = w.slice(0, -2)
    push(stem)
    push(w.slice(0, -1))
    if (stem.length >= 2 && stem[stem.length - 1] === stem[stem.length - 2]) push(stem.slice(0, -1))
  }
  if (w.endsWith('er') && w.length > 4) push(w.slice(0, -2))
  if (w.endsWith('est') && w.length > 5) push(w.slice(0, -3))
  return out
}

export async function loadDictLetter(letter: string): Promise<Record<string, DictEntry>> {
  const key = letter.toLowerCase()
  if (dictCache.has(key)) return dictCache.get(key)!
  try {
    const arr: DictEntry[] = await fetchJson(`${BASE}dict/${key}.json`)
    const map: Record<string, DictEntry> = {}
    for (const e of arr) map[e.word.toLowerCase()] = e
    dictCache.set(key, map)
    return map
  } catch {
    dictCache.set(key, {})
    return {}
  }
}

export async function lookupDict(word: string): Promise<DictEntry | null> {
  for (const cand of lemmaCandidates(word)) {
    const map = await loadDictLetter(firstLetter(cand))
    const hit = map[cand]
    if (hit) return hit
  }
  return null
}

export async function loadBankLetter(letter: string): Promise<WordBankEntry[]> {
  const key = letter.toLowerCase()
  if (bankCache.has(key)) return bankCache.get(key)!
  try {
    const arr: WordBankEntry[] = await fetchJson(`${BASE}wordbank/${key}.json`)
    bankCache.set(key, arr)
    return arr
  } catch {
    bankCache.set(key, [])
    return []
  }
}

export async function lookupBank(word: string): Promise<WordBankEntry | null> {
  for (const cand of lemmaCandidates(word)) {
    const arr = await loadBankLetter(firstLetter(cand))
    const hit = arr.find((e) => e.word.toLowerCase() === cand)
    if (hit) return hit
  }
  return null
}

let meta: WordBankMeta | null = null
export async function loadBankMeta(): Promise<WordBankMeta | null> {
  if (meta) return meta
  try {
    const res = await fetch(`${BASE}wordbank/meta.json`)
    if (!res.ok) return null
    meta = await res.json()
    return meta
  } catch {
    return null
  }
}

function suggestItemToEntry(raw: unknown): DictEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const it = raw as Record<string, unknown>
  const word = typeof it.word === 'string' ? it.word : ''
  if (!word) return null
  const cn = typeof it.cn === 'string' ? it.cn : ''
  const pos = typeof it.pos === 'string' ? it.pos : ''
  const trans = Array.isArray(it.trans) ? (it.trans as DictEntry['trans']) : [{ pos, cn }]
  return {
    word,
    phon: typeof it.phon === 'string' ? it.phon : '',
    trans,
    sentences: Array.isArray(it.sentences) ? (it.sentences as DictEntry['sentences']) : [],
    phrases: Array.isArray(it.phrases) ? (it.phrases as DictEntry['phrases']) : [],
  }
}

/** 综合查词:词典与词库都查(词库用于 level) */
export async function lookupWord(word: string): Promise<{ dict: DictEntry | null; bank: WordBankEntry | null }> {
  try {
    const res = await companionFetch('/api/dict/lookup?word=' + encodeURIComponent(word))
    if (res?.ok) {
      const json = (await res.json()) as { dict?: DictEntry | null; bank?: WordBankEntry | null }
      if (json.dict || json.bank) return { dict: json.dict ?? null, bank: json.bank ?? null }
    }
  } catch {
    /* fall through */
  }
  const dict = await lookupDict(word)
  const bank = await lookupBank(word)
  return { dict, bank }
}

async function searchDictCompanion(s: string): Promise<DictEntry[]> {
  try {
    const res = await companionFetch('/api/dict/suggest?q=' + encodeURIComponent(s) + '&limit=12')
    if (!res?.ok) return []
    const json = (await res.json()) as { entries?: unknown; items?: unknown }
    if (Array.isArray(json.entries) && json.entries.length) {
      return json.entries.filter((e): e is DictEntry => !!e && typeof e === 'object' && typeof (e as DictEntry).word === 'string')
    }
    if (Array.isArray(json.items) && json.items.length) {
      return json.items.map(suggestItemToEntry).filter((e): e is DictEntry => e != null)
    }
  } catch {
    /* fall through */
  }
  return []
}

export async function searchDict(q: string): Promise<DictEntry[]> {
  const s = q.trim().toLowerCase()
  if (s.length < 2) return []
  const remote = await searchDictCompanion(s)
  if (remote.length) return remote.slice(0, 12)
  if (s.includes(' ')) {
    const m = s.match(/[a-z]/)
    const map = await loadDictLetter(m ? m[0] : 'x')
    const hits = Object.values(map).filter((e) =>
      e.phrases.some((ph) => ph.p.toLowerCase().includes(s)),
    )
    hits.sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()))
    return hits.slice(0, 12)
  }
  const map = await loadDictLetter(firstLetter(s))
  const hits = Object.values(map).filter((e) => e.word.toLowerCase().startsWith(s))
  hits.sort((a, b) => {
    const aw = a.word.toLowerCase()
    const bw = b.word.toLowerCase()
    if (aw === s && bw !== s) return -1
    if (bw === s && aw !== s) return 1
    return aw.localeCompare(bw)
  })
  return hits.slice(0, 12)
}
