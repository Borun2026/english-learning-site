import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import { loadIndex } from '../lib/curriculum'
import { addDays, dayIndexOf, generatePlan, MAX_DAYS, MIN_DAYS, tasksOfDay, todayStr } from '../lib/plan'
import { adjustRemainingPlan, isV1Plan } from '../lib/planCore'
import { isPlanTaskDone, loadData, resetPlan, setPlan, togglePlanCheckin, useDataVersion } from '../lib/storage'
import type { CurriculumIndex, PlanIntensity, StageId } from '../lib/types'
import { STAGE_NAMES } from '../lib/types'

export default function Plan() {
  const [index, setIndex] = useState<CurriculumIndex | null>(null)
  const [err, setErr] = useState('')
  const [data, setData] = useState(loadData())
  const existing = data.plan
  const [totalDays, setTotalDays] = useState(existing?.totalDays ?? 100)
  const [startStage, setStartStage] = useState<StageId>(existing?.startStage ?? 1)
  const [endStage, setEndStage] = useState<StageId>(existing?.endStage ?? 5)
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayStr())
  const [generating, setGenerating] = useState(false)
  const [intensity, setIntensity] = useState<PlanIntensity>(existing?.intensity ?? 'normal')

  const INTENSITY_LABEL: Record<PlanIntensity, string> = { light: '轻松', normal: '正常', intense: '强化' }
  const intensityLabel = INTENSITY_LABEL[intensity]

  useEffect(() => {
    loadIndex()
      .then(setIndex)
      .catch((e) => setErr((e as Error).message))
  }, [])

  // 跨标签页同步:其他页面保存后本页计划/打卡即时刷新
  const dv = useDataVersion()
  useEffect(() => {
    setData(loadData())
  }, [dv])

  const plan = data.plan
  const today = todayStr()
  const dayIdx = plan ? dayIndexOf(plan, today) : -1

  const inRangeUnits =
    index?.stages.filter((s) => s.id >= startStage && s.id <= endStage).reduce((a, s) => a + s.units.length, 0) ?? 0

  const generate = async () => {
    setGenerating(true)
    setErr('')
    try {
      setPlan(await generatePlan({ totalDays, startStage, endStage, startDate, intensity }))
      setData(loadData())
    } catch (e) {
      setErr((e as Error).message)
    }
    setGenerating(false)
  }

  const totalTasks = plan?.tasks.length ?? 0
  const doneTasks = plan
    ? plan.tasks.filter((t) => isPlanTaskDone(addDays(plan.startDate, t.day - 1), t.id)).length
    : 0

  if (err && !index) {
    return (
      <section className="card">
        <h2>⚠️ 内容目录加载失败</h2>
        <p className="hint">{err}</p>
        <button className="btn ghost" onClick={() => location.reload()}>
          🔄 重新加载
        </button>
      </section>
    )
  }
  if (!index) return <section className="card"><div className="hint">加载课程目录中…</div></section>

  return (
    <div>
      <section className="card">
        <div className="card-head">
          <h2>📅 学习计划生成器</h2>
          <span className="tag">自选天数 · 自选起止程度 · 自动排程</span>
        </div>
        <p className="hint">
          按所选阶段的课程单元,自动穿插 NCE / CET-6 泛读、考研真题(目标 ≥ S4 时)与每周复盘。计划与打卡存本机,首页显示今日任务。
        </p>
        <div className="form-row">
          <label>
            计划天数({MIN_DAYS}-{MAX_DAYS})
            <input
              type="number"
              min={MIN_DAYS}
              max={MAX_DAYS}
              value={totalDays}
              onChange={(e) => setTotalDays(Math.max(MIN_DAYS, Math.min(MAX_DAYS, Number(e.target.value) || 100)))}
            />
          </label>
          <label>
            从什么程度
            <select
              value={startStage}
              onChange={(e) => {
                const v = Number(e.target.value) as StageId
                setStartStage(v)
                if (endStage < v) setEndStage(v)
              }}
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <option key={s} value={s}>
                  S{s} · {STAGE_NAMES[s as StageId]}
                </option>
              ))}
            </select>
          </label>
          <label>
            学到什么程度
            <select value={endStage} onChange={(e) => setEndStage(Number(e.target.value) as StageId)}>
              {[1, 2, 3, 4, 5].map((s) => (
                <option key={s} value={s} disabled={s < startStage}>
                  S{s} · {STAGE_NAMES[s as StageId]}
                </option>
              ))}
            </select>
          </label>
          <label>
            开始日期
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value || todayStr())} />
          </label>
          <label>
            强度
            <select value={intensity} onChange={(e) => setIntensity(e.target.value as PlanIntensity)}>
              <option value="light">轻松</option>
              <option value="normal">正常</option>
              <option value="intense">强化</option>
            </select>
          </label>
          <button className="btn" onClick={generate} disabled={generating}>
            {generating ? '生成中…' : plan ? '🔄 按新配置重新生成' : '🎯 生成计划'}
          </button>
        </div>
        <p className="hint">
          所选范围 S{startStage}–S{endStage}:<b>{inRangeUnits}</b> 个单元 = <b>{inRangeUnits * 6}</b> 小节;按强度与天数,计划每天约排 {Math.max(2, Math.min(18, Math.ceil((inRangeUnits * 6) / totalDays)))} 小节。练习难度跟当天解锁阶段走,入门不会立刻刷考研题。
        </p>
        {err && <div className="feedback no">❌ {err.slice(0, 150)}</div>}
      </section>

      {!plan ? (
        <section className="card">
          <h2>还没有计划</h2>
          <p className="hint">选择天数与起止程度后点击「🎯 生成计划」。默认 100 天 S1→S5 覆盖全部 48 个单元。</p>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="card-head">
              <div>
                <h2>📋 当前计划:S{plan.startStage} → S{plan.endStage}</h2>
                <span className="tag">
                  {plan.version === 2
                    ? `${plan.totalDays} 天 · ${plan.unitIds.length} 单元 · 起 ${plan.startDate} · 强度 ${intensityLabel}${plan.dailySections ? ` · ${plan.dailySections} 小节/天` : ''}`
                    : `${plan.totalDays} 天 · ${plan.unitIds.length} 个单元 · ${plan.startDate} 起`}
                </span>
              </div>
              <button
                className="btn ghost"
                onClick={() => {
                  if (confirm('确定重置计划?打卡记录将一并清空。')) {
                    resetPlan()
                    setData(loadData())
                  }
                }}
              >
                🗑 重置计划
              </button>
            </div>
            <p className="hint">
              {dayIdx < 1
                ? `⏳ 计划将于 ${plan.startDate} 开始`
                : dayIdx > plan.totalDays
                  ? '🎉 计划已结束!可以调整目标阶段生成新计划。'
                  : `▶ 今天是 Day ${dayIdx}/${plan.totalDays}`}
            </p>
            <div className="plan-progress">
              <span className="dim">任务打卡</span>
              <ProgressBar value={totalTasks ? (doneTasks / totalTasks) * 100 : 0} />
              <span className="dim">
                {doneTasks}/{totalTasks} 任务
              </span>
            </div>
            {isV1Plan(plan) && (
              <p className="hint">⏳ 这是旧版整单元日程,点击「重新生成」可升级为按小节+按基础排难度的新版计划(打卡会清空)。</p>
            )}
            {!isV1Plan(plan) && plan.version === 2 && (
              <div style={{ marginTop: 8 }}>
                <button
                  className="btn ghost small"
                  onClick={() => {
                    const today = todayStr()
                    const idx = dayIndexOf(plan, today)
                    if (idx < 1) {
                      alert('计划尚未开始,无需重排。')
                      return
                    }
                    // 近 7 日打卡完成率(已过去 7 天范围内)
                    let planned = 0
                    let doneN = 0
                    for (let d = Math.max(1, idx - 6); d <= idx; d++) {
                      const ds = addDays(plan.startDate, d - 1)
                      const ts = tasksOfDay(plan, d)
                      planned += ts.length
                      doneN += ts.filter((t) => isPlanTaskDone(ds, t.id)).length
                    }
                    const rate = planned === 0 ? 1 : doneN / planned
                    // 近期单元 exam 均分(已完成 step=exam 的单元)
                    const prog = loadData().progress
                    let sumPct: number[] = []
                    for (const uId of plan.unitIds) {
                      const p = prog[uId]
                      if (p?.exam?.done && typeof p.exam.score === 'number' && typeof p.exam.total === 'number' && p.exam.total > 0) {
                        sumPct.push((p.exam.score / p.exam.total) * 100)
                      }
                    }
                    const avg = sumPct.length === 0 ? null : sumPct.reduce((a, b) => a + b, 0) / sumPct.length
                    const due = Object.values(loadData().wordStates).filter((w) => w.status !== 'mastered' && w.next <= Date.now()).length
                    const next = adjustRemainingPlan({ plan, today, recentCompletionRate: rate, recentExamAvg: avg, dueWords: due })
                    if (next === plan) {
                      alert('当前学习状态良好(完成率≥50% 且 考试均分≥60%),无需重排。')
                    } else {
                      setPlan(next)
                      setData(loadData())
                      const added = next.tasks.length - plan.tasks.length
                      alert(`已按近况重排剩余天数:新增 ${added} 条词汇减负复习。已过去任务与打卡未改动。`)
                    }
                  }}
                >
                  🧭 按近况重排剩余天数
                </button>
                <span className="dim" style={{ marginLeft: 8, fontSize: 12 }}>
                  根据近 7 日打卡完成率、单元考试均分与到期词汇,在剩余的纯泛读日插入词汇减负复习;已过去任务与打卡不动。
                </span>
              </div>
            )}
          </section>

          <section className="card">
            <h3 className="plan-list-title">日程(点击任务可跳转,勾选即打卡)</h3>
            {Array.from({ length: plan.totalDays }, (_, i) => i + 1).map((day) => {
              const dateStr = addDays(plan.startDate, day - 1)
              const tasks = tasksOfDay(plan, day)
              const doneCount = tasks.filter((t) => isPlanTaskDone(dateStr, t.id)).length
              const allDone = tasks.length > 0 && doneCount === tasks.length
              return (
                <div
                  key={day}
                  className={'plan-day' + (dateStr === today ? ' today' : '') + (allDone ? ' all-done' : '')}
                >
                  <div className="plan-day-head">
                    <b>Day {day}</b>
                    <span className="dim">
                      {dateStr}
                      {dateStr === today ? ' · 今天' : ''}
                    </span>
                    <span className="dim">
                      {doneCount}/{tasks.length}
                    </span>
                  </div>
                  {tasks.map((t) => {
                    const done = isPlanTaskDone(dateStr, t.id)
                    return (
                      <label key={t.id} className="plan-task">
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => {
                            togglePlanCheckin(dateStr, t.id)
                            setData(loadData())
                          }}
                        />
                        <span className={done ? 'plan-task-title strike' : 'plan-task-title'}>
                          {t.link ? <Link to={t.link}>{t.title}</Link> : t.title}
                        </span>
                        {t.detail && <span className="dim plan-task-detail">{t.detail}</span>}
                      </label>
                    )
                  })}
                </div>
              )
            })}
          </section>
        </>
      )}
    </div>
  )
}
