import { useState } from 'react'
import type { GrammarLesson } from '../lib/types'

export default function GrammarQuiz({
  quiz,
  onDone,
}: {
  quiz: GrammarLesson['quiz']
  onDone?: (score: number, total: number) => void
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [finished, setFinished] = useState(false)
  const answeredCount = Object.keys(answers).length
  const score = quiz.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0)

  const pick = (qi: number, oi: number) => {
    if (finished || answers[qi] != null) return
    setAnswers((a) => ({ ...a, [qi]: oi }))
  }

  const submit = () => {
    setFinished(true)
    onDone?.(score, quiz.length)
  }

  return (
    <div className="quiz">
      <h3>小练习</h3>
      {quiz.map((q, qi) => (
        <div key={qi} className="quiz-q">
          <div className="quiz-q-text">
            {qi + 1}. {q.q}
          </div>
          <div className="quiz-opts">
            {q.options.map((o, oi) => {
              let cls = 'quiz-opt'
              const mine = answers[qi]
              if (mine != null) {
                if (oi === q.answer) cls += ' right'
                else if (oi === mine) cls += ' bad'
                else cls += ' dim'
              }
              return (
                <button key={oi} className={cls} onClick={() => pick(qi, oi)}>
                  {String.fromCharCode(65 + oi)}. {o}
                </button>
              )
            })}
          </div>
          {finished && answers[qi] != null && <div className="quiz-note">{q.note}</div>}
        </div>
      ))}
      {!finished && (
        <button className="btn" disabled={answeredCount < quiz.length} onClick={submit}>
          提交答案({answeredCount}/{quiz.length})
        </button>
      )}
      {finished && (
        <div className="quiz-result">
          得分:{score} / {quiz.length}
        </div>
      )}
    </div>
  )
}
