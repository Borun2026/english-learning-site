// =====================================================================
// 单元预取(P5-7):切入某单元后后台预热相邻单元 5 个内容文件,不阻塞首屏。
// =====================================================================

const BASE = import.meta.env.BASE_URL + 'content/curriculum/'
const FILES = ['grammar.json', 'article.json', 'dialogue.json', 'listen.json', 'exam.json']

const warmed = new Set<string>()

function warm(unitId: string) {
  if (warmed.has(unitId) || typeof fetch !== 'function') return
  warmed.add(unitId)
  for (const f of FILES) {
    void fetch(`${BASE}${unitId}/${f}`).catch(() => {
      /* 预取失败静默 */
    })
  }
}

/** 预热当前 + 下一个单元(id 形如 s1u1 / s2u12) */
export function prefetchNearby(unitId: string) {
  warm(unitId)
  const m = unitId.match(/^(s(\d+)u)(\d+)$/)
  if (!m) return
  const next = `${m[1]}${Number(m[3]) + 1}`
  warm(next)
}
