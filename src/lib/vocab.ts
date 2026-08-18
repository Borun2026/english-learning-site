// =====================================================================
// 词汇池(P5-2):入池事件 / 今日到期队列 / 错词重排队 / 掌握度统计
// 数据落在 localStorage(AppData.wordStates),UI 层见 Wordbook/VocabView 等。
// =====================================================================

import { loadData, makeWordState, saveData } from './storage.ts'
import { applySrs, type SrsGrade } from './srs.ts'
import type { WordSource, WordState } from './types'

/** 词归一化:小写 + 只保留字母/连字符/撇号(与点词口径一致) */
export function wordKey(w: string): string {
  return w.toLowerCase().replace(/[^a-z'-]/g, '')
}

/** 入池:新词建 learning 态;已有词只补充来源 */
export function addWord(word: string, source: WordSource): WordState {
  const key = wordKey(word)
  const d = loadData()
  let st = d.wordStates[key]
  if (st) {
    if (!st.sources.includes(source)) st.sources = [...st.sources, source]
  } else {
    st = makeWordState(key, source)
  }
  d.wordStates[key] = st
  saveData(d)
  return st
}

/** SM-2 复习一档;返回更新后的状态(词不存在返回 null) */
export function reviewWord(word: string, grade: SrsGrade): WordState | null {
  const key = wordKey(word)
  const d = loadData()
  const st = d.wordStates[key]
  if (!st) return null
  const now = Date.now()
  const out = applySrs({ reps: st.reps, interval: st.interval, ef: st.ef, box: st.box }, grade)
  const next: WordState = {
    ...st,
    ...out,
    next: grade === 'again' ? now : now + out.interval * 86400000,
    lastReviewAt: now,
    wrongCount: grade === 'again' ? st.wrongCount + 1 : st.wrongCount,
  }
  d.wordStates[key] = next
  saveData(d)
  return next
}

/** 错词入池:新词 learning;已有词 wrongCount+1 并当日重排队(队尾) */
export function requeueWrongWord(word: string, source: WordSource): WordState {
  const key = wordKey(word)
  const d = loadData()
  let st = d.wordStates[key]
  if (!st) {
    st = makeWordState(key, source)
    st.wrongCount = 1
  } else {
    st = { ...st, next: Date.now(), wrongCount: st.wrongCount + 1, sources: st.sources.includes(source) ? st.sources : [...st.sources, source] }
  }
  d.wordStates[key] = st
  saveData(d)
  return st
}

export function getWordState(word: string): WordState | undefined {
  return loadData().wordStates[wordKey(word)]
}

/** 快标掌握:入池后直接标为箱 5 / mastered */
export function markMastered(word: string, source: WordSource): WordState {
  addWord(word, source)
  const key = wordKey(word)
  const d = loadData()
  const st = d.wordStates[key]
  const now = Date.now()
  const interval = st.interval > 0 ? st.interval : 21
  const next: WordState = {
    ...st,
    reps: Math.max(1, st.reps),
    box: 5,
    status: 'mastered',
    interval,
    lastReviewAt: now,
    next: now + interval * 86400000,
  }
  d.wordStates[key] = next
  saveData(d)
  return next
}

export function allWordStates(): WordState[] {
  return Object.values(loadData().wordStates).sort((a, b) => a.word.localeCompare(b.word))
}

/** 已到期队列(含今天到期的),按到期时间升序 */
export function dueWords(now = Date.now()): WordState[] {
  return Object.values(loadData().wordStates)
    .filter((s) => s.next <= now && s.status !== 'mastered')
    .sort((a, b) => a.next - b.next || a.word.localeCompare(b.word))
}

/** 今天(0 点至 24 点)内到期的队列:用于「今日复习」 */
export function dueTodayWords(now = Date.now()): WordState[] {
  const d = new Date(now)
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime()
  return Object.values(loadData().wordStates)
    .filter((s) => s.next <= end && s.status !== 'mastered')
    .sort((a, b) => a.next - b.next || a.word.localeCompare(b.word))
}

export interface VocabStats {
  total: number
  dueToday: number
  learning: number
  reviewing: number
  mastered: number
}

export function vocabStats(now = Date.now()): VocabStats {
  const all = Object.values(loadData().wordStates)
  const due = dueTodayWords(now).length
  return {
    total: all.length,
    dueToday: due,
    learning: all.filter((s) => s.status === 'learning').length,
    reviewing: all.filter((s) => s.status === 'reviewing').length,
    mastered: all.filter((s) => s.status === 'mastered').length,
  }
}

/* ---------------- 文本提词(真题/教练错词自动入池) ---------------- */

const STOPWORDS = new Set(
  `the a an and or but not for with from that this these those are was were been being have has had will would should could can may might must shall do does did doing done is am be to of in on at by as it its it's you your yours he him his she her hers they them their theirs we us our ours what which who whom whose when where why how all any both each few more most other some such only own same so than too very just about into over under again further once here there out off up down then now new old good great big small long short high low much many little thing things way ways people time times year years day days one two three man woman child world life hand part place case week company system program question government work number night point home water room mother area money story fact month lot right study book eye job word business issue side kind head house service friend father power hour game line end member law car city community name president team minute idea body information back parent face others level office door health person art war history party result change morning reason research girl guy moment air teacher force education sentence word get make like know take see come think look want give use find tell ask work seem feel try leave call make`.split(/\s+/),
)

/** 从一段文本提取可入池的内容词(去重,过滤停用词,最多 8 个) */
export function extractWords(text: string, max = 8): string[] {
  const words = (text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []).filter((w) => w.length >= 3 && !STOPWORDS.has(w))
  return Array.from(new Set(words)).slice(0, max)
}

/** 把一批词以「错词」身份入池(真题/教练用) */
export function addWrongWords(text: string, source: WordSource) {
  for (const w of extractWords(text)) {
    requeueWrongWord(w, source)
  }
}
