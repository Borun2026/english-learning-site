// 游戏共用小部件:AI 讲讲按钮 + 结算卡 (含 Canvas Confetti 礼花庆典)
import { useEffect, useState, type ReactNode } from 'react'
import { loadData } from '../storage'
import { explainGameItem, gameAiReady } from './ai'

export function triggerConfetti() {
  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '9999'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }

  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  ctx.scale(dpr, dpr)

  const colors = ['#ff7a18', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#3b82f6']
  const pieces = Array.from({ length: 90 }).map(() => ({
    x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 200,
    y: window.innerHeight * 0.4 + (Math.random() - 0.5) * 100,
    vx: (Math.random() - 0.5) * 16,
    vy: (Math.random() - 0.8) * 16,
    size: Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * 360,
    vrot: (Math.random() - 0.5) * 10,
    opacity: 1,
  }))

  let frame = 0
  const loop = () => {
    frame++
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    let alive = false
    for (const p of pieces) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.35 // 重力
      p.rot += p.vrot
      if (frame > 25) p.opacity -= 0.015
      if (p.opacity > 0) {
        alive = true
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5)
        ctx.restore()
      }
    }
    if (alive && frame < 120) {
      requestAnimationFrame(loop)
    } else {
      canvas.remove()
    }
  }
  requestAnimationFrame(loop)
}

export function AiExplain({
  cacheKey,
  topic,
  question,
  answer,
}: {
  cacheKey: string
  topic: string
  question: string
  answer: string
}) {
  const [text, setText] = useState(() => loadData().gameAiNotes[cacheKey] ?? '')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  if (!gameAiReady()) return null
  return (
    <div className="game-ai">
      {!text && (
        <button
          className="btn small ghost"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            setErr('')
            try {
              setText(await explainGameItem(cacheKey, topic, question, answer))
            } catch (e) {
              setErr((e as Error).message.slice(0, 120))
            }
            setLoading(false)
          }}
        >
          {loading ? '🤖 讲解中…' : '🤖 AI 讲讲'}
        </button>
      )}
      {text && <div className="feedback ok">🤖 {text}</div>}
      {err && <div className="feedback no">❌ {err}</div>}
    </div>
  )
}

export function ResultCard({
  title,
  correct,
  total,
  onRestart,
  onExit,
  children,
}: {
  title: string
  correct: number
  total: number
  onRestart: () => void
  onExit: () => void
  children?: ReactNode
}) {
  const perfect = correct === total && total > 0

  useEffect(() => {
    if (perfect) {
      triggerConfetti()
    }
  }, [perfect])

  return (
    <div className={'dlg-result ' + (perfect ? 'win' : 'lose')}>
      <div style={{ fontSize: 42, marginBottom: 8 }}>{perfect ? '🎉' : '👏'}</div>
      <h3 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>{title}</h3>
      <p style={{ fontSize: 16 }}>
        得分: <b style={{ fontSize: 20, color: 'var(--primary)' }}>{correct}</b> / {total}
        {perfect ? ' · 🌟 完美的表现!' : ''}
      </p>
      {children}
      <div className="row-btns" style={{ marginTop: 20 }}>
        <button className="btn game big" onClick={onRestart}>
          🔄 再来一局
        </button>
        <button className="btn ghost" onClick={onExit}>
          🎮 返回游戏中心
        </button>
      </div>
    </div>
  )
}
