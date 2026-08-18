// 模式 1:连词成句 —— 点击/按数字选词块,拼出正确句子 (强化磁吸感与动画)
import { useEffect, useMemo, useState } from 'react'
import { speak } from '../speech'
import { extractWords } from '../vocab'
import { normalizeText, pickMany, shuffle, type OrderSentenceItem } from './gen'
import { loadOrderSentenceBank } from './words'
import { applyWordResults, finishGame } from './score'
import { AiExplain, ResultCard } from './ui'

const ROUNDS = 8

export default function OrderSentence({ onExit }: { onExit: () => void }) {
  const [items, setItems] = useState<OrderSentenceItem[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [chips, setChips] = useState<{ id: number; text: string }[]>([])
  const [answer, setAnswer] = useState<number[]>([])
  const [checked, setChecked] = useState(false)
  const [right, setRight] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    loadOrderSentenceBank()
      .then((bank) => {
        if (alive) setItems(pickMany(bank.items, ROUNDS))
      })
      .catch(() => {
        if (alive) setItems([])
      })
    return () => {
      alive = false
    }
  }, [])

  const item = items?.[idx] ?? null

  useEffect(() => {
    if (!item) return
    setChips(shuffle([...item.chunks, ...item.distractors]).map((text, id) => ({ id, text })))
    setAnswer([])
    setChecked(false)
  }, [item])

  const selectedText = useMemo(() => answer.map((i) => chips[i]?.text ?? '').join(' '), [answer, chips])
  const isCorrect = checked && item ? normalizeText(selectedText) === normalizeText(item.text) : false

  const check = () => {
    if (!item || checked || answer.length === 0) return
    const ok = normalizeText(selectedText) === normalizeText(item.text)
    setChecked(true)
    if (ok) {
      setRight((r) => r + 1)
      applyWordResults(extractWords(item.text, 6), [])
    } else {
      applyWordResults([], extractWords(item.text, 6))
    }
  }

  const next = () => {
    if (items && idx + 1 >= items.length) {
      finishGame('orderSentence', right, items.length)
      setDone(true)
      return
    }
    setIdx((i) => i + 1)
  }

  // 键盘:数字选词块,Enter 检查;结算后 Enter 下一题
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return
      if (e.key === 'Enter') {
        e.preventDefault()
        checked ? next() : check()
        return
      }
      if (checked) return
      const n = Number(e.key)
      if (n >= 1 && n <= 9 && chips[n - 1]) {
        setAnswer((a) => (a.includes(n - 1) ? a.filter((x) => x !== n - 1) : [...a, n - 1]))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (done) {
    return (
      <ResultCard
        title={right === (items?.length ?? 0) ? '🌟 连词成句全对!' : '连词成句完成'}
        correct={right}
        total={items?.length ?? ROUNDS}
        onRestart={() => {
          setItems(pickMany(items ?? [], ROUNDS))
          setIdx(0)
          setRight(0)
          setDone(false)
        }}
        onExit={onExit}
      >
        <p className="hint">答错的句子已把其中的关键词放入今日错词重排队。</p>
      </ResultCard>
    )
  }

  if (!item) return <div className="hint">加载题库中…</div>

  return (
    <div>
      <div className="card-head">
        <div>
          <h2>🧩 连词成句</h2>
          <span className="tag">
            第 {idx + 1} / {items?.length ?? ROUNDS} 题 · 单元:{item.unitId} · 阶段 {item.stage}
          </span>
        </div>
        <button className="btn ghost small" onClick={onExit}>
          退出
        </button>
      </div>

      <div className="order-target-cn">
        <span className="hint-label">🎯 目标句意：</span>
        <b>{item.cn}</b>
      </div>

      <div className="order-box-title">请组合下方词块（点击或按数字）：</div>
      <div className={'order-answer ' + (checked ? (isCorrect ? 'correct-box' : 'wrong-box') : '')}>
        {answer.length === 0 && <span className="dim">点击下方词块飞入这里…</span>}
        {answer.map((chipIdx) => (
          <button
            key={chipIdx}
            className="chip active-slot"
            disabled={checked}
            onClick={() => setAnswer((a) => a.filter((x) => x !== chipIdx))}
          >
            {chips[chipIdx]?.text} ✕
          </button>
        ))}
      </div>

      <div className="chips-pool">
        {chips.map((c, i) => {
          const used = answer.includes(i)
          return (
            <button
              key={c.id}
              className={'chip tactile' + (used ? ' used' : '')}
              disabled={used || checked}
              onClick={() => setAnswer((a) => [...a, i])}
            >
              <span className="chip-no">{i + 1}</span>
              {c.text}
            </button>
          )
        })}
      </div>

      {!checked ? (
        <div className="row-btns">
          <button className="btn game big" disabled={answer.length === 0} onClick={check}>
            ✅ 检查答案 (Enter)
          </button>
          <button className="btn ghost" disabled={answer.length === 0} onClick={() => setAnswer([])}>
            🗑️ 清空
          </button>
        </div>
      ) : (
        <div className="order-feedback-area">
          <div className={'feedback ' + (isCorrect ? 'ok' : 'no')}>
            <div>
              <b>{isCorrect ? '🎉 拼写完全正确!' : '❌ 正确答案为：'}</b>
              {!isCorrect && <div className="correct-line">{item.text}</div>}
            </div>
            <button className="btn small" onClick={() => speak(item.text)}>
              🔊 朗读
            </button>
          </div>

          <AiExplain
            cacheKey={`order-${item.text}`}
            topic="连词成句语法解析"
            question={`中文意图: ${item.cn}\n候选词: ${chips.map((c) => c.text).join(' ')}`}
            answer={item.text}
          />

          <div className="row-btns" style={{ marginTop: 14 }}>
            <button className="btn game big" onClick={next}>
              下一题 → (Enter)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
