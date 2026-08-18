export type CompanionHealth = { ok: boolean; service: string; uptime?: number }

const CACHE_MS = 15_000
const PROBE_MS = 300

let cachedUp = false
let cachedAt = 0
let inflight: Promise<boolean> | null = null

export function companionBase(): string {
  return ''
}

export function companionUrl(path: string): string {
  return companionBase() + path
}

export function isCompanionUp(): boolean {
  return cachedUp
}

function markDown() {
  cachedUp = false
  cachedAt = Date.now()
}

async function doProbe(): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_MS)
  try {
    const res = await fetch(companionUrl('/health'), { signal: controller.signal })
    if (!res.ok) {
      markDown()
      return false
    }
    const json = (await res.json()) as CompanionHealth
    const up = json.service === 'english-app'
    cachedUp = up
    cachedAt = Date.now()
    return up
  } catch {
    markDown()
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function probeCompanion(): Promise<boolean> {
  if (Date.now() - cachedAt < CACHE_MS) return cachedUp
  if (inflight) return inflight
  inflight = doProbe().finally(() => {
    inflight = null
  })
  return inflight
}

export async function companionFetch(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    if (!(await probeCompanion())) return null
    return await fetch(companionUrl(path), init)
  } catch {
    markDown()
    return null
  }
}
