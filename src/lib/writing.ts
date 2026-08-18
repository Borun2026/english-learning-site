import type { BandWordsFile, WritingErrorsFile, WritingPatternsFile } from './types'
import { fetchJson } from './fetchJson'

const BASE = import.meta.env.BASE_URL + 'content/writing/s5/'

let patternsCache: WritingPatternsFile | null = null
let bandCache: BandWordsFile | null = null
let errorsCache: WritingErrorsFile | null = null

export async function loadWritingPatterns(): Promise<WritingPatternsFile> {
  if (patternsCache) return patternsCache
  patternsCache = await fetchJson<WritingPatternsFile>(`${BASE}patterns.json`)
  return patternsCache
}

export async function loadBandWords(): Promise<BandWordsFile> {
  if (bandCache) return bandCache
  bandCache = await fetchJson<BandWordsFile>(`${BASE}band-words.json`)
  return bandCache
}

export async function loadWritingErrors(): Promise<WritingErrorsFile> {
  if (errorsCache) return errorsCache
  errorsCache = await fetchJson<WritingErrorsFile>(`${BASE}errors.json`)
  return errorsCache
}

export async function loadWritingLibrary() {
  const [patterns, bandWords, errors] = await Promise.all([
    loadWritingPatterns(),
    loadBandWords(),
    loadWritingErrors(),
  ])
  return { patterns: patterns.patterns, bandWords: bandWords.words, errors: errors.errors }
}
