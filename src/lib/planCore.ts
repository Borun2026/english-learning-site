/**
 * 学习计划纯排程核心(无浏览器/网络依赖,便于 Node 自测:scripts/selftest_plan.mjs)
 * 契约字段见 ../types 的 StudyPlan/PlanTask。
 *
 * v2(P6 自适应):练习档跟当天解锁阶段走,一天按小节预算打包,可跨单元。
 * 详见 docs/PLAN_ADAPTIVE.md。旧 v1 `kind:'unit'` 计划只读兼容,不再生成。
 */
import type { PlanIntensity, PlanTask, StageId, UnitDef, UnitStepKey } from './types'

export const MIN_DAYS = 7
export const MAX_DAYS = 365

/** 单元六步(顺序与 UnitPlayer.STEPS 一致) */
export const UNIT_STEPS: UnitStepKey[] = ['vocab', 'grammar', 'article', 'dialogue', 'listen', 'exam']

const STEP_LABEL: Record<UnitStepKey, string> = {
  vocab: '① 词汇预习',
  grammar: '② 语法课',
  article: '③ 语法精读',
  dialogue: '④ 目标对话',
  listen: '⑤ 听力挑战',
  exam: '⑥ 真题演练',
}

/** 强度基线(每日小节目标,仅展示;实际日预算由 needed 决定) */
export const INTENSITY_BASELINE: Record<PlanIntensity, number> = { light: 3, normal: 6, intense: 9 }

export function todayStr(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return todayStr(d)
}

/** 某日期是计划的第几天:未开始返回 0,进行中 1..totalDays,已结束 totalDays+1,日期非法返回 -1 */
export function dayIndexOf(plan: { totalDays: number; startDate: string }, date: string = todayStr()): number {
  const start = new Date(plan.startDate + 'T00:00:00').getTime()
  const cur = new Date(date + 'T00:00:00').getTime()
  if (Number.isNaN(start) || Number.isNaN(cur)) return -1
  return Math.round((cur - start) / 86400000) + 1
}

export function tasksOfDay(plan: { tasks: PlanTask[] }, day: number): PlanTask[] {
  return plan.tasks.filter((t) => t.day === day)
}

/* ---------------- v1 兼容渲染 ---------------- */

/** 旧 v1 整单元任务标题的简单解析,供 Plan/Home 兼容老计划显示 */
export function isV1Plan(plan: { tasks: PlanTask[]; version?: 1 | 2 }): boolean {
  return plan.version !== 2
}

/* ---------------- v2 排程 ---------------- */

const MIN_DAILY = 2
const MAX_DAILY = 18

/** 计算 v2 每日小节预算。needed = ceil(总小节 / 天数)。clamp 到 [2,18]。 */
export function computeDailySections(totalSections: number, totalDays: number): number {
  const days = Math.max(MIN_DAYS, totalDays)
  const needed = Math.ceil(totalSections / days)
  return Math.min(MAX_DAILY, Math.max(MIN_DAILY, needed))
}

/**
 * 阶段窗口分配:把 totalDays 按各阶段小节量切成连续区间,使 Σ days === totalDays,
 * 并且每个有单元的阶段至少 1 天。返回 dayStart[s] 与 dayEnd[s](1 起,含)。
 */
export function stageWindows(
  units: UnitDef[],
  startStage: StageId,
  endStage: StageId,
  totalDays: number,
): { stage: StageId; dayStart: number; dayEnd: number }[] {
  const days = Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.floor(totalDays)))
  const sectionsByStage = new Map<StageId, number>()
  for (let s = startStage; s <= endStage; s++) {
    const cnt = units.filter((u) => u.stage === s).length
    if (cnt > 0) sectionsByStage.set(s, cnt * 6)
  }
  const stages = Array.from(sectionsByStage.keys())
  const total = stages.reduce((a, s) => a + sectionsByStage.get(s)!, 0)
  // 占位:比例分配
  let raw = stages.map((s) => days * (sectionsByStage.get(s) ?? 0) / total)
  let alloc = raw.map((r) => Math.max(1, Math.round(r)))
  // 修正 Σ 不等:按余数最大者补/减 1
  let sum = alloc.reduce((a, b) => a + b, 0)
  while (sum < days) {
    let bi = 0
    for (let i = 1; i < stages.length; i++) if (raw[i] - Math.floor(raw[i]) > raw[bi] - Math.floor(raw[bi])) bi = i
    alloc[bi]++
    sum++
  }
  while (sum > days) {
    let bi = 0
    for (let i = 1; i < stages.length; i++) {
      if (alloc[i] <= 1) continue
      if (alloc[i] - raw[i] > alloc[bi] - raw[bi]) bi = i
    }
    if (alloc[bi] <= 1) break
    alloc[bi]--
    sum--
  }
  // 拼窗口
  const windows: { stage: StageId; dayStart: number; dayEnd: number }[] = []
  let cursor = 1
  stages.forEach((s, i) => {
    windows.push({ stage: s, dayStart: cursor, dayEnd: cursor + alloc[i] - 1 })
    cursor += alloc[i]
  })
  return windows
}

/** 第 day 天(1 起)落在哪个解锁阶段;找不到(尾余)返回最后一个窗口阶段。 */
export function dayUnlockStage(
  windows: { stage: StageId; dayStart: number; dayEnd: number }[],
  day: number,
): StageId {
  for (const w of windows) if (day >= w.dayStart && day <= w.dayEnd) return w.stage
  return windows[windows.length - 1].stage
}

function reviewTask(day: number): PlanTask {
  return {
    id: `review-day${day}`,
    day,
    kind: 'review',
    title: '🔁 每周复盘',
    detail: '复习本周生词本、重做薄弱句内练习与真题/单元真题演练错题',
    link: '/wordbook',
  }
}

function nceTask(day: number, book: 1 | 2 | 3 | 4, slot = 0): PlanTask {
  return {
    id: `nce-day${day}${slot ? `-s${slot}` : ''}`,
    day,
    kind: 'nce',
    title: `📗 新概念第 ${book} 册泛读 1 课`,
    detail: '资料库选 1 课语法笔记精读 + 跟读例句',
    link: '/library?tab=nce',
    nceBook: book,
    tier: book as StageId,
  }
}

function cet6Task(day: number, slot = 0): PlanTask {
  return {
    id: `cet6-day${day}${slot ? `-s${slot}` : ''}`,
    day,
    kind: 'cet6',
    title: '📝 CET-6 语篇泛读 1 篇',
    detail: '点词查义 + 段落翻译讲解(需配 AI);做完 3 道理解题',
    link: '/library?tab=cet6',
    tier: 3,
  }
}

function zhentiTask(day: number, slot = 0): PlanTask {
  return {
    id: `zhenti-day${day}${slot ? `-s${slot}` : ''}`,
    day,
    kind: 'zhenti',
    title: '📝 考研真题限时 1 篇',
    detail: '限时 20 分钟完成阅读或完形,做完看解析(需解锁到 S4)',
    link: '/zhenti',
    tier: 4,
  }
}

function writingTask(day: number, slot = 0): PlanTask {
  return {
    id: `writing-day${day}${slot ? `-s${slot}` : ''}`,
    day,
    kind: 'writing',
    title: '✍️ S5 写作句式仿写 1 条',
    detail: '选 1 个句式仿写,可调用 AI 三项批改',
    link: '/writing',
    tier: 5,
  }
}

function vocabReviewTask(day: number, slot = 0): PlanTask {
  return {
    id: `vocab-review-day${day}${slot ? `-s${slot}` : ''}`,
    day,
    kind: 'vocab-review',
    title: '🔁 词汇到期复习',
    detail: '到期的词汇池闪卡复习(SM-2),不足 5 个就多做今日一篇',
    link: '/wordbook',
  }
}

function unitStepTask(day: number, unit: UnitDef, step: UnitStepKey): PlanTask {
  const upper = unit.id.toUpperCase()
  const label = STEP_LABEL[step]
  return {
    id: `us-${unit.id}-${step}`,
    day,
    kind: 'unit-step',
    title: `${upper} ${label}`,
    detail: `${unit.title} · 语法:${unit.grammarTopic} · 场景:${unit.scene}`,
    link: `/unit/${unit.id}?step=${step}`,
    tier: unit.stage,
    unitId: unit.id,
    step,
  }
}

/**
 * 同档 filler 选择(确定性,稳定):按当天已用剩余配额的 slot 取不同 kind。
 * - S1: nce(1) / vocab-review 轮转
 * - S2: nce(2) / vocab-review
 * - S3: nce(3) / cet6 / vocab-review
 * - S4: cet6 / zhenti / vocab-review
 * - S5: cet6 / writing / zhenti / vocab-review
 * 每第 7 天(且 totalDays>=10)额外追加 review,不占 filler 名额。
 * slot 从 0 起(等于当天已 push 的 filler 数),保证同日不同 slot 取不同条且 id 不重复。
 */
function fillerForDay(day: number, unlock: StageId, slot: number): PlanTask {
  switch (unlock) {
    case 1: {
      const idx = (day + slot) % 2
      return idx === 0 ? nceTask(day, 1, slot) : vocabReviewTask(day, slot)
    }
    case 2: {
      const idx = (day + slot) % 2
      return idx === 0 ? nceTask(day, 2, slot) : vocabReviewTask(day, slot)
    }
    case 3: {
      const idx = (day + slot) % 3
      return idx === 0 ? nceTask(day, 3, slot) : idx === 1 ? cet6Task(day, slot) : vocabReviewTask(day, slot)
    }
    case 4: {
      const idx = (day + slot) % 3
      return idx === 0 ? cet6Task(day, slot) : idx === 1 ? zhentiTask(day, slot) : vocabReviewTask(day, slot)
    }
    case 5:
    default: {
      const idx = (day + slot) % 4
      return idx === 0
        ? cet6Task(day, slot)
        : idx === 1
          ? writingTask(day, slot)
          : idx === 2
            ? zhentiTask(day, slot)
            : vocabReviewTask(day, slot)
    }
  }
}

/** 解锁阶段允许哪种 filler(校验用,目前均允许对应档);返回该档内是否含指定 kind */
export function fillerAllowed(unlock: StageId, kind: PlanTask['kind']): boolean {
  if (kind === 'zhenti') return unlock >= 4
  if (kind === 'cet6') return unlock >= 3
  if (kind === 'writing') return unlock >= 5
  if (kind === 'nce') return true
  return true
}

/**
 * v2 排程(能力窗 + 按日小节打包):
 * - 阶段窗口按各阶段小节量切,Σ days === totalDays,每阶段≥1 天
 * - 每天 unlock = 该天窗口阶段;从有序小节队列头部取 tier<=unlock 的若干条(可跨单元)
 * - 预算 dailySections = clamp(needed, 2, 18);剩余配额用同档 filler 填
 * - 每第 7 天(且 totalDays>=10)追加一条 review,可与小节并存(不占配额)
 * - 若循环结束队列非空(极紧):继续按日追加剩余小节,允许超过配额
 * 返回 tasks(已按 day/顺序排)与 coveredUnits(队列覆盖的单元,不重不漏)。
 */
export function buildSchedule(
  units: UnitDef[],
  opts: {
    totalDays: number
    endStage: StageId
    /** v2 新增:窗口起点(默认 1)。旧调用方不传时走 v1 兼容分支见下。 */
    startStage?: StageId
    /** v2 新增:强度(仅记录,不影响日预算) */
    intensity?: PlanIntensity
  },
): { tasks: PlanTask[]; coveredUnits: UnitDef[] } {
  const startStage = (Math.min(Math.max(opts.startStage ?? 1, 1), 5) as StageId)
  const endStage = (Math.min(Math.max(opts.endStage, startStage), 5) as StageId)
  // 旧调用方不传 startStage:现场任何已上线代码都传 {totalDays,endStage}(见 plan.ts),startStage 来自 generatePlan 已传。此处保留默认与 v1 行为可切换。
  // 但 generatePlan v2 始终传 startStage,故这里不会退到 v1。v1 兼容仅停留在数据渲染层。
  const days = Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.floor(opts.totalDays)))
  const tasks: PlanTask[] = []
  const coveredUnits: UnitDef[] = []
  const inScope = units.filter((u) => u.stage >= startStage && u.stage <= endStage)
  const totalSections = inScope.length * 6
  const dailySections = computeDailySections(totalSections, days)
  const windows = stageWindows(inScope, startStage, endStage, days)

  // 有序小节队列:按单元顺序 ×6 步;每步带所属 unit 与 stage
  type QItem = { unit: UnitDef; step: UnitStepKey }
  const queue: QItem[] = []
  for (const u of inScope) {
    for (const step of UNIT_STEPS) queue.push({ unit: u, step })
  }
  const pushedUnits = new Set<string>()

  let day = 1
  // 主循环:正常排期
  for (; day <= days && queue.length > 0; day++) {
    const unlock = dayUnlockStage(windows, day)
    let taken = 0
    while (queue.length > 0 && taken < dailySections) {
      const head = queue[0]
      // 解锁到该阶段才取;未解锁就停(等窗口自然推进时再排)
      // 实际:阶段窗口按小节量分配,匹配上时队列头一般 tier<=unlock
      if (head.unit.stage > unlock) break
      queue.shift()
      tasks.push(unitStepTask(day, head.unit, head.step))
      if (!pushedUnits.has(head.unit.id)) {
        pushedUnits.add(head.unit.id)
        coveredUnits.push(head.unit)
      }
      taken++
    }
    // 剩余配额用同档 filler
    while (taken < dailySections) {
      tasks.push(fillerForDay(day, unlock, taken))
      taken++
    }
    // 每周复盘(不占配额)
    if (days >= 10 && day % 7 === 0) tasks.push(reviewTask(day))
  }

  // 极紧:队列还有,剩余天数填满
  for (; day <= days && queue.length > 0; day++) {
    const unlock = dayUnlockStage(windows, Math.min(day, days))
    let taken = 0
    while (queue.length > 0 && taken < dailySections) {
      const head = queue[0]
      if (head.unit.stage > unlock) {
        // 极紧也允许跨一档?不:仍不提前两档。queue 头若超 unlock,说明该天窗口还没到;
        // 但极紧下 window 已结束——不会再有更高档窗口。此时强制排(解锁到 endStage)。
        if (day >= days) {
          queue.shift()
          tasks.push(unitStepTask(day, head.unit, head.step))
          if (!pushedUnits.has(head.unit.id)) {
            pushedUnits.add(head.unit.id)
            coveredUnits.push(head.unit)
          }
          taken++
          continue
        }
        break
      }
      queue.shift()
      tasks.push(unitStepTask(day, head.unit, head.step))
      if (!pushedUnits.has(head.unit.id)) {
        pushedUnits.add(head.unit.id)
        coveredUnits.push(head.unit)
      }
      taken++
    }
    while (taken < dailySections) {
      tasks.push(fillerForDay(day, unlock, taken))
      taken++
    }
    if (days >= 10 && day % 7 === 0) tasks.push(reviewTask(day))
  }

  // 剩余纯 filler 天数(队列已空)
  for (; day <= days; day++) {
    const unlock = dayUnlockStage(windows, day)
    let taken = 0
    while (taken < dailySections) {
      tasks.push(fillerForDay(day, unlock, taken))
      taken++
    }
    if (days >= 10 && day % 7 === 0) tasks.push(reviewTask(day))
  }

  // 队列在极紧下仍可能非空(超过 daily×days 容量)→ 已强制排满最后天,这里理论不会剩
  // 但保险:把剩余小节塞进最后一天
  if (queue.length > 0) {
    const last = days
    for (const it of queue) {
      tasks.push(unitStepTask(last, it.unit, it.step))
      if (!pushedUnits.has(it.unit.id)) {
        pushedUnits.add(it.unit.id)
        coveredUnits.push(it.unit)
      }
    }
  }

  tasks.sort((a, b) => a.day - b.day || a.id.localeCompare(b.id))
  return { tasks, coveredUnits }
}

/* ---------------- P6-4 按近况重排剩余天数 ---------------- */

/**
 * 仅作用于 v2 计划:已过去(day <= todayDayIdx)任务与打卡一律不动。
 * 弱势信号(近 7 日打卡完成率 < 0.5,或近期单元 exam 均分 < 60%)出现时,
 * 在未来(含今天 if todayDayIdx>=1)每个「纯 filler 日」额外追加一条 `vocab-review`
 * (id `vocab-review-recover-day{N}`),用于减负增速复习;不强增新内容、不改 unit-step 分布。
 * 无信号或 v1 计划:返回原对象引用(P6-4 是惰性的,不冗余改写)。
 */
export function adjustRemainingPlan(input: {
  plan: import('./types').StudyPlan
  today: string
  recentCompletionRate: number
  recentExamAvg: number | null
  dueWords: number
}): import('./types').StudyPlan {
  const { plan, today } = input
  if (plan.version !== 2) return plan
  const avg = input.recentExamAvg
  const weak = input.recentCompletionRate < 0.5 || (avg != null && avg < 60)
  if (!weak) return plan
  const todayIdx = dayIndexOf(plan, today)
  if (todayIdx < 1) return plan // 未开始或不合法日期,不动

  const extra: PlanTask[] = []
  for (let d = Math.max(1, todayIdx); d <= plan.totalDays; d++) {
    const ts = plan.tasks.filter((t) => t.day === d)
    // 仅给「纯 filler 日」加 vocab-review:当天无 unit-step、无 review、无 vocab-review-recover
    if (
      ts.length > 0 &&
      ts.every((t) => t.kind === 'nce' || t.kind === 'cet6' || t.kind === 'zhenti' || t.kind === 'writing' || t.kind === 'vocab-review')
    ) {
      // 跳过本周已含 review 的一天(避免同日两条复盘)
      if (ts.some((t) => t.kind === 'review')) continue
      // 限频:每 3 天最多一条 recover(避免刷屏)
      const recentHasRecover = extra.some((e) => e.day > 0 && Math.abs(e.day - d) < 3)
      if (recentHasRecover) continue
      extra.push({
        id: `vocab-review-recover-day${d}`,
        day: d,
        kind: 'vocab-review',
        title: '🔁 进度减负:词汇复习',
        detail: '检测到近 7 日完成率偏低,本日多加一场词汇复习(到期词 + 错词重练)',
        link: '/wordbook',
      })
    }
  }
  if (extra.length === 0) return plan
  const tasks = [...plan.tasks, ...extra].sort((a, b) => a.day - b.day || a.id.localeCompare(b.id))
  return { ...plan, tasks }
}
