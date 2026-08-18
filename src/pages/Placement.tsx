import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadIndex } from '../lib/curriculum'
import { generatePlan } from '../lib/plan'
import { setPlan } from '../lib/storage'
import type { PlanIntensity, StageId } from '../lib/types'

interface PlaceQ {
  q: string
  options: string[]
  answer: number
  stage: StageId
}

const BANK: PlaceQ[] = [
  { q: 'I ___ a student.', options: ['am', 'is', 'are', 'be'], answer: 0, stage: 1 },
  { q: 'She ___ to school every day.', options: ['go', 'goes', 'going', 'gone'], answer: 1, stage: 1 },
  { q: 'There are two ___ on the table.', options: ['book', 'books', 'bookes', 'booking'], answer: 1, stage: 1 },
  { q: 'They ___ football yesterday.', options: ['play', 'plays', 'played', 'playing'], answer: 2, stage: 1 },
  { q: 'I have ___ this movie before.', options: ['see', 'saw', 'seen', 'seeing'], answer: 2, stage: 2 },
  { q: 'The letter ___ yesterday.', options: ['send', 'sent', 'was sent', 'sending'], answer: 2, stage: 2 },
  { q: 'He is the student ___ won the prize.', options: ['which', 'who', 'whose', 'whom'], answer: 1, stage: 2 },
  { q: 'This book is ___ than that one.', options: ['interesting', 'more interesting', 'most interesting', 'interestinger'], answer: 1, stage: 2 },
  { q: 'If I ___ you, I would accept.', options: ['am', 'was', 'were', 'be'], answer: 2, stage: 3 },
  { q: 'Not only did he come, ___ he also brought gifts.', options: ['and', 'but', 'so', 'or'], answer: 1, stage: 3 },
  { q: 'It was in 2010 ___ they first met.', options: ['when', 'that', 'which', 'where'], answer: 1, stage: 3 },
  { q: '___ finished the work, she left.', options: ['Have', 'Having', 'Had', 'Has'], answer: 1, stage: 3 },
  { q: 'The committee ___ the proposal, arguing that it lacked evidence.', options: ['endorsed', 'endorses', 'endorsing', 'to endorse'], answer: 0, stage: 4 },
  { q: 'Hardly had he arrived ___ the meeting began.', options: ['than', 'when', 'then', 'that'], answer: 1, stage: 4 },
  { q: 'The findings are ___ with previous studies.', options: ['consistent', 'consistence', 'consist', 'consisting'], answer: 0, stage: 4 },
  { q: 'Far from ___ a solution, the plan created new problems.', options: ['provide', 'provided', 'providing', 'to provide'], answer: 2, stage: 4 },
  { q: 'The graph ___ a steady increase over the decade.', options: ['illustrates', 'illustration', 'illustrated by', 'illustrating'], answer: 0, stage: 5 },
  { q: 'It is widely ___ that climate change requires urgent action.', options: ['acknowledge', 'acknowledged', 'acknowledging', 'acknowledges'], answer: 1, stage: 5 },
  { q: 'The author puts forward a ___ argument against the policy.', options: ['compel', 'compelled', 'compelling', 'compulsion'], answer: 2, stage: 5 },
  { q: 'While some people prefer cities, others ___ rural life.', options: ['advocate', 'advocates', 'advocating', 'advocacy'], answer: 0, stage: 5 },
]

const STAGE_CEFR: Record<StageId, string> = { 1: 'A1', 2: 'A2-B1', 3: 'B1-B2', 4: 'B2-C1', 5: 'C1' }

export default function Placement() {
  const nav = useNavigate()
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)
  const [goalStage, setGoalStage] = useState<StageId>(5)
  const [planDays, setPlanDays] = useState(100)
  const [intensity, setIntensity] = useState<PlanIntensity>('normal')

  useEffect(() => {
    loadIndex().catch(() => {})
  }, [])

  const q = BANK[idx]
  const pick = (oi: number) => {
    if (chosen != null) return
    setChosen(oi)
    const ok = oi === q.answer
    const nextCorrect = correct + (ok ? 1 : 0)
    setTimeout(() => {
      if (idx + 1 >= BANK.length) {
        setCorrect(nextCorrect)
        setDone(true)
      } else {
        setCorrect(nextCorrect)
        setIdx(idx + 1)
        setChosen(null)
      }
    }, 450)
  }

  const suggested: StageId = correct <= 5 ? 1 : correct <= 9 ? 2 : correct <= 13 ? 3 : correct <= 17 ? 4 : 5

  const applyPlan = () => {
    void generatePlan({
      totalDays: planDays,
      startStage: suggested,
      endStage: goalStage,
      startDate: new Date().toISOString().slice(0, 10),
      intensity,
      abilityStage: suggested,
    }).then((plan) => {
      setPlan(plan)
      nav('/plan')
    })
  }

  if (done) {
    return (
      <section className="card">
        <div className="card-head">
          <h2>🎯 分级测评结果</h2>
          <span className="tag">{correct} / {BANK.length}</span>
        </div>
        <div className="dlg-result win">
          <h3>建议起点: S{suggested} · CEFR {STAGE_CEFR[suggested]}</h3>
          <p className="hint">按答对题数映射阶段。练习难度只会随已解锁阶段上升,入门不会立刻刷考研题。</p>
          <div className="form-row" style={{ marginTop: 12, marginBottom: 12 }}>
            <label>
              目标阶段
              <select value={goalStage} onChange={(e) => setGoalStage(Number(e.target.value) as StageId)}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <option key={s} value={s} disabled={s < suggested}>
                    S{s} · {STAGE_CEFR[s as StageId]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              计划天数(7-365)
              <input
                type="number"
                min={7}
                max={365}
                value={planDays}
                onChange={(e) => setPlanDays(Math.max(7, Math.min(365, Number(e.target.value) || 100)))}
              />
            </label>
            <label>
              强度
              <select value={intensity} onChange={(e) => setIntensity(e.target.value as PlanIntensity)}>
                <option value="light">轻松(3 小节/天)</option>
                <option value="normal">正常(6 小节/天)</option>
                <option value="intense">强化(9 小节/天)</option>
              </select>
            </label>
          </div>
          <div className="row-btns">
            <button className="btn" onClick={applyPlan}>
              带入学习计划
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                setIdx(0)
                setChosen(null)
                setCorrect(0)
                setDone(false)
              }}
            >
              重测
            </button>
            <Link className="btn ghost" to="/">
              回首页
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>🎯 分级测评</h2>
        <span className="tag">{idx + 1} / {BANK.length}</span>
      </div>
      <p className="hint">20 道自适应语法题,做完给出 CEFR / 阶段建议,可一键生成学习计划。</p>
      <div className="review-card">
        <p className="exercise-prompt">{q.q}</p>
        <div className="options">
          {q.options.map((o, oi) => (
            <button
              key={oi}
              className={'option' + (chosen == null ? '' : oi === q.answer ? ' right' : oi === chosen ? ' wrong' : ' dim')}
              disabled={chosen != null}
              onClick={() => pick(oi)}
            >
              {String.fromCharCode(65 + oi)}. {o}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
