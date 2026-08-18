import { useState } from 'react'
import type { CoachDrill } from '../lib/types'

/** 教练专项操练面板:选择/填空即时判分,仿写/回译显示参考回答 */
export default function CoachDrills({ drills }: { drills: CoachDrill[] }) {
  if (!drills.length) {
    return (
      <div className="hint">暂无操练题。可以再来一轮对话,教练会重新诊断并出题。</div>
    )
  }
  return (
    <div className="coach-drills">
      <h4>🎯 专项操练({drills.length} 题)</h4>
      {drills.map((d, i) => (
        <Drill key={i} d={d} />
      ))}
    </div>
  )
}

function Drill({ d }: { d: CoachDrill }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const isChoice = (d.kind === 'blank' || d.kind === 'judge') && !!d.options?.length
  const label =
    d.kind === 'blank' ? '✏️ 填空' : d.kind === 'judge' ? '⚖️ 判断' : d.kind === 'rewrite' ? '✍️ 仿写' : '🔄 回译'

  return (
    <div className="exercise">
      <div className="exercise-head">
        <span className="tag">{label}</span>
        <span className="dim">{d.point}</span>
      </div>
      <div className="exercise-prompt">{d.prompt}</div>
      {isChoice ? (
        <div className="quiz-opts">
          {d.options!.map((o, oi) => {
            let cls = 'quiz-opt'
            if (picked != null) {
              if (o === d.answer) cls += ' right'
              else if (o === picked) cls += ' bad'
              else cls += ' dim'
            }
            return (
              <button key={oi} className={cls} disabled={picked != null} onClick={() => setPicked(o)}>
                {String.fromCharCode(65 + oi)}. {o}
              </button>
            )
          })}
        </div>
      ) : (
        <button className="btn small ghost" onClick={() => setRevealed((r) => !r)}>
          {revealed ? '收起参考回答' : '显示参考回答'}
        </button>
      )}
      {picked != null && <div className="quiz-note">💡 {d.note}</div>}
      {revealed && (
        <div className="exercise-answer">
          💬 {d.answer}
          <div className="dim">💡 {d.note}</div>
        </div>
      )}
    </div>
  )
}
