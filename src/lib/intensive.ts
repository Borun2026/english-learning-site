import type { NceIndex, NceLesson, ReadingIndex, ReadingPassage } from './types'
import { fetchJson } from './fetchJson'

const BASE = import.meta.env.BASE_URL + 'content/intensive/'

let nceIndex: NceIndex | null = null
export async function loadNceIndex(): Promise<NceIndex> {
  if (nceIndex) return nceIndex
  nceIndex = await fetchJson<NceIndex>(`${BASE}nce/index.json`)
  return nceIndex
}

let nceCache = new Map<string, NceLesson>()
export async function loadNceLesson(book: string, lesson: string): Promise<NceLesson> {
  const key = `${book}/${lesson}`
  const hit = nceCache.get(key)
  if (hit) return hit
  const l = await fetchJson<NceLesson>(`${BASE}nce/${book}/${lesson}.json`)
  nceCache.set(key, l)
  return l
}

let magazineIndex: ReadingIndex | null = null
export async function loadMagazineIndex(): Promise<ReadingIndex> {
  if (magazineIndex) return magazineIndex
  magazineIndex = await fetchJson<ReadingIndex>(`${BASE}reading/magazine/index.json`)
  return magazineIndex
}

let magazineCache = new Map<string, ReadingPassage>()
export async function loadMagazineArticle(id: string): Promise<ReadingPassage> {
  const hit = magazineCache.get(id)
  if (hit) return hit
  const a = await fetchJson<ReadingPassage>(`${BASE}reading/magazine/${id}.json`)
  magazineCache.set(id, a)
  return a
}
