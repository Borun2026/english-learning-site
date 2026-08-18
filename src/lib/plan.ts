import type { PlanIntensity, StageId, StudyPlan, UnitDef } from './types'
import { loadIndex } from './curriculum'
import { buildSchedule, computeDailySections, MAX_DAYS, MIN_DAYS, todayStr } from './planCore'

export { addDays, dayIndexOf, MAX_DAYS, MIN_DAYS, tasksOfDay, todayStr } from './planCore'

/** 阶段范围内的单元(升序) */
export function unitsInRange(startStage: StageId, endStage: StageId): Promise<UnitDef[]> {
  return loadIndex().then((idx) =>
    idx.stages.filter((s) => s.id >= startStage && s.id <= endStage).flatMap((s) => s.units),
  )
}

/**
 * 自动生成学习计划(自选天数 / 起止阶段 / 开始日期)。
 * 排程规则见 planCore.buildSchedule;无内容依赖时(目录加载失败)向上抛错,页面降级提示。
 */
export async function generatePlan(opts: {
  totalDays: number
  startStage: StageId
  endStage: StageId
  startDate: string
  intensity?: PlanIntensity
  abilityStage?: StageId
}): Promise<StudyPlan> {
  const days = Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.floor(opts.totalDays)))
  const startStage = Math.min(Math.max(opts.startStage, 1), 5) as StageId
  const endStage = Math.min(Math.max(opts.endStage, startStage), 5) as StageId
  const intensity: PlanIntensity = opts.intensity ?? 'normal'
  const abilityStage = (Math.min(Math.max(opts.abilityStage ?? startStage, 1), 5) as StageId)
  const units = await unitsInRange(startStage, endStage)
  const { tasks, coveredUnits } = buildSchedule(units, {
    totalDays: days,
    endStage,
    startStage,
    intensity,
  })
  const totalSections = coveredUnits.length * 6
  const dailySections = computeDailySections(totalSections, days)

  return {
    id: 'plan_' + Date.now().toString(36),
    createdAt: Date.now(),
    totalDays: days,
    startStage,
    endStage,
    startDate: opts.startDate || todayStr(),
    unitIds: coveredUnits.map((u) => u.id),
    tasks,
    version: 2,
    intensity,
    dailySections,
    abilityStage,
  }
}
