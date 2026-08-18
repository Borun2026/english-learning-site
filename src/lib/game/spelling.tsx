// 模式 4:拼写挑战 —— 看中文 + 听发音,拼出单词
import { useEffect, useState } from 'react'
import { speak } from '../speech'
import { sampleGameWords } from './words'
import { applyWordResults, finishGame } from './score'
import type { GameWord } from './gen'
import { AiExplain, ResultCard } from './ui'

const ROUNDS = 10

export default function Spelling({ onExit }: { onExit: () => void }) {
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
      finishGame('spelling', right, words.length)
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
        title={right === ROUNDS ? '🌟 拼写满分!' : '拼写挑战完成'}
        correct={right}
        total={words?.length ?? ROUNDS}
        onRestart={restart}
        onExit={onExit}
      >
        <p className="hint">拼对的词记 good;拼错的词进入今日错词重排队。</p>
      </ResultCard>
    )
  }

  if (!words) return <section className="card"><div className="hint">准备单词中…</div></section>

  const hint = word ? word.word[0] + '_'.repeat(Math.max(1, word.word.length - 1)) : ''

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>✍️ 拼写挑战</h2>
          <span className="tag">
            第 {idx + 1} / {words.length} 词
          </span>
        </div>
        <button className="btn ghost" onClick={() => word && speak(word.word)}>
          🔊 听发音
        </button>
      </div>
      {word && (
        <>
          <div className="review-card">
            <div className="popup-cn" style={{ fontSize: 18 }}>
              {word.cn}
            </div>
            <div className="review-word" style={{ letterSpacing: 4 }}>
              {hint}
            </div>
            <input
              autoFocus
              className="game-input"
              value={input}
              disabled={checked}
              placeholder="根据中文和发音拼写…"
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
          {checked && <AiExplain cacheKey={`game:spelling:${word.word}`} topic="单词拼写" question={word.word} answer={word.cn} />}
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
