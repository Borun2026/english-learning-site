// 模式 6:每日挑战 —— 按日期种子固定 10 题(8 道词义选择 + 2 道拼写)
import { useEffect, useState } from 'react'
import { speak } from '../speech'
import { sampleGameWords } from './words'
import { applyWordResults, finishGame } from './score'
import { buildDailyPlan, dateSeed, mulberry32, type DailyQuestion } from './gen'
import { AiExplain, ResultCard } from './ui'

export default function Daily({ onExit }: { onExit: () => void }) {
  const seed = dateSeed()
  const [plan, setPlan] = useState<DailyQuestion[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [checked, setChecked] = useState(false)
  const [right, setRight] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    sampleGameWords(12, seed).then((ws) => {
      if (alive && ws.length >= 5) setPlan(buildDailyPlan(ws, mulberry32(seed)))
      else if (alive) setPlan([])
    })
    return () => {
      alive = false
    }
  }, [seed])

  const q = plan?.[idx] ?? null

  const answer = (val: string | null) => {
    if (!q || checked) return
    const ok = val !== null && val.trim().toLowerCase() === q.word.toLowerCase()
    setChecked(true)
    if (ok) {
      setRight((r) => r + 1)
      applyWordResults([q.word], [])
    } else {
      applyWordResults([], [q.word])
    }
  }

  const next = () => {
    if (plan && idx + 1 >= plan.length) {
      finishGame('daily', right, plan.length)
      setDone(true)
      return
    }
    setIdx((i) => i + 1)
    setInput('')
    setChecked(false)
  }

  const restart = () => {
    setIdx(0)
    setInput('')
    setChecked(false)
    setRight(0)
    setDone(false)
  }

  // 键盘:选择题 1-4,拼写题 Enter;结算后 Enter 下一题
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !q) return
      if (e.key === 'Enter') {
        e.preventDefault()
        if (q.kind === 'spell') {
          checked ? next() : answer(input)
        } else if (checked) {
          next()
        }
        return
      }
      if (checked) return
      if (q.kind === 'choice') {
        const n = Number(e.key)
        if (n >= 1 && n <= 4 && q.options?.[n - 1]) answer(q.options[n - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (done) {
    return (
      <ResultCard
        title={right === (plan?.length ?? 0) ? '🌟 每日挑战满分!' : '每日挑战完成'}
        correct={right}
        total={plan?.length ?? 10}
        onRestart={restart}
        onExit={onExit}
      >
        <p className="hint">同一日期题目固定,可反复挑战刷新最佳成绩;对词记 good,错词进今日错词重排队。</p>
      </ResultCard>
    )
  }

  if (!plan) return <section className="card"><div className="hint">准备今日挑战…</div></section>
  if (!q) return <section className="card"><div className="feedback no">今日题库不足(先到词汇中心积累单词)。</div></section>

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>📅 每日挑战</h2>
          <span className="tag">
            {new Date().toLocaleDateString()} · 第 {idx + 1} / {plan.length} 题
          </span>
        </div>
        <button className="btn ghost" onClick={() => speak(q.word)}>
          🔊
        </button>
      </div>
      {q.kind === 'choice' ? (
        <>
          <div className="review-card">
            <div className="review-word">{q.word}</div>
            <p className="hint">选择正确的中文释义(按 1-4):</p>
            <div className="options">
              {q.options?.map((o, i) => {
                let cls = 'option'
                if (checked) {
                  if (o === q.cn) cls += ' correct'
                  else if (o === input) cls += ' wrong'
                  else cls += ' dim'
                }
                return (
                  <button
                    key={i}
                    className={cls}
                    disabled={checked}
                    onClick={() => {
                      setInput(o)
                      answer(o)
                    }}
                  >
                    {String.fromCharCode(65 + i)}. {o}
                  </button>
                )
              })}
            </div>
            {checked && (
              <div className={'feedback ' + (input === q.cn ? 'ok' : 'no')}>
                {input === q.cn ? '✅ 正确!' : `❌ 正确释义: ${q.cn}`}
              </div>
            )}
          </div>
          {checked && <AiExplain cacheKey={`game:daily:${seed}:${q.word}`} topic="词义辨析" question={q.word} answer={q.cn} />}
        </>
      ) : (
        <>
          <div className="review-card">
            <div className="popup-cn" style={{ fontSize: 18 }}>
              {q.cn}
            </div>
            <input
              autoFocus
              className="game-input"
              value={input}
              disabled={checked}
              placeholder="拼写这个单词…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  checked ? next() : answer(input)
                }
              }}
            />
            {checked && (
              <div className={'feedback ' + (input.trim().toLowerCase() === q.word.toLowerCase() ? 'ok' : 'no')}>
                {input.trim().toLowerCase() === q.word.toLowerCase() ? '✅ 正确!' : `❌ 正确拼写: ${q.word}`}
              </div>
            )}
          </div>
          {checked && <AiExplain cacheKey={`game:daily:${seed}:${q.word}`} topic="单词拼写" question={q.word} answer={q.cn} />}
        </>
      )}
      <div className="row-btns">
        {checked ? (
          <button className="btn" onClick={next}>
            {idx + 1 >= plan.length ? '🏁 结算' : '下一题 →'}
          </button>
        ) : (
          q.kind === 'spell' && (
            <button className="btn" onClick={() => answer(input)} disabled={!input.trim()}>
              ✅ 检查(Enter)
            </button>
          )
        )}
      </div>
    </section>
  )
}
