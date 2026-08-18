import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import { loadIndex } from '../lib/curriculum'
import { pickDailyId } from '../lib/daily'
import { loadMagazineIndex } from '../lib/intensive'
import { dayIndexOf, tasksOfDay, todayStr } from '../lib/plan'
import { isPlanTaskDone, loadData, togglePlanCheckin, useDataVersion } from '../lib/storage'
import { vocabStats } from '../lib/vocab'
import { getStats, xpToNext } from '../lib/stats'
import type { CurriculumIndex, ReadingIndex, StageDef, UnitDef, UnitProgress } from '../lib/types'

export default function Home() {
  const [index, setIndex] = useState<CurriculumIndex | null>(null)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [err, setErr] = useState('')
  const [data, setData] = useState(loadData())
  const [mag, setMag] = useState<ReadingIndex | null>(null)

  // 跨标签页同步:另一页改进度/打卡后本页即时刷新
  const dv = useDataVersion()
  useEffect(() => {
    setData(loadData())
  }, [dv])

  useEffect(() => {
    loadIndex()
      .then(setIndex)
      .catch((e) => setErr((e as Error).message))
    loadMagazineIndex().then(setMag).catch(() => setMag(null))
  }, [])

  if (err) return <section className="card"><h2>⚠️ {err}</h2></section>
  if (!index) return <section className="card"><div className="hint">加载目录中…</div></section>

  const isUnitDone = (p: UnitProgress | undefined) =>
    !!p && p.vocab && !!p.grammar?.done && p.article && !!p.dialogue?.done && !!p.listen?.done && !!p.exam?.done

  const progress = data.progress
  const doneUnits = Object.values(progress).filter(isUnitDone).length
  const totalUnits = index.stages.reduce((a, s) => a + s.units.length, 0)

  const firstIncomplete = (() => {
    for (const st of index.stages) {
      for (const u of st.units) {
        if (!isUnitDone(progress[u.id])) return u
      }
    }
    return null
  })()

  const aiReady = !!data.aiConfig.apiKey
  const vs = vocabStats()
  const st = getStats()
  const bar = xpToNext(st.xp)
  const dailyId = mag ? pickDailyId(mag.items.map((it) => it.id)) : null
  const dailyItem = dailyId ? mag?.items.find((it) => it.id === dailyId) : undefined

  return (
    <div>
      <section className="card home-hero">
        <div className="hero-stats">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>📊</span>
              <h2 style={{ fontSize: 24, margin: 0 }}>今日仪表盘</h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 8 }}>
              <span className="tag" style={{ fontSize: 13, padding: '4px 12px' }}>
                单元 <b>{doneUnits}</b>/{totalUnits}
              </span>
              <span className="tag" style={{ fontSize: 13, padding: '4px 12px', background: 'var(--game-orange-light)', color: 'var(--game-orange)', borderColor: 'rgba(255,122,24,0.2)' }}>
                待复习 <b>{vs.dueToday}</b> 词
              </span>
              <span className="tag" style={{ fontSize: 13, padding: '4px 12px', background: 'var(--game-yellow-light)', color: '#b45309', borderColor: 'rgba(245,158,11,0.2)' }}>
                🔥 连击 <b>{st.streak}</b> 天
              </span>
              <span className="tag" style={{ fontSize: 13, padding: '4px 12px', background: 'var(--game-purple-light)', color: 'var(--game-purple)', borderColor: 'rgba(139,92,246,0.2)' }}>
                👑 Lv.{st.level} ({bar.have}/{bar.need} XP)
              </span>
            </div>
          </div>
          <div className="hero-actions" style={{ marginTop: 14 }}>
            {firstIncomplete ? (
              <Link className="btn big" to={`/unit/${firstIncomplete.id}`} style={{ boxShadow: '0 4px 12px var(--primary-glow)' }}>
                ▶ 继续学习: {firstIncomplete.title}
              </Link>
            ) : (
              <span className="tag" style={{ fontSize: 15, padding: '8px 16px' }}>🎉 全部单元已完成!</span>
            )}
            <Link className={'btn ghost' + (aiReady ? '' : ' warn')} to="/settings">
              ⚙️ {aiReady ? 'AI 已配置' : '配置 AI (可选)'}
            </Link>
            <Link className="btn ghost" to="/vocab-games">
              🎮 词汇游戏
            </Link>
            <Link className="btn ghost" to="/wordbook">
              📒 词汇中心 ({vs.total} 词)
            </Link>
            <Link className="btn ghost" to="/ai-parse">
              🔍 解析文章
            </Link>
            <Link className="btn ghost" to="/placement">
              🎯 分级测评
            </Link>
            <Link className="btn ghost" to="/achievements">
              🏆 成就墙
            </Link>
            {aiReady && (
              <Link className="btn ghost" to="/practice">
                🧪 AI 练习
              </Link>
            )}
          </div>
        </div>
      </section>

      {dailyItem && (
        <section className="card daily-home">
          <div className="card-head">
            <h2>📅 今日一篇</h2>
            <Link className="btn ghost small" to={`/library?tab=magazine&id=${dailyItem.id}`}>
              去读 →
            </Link>
          </div>
          <p>
            <b>{dailyItem.title}</b>
            <span className="dim">
              {' '}
              · {dailyItem.journal ?? '外刊'} {dailyItem.wordCount ? `· ${dailyItem.wordCount} 词` : ''}
            </span>
          </p>
          <p className="hint">按日期固定一篇外刊,同一天全站一致;打开即精读,可收藏/标已读。</p>
        </section>
      )}

      <TodayPlanCard
        onToggle={() => setData(loadData())}
      />

      {index.stages.map((st) => (
        <StageCard
          key={st.id}
          stage={st}
          expanded={!!expanded[st.id]}
          onToggle={() => setExpanded((e) => ({ ...e, [st.id]: !e[st.id] }))}
        />
      ))}
    </div>
  )
}

function unitDone(u: UnitDef): number {
  const p = loadData().progress[u.id]
  if (!p) return 0
  const steps = [p.vocab, !!p.grammar?.done, p.article, !!p.dialogue?.done, !!p.listen?.done, !!p.exam?.done]
  return steps.filter(Boolean).length
}

/** 首页「今日任务」卡片:计划存在时按日期取当日任务,支持直接打卡 */
function TodayPlanCard({ onToggle }: { onToggle: () => void }) {
  const plan = loadData().plan
  if (!plan) return null
  const today = todayStr()
  const day = dayIndexOf(plan, today)
  const done = (dateStr: string, id: string) => isPlanTaskDone(dateStr, id)

  return (
    <section className="card today-plan">
      <div className="card-head">
        <h2>📅 今日任务</h2>
        <Link className="btn ghost small" to="/plan">
          查看完整计划 →
        </Link>
      </div>
      {day < 1 && (
        <p className="hint">
          ⏳ 计划 {plan.totalDays} 天(S{plan.startStage}→S{plan.endStage})将于 <b>{plan.startDate}</b> 开始。
        </p>
      )}
      {day > plan.totalDays && (
        <p className="hint">
          🎉 本次 {plan.totalDays} 天计划已结束!可以到
          <Link to="/plan"> 计划页 </Link>调整目标阶段生成新计划。
        </p>
      )}
      {day >= 1 && day <= plan.totalDays && (
        <>
          <p className="hint">
            Day {day}/{plan.totalDays} · {today}
            {plan.version === 2 && tasksOfDay(plan, day).length > 1 && ` · ${tasksOfDay(plan, day).length} 小节`}
          </p>
          {tasksOfDay(plan, day).map((t) => {
            const d = done(today, t.id)
            return (
              <label key={t.id} className="plan-task">
                <input
                  type="checkbox"
                  checked={d}
                  onChange={() => {
                    togglePlanCheckin(today, t.id)
                    onToggle()
                  }}
                />
                <span className={d ? 'plan-task-title strike' : 'plan-task-title'}>
                  {t.link ? <Link to={t.link}>{t.title}</Link> : t.title}
                </span>
                {t.detail && <span className="dim plan-task-detail">{t.detail}</span>}
              </label>
            )
          })}
          {tasksOfDay(plan, day).length === 0 && <p className="hint">🌤 今天没有排任务,自由复习或休息一下。</p>}
        </>
      )}
    </section>
  )
}

function StageCard({ stage, expanded, onToggle }: { stage: StageDef; expanded: boolean; onToggle: () => void }) {
  const done = stage.units.reduce((a, u) => a + (unitDone(u) === 6 ? 1 : 0), 0)
  const pct = (done / stage.units.length) * 100
  return (
    <section className="card stage-card">
      <div
        className="stage-head"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <div>
          <h2>
            阶段 {stage.id} · {stage.name}
          </h2>
          <span className="tag">{stage.desc}</span>
        </div>
        <div className="stage-right">
          <span className="dim">
            {done}/{stage.units.length}
          </span>
          <span className="stage-arrow">{expanded ? '▾' : '▸'}</span>
        </div>
      </div>
      <ProgressBar value={pct} />
      {expanded && (
        <div className="unit-list">
          {stage.units.map((u) => {
            const d = unitDone(u)
            return (
              <Link key={u.id} to={`/unit/${u.id}`} className="unit-row">
                <span className={'udot' + (d === 6 ? ' full' : d > 0 ? ' part' : '')}>{d}/6</span>
                <span className="u-title">{u.title}</span>
                <span className="u-grammar dim">语法:{u.grammarTopic}</span>
                <span className="u-scene dim">场景:{u.scene}</span>
                <span className="u-go">{d === 6 ? '✅' : '▶'}</span>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
