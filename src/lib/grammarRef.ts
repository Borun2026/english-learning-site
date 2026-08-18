import type { CefrProfile, GrammarCnFile, GrammarMap } from './types'
import { fetchJson } from './fetchJson'

const BASE = import.meta.env.BASE_URL + 'content/'

/* ---------------- grammar-reference.json(CEFR 规则 + Murphy + 时态 + 中文语法书) ---------------- */

export interface GrammarRule {
  id: string
  text: string
  note?: string
  exp?: string
  ex?: string[]
  tip?: string
  mistakes?: string[]
  markers?: { tags?: string[]; note?: string }
  /** 映射到本平台单元 */
  unitId?: string
  /** 语法地图节点 id(如 g-s1u1) */
  grammarId?: string
  /** 中文语法课主题名 */
  topicCn?: string
}

export interface GrammarCategory {
  name: string
  rules: GrammarRule[]
}

export interface GrammarLevel {
  id: string
  name: string
  sub: string
  categories: GrammarCategory[]
}

export interface GrammarTense {
  name: string
  formula: string
  color: string
  markers: string
  examplesEn: [string, string]
  mistakeCount: number
}

export interface GrammarBookChapter {
  id: string
  title: string
  stage: number
  cefr?: string
  unitId: string
  explanation: string
  examples: { en: string; cn: string; note?: string }[]
  errors: { wrong: string; right: string; note: string }[]
  refs: string[]
  external: GrammarRule[]
}

export interface GrammarRef {
  levels: GrammarLevel[]
  murphy: GrammarLevel[]
  tenses: Record<string, GrammarTense>
  book: { chapters: GrammarBookChapter[] }
  stats: Record<string, number>
}

let refCache: GrammarRef | null = null
let refLoading: Promise<GrammarRef> | null = null

export function loadGrammarRef(): Promise<GrammarRef> {
  if (refCache) return Promise.resolve(refCache)
  if (!refLoading) {
    refLoading = fetchJson<GrammarRef>(`${BASE}grammar-reference.json`).then((d) => {
      refCache = d
      return d
    })
  }
  return refLoading
}

export function allRules(ref: GrammarRef): GrammarRule[] {
  return ref.levels.flatMap((lv) => lv.categories.flatMap((c) => c.rules))
}

/** 已映射到某单元的语法树规则(42/48 单元有映射) */
export function rulesOfUnit(ref: GrammarRef, unitId: string): GrammarRule[] {
  return allRules(ref).filter((r) => r.unitId === unitId)
}

export function ruleById(ref: GrammarRef, id: string): GrammarRule | null {
  return allRules(ref).find((r) => r.id === id) ?? null
}

/* ---------------- grammar-map.json(48 语法地图节点) ---------------- */

let mapCache: GrammarMap | null = null
let mapLoading: Promise<GrammarMap> | null = null

export function loadGrammarMap(): Promise<GrammarMap> {
  if (mapCache) return Promise.resolve(mapCache)
  if (!mapLoading) {
    mapLoading = fetchJson<GrammarMap>(`${BASE}grammar-map.json`).then((d) => {
      mapCache = d
      return d
    })
  }
  return mapLoading
}

/* ---------------- cefr-profile.json(AI 教练大纲,也用于语法树中文引导) ---------------- */

let cefrCache: CefrProfile | null = null
let cefrLoading: Promise<CefrProfile | null> | null = null

export function loadCefrProfile(): Promise<CefrProfile | null> {
  if (cefrCache) return Promise.resolve(cefrCache)
  if (!cefrLoading) {
    cefrLoading = fetchJson<CefrProfile>(`${BASE}cefr-profile.json`)
      .then((d) => {
        cefrCache = d
        return d
      })
      .catch(() => {
        cefrCache = null
        return null
      })
  }
  return cefrLoading
}

/* ---------------- grammar-cn.json(语法树中文讲解手册) ---------------- */

let grammarCnCache: GrammarCnFile | null = null

export function loadGrammarCn(): Promise<GrammarCnFile> {
  if (grammarCnCache) return Promise.resolve(grammarCnCache)
  return fetchJson<GrammarCnFile>(`${BASE}grammar-cn.json`).then((d) => {
    grammarCnCache = d
    return d
  })
}
