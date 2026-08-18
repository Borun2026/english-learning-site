import type { ReadingIndex, ReadingPassage } from './types'
import { fetchJson } from './fetchJson'

const BASE = import.meta.env.BASE_URL + 'content/intensive/ted/'

let indexCache: ReadingIndex | null = null
const lessonCache = new Map<string, ReadingPassage>()

export async function loadTedIndex(): Promise<ReadingIndex> {
  if (indexCache) return indexCache
  indexCache = await fetchJson<ReadingIndex>(`${BASE}ted-index.json`)
  return indexCache
}

export async function loadTedLesson(id: string): Promise<ReadingPassage> {
  const hit = lessonCache.get(id)
  if (hit) return hit
  const lesson = await fetchJson<ReadingPassage>(`${BASE}${id}.json`)
  lessonCache.set(id, lesson)
  return lesson
}
