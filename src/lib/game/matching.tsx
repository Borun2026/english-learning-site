// 模式 3:词义配对 —— 左列单词 ↔ 右列释义,点击或按数字配对 (带果冻脉冲与动效)
import { useEffect, useState } from 'react'
import { sampleGameWords } from './words'
import { applyWordResults, finishGame } from './score'
import { shuffle, type GameWord } from './gen'
import { ResultCard } from './ui'

const PAIRS = 6

export default function Matching({ onExit }: { onExit: () => void }) {
  const [words, setWords] = useState<GameWord[] | null>(null)
  const [rightCol, setRightCol] = useState<GameWord[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<string | null>(null)
  const [misses, setMisses] = useState(0)
  const [done, setDone] = useState(false)
  const [shakeErr, setShakeErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    sampleGameWords(PAIRS).then((ws) => {
      if (!alive) return
      setWords(ws)
      setRightCol(shuffle(ws))
    })
    return () => {
      alive = false
    }
  }, [])

  const restart = () => {
    sampleGameWords(PAIRS).then((ws) => {
      setWords(ws)
      setRightCol(shuffle(ws))
    })
    setMatched(new Set())
    setPending(null)
    setMisses(0)
    setDone(false)
  }

  const pick = (word: string) => {
    if (!pending) {
      setPending(word)
      return
    }
    if (pending === word) {
      setMatched((m) => new Set(m).add(word))
      applyWordResults([word], [])
    } else {
      setMisses((x) => x + 1)
      setShakeErr(word)
      setTimeout(() => setShakeErr(null), 600)
      applyWordResults([], [pending, word])
    }
    setPending(null)
    if (matched.size + 1 >= PAIRS) {
      finishGame('matching', Math.max(0, PAIRS - misses), PAIRS)
      setDone(true)
    }
  }

  // 键盘:先按数字选左列,再按数字选右列(1..6);0 取消
  useEffect(() => {
    if (done || !words) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '0') {
        setPending(null)
        return
      }
      const n = Number(e.key)
      if (n < 1 || n > PAIRS) return
      if (pending) {
        const w = rightCol[n - 1]?.word
        if (w) pick(w)
      } else {
        const w = words[n - 1]?.word
        if (w) setPending(w)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (done) {
    return (
      <ResultCard title={misses === 0 ? '🌟 全部一次配对!' : '词义配对完成'} correct={Math.max(0, PAIRS - misses)} total={PAIRS} onRestart={restart} onExit={onExit}>
        <p className="hint">一次配对的词记 good;配错的词进入今日错词重排队。</p>
      </ResultCard>
    )
  }

  if (!words) return <section className="card"><div className="hint">准备单词中…</div></section>

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>🔗 词义配对</h2>
          <span className="tag">先选左列(1-6)再选右列(1-6) · 0 取消 · 配错 +1 失误</span>
        </div>
        <button className="btn ghost small" onClick={onExit}>
          退出
        </button>
      </div>

      <div className="matching-status-bar">
        <span className="match-progress">
          已配对 <b>{matched.size}</b> / {PAIRS} 组
        </span>
        {misses > 0 && <span className="match-misses">⚠️ 失误 {misses} 次</span>}
      </div>

      <div className="match-grid">
        <div className="match-col">
          <div className="col-header">🔤 英文单词</div>
          {words.map((w, i) => (
            <button
              key={w.word}
              className={
                'match-cell tactile ' +
                (matched.has(w.word) ? 'matched' : pending === w.word ? 'pending' : '')
              }
              disabled={matched.has(w.word)}
              onClick={() => setPending(w.word)}
            >
              <span className="chip-no">{i + 1}</span> {w.word}
            </button>
          ))}
        </div>
        <div className="match-col">
          <div className="col-header">🇨🇳 中文释义</div>
          {rightCol.map((w, i) => (
            <button
              key={w.word}
              className={
                'match-cell tactile ' +
                (matched.has(w.word) ? 'matched' : '') +
                (shakeErr === w.word ? ' shake-error' : '')
              }
              disabled={matched.has(w.word) || !pending}
              onClick={() => pick(w.word)}
            >
              <span className="chip-no">{i + 1}</span> {w.cn}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
