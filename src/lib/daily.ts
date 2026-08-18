// =====================================================================
// 今日一篇(P5-4):按日期种子从外刊索引稳定抽取一篇,同一天全站一致
// 纯函数,Node 可直测(scripts/selftest_affix.mjs)
// =====================================================================

import { dateSeed } from './game/gen.ts'

/** 按日期从 id 列表稳定抽一篇;同一 day 永远同一篇 */
export function pickDailyId(ids: string[], day = dateSeed()): string | null {
  if (!ids.length) return null
  const i = ((day % ids.length) + ids.length) % ids.length
  return ids[i]
}
