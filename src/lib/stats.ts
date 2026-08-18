// =====================================================================
// 激励系统(P5-6):XP / 升级 / 连击 / 成就。纯函数可测 + 写回 storage。
// =====================================================================

import { loadData, saveData } from './storage.ts'
import type { UserStats } from './types'

export interface AchievementDef {
  id: string
  name: string
  desc: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-xp', name: '迈出第一步', desc: '获得第一点经验' },
  { id: 'xp-100', name: '小有斩获', desc: '累计 100 XP' },
  { id: 'xp-500', name: '稳步向前', desc: '累计 500 XP' },
  { id: 'streak-3', name: '三日不辍', desc: '连续学习 3 天' },
  { id: 'streak-7', name: '一周坚持', desc: '连续学习 7 天' },
  { id: 'review-10', name: '复习达人', desc: '完成 10 次词汇复习加分' },
  { id: 'game-1', name: '玩中学', desc: '完成一局词汇游戏' },
  { id: 'shadow-1', name: '开口第一句', desc: '完成一次跟读' },
  { id: 'daily-1', name: '今日一篇', desc: '读完一篇今日外刊' },
  { id: 'unit-1', name: '单元启程', desc: '完成一个完整单元' },
]

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function yesterdayKey(d = new Date()): string {
  return todayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1))
}

/** 升级曲线:level = floor(sqrt(xp / 40)) + 1,至少 1 */
export function levelOfXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 40)) + 1)
}

export function xpToNext(xp: number): { level: number; have: number; need: number } {
  const level = levelOfXp(xp)
  const cur = (level - 1) * (level - 1) * 40
  const nxt = level * level * 40
  return { level, have: xp - cur, need: nxt - cur }
}

export function applyXp(stats: UserStats, amount: number, day = todayKey()): UserStats {
  const xp = Math.max(0, stats.xp + Math.max(0, amount))
  let streak = stats.streak
  if (stats.lastActiveDay === day) {
    // 同一天不叠加连击
  } else if (stats.lastActiveDay === yesterdayKey(new Date(day + 'T12:00:00'))) {
    streak = Math.max(1, streak) + 1
  } else {
    streak = 1
  }
  const activityLog = { ...stats.activityLog, [day]: (stats.activityLog[day] ?? 0) + amount }
  return {
    ...stats,
    xp,
    level: levelOfXp(xp),
    streak,
    lastActiveDay: day,
    activityLog,
  }
}

export function unlockAchievements(stats: UserStats, extra: Record<string, boolean> = {}): string[] {
  const have = new Set(stats.achievements)
  const next: string[] = []
  const check = (id: string, ok: boolean) => {
    if (ok && !have.has(id)) next.push(id)
  }
  check('first-xp', stats.xp > 0)
  check('xp-100', stats.xp >= 100)
  check('xp-500', stats.xp >= 500)
  check('streak-3', stats.streak >= 3)
  check('streak-7', stats.streak >= 7)
  check('review-10', extra.review10 === true)
  check('game-1', extra.game === true)
  check('shadow-1', extra.shadow === true)
  check('daily-1', extra.daily === true)
  check('unit-1', extra.unit === true)
  return next
}

export interface AwardResult {
  stats: UserStats
  unlocked: AchievementDef[]
}

/** 加 XP 并刷新连击/成就;返回新解锁成就供 toast */
export function awardXp(amount: number, extra: Record<string, boolean> = {}): AwardResult {
  const d = loadData()
  const next = applyXp(d.stats, amount)
  const unlockedIds = unlockAchievements(next, extra)
  next.achievements = [...next.achievements, ...unlockedIds]
  d.stats = next
  saveData(d)
  return {
    stats: next,
    unlocked: ACHIEVEMENTS.filter((a) => unlockedIds.includes(a.id)),
  }
}

export function getStats(): UserStats {
  return loadData().stats
}
