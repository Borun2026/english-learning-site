import { useState } from 'react'
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

  const current = words[idx]

  const answer = (know: boolean) => {
    // P5-2 入池钩子:新词统一入池;「认识」按 easy 排到 5 天后,「不认识」今日学习
    addWord(current, 'unit-vocab')
    if (know) {
      reviewWord(current, 'easy')
      setKnown((n) => n + 1)
    } else {
      setUnknown((n) => n + 1)
    }
    if (idx + 1 >= words.length) {
      setPhase('done')
    } else {
      setIdx((i) => i + 1)
    }
  }

  const restart = () => {
    setPhase('preview')
    setIdx(0)
    setKnown(0)
    setUnknown(0)
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
        <p className="hint">诚实自评:点「认识」会排到 5 天后复习;点「不认识」今天进入复习队列。自测完成才算完成本单元词汇。</p>
        <div className="vocab-grid" style={{ justifyContent: 'center' }}>
          <VocabCard word={current} onSpeak={onSpeak} />
        </div>
        <div className="row-btns" style={{ justifyContent: 'center', marginTop: 14 }}>
          <button className="btn" onClick={() => answer(true)}>
            ✅ 认识
          </button>
          <button className="btn ghost" onClick={() => answer(false)}>
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
            全部 {words.length} 词已收入词汇池:「不认识」的词今天到期,「认识」的词 5 天后复习。可到
            <a href="#/wordbook"> 📒 词汇中心 </a>
            复习。
          </p>
          <div className="row-btns">
            <button className="btn" onClick={onComplete}>
              ✅ 完成本单元词汇,标记进度
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
        <button className="btn" onClick={() => setPhase('test')}>
          ▶️ 开始自测
        </button>
      </div>
    </div>
  )
}
