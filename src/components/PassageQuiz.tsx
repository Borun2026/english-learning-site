import { useState } from 'react'
import type { ReadingQuestion } from '../lib/types'

/** 语篇阅读做题面板(复用 ExamView 判分交互:CET-6 语篇 P2-7) */
export default function PassageQuiz({ questions }: { questions: ReadingQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const total = questions.length
  const answered = Object.keys(answers).length
  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0)

  const reset = () => {
    setAnswers({})
    setSubmitted(false)
  }

  return (
    <div className="passage-quiz">
      <div className="card-head">
        <h4>📝 阅读理解({total} 题)</h4>
        <span className="tag">
          已答 {answered}/{total}
          {submitted ? ` · 得分 ${score}/${total}` : ''}
        </span>
      </div>
      {questions.map((q, qi) => (
        <div key={qi} className="zq">
          <div className="zq-q">
            {qi + 1}. {q.q}
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
                <button
                  key={oi}
                  className={cls}
                  disabled={submitted}
                  onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                >
                  {String.fromCharCode(65 + oi)}. {o}
                </button>
              )
            })}
          </div>
          {submitted && <div className="zq-analysis">📖 {q.analysis}</div>}
        </div>
      ))}
      <div className="row-btns">
        {!submitted ? (
          <button className="btn" disabled={answered < total} onClick={() => setSubmitted(true)}>
            交卷({answered}/{total})
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
  )
}
