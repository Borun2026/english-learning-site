import { useEffect, useRef, useState } from 'react'
import VocabCard from '../components/VocabCard'
import { addWord, reviewWord } from '../lib/vocab'

type Phase = 'preview' | 'test' | 'done'

export default function VocabView({
  words,
  onSpeak,
  onComplete,
}: {
  words: string[]
  onSpeak: (w: string) => void
  onComplete: () => void
}) {
  const [phase, setPhase] = useState<Phase>('preview')
  const [idx, setIdx] = useState(0)
  const [known, setKnown] = useState<number>(0)
  const [unknown, setUnknown] = useState<number>(0)
  const [locked, setLocked] = useState(false)
  const [askStart, setAskStart] = useState(false)
  const busy = useRef(false)
  const finished = useRef(false)

  const current = words[idx]

  useEffect(() => {
    busy.current = false
    setLocked(false)
  }, [idx])

  const finish = () => {
    if (finished.current) return
    finished.current = true
    setPhase('done')
    onComplete()
  }

  const answer = (know: boolean) => {
    if (busy.current || finished.current || !current) return
    busy.current = true
    setLocked(true)
    addWord(current, 'unit-vocab')
    if (know) {
      reviewWord(current, 'easy')
      setKnown((n) => n + 1)
    } else {
      setUnknown((n) => n + 1)
    }
    if (idx + 1 >= words.length) {
      finish()
    } else {
      setIdx((i) => i + 1)
    }
  }

  const startTest = () => {
    setAskStart(false)
    setPhase('test')
    setIdx(0)
    setKnown(0)
    setUnknown(0)
    busy.current = false
    finished.current = false
    setLocked(false)
  }

  const restart = () => {
    setPhase('preview')
    setIdx(0)
    setKnown(0)
    setUnknown(0)
    busy.current = false
    finished.current = false
    setLocked(false)
  }

  if (phase === 'test' && current) {
    return (
      <div>
        <div className="card-head">
          <div>
            <h2>📝 词汇自测</h2>
            <span className="tag">
              {idx + 1} / {words.length} 词
            </span>
          </div>
        </div>
        <p className="hint">释义已遮挡。点「认识」会排到 5 天后复习;点「不认识」今天进入复习队列。自测完成将进入语法课。</p>
        <div className="vocab-grid" style={{ justifyContent: 'center' }}>
          <VocabCard word={current} onSpeak={onSpeak} masked />
        </div>
        <div className="row-btns" style={{ justifyContent: 'center', marginTop: 14 }}>
          <button className="btn" disabled={locked} onClick={() => answer(true)}>
            ✅ 认识
          </button>
          <button className="btn ghost" disabled={locked} onClick={() => answer(false)}>
            ❌ 不认识
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div>
        <div className={'dlg-result ' + (unknown === 0 ? 'win' : 'lose')}>
          <h3>{unknown === 0 ? '🌟 全部认识!' : '自测完成'}</h3>
          <p>
            认识 {known} 个 · 不认识 {unknown} 个
          </p>
          <p className="hint">
            全部 {words.length} 词已收入词汇池:「不认识」的词今天到期,「认识」的词 5 天后复习。正在进入语法课…
          </p>
          <div className="row-btns">
            <button className="btn" disabled onClick={finish}>
              ✅ 已完成本单元词汇
            </button>
            <button className="btn ghost" onClick={restart}>
              🔄 重新自测
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card-head">
        <div>
          <h2>📝 本单元新词({words.length})</h2>
          <span className="tag">预览 → 认识/不认识自测 → 收入复习队列</span>
        </div>
      </div>
      <p className="hint">先过一遍新词(它们会在文章、对话和听力中复现),然后点「开始自测」。</p>
      <div className="vocab-grid">
        {words.map((w) => (
          <VocabCard key={w} word={w} onSpeak={onSpeak} />
        ))}
      </div>
      <div className="step-actions">
        <button className="btn" onClick={() => setAskStart(true)}>
          ▶️ 开始自测
        </button>
      </div>
      {askStart && (
        <div className="modal-backdrop" onClick={() => setAskStart(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>是否开始单词自测？</h3>
              <button className="icon-btn" onClick={() => setAskStart(false)}>
                ✕
              </button>
            </div>
            <p className="hint">
              释义将被模糊遮挡，点击模糊区域可查看意思。点「认识」排到 5 天后复习，点「不认识」今天进入复习队列。自测完成后会自动进入语法课。
            </p>
            <div className="row-btns">
              <button className="btn" onClick={startTest}>
                开始自测
              </button>
              <button className="btn ghost" onClick={() => setAskStart(false)}>
                继续预习
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
