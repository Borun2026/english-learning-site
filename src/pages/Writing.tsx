import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { passageWavUrl } from '../lib/audio'
import { speak } from '../lib/speech'
import { loadWritingLibrary } from '../lib/writing'
import { aiCorrectWriting } from '../lib/ai/writing'
import { getWritingFeedback, loadData, setWritingFeedback } from '../lib/storage'
import type { AiWritingFeedback, BandWord, WritingErrorItem, WritingPattern } from '../lib/types'

type Tab = 'pattern' | 'band' | 'error'

const TYPE_LABEL: Record<WritingPattern['type'], string> = {
  opinion: '观点类',
  discuss: '双边讨论',
  report: '原因报告',
  data: '图表数据',
  general: '通用高分结构',
}

const ERROR_TYPE_LABEL: Record<WritingErrorItem['type'], string> = {
  grammar: '语法',
  lexis: '用词',
  coherence: '连贯',
}

export default function Writing() {
  const [tab, setTab] = useState<Tab>('pattern')
  const [patterns, setPatterns] = useState<WritingPattern[] | null>(null)
  const [bandWords, setBandWords] = useState<BandWord[] | null>(null)
  const [errors, setErrors] = useState<WritingErrorItem[] | null>(null)
  const [err, setErr] = useState('')
  const [bandQuery, setBandQuery] = useState('')
  const aiReady = !!loadData().aiConfig.apiKey

  useEffect(() => {
    loadWritingLibrary()
      .then((r) => {
        setPatterns(r.patterns)
        setBandWords(r.bandWords)
        setErrors(r.errors)
      })
      .catch((e) => setErr((e as Error).message))
  }, [])

  if (err) {
    return (
      <section className="card">
        <h2>⚠️ 写作库加载失败</h2>
        <p className="hint">{err}</p>
        <button className="btn ghost" onClick={() => location.reload()}>
          🔄 重新加载
        </button>
      </section>
    )
  }
  if (!patterns || !bandWords || !errors) return <section className="card"><div className="hint">写作库加载中…</div></section>

  return (
    <div>
      <section className="card">
        <div className="card-head">
          <h2>✍️ S5 写作练习(雅思/托福)</h2>
          <span className="tag">句式仿写 · band 词汇 · 常见错误 · AI 批改</span>
        </div>
        <div className="tabs" style={{ marginTop: 8 }}>
          <button className={'tab' + (tab === 'pattern' ? ' on' : '')} onClick={() => setTab('pattern')}>
            🧩 句式仿写({patterns.length})
          </button>
          <button className={'tab' + (tab === 'band' ? ' on' : '')} onClick={() => setTab('band')}>
            💎 Band 词汇({bandWords.length})
          </button>
          <button className={'tab' + (tab === 'error' ? ' on' : '')} onClick={() => setTab('error')}>
            ⚠️ 常见错误({errors.length})
          </button>
        </div>
      </section>

      {tab === 'pattern' && (
        <section className="card">
          <p className="hint">
            先看句式卡(模板 + 例句 + 使用要点),再在输入框仿写一句。
            {aiReady
              ? '「🤖 AI 批改」给出语法/用词/连贯三项反馈与雅思估分,结果本机缓存。'
              : '配置 AI 后解锁自动批改(语法/用词/连贯 + 估分)。'}
            {!aiReady && <Link to="/settings"> 去设置 AI →</Link>}
          </p>
          {patterns.map((p) => (
            <PatternCard key={p.id} p={p} aiReady={aiReady} />
          ))}
        </section>
      )}

      {tab === 'band' && (
        <section className="card">
          <p className="hint">
            写作提分核心:用高 band 词替换低阶词(共 {bandWords.length} 词,含词库雅思级 {bandWords.length - 30}+ 词)。全部离线可用。
          </p>
          <div className="form-row">
            <input
              className="grow-input"
              placeholder="🔍 搜索单词或中文释义(如 demonstrate / 减少)…"
              value={bandQuery}
              onChange={(e) => setBandQuery(e.target.value)}
            />
          </div>
          {(() => {
            const q = bandQuery.trim().toLowerCase()
            const filtered = q
              ? bandWords.filter((w) => w.word.toLowerCase().includes(q) || w.cn.includes(q))
              : bandWords
            const shown = filtered.slice(0, 300)
            return (
              <>
                {filtered.length > shown.length && (
                  <p className="hint">匹配 {filtered.length} 词,仅显示前 {shown.length} 词,请继续输入以缩小范围。</p>
                )}
                <div className="band-grid">
                  {shown.map((w) => (
                    <div key={w.word} className="band-card">
                      <div className="band-card-head">
                        <b>{w.word}</b>
                        <span className={'band-tag b' + w.band}>Band {w.band}</span>
                      </div>
                      <div className="dim">
                        {w.pos} {w.cn}
                      </div>
                      {w.replaceFor && (
                        <div className="band-replace">
                          替换:<s>{w.replaceFor}</s>
                        </div>
                      )}
                      {w.example && (
                        <>
                          <div className="band-ex">💬 {w.example}</div>
                          <div className="dim">{w.exampleCn}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </section>
      )}

      {tab === 'error' && (
        <section className="card">
          <p className="hint">中国学生写作高频错误。改正这些错误比多背模板更能提分。</p>
          {errors.map((e) => (
            <div key={e.id} className="writing-error">
              <span className="tag">{ERROR_TYPE_LABEL[e.type]}</span>
              <div className="writing-error-line">❌ {e.wrong}</div>
              <div className="writing-error-line ok">✅ {e.right}</div>
              <div className="dim">💡 {e.note}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

function PatternCard({ p, aiReady }: { p: WritingPattern; aiReady: boolean }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<AiWritingFeedback | null>(null)
  const [fbErr, setFbErr] = useState('')

  const submit = async () => {
    const s = text.trim()
    if (!s || loading) return
    const key = `${p.id}::${s.slice(0, 80).toLowerCase()}`
    const hit = getWritingFeedback(key)
    if (hit) {
      setFeedback(hit)
      setFbErr('')
      return
    }
    setLoading(true)
    setFbErr('')
    try {
      const fb = await aiCorrectWriting(p.name, s)
      setWritingFeedback(key, fb)
      setFeedback(fb)
    } catch (e) {
      setFbErr((e as Error).message)
    }
    setLoading(false)
  }

  return (
    <div className="writing-pattern">
      <div className="writing-pattern-head">
        <b>{p.name}</b>
        <span className="tag">{TYPE_LABEL[p.type]}</span>
      </div>
      <p className="dim">
        {p.cn} · 模板:<code className="writing-code">{p.template}</code>
      </p>
      <div className="writing-example">
        <div>
          <span className="sentence-x" onClick={() => speak(p.example, { audioUrl: passageWavUrl('writing', p.id, '') })}>
            🔊
          </span>{' '}
          💬 {p.example}
        </div>
        <div className="dim">{p.exampleCn}</div>
      </div>
      {p.tips?.map((t, i) => (
        <div key={i} className="dim" style={{ fontSize: 13 }}>
          💡 {t}
        </div>
      ))}
      <div className="form-row writing-input-row">
        <input
          className="grow-input"
          placeholder="用这个句式仿写一句(输入你自己的句子)…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn small" onClick={submit} disabled={loading || !text.trim() || !aiReady}>
          {loading ? '批改中…' : '🤖 AI 批改'}
        </button>
      </div>
      {fbErr && <div className="feedback no">❌ {fbErr.slice(0, 120)}</div>}
      {feedback && <FeedbackPanel fb={feedback} />}
    </div>
  )
}

function FeedbackPanel({ fb }: { fb: AiWritingFeedback }) {
  const section = (title: string, list: string[], okText: string) => (
    <div className="writing-fb-sec">
      <b>{title}</b>
      {list.length === 0 ? (
        <span className="dim"> {okText}</span>
      ) : (
        <ul className="writing-fb-list">
          {list.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}
    </div>
  )
  return (
    <div className="writing-feedback">
      <div className="coach-level">
        <span>雅思估分</span>
        <span className="score-badge">{fb.score}</span>
        <span className="dim">/ 9(同一句子再次批改会直接读本机缓存)</span>
      </div>
      {section('📝 语法', fb.grammar, '✓ 无明显语法问题')}
      {section('💎 用词', fb.lexical, '✓ 无明显用词问题')}
      {section('🔗 连贯', fb.coherence, '✓ 无明显连贯问题')}
      {fb.rewrite && (
        <div className="exercise-answer">
          ✨ 打磨建议版:{fb.rewrite}
        </div>
      )}
    </div>
  )
}
