import { useState } from 'react'
import type { ExamSet } from '../lib/types'
import { addWrongWords } from '../lib/vocab'

export default function ExamView({
  exam,
  onComplete,
  onReview,
  onOpenTree,
}: {
  exam: ExamSet
  onComplete: (score: number, total: number) => void
  onReview: (point: string) => void
  onOpenTree: (point: string) => void
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [reported, setReported] = useState(false)
  const [expandedQ, setExpandedQ] = useState<Record<number, boolean>>({})

  const total = exam.questions.length
  const answeredCount = Object.keys(answers).length
  const score = exam.questions.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0)

  const pick = (qi: number, oi: number) => {
    if (submitted) return
    setAnswers((a) => ({ ...a, [qi]: oi }))
  }

  const submit = () => {
    // P5-2 入池钩子:答错的题,题干与正确答案里的内容词自动进错词重排队
    exam.questions.forEach((q, qi) => {
      if (answers[qi] !== q.answer) {
        addWrongWords(`${q.q} ${q.options[q.answer] ?? ''}`, 'exam-wrong')
      }
    })
    setSubmitted(true)
    if (!reported) {
      setReported(true)
      onComplete(score, total)
    }
  }

  const reset = () => {
    setAnswers({})
    setSubmitted(false)
    setReported(false)
  }

  return (
    <div>
      <div className="card-head">
        <div>
          <h2>📝 {exam.title}</h2>
          <span className="tag">单元真题 · {total} 题</span>
        </div>
      </div>

      {exam.hint && <p className="hint">{exam.hint}</p>}

      <div className="goal-banner">
        <b>答题卡</b>
        <span className="dim">
          {' '}
          · 已答 {answeredCount}/{total} {submitted ? `· 得分 ${score}/${total}` : ''}
        </span>
      </div>

      <div className="zhenti-questions">
        {exam.questions.map((q, qi) => (
          <div key={qi} className="zq">
            <div className="zq-q">
              {qi + 1}.{' '}
              {q.q.length > 240 ? (
                <>
                  {expandedQ[qi] ? (
                    <div className="zq-passage">{q.q}</div>
                  ) : (
                    <span>{q.q.slice(0, 240)}…</span>
                  )}
                  <button
                    className="btn small ghost"
                    style={{ marginLeft: 6 }}
                    onClick={() => setExpandedQ((m) => ({ ...m, [qi]: !m[qi] }))}
                  >
                    {expandedQ[qi] ? '收起原文' : '展开原文'}
                  </button>
                </>
              ) : (
                q.q
              )}
              {q.source && <span className="dim"> · {q.source}</span>}
            </div>
            <div className="zq-opts">
              {q.options.map((o, oi) => {
                let cls = 'zq-opt'
                if (submitted) {
                  if (oi === q.answer) cls += ' right'
                  else if (oi === answers[qi]) cls += ' wrong'
                  else cls += ' dim'
                } else if (answers[qi] === oi) cls += ' chosen'
                return (
                  <button key={oi} className={cls} disabled={submitted} onClick={() => pick(qi, oi)}>
                    {String.fromCharCode(65 + oi)}. {o}
                  </button>
                )
              })}
            </div>
            {submitted && (
              <div className="zq-analysis">
                📖 {q.analysis}
                <div className="row-btns" style={{ justifyContent: 'flex-start', marginTop: 6 }}>
                  <button className="btn small ghost" onClick={() => onReview(q.point)}>
                    ← 回溯语法课
                  </button>
                  <button className="btn small ghost" onClick={() => onOpenTree(q.point)}>
                    🌳 语法树考点
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="row-btns">
          {!submitted ? (
            <button className="btn" disabled={answeredCount < total} onClick={submit}>
              交卷({answeredCount}/{total})
            </button>
          ) : (
            <>
              <span className={'score-badge ' + (score === total ? 'full' : '')}>
                {score === total ? '🌟 满分!' : `得分 ${score}/${total}`}
              </span>
              <button className="btn ghost" onClick={reset}>
                🔄 重做
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
