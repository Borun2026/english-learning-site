import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import WordPopup from './components/WordPopup'
import { normalizeWord } from './components/WordText'
import { wordWavUrl } from './lib/audio'
import { searchDict } from './lib/dict'
import { initSpeech, speak } from './lib/speech'
import { loadData, setTts } from './lib/storage'
import type { DictEntry } from './lib/types'

interface PopupState {
  word: string
  x: number
  y: number
}

export interface AppContext {
  openPopup: (e: React.MouseEvent<HTMLElement>, w: string) => void
  /** audioUrl:本地预生成 wav(P5-4 听力/文章优先),缺失自动回退在线引擎 */
  onSpeak: (w: string, r?: number, audioUrl?: string) => void
}

type NavSection = 'all' | 'main' | 'library' | 'vocab' | 'ai'

export default function App() {
  const navigate = useNavigate()
  const [popup, setPopup] = useState<PopupState | null>(null)
  const [rate, setRate] = useState(loadData().tts.rate)
  const [netError, setNetError] = useState('')
  const [navSection, setNavSection] = useState<NavSection>('all')
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [suggs, setSuggs] = useState<DictEntry[]>([])

  useEffect(() => {
    const q = draft.trim()
    if (q.length < 2) {
      setSuggs([])
      return
    }
    let alive = true
    searchDict(q).then((rows) => {
      if (alive) setSuggs(rows)
    })
    return () => {
      alive = false
    }
  }, [draft])

  useEffect(() => {
    initSpeech()
    const onReject = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason?.message ?? e.reason ?? '')
      // 只有 fetchJson 抛出的"本地服务不可用"才显示横幅;
      // AI API 等网络错误由各页面就地展示,避免误导。
      if (msg.includes('无法连接本地服务')) {
        setNetError('无法连接本地服务器。请确认已运行:npm run dev(或双击 start.bat),然后访问 http://127.0.0.1:5273')
      }
    }
    window.addEventListener('unhandledrejection', onReject)
    return () => window.removeEventListener('unhandledrejection', onReject)
  }, [])

  const openPopup = (e: React.MouseEvent<HTMLElement>, w: string) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPopup({ word: normalizeWord(w), x: r.left, y: r.bottom + 6 })
  }

  return (
    <div className="page">
      {netError && (
        <div className="net-error">
          ⚠️ {netError}
          <button className="btn small" onClick={() => setNetError('')}>
            关闭
          </button>
        </div>
      )}
      <header className="topbar">
        <Link to="/" className="logo">
          <span style={{ fontSize: 26 }}>📚</span>
          <h1>英语语境学习</h1>
        </Link>
        <form
          className="dict-search"
          onSubmit={(e) => {
            e.preventDefault()
            const q = draft.trim()
            if (q) navigate('/dict?q=' + encodeURIComponent(q))
            setOpen(false)
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 150)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="查词…"
            aria-label="查词"
            autoComplete="off"
          />
          {open && suggs.length > 0 && (
            <div className="dict-sugg" onMouseDown={(e) => e.preventDefault()}>
              {suggs.map((e) => (
                <button
                  type="button"
                  key={e.word}
                  onClick={() => {
                    navigate('/dict?q=' + encodeURIComponent(e.word))
                    setDraft(e.word)
                    setOpen(false)
                  }}
                >
                  <b>{e.word}</b>
                  <span className="dim">{e.trans[0] ? (e.trans[0].pos ? e.trans[0].pos + '. ' : '') + e.trans[0].cn : ''}</span>
                </button>
              ))}
            </div>
          )}
        </form>
        <div className="rate-box">
          <span>语速</span>
          <input
            type="range"
            min="0.6"
            max="1.2"
            step="0.05"
            value={rate}
            onChange={(e) => {
              setRate(Number(e.target.value))
              setTts({ rate: Number(e.target.value) })
            }}
          />
          <span className="rate-val">{rate.toFixed(2)}x</span>
          <Link to="/settings" className="gear" title="设置">
            ⚙️
          </Link>
        </div>
      </header>

      <div className="nav-container">
        <div className="nav-groups">
          <button
            className={'nav-group-btn' + (navSection === 'all' ? ' on' : '')}
            onClick={() => setNavSection('all')}
          >
            🌟 全部导航
          </button>
          <button
            className={'nav-group-btn' + (navSection === 'main' ? ' on' : '')}
            onClick={() => setNavSection('main')}
          >
            🎯 学习主线
          </button>
          <button
            className={'nav-group-btn' + (navSection === 'library' ? ' on' : '')}
            onClick={() => setNavSection('library')}
          >
            📚 题库资料
          </button>
          <button
            className={'nav-group-btn' + (navSection === 'vocab' ? ' on' : '')}
            onClick={() => setNavSection('vocab')}
          >
            ⚡ 词汇宇宙
          </button>
          <button
            className={'nav-group-btn' + (navSection === 'ai' ? ' on' : '')}
            onClick={() => setNavSection('ai')}
          >
            🤖 AI 实验室
          </button>
        </div>

        <nav className="tabs">
          {(navSection === 'all' || navSection === 'main') && (
            <>
              <NavLink to="/" end className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                🏠 首页
              </NavLink>
              <NavLink to="/plan" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                📅 计划
              </NavLink>
              <NavLink to="/placement" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                🎯 分级测评
              </NavLink>
            </>
          )}
          {(navSection === 'all' || navSection === 'library') && (
            <>
              <NavLink to="/zhenti" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                📝 真题
              </NavLink>
              <NavLink to="/grammar" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                🧭 语法树
              </NavLink>
              <NavLink to="/library" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                📚 资料库
              </NavLink>
              <NavLink to="/my-articles" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                🗂 我的文章
              </NavLink>
            </>
          )}
          {(navSection === 'all' || navSection === 'vocab') && (
            <>
              <NavLink to="/wordbook" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                📒 词汇中心
              </NavLink>
              <NavLink to="/dict" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                🔍 词典
              </NavLink>
              <NavLink to="/vocab-games" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                🎮 词汇游戏
              </NavLink>
              <NavLink to="/achievements" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                🏆 成就墙
              </NavLink>
            </>
          )}
          {(navSection === 'all' || navSection === 'ai') && (
            <>
              <NavLink to="/writing" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                ✍️ 写作工坊
              </NavLink>
              <NavLink to="/ai-dialogue" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                🤖 AI 对话
              </NavLink>
              <NavLink to="/ai-parse" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                🔍 AI 解析
              </NavLink>
              <NavLink to="/practice" className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
                🧪 AI 练习
              </NavLink>
            </>
          )}
        </nav>
      </div>

      <Suspense
        fallback={
          <div className="page-enter">
            <section className="skeleton-card">
              <div className="skeleton skeleton-text" style={{ width: '40%', height: 26, marginBottom: 16 }} />
              <div className="skeleton skeleton-text" style={{ width: '80%' }} />
              <div className="skeleton skeleton-text" style={{ width: '65%' }} />
              <div className="skeleton skeleton-text short" />
            </section>
          </div>
        }
      >
        <main className="page-enter">
          <Outlet
            context={{
              openPopup,
              onSpeak: (w: string, r?: number, audioUrl?: string) => {
                const go = (url?: string) =>
                  speak(w, { ...(r != null ? { rate: r } : {}), ...(url ? { audioUrl: url } : {}) })
                if (audioUrl) {
                  go(audioUrl)
                  return
                }
                if (/^[A-Za-z][A-Za-z'-]*$/.test(w) && w.split(/\s+/).length === 1) {
                  void wordWavUrl(w).then((u) => go(u)).catch(() => go())
                  return
                }
                go()
              },
            }}
          />
        </main>
      </Suspense>

      {popup && (
        <WordPopup
          word={popup.word}
          x={popup.x}
          y={popup.y}
          onClose={() => setPopup(null)}
          onSpeak={(w) => {
            void wordWavUrl(w).then((u) => speak(w, u ? { audioUrl: u } : {})).catch(() => speak(w))
          }}
        />
      )}
    </div>
  )
}
