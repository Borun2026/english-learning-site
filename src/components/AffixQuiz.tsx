import { useEffect, useState } from 'react'
import { affixTypeLabel, buildAffixQuiz, type AffixQuestion } from '../lib/affix'

interface Props {
  n?: number
}

export default function AffixQuiz({ n = 8 }: Props) {
  const [qs, setQs] = useState<AffixQuestion[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [seed, setSeed] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    setQs(null)
    setIdx(0)
    setChosen(null)
    setScore(0)
    buildAffixQuiz(n, seed).then((list) => {
      if (alive) setQs(list)
    })
    return () => {
      alive = false
    }
  }, [n, seed])

  if (qs === null) return <div className="hint">词根测验加载中…</div>
  if (qs.length === 0) return <div className="hint">词根库暂不可用,稍后再试。</div>

  const done = idx >= qs.length
  const q = qs[idx]
  const pick = (oi: number) => {
    if (chosen != null || !q) return
    setChosen(oi)
    if (q.options[oi] === q.meaning) setScore((s) => s + 1)
  }
  const next = () => {
    setChosen(null)
    setIdx((i) => i + 1)
  }

  return (
    <div className="affix-quiz">
      <div className="card-head" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>🧬 词根词缀测验</h3>
        <span className="tag">
          {done ? `得分 ${score}/${qs.length}` : `${idx + 1} / ${qs.length}`}
        </span>
      </div>
      {done ? (
        <div className={'dlg-result ' + (score >= qs.length * 0.7 ? 'win' : '')}>
          <h3>{score === qs.length ? '🎉 全对' : `本次 ${score} / ${qs.length}`}</h3>
          <p className="dim">看词缀选含义,错题可再来一轮巩固。</p>
          <button className="btn" onClick={() => setSeed(Date.now())}>
            🔄 再来一轮
          </button>
        </div>
      ) : (
        <>
          <div className="review-card">
            <div className="review-word">
              <span className="tag">{affixTypeLabel(q.type)}</span> {q.affix}
            </div>
            <p className="hint" style={{ margin: 0 }}>
              这个{affixTypeLabel(q.type)}的含义是?
            </p>
            {q.examples.length > 0 && <div className="dim">例: {q.examples.join(' / ')}</div>}
            <div className="options" style={{ width: '100%' }}>
              {q.options.map((opt, oi) => {
                const right = opt === q.meaning
                const cls =
                  chosen == null
                    ? 'option'
                    : right
                      ? 'option right'
                      : oi === chosen
                        ? 'option wrong'
                        : 'option dim'
                return (
                  <button key={oi} className={cls} disabled={chosen != null} onClick={() => pick(oi)}>
                    {String.fromCharCode(65 + oi)}. {opt}
                  </button>
                )
              })}
            </div>
          </div>
          {chosen != null && (
            <div className={'feedback ' + (q.options[chosen] === q.meaning ? 'ok' : 'no')}>
              {q.options[chosen] === q.meaning ? '✅ 正确' : `❌ 正确含义是「${q.meaning}」`}
              <button className="btn small" onClick={next} style={{ marginLeft: 10 }}>
                {idx + 1 >= qs.length ? '看结果' : '下一题'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
