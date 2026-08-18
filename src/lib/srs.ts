// =====================================================================
// SM-2 间隔复习(P5-2,参考 spaced-english 的 sm2.ts 思路自实现,MIT)
// 四档:Again(当日回到队尾)/ Hard / Good / Easy。
// 纯函数,无 DOM/localStorage 依赖,Node 可直接测试。
// =====================================================================

import type { WordStatus } from './types'

export type SrsGrade = 'again' | 'hard' | 'good' | 'easy'

export interface SrsInput {
  reps: number
  /** 当前间隔(天) */
  interval: number
  /** 难易系数 */
  ef: number
  /** 记忆箱 1-5 */
  box: number
}

export interface SrsOutput {
  reps: number
  interval: number
  ef: number
  box: number
  status: WordStatus
}

const clampEf = (x: number) => Math.min(2.5, Math.max(1.3, x))

/**
 * 复习一次。约定:
 * - again:连续记录清零、间隔归 0(调用方把 next 设为当前时间 = 当日队尾)、EF -0.2、箱降回 1
 * - hard:间隔 ×1.2,EF -0.15;首次 1 天
 * - good:间隔 ×EF;首次 3 天;箱 +1
 * - easy:间隔 ×EF×1.3,EF +0.15;首次 5 天;箱 +1
 * - box ≥ 5 → mastered
 */
export function applySrs(s: SrsInput, grade: SrsGrade): SrsOutput {
  let { reps, interval, ef, box } = s
  ef = clampEf(ef)
  box = Math.max(1, Math.min(5, Math.round(box)))
  if (grade === 'again') {
    reps = 0
    interval = 0
    ef = clampEf(ef - 0.2)
    box = 1
  } else if (grade === 'hard') {
    reps += 1
    ef = clampEf(ef - 0.15)
    interval = reps === 1 ? 1 : Math.max(1, Math.round(interval * 1.2))
  } else if (grade === 'good') {
    reps += 1
    interval = reps === 1 ? 3 : Math.max(1, Math.round(interval * ef))
    box += 1
  } else {
    reps += 1
    ef = clampEf(ef + 0.15)
    interval = reps === 1 ? 5 : Math.max(1, Math.round(interval * ef * 1.3))
    box += 1
  }
  const status: WordStatus = box >= 5 ? 'mastered' : reps >= 1 ? 'reviewing' : 'learning'
  return { reps, interval, ef, box, status }
}

export const GRADE_LABELS: Record<SrsGrade, string> = {
  again: 'Again 重来',
  hard: 'Hard 模糊',
  good: 'Good 记得',
  easy: 'Easy 简单',
}
