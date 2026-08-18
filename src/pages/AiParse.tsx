import { useEffect, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import type { AppContext } from '../App'
import WordText from '../components/WordText'
import SentenceBreakdown from '../components/SentenceBreakdown'
import { aiParseSentences } from '../lib/ai/parse'
import { recordReadingSample } from '../lib/ai/coach'
import { addMyArticle, loadData } from '../lib/storage'
import type { ArticleSentence } from '../lib/types'

export default function AiParse() {
  const { openPopup } = useOutletContext<AppContext>()
  const [sp] = useSearchParams()
  const [text, setText] = useState('')
  const [sentences, setSentences] = useState<ArticleSentence[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState('')
  const [profileNote, setProfileNote] = useState('')
  const aiReady = !!loadData().aiConfig.apiKey

  useEffect(() => {
    const openId = sp.get('open')
    if (openId) {
      const art = loadData().myArticles.find((a) => a.id === openId)
      if (art) {
        setSentences(art.sentences)
        setTitle(art.title)
      }
    }
  }, [sp])

  const run = async () => {
    const raw = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2)
    if (raw.length === 0) return
    setLoading(true)
    setErr('')
    setProgress('')
    setProfileNote('')
    try {
      const parsed = await aiParseSentences(raw, (done, total) => setProgress(`${done}/${total}`))
      setSentences(parsed)
      // 解析文本并入教练画像(估级 + 语法点薄弱项),失败静默,不阻塞解析结果
      recordReadingSample(
        parsed.map((s) => s.text),
        parsed.flatMap((s) => s.grammar.map((g) => g.name)),
      )
        .then((r) => {
          if (r) setProfileNote(`📊 已更新教练画像:文本估级 ${r.level}`)
        })
        .catch(() => {})
    } catch (e) {
      setErr((e as Error).message)
    }
    setLoading(false)
    setProgress('')
  }

  const saveArticle = () => {
    if (!sentences) return
    const id = 'my_' + Date.now().toString(36)
    addMyArticle({ id, title: title || '未命名文章', createdAt: Date.now(), sentences })
    alert('已保存到"我的文章"')
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>🔍 AI 解析任意文章</h2>
        <span className="tag">需配置 API</span>
      </div>
      {!aiReady && (
        <div className="goal-banner">
          ⚙️ 尚未配置 AI。请到
          <Link to="/settings"> 设置页 </Link>
          填写 API Key 后使用。离线功能不受影响。
        </div>
      )}
      <textarea
        className="parse-input"
        rows={6}
        placeholder="粘贴任意英文文章,AI 将逐句给出:主干拆解 + 中文翻译 + 语法点。例如:&#10;Despite the economic downturn, the company decided to expand its business."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="row-btns" style={{ justifyContent: 'flex-start' }}>
        <button className="btn" onClick={run} disabled={loading || !aiReady || !text.trim()}>
          {loading ? (progress ? `解析中… ${progress} 句` : '解析中…') : '🚀 开始解析'}
        </button>
        {sentences && (
          <>
            <input className="grow-input" placeholder="文章标题(保存用)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button className="btn ghost" onClick={saveArticle}>
              💾 保存到我的文章
            </button>
          </>
        )}
      </div>
      {err && <div className="feedback no">❌ {err.slice(0, 150)}</div>}
      {profileNote && <div className="hint">{profileNote}</div>}

      {sentences && (
        <div className="parse-result">
          {sentences.map((s, i) => (
            <div key={i} className="sentence-block">
              <div className="sentence">
                <WordText text={s.text} onWord={openPopup} />
              </div>
              <SentenceBreakdown sentence={s} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
