import type { Article, CurriculumIndex, ExamSet, GoalDialogue, GrammarLesson, ListenChallenge, NceLinksFile, UnitDef } from './types'
import { fetchJson } from './fetchJson'

const BASE = import.meta.env.BASE_URL + 'content/curriculum/'

let indexCache: CurriculumIndex | null = null

export async function loadIndex(): Promise<CurriculumIndex> {
  if (indexCache) return indexCache
  const idx: CurriculumIndex = await fetchJson(`${BASE}index.json`)
  indexCache = idx
  return idx
}

/* ---------------- NCE 课文精读整合(P3-3) ---------------- */

let nceLinksCache: NceLinksFile | null = null

export async function loadNceLinks(): Promise<NceLinksFile> {
  if (nceLinksCache) return nceLinksCache
  nceLinksCache = await fetchJson<NceLinksFile>(`${BASE}nce-links.json`)
  return nceLinksCache
}

export function findUnit(index: CurriculumIndex, unitId: string): UnitDef | null {
  for (const st of index.stages) {
    const u = st.units.find((x) => x.id === unitId)
    if (u) return u
  }
  return null
}

async function loadUnitFile<T>(unitId: string, file: string): Promise<T | null> {
  try {
    return await fetchJson<T>(`${BASE}${unitId}/${file}.json`)
  } catch {
    return null
  }
}

export const loadGrammar = (unitId: string) => loadUnitFile<GrammarLesson>(unitId, 'grammar')
export const loadArticle = (unitId: string) => loadUnitFile<Article>(unitId, 'article')
export const loadDialogue = (unitId: string) => loadUnitFile<GoalDialogue>(unitId, 'dialogue')
export const loadListen = (unitId: string) => loadUnitFile<ListenChallenge>(unitId, 'listen')
export const loadExam = (unitId: string) => loadUnitFile<ExamSet>(unitId, 'exam')
