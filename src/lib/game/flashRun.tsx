// 模式 5:闪卡快跑 —— 60 秒快速判断认识/不认识 (带 Combo 连击与光效充能)
import { useEffect, useRef, useState } from 'react'
import { speak } from '../speech'
import { sampleGameWords } from './words'
import { applyWordResults, finishGame } from './score'
import type { GameWord } from './gen'
import { ResultCard } from './ui'

const SECONDS = 60

export default function FlashRun({ onExit }: { onExit: () => void }) {
  const [words, setWords] = useState<GameWord[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [known, setKnown] = useState(0)
  const [unknown, setUnknown] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [reveal, setReveal] = useState<string | null>(null)
  const [left, setLeft] = useState(SECONDS)
  const [done, setDone] = useState(false)
  const knownRef = useRef(0)

  useEffect(() => {
    let alive = true
    sampleGameWords(25).then((ws) => {
      if (alive) setWords(ws)
    })
    return () => {
      alive = false
    }
  }, [])

  const word = words?.[idx] ?? null

  const judge = (know: boolean) => {
    if (!word || done) return
    if (know) {
      setKnown((n) => n + 1)
      knownRef.current += 1
      applyWordResults([word.word], [])
      setCombo((c) => {
        const nc = c + 1
        setMaxCombo((mc) => Math.max(mc, nc))
        return nc
      })
    } else {
      setUnknown((n) => n + 1)
      applyWordResults([], [word.word])
      setReveal(`${word.word}: ${word.cn}`)
      setCombo(0)
    }
    setIdx((i) => i + 1)
  }

  const finish = () => {
    if (done) return
    finishGame('flashRun', knownRef.current, idx)
    setDone(true)
    setReveal(null)
  }

  // 倒计时
  useEffect(() => {
    if (done) return
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(t)
          finish()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  // 键盘 J=认识 F=不认识
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'j') judge(true)
      else if (k === 'f') judge(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const restart = () => {
    sampleGameWords(25).then(setWords)
    setIdx(0)
    setKnown(0)
    setUnknown(0)
    setCombo(0)
    setMaxCombo(0)
    knownRef.current = 0
    setReveal(null)
    setLeft(SECONDS)
    setDone(false)
  }

  if (done) {
    return (
      <ResultCard title="⚡ 闪卡快跑结束" correct={known} total={known + unknown} onRestart={restart} onExit={onExit}>
        <p className="hint">
          60 秒内认识 <b>{known}</b> 个、不认识 <b>{unknown}</b> 个 · 最高连击 <b>{maxCombo}x 🔥</b>
        </p>
      </ResultCard>
    )
  }

  const pct = (left / SECONDS) * 100
  const isUrgent = left <= 10

  return (
    <div className="flash-game-container">
      <div className="card-head">
        <div>
          <h2>⚡ 闪卡快跑</h2>
          <span className="tag">60 秒快速判断 · J 键认识 / F 键不认识</span>
        </div>
        <button className="btn ghost small" onClick={onExit}>
          退出
        </button>
      </div>

      <div className="flash-timer-bar">
        <div
          className={'flash-timer-fill' + (isUrgent ? ' urgent' : '')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flash-stats-bar">
        <span className="timer-badge">⏳ 倒计时 <b>{left}s</b></span>
        {combo > 1 && (
          <span className="combo-badge">
            🔥 {combo}x COMBO!
          </span>
        )}
        <span className="dim">已答 {known + unknown} 词</span>
      </div>

      {word ? (
        <div className="flash-card-box">
          <div className="flash-word-text">{word.word}</div>
          <div className="flash-actions">
            <button className="flash-btn know" onClick={() => judge(true)}>
              <span className="key-hint">J</span>
              <span className="btn-label">✅ 认识</span>
            </button>
            <button className="flash-btn dont-know" onClick={() => judge(false)}>
              <span className="key-hint">F</span>
              <span className="btn-label">❌ 不认识</span>
            </button>
          </div>
          {reveal && (
            <div className="flash-reveal-note">
              💡 刚刚的词: <b>{reveal}</b>
            </div>
          )}
        </div>
      ) : (
        <div className="hint">正在加载词汇库…</div>
      )}
    </div>
  )
}
