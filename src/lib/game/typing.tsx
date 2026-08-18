// 模式 2:打字操练 —— 看词打字,Enter 检查
import { useEffect, useState } from 'react'
import { speak } from '../speech'
import { sampleGameWords } from './words'
import { applyWordResults, finishGame } from './score'
import type { GameWord } from './gen'
import { AiExplain, ResultCard } from './ui'

const ROUNDS = 10

export default function Typing({ onExit }: { onExit: () => void }) {
  const [words, setWords] = useState<GameWord[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [checked, setChecked] = useState(false)
  const [right, setRight] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    sampleGameWords(ROUNDS).then((ws) => {
      if (alive) setWords(ws)
    })
    return () => {
      alive = false
    }
  }, [])

  const word = words?.[idx] ?? null
  const ok = word ? input.trim().toLowerCase() === word.word.toLowerCase() : false

  const check = () => {
    if (!word || checked || !input.trim()) return
    setChecked(true)
    if (ok) {
      setRight((r) => r + 1)
      applyWordResults([word.word], [])
    } else {
      applyWordResults([], [word.word])
    }
  }

  const next = () => {
    if (words && idx + 1 >= words.length) {
      finishGame('typing', right, words.length)
      setDone(true)
      return
    }
    setIdx((i) => i + 1)
    setInput('')
    setChecked(false)
  }

  const restart = () => {
    sampleGameWords(ROUNDS).then(setWords)
    setIdx(0)
    setInput('')
    setChecked(false)
    setRight(0)
    setDone(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return
      if (e.key === 'Enter') {
        e.preventDefault()
        checked ? next() : check()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (done) {
    return (
      <ResultCard
        title={right === ROUNDS ? '🌟 打字全对!' : '打字操练完成'}
        correct={right}
        total={words?.length ?? ROUNDS}
        onRestart={restart}
        onExit={onExit}
      >
        <p className="hint">打对的词按 SM-2 记一次 good;打错的词进入今日错词重排队。</p>
      </ResultCard>
    )
  }

  if (!words) return <section className="card"><div className="hint">准备单词中…</div></section>

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>⌨️ 打字操练</h2>
          <span className="tag">
            第 {idx + 1} / {words.length} 词
          </span>
        </div>
        <button className="btn ghost" onClick={() => word && speak(word.word)}>
          🔊
        </button>
      </div>
      {word && (
        <>
          <div className="review-card">
            <div className="review-word">{word.word}</div>
            <div className="popup-cn">{word.cn}</div>
            <input
              autoFocus
              className="game-input"
              value={input}
              disabled={checked}
              placeholder="照着打出上面的单词…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  checked ? next() : check()
                }
              }}
            />
            {checked && (
              <div className={'feedback ' + (ok ? 'ok' : 'no')}>
                {ok ? '✅ 正确!' : `❌ 正确拼写: ${word.word}`}
              </div>
            )}
          </div>
          {checked && <AiExplain cacheKey={`game:typing:${word.word}`} topic="单词拼写" question={word.word} answer={word.cn} />}
          <div className="row-btns">
            {!checked ? (
              <button className="btn" onClick={check} disabled={!input.trim()}>
                ✅ 检查(Enter)
              </button>
            ) : (
              <button className="btn" onClick={next}>
                {idx + 1 >= words.length ? '🏁 结算' : '下一词 →'}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
