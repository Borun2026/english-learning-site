import { useState } from 'react'
import { Link } from 'react-router-dom'
import PassageQuiz from '../components/PassageQuiz'
import { generatePractice } from '../lib/ai/generatePractice'
import { getPracticeSet, loadData } from '../lib/storage'
import { speak, stopSpeech } from '../lib/speech'
import type { PracticeSet } from '../lib/types'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']

export default function Practice() {
  const profileLevel = loadData().aiProfile.level || 'A2'
  const [kind, setKind] = useState<PracticeSet['kind']>('listen')
  const [level, setLevel] = useState(LEVELS.includes(profileLevel) ? profileLevel : 'A2')
  const [set, setSet] = useState<PracticeSet | undefined>(() => getPracticeSet('listen', LEVELS.includes(profileLevel) ? profileLevel : 'A2'))
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [reading, setReading] = useState(false)
  const aiReady = !!loadData().aiConfig.apiKey

  const loadCached = (k: PracticeSet['kind'], lv: string) => {
    setKind(k)
    setLevel(lv)
    setSet(getPracticeSet(k, lv))
    setRevealed(false)
    setErr('')
  }

  const gen = async () => {
    if (!aiReady) return
    setLoading(true)
    setErr('')
    try {
      const s = await generatePractice(kind, level)
      setSet(s)
      setRevealed(false)
    } catch (e) {
      setErr((e as Error).message)
    }
    setLoading(false)
  }

  const play = () => {
    if (!set) return
    if (reading) {
      stopSpeech()
      setReading(false)
      return
    }
    setReading(true)
    speak(set.text, { onEnd: () => setReading(false) })
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>🧪 AI 生成练习</h2>
        <span className="tag">听力 / 阅读 · 按 CEFR 出题</span>
      </div>
      {!aiReady && (
        <div className="goal-banner">
          ⚙️ 需要 API Key。<Link to="/settings">去设置</Link>
        </div>
      )}
      <div className="form-row">
        <label>
          类型
          <select value={kind} onChange={(e) => loadCached(e.target.value as PracticeSet['kind'], level)}>
            <option value="listen">听力(先听后揭)</option>
            <option value="read">阅读(文+题)</option>
          </select>
        </label>
        <label>
          级别
          <select value={level} onChange={(e) => loadCached(kind, e.target.value)}>
            {LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                {lv}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" disabled={!aiReady || loading} onClick={() => void gen()}>
          {loading ? '生成中…' : set ? '🔄 再生成一套' : '🚀 生成练习'}
        </button>
      </div>
      {err && <div className="feedback no">❌ {err.slice(0, 160)}</div>}
      {set && (
        <>
          <div className="card-head">
            <h3>{set.title}</h3>
            <span className="dim">{set.level} · {new Date(set.createdAt).toLocaleString()}</span>
          </div>
          {kind === 'listen' && (
            <div className="row-btns">
              <button className="btn" onClick={play}>
                {reading ? '⏹ 停止' : '🔊 播放听力'}
              </button>
              <button className="btn ghost" onClick={() => setRevealed((v) => !v)}>
                {revealed ? '隐藏原文' : '揭开原文'}
              </button>
            </div>
          )}
          {(kind === 'read' || revealed) && (
            <div className="passage-note">
              <p style={{ whiteSpace: 'pre-wrap' }}>{set.text}</p>
              {set.textCn && <p className="dim">{set.textCn}</p>}
            </div>
          )}
          <PassageQuiz questions={set.questions} />
        </>
      )}
      {!set && aiReady && <p className="hint">选择类型和级别后生成。结果按级别缓存,下次打开可直接重做。</p>}
    </section>
  )
}
