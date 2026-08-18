import { useEffect, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import type { AppContext } from '../App'
import WordText from '../components/WordText'
import WordLevelLegend from '../components/WordLevelLegend'
import PassageQuiz from '../components/PassageQuiz'
import { pickDailyId } from '../lib/daily'
import { loadMagazineArticle, loadMagazineIndex, loadNceIndex, loadNceLesson } from '../lib/intensive'
import { loadCet6Index, loadCet6Passage } from '../lib/zhenti'
import { loadTedIndex, loadTedLesson } from '../lib/ted'
import { passageWavUrl } from '../lib/audio'
import { speak, stopSpeech } from '../lib/speech'
import { aiAnnotateParagraph } from '../lib/ai/provider'
import { getPassageNote, loadData, markLibraryRead, setPassageNote, toggleLibraryFav, useDataVersion } from '../lib/storage'
import { awardXp } from '../lib/stats'
import { useWordLevelMarks, type WordLevelMark } from '../lib/wordLevel'
import type { NceIndex, NceLesson, PassageNote, ReadingIndex, ReadingPassage } from '../lib/types'

type Tab = 'nce' | 'cet6' | 'magazine' | 'ted'

export default function Library() {
  const { openPopup } = useOutletContext<AppContext>()
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') as Tab) || 'nce'

  return (
    <div>
      <div className="tabs">
        {(
          [
            ['nce', '📗 新概念英语笔记'],
            ['cet6', '📝 CET-6 真题语篇'],
            ['magazine', '📰 外刊文章'],
            ['ted', '🎤 TED 主题'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setSp({ tab: k })}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'nce' && <NceTab onWord={openPopup} />}
      {tab === 'cet6' && (
        <PassageTab
          onWord={openPopup}
          loadIndex={loadCet6Index}
          loadArticle={loadCet6Passage}
          empty="CET-6 真题语篇加载中…"
        />
      )}
      {tab === 'magazine' && (
        <PassageTab
          onWord={openPopup}
          loadIndex={loadMagazineIndex}
          loadArticle={loadMagazineArticle}
          empty="外刊文章加载中…"
          daily
        />
      )}
      {tab === 'ted' && (
        <PassageTab
          onWord={openPopup}
          loadIndex={loadTedIndex}
          loadArticle={loadTedLesson}
          empty="TED 主题笔记加载中…"
        />
      )}
    </div>
  )
}

function NceTab({ onWord }: { onWord: AppContext['openPopup'] }) {
  const [index, setIndex] = useState<NceIndex | null>(null)
  const [lesson, setLesson] = useState<NceLesson | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    loadNceIndex().then(setIndex).catch((e) => setErr((e as Error).message))
  }, [])

  if (err) return <section className="card"><h2>⚠️ {err}</h2></section>
  if (!index) return <section className="card"><div className="hint">加载中…</div></section>

  return (
    <div className="lib-layout">
      <section className="card lib-col">
        <div className="card-head">
          <h2>📗 新概念英语 1-4 册语法笔记</h2>
          <span className="tag">{index.source}</span>
        </div>
        <p className="hint">每课提炼语法要点(Main knowledge)与逐节讲解,配合单元课程使用。原文课文仅本地学习使用。</p>
        {index.books.map((b) => (
          <details key={b.id} className="lib-book" open={b.id === 'nce1'}>
            <summary>
              {b.title} <span className="dim">({b.lessons.length} 课)</span>
            </summary>
            <div className="lib-lessons">
              {b.lessons.map((l) => (
                <button
                  key={l.id}
                  className={'lib-item' + (lesson?.id === l.id ? ' on' : '')}
                  onClick={() => loadNceLesson(b.id, l.id.replace(`${b.id}-`, '')).then(setLesson)}
                >
                  {l.title}
                  <span className="dim">· {l.points} 个要点</span>
                </button>
              ))}
            </div>
          </details>
        ))}
      </section>

      <section className="card lib-col">
        {!lesson ? (
          <div className="hint">← 从左侧选择一课查看笔记</div>
        ) : (
          <div>
            <div className="card-head">
              <h2>{lesson.title}</h2>
              <button className="btn small ghost" onClick={() => setLesson(null)}>
                ✕
              </button>
            </div>
            {lesson.mainKnowledge.length > 0 && (
              <>
                <h4>📌 Main knowledge</h4>
                <div className="wordbook">
                  {lesson.mainKnowledge.map((k, i) => (
                    <span key={i} className="wb-item" style={{ cursor: 'default' }}>
                      {k}
                    </span>
                  ))}
                </div>
              </>
            )}
            {lesson.sections.map((s, i) => (
              <div key={i} className="grammar-lesson">
                <h4>{s.heading}</h4>
                {s.content.map((c, ci) => (
                  <p key={ci}>{c}</p>
                ))}
              </div>
            ))}
            {lesson.notes.length > 0 && (
              <>
                <h4>补充笔记</h4>
                {lesson.notes.map((n, i) => (
                  <p key={i} className="dim" style={{ fontSize: 14 }}>
                    {n}
                  </p>
                ))}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function ParagraphBlock({
  passageId,
  idx,
  text,
  onWord,
  levelOf,
  allowAnnotate = true,
  audioUrl,
}: {
  passageId: string
  idx: number
  text: string
  onWord: AppContext['openPopup']
  levelOf?: (w: string) => WordLevelMark | undefined
  allowAnnotate?: boolean
  audioUrl?: string
}) {
  const cacheKey = `${passageId}:${idx}`
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState<PassageNote | undefined>(() => getPassageNote(cacheKey))
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const aiReady = !!loadData().aiConfig.apiKey

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (!next) return
    if (note) return
    if (!aiReady) return
    setLoading(true)
    setErr('')
    aiAnnotateParagraph(text)
      .then((r) => {
        setNote(r)
        setPassageNote(cacheKey, r)
      })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false))
  }

  return (
    <div className="sentence-block">
      <div className="sentence">
        <WordText text={text} onWord={onWord} levelOf={levelOf} />
        <span className="sentence-x" onClick={() => speak(text, audioUrl ? { audioUrl } : {})}>
          🔊
        </span>
      </div>
      {allowAnnotate && (
      <div style={{ margin: '4px 0 8px' }}>
        <button className="btn small ghost" onClick={toggle}>
          {open ? '收起翻译与讲解' : '🌐 翻译与讲解'}
        </button>
      </div>
      )}
      {allowAnnotate && open && (
        <div className="passage-note">
          {loading && <div className="hint">🤖 AI 生成翻译与讲解中…</div>}
          {!loading && err && (
            <div className="feedback no">
              ❌ {err.slice(0, 100)}
              <Link to="/settings">去设置 AI</Link>
            </div>
          )}
          {!loading && !err && !aiReady && (
            <div className="hint">
              配置 AI 后可生成段落翻译与讲解。<Link to="/settings">去设置 AI</Link>
            </div>
          )}
          {!loading && note && (
            <>
              {note.translation && (
                <div className="pn-item">
                  <b>🌐 翻译</b>
                  <p>{note.translation}</p>
                </div>
              )}
              {note.explanation && (
                <div className="pn-item">
                  <b>📖 讲解</b>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{note.explanation}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function PassageTab({
  onWord,
  loadIndex,
  loadArticle,
  empty,
  daily,
}: {
  onWord: AppContext['openPopup']
  loadIndex: () => Promise<ReadingIndex>
  loadArticle: (id: string) => Promise<ReadingPassage>
  empty: string
  daily?: boolean
}) {
  const [index, setIndex] = useState<ReadingIndex | null>(null)
  const [passage, setPassage] = useState<ReadingPassage | null>(null)
  const [err, setErr] = useState('')
  const [reading, setReading] = useState(false)
  const [levelOn, setLevelOn] = useState(false)
  const [sp, setSp] = useSearchParams()
  const dv = useDataVersion()
  const flags = loadData().libraryFlags
  const filter = (sp.get('filter') as 'all' | 'fav' | 'unread') || 'all'
  const deepId = sp.get('id')

  useEffect(() => {
    loadIndex()
      .then((idx) => {
        setIndex(idx)
        const want = deepId && idx.items.some((it) => it.id === deepId) ? deepId : daily && !deepId ? pickDailyId(idx.items.map((it) => it.id)) : null
        if (want) loadArticle(want).then(setPassage).catch((e) => setErr((e as Error).message))
      })
      .catch((e) => setErr((e as Error).message))
  }, [loadIndex, loadArticle, daily, deepId])

  const passageText = passage ? passage.paragraphs.join(' ') : ''
  const { marks, loading } = useWordLevelMarks(passageText, levelOn)
  const levelOf = marks ? (w: string) => marks.get(w) : undefined

  const extraKind: 'mag' | 'cet6' | 'ted' =
    index?.type === 'cet6-passages' ? 'cet6' : index?.type === 'ted-lessons' ? 'ted' : 'mag'

  const paraAudio = (id: string, idx: number) => passageWavUrl(extraKind, id, idx)

  const readFull = () => {
    if (!passage) return
    if (reading) {
      stopSpeech()
      setReading(false)
      return
    }
    const paras = passage.sections?.length
      ? passage.sections.flatMap((sec, si) => sec.paragraphs.map((p, pi) => ({ text: p, idx: si * 1000 + pi })))
      : passage.paragraphs.map((p, i) => ({ text: p, idx: i }))
    setReading(true)
    import('../lib/speech').then((m) => {
      m.speakSentences(
        paras.map((x) => x.text),
        { onEnd: () => setReading(false), audioUrls: paras.map((x) => paraAudio(passage.id, x.idx)) },
      )
    })
  }

  if (err) return <section className="card"><h2>⚠️ {err}</h2></section>
  if (!index) return <section className="card"><div className="hint">{empty}</div></section>

  const openArticle = (id: string) => {
    loadArticle(id).then((p) => {
      setPassage(p)
      markLibraryRead(id)
      if (daily && dailyId === id) awardXp(8, { daily: true })
      const next = new URLSearchParams(sp)
      next.set('id', id)
      setSp(next, { replace: true })
    })
  }

  const dailyId = daily ? pickDailyId(index.items.map((it) => it.id)) : null
  const dailyItem = dailyId ? index.items.find((it) => it.id === dailyId) : undefined

  const items = (
    index.type === 'ted-lessons'
      ? [...index.items] // TED 笔记按专辑顺序展示,不按年份排序
      : [...index.items].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.id < a.id ? 1 : -1))
  ).filter((it) => {
    const f = flags[it.id]
    if (filter === 'fav') return !!f?.fav
    if (filter === 'unread') return !f?.read
    return true
  })

  const title =
    index.type === 'cet6-passages' ? '📝 CET-6 真题语篇' : index.type === 'ted-lessons' ? '🎤 TED 主题' : '📰 外刊文章'
  let lastGroup = ''
  void dv

  return (
    <div className="lib-layout">
      <section className="card lib-col">
        <div className="card-head">
          <h2>{title}</h2>
          <span className="tag">{index.items.length} 篇</span>
        </div>
        <p className="hint">{index.source} · 点击文章进入精读,点击单词查义,支持朗读。</p>
        {daily && dailyItem && (
          <button className="daily-card" onClick={() => openArticle(dailyItem.id)}>
            <span className="tag">📅 今日一篇</span>
            <b>{dailyItem.title}</b>
            <span className="dim">
              {dailyItem.journal ?? ''} {dailyItem.wordCount ? `· ${dailyItem.wordCount} 词` : ''}
            </span>
          </button>
        )}
        <div className="row-btns" style={{ margin: '8px 0' }}>
          {(['all', 'unread', 'fav'] as const).map((k) => (
            <button
              key={k}
              className={'btn small ' + (filter === k ? '' : 'ghost')}
              onClick={() => {
                const next = new URLSearchParams(sp)
                if (k === 'all') next.delete('filter')
                else next.set('filter', k)
                setSp(next, { replace: true })
              }}
            >
              {k === 'all' ? '全部' : k === 'unread' ? '未读' : '⭐ 收藏'}
            </button>
          ))}
        </div>
        <div className="lib-list">
          {items.map((it) => {
            const groupHeader = it.group && it.group !== lastGroup ? it.group : ''
            lastGroup = it.group ?? lastGroup
            const f = flags[it.id]
            return (
              <div key={it.id}>
                {groupHeader && <div className="lib-group">{groupHeader}</div>}
                <button
                  className={'lib-item' + (passage?.id === it.id ? ' on' : '')}
                  onClick={() => openArticle(it.id)}
                >
                  <span className="dim">{it.year ? it.year + ' · ' : ''}{it.journal ?? ''}</span>
                  <span className="lib-title">
                    {f?.fav ? '⭐ ' : ''}
                    {it.title}
                  </span>
                  <span className="dim">
                    {f?.read ? '已读 · ' : '未读 · '}
                    {it.difficulty ? `${it.difficulty} · ` : ''}
                    {it.wordCount ?? ''} 词
                  </span>
                </button>
              </div>
            )
          })}
          {items.length === 0 && <p className="hint">该筛选下暂无文章。</p>}
        </div>
      </section>

      <section className="card lib-col">
        {!passage ? (
          <div className="hint">← 选择一篇文章开始精读</div>
        ) : (
          <div>
            <div className="card-head">
              <div>
                <h2>{passage.title}</h2>
                <span className="tag">
                  {passage.group ? passage.group + ' · ' : ''}
                  {passage.source ?? passage.journal ?? ''} {passage.difficultyLabel ? `· ${passage.difficultyLabel}` : ''}{' '}
                  {passage.wordCount ? `· ${passage.wordCount} 词` : ''}
                </span>
              </div>
              <div className="row-btns" style={{ margin: 0 }}>
                <button
                  className={'btn small ' + (flags[passage.id]?.fav ? '' : 'ghost')}
                  onClick={() => toggleLibraryFav(passage.id)}
                >
                  {flags[passage.id]?.fav ? '⭐ 已收藏' : '☆ 收藏'}
                </button>
                <button className="btn" onClick={readFull}>
                  {reading ? '⏹ 停止朗读' : '🔊 朗读全文'}
                </button>
              </div>
            </div>
            <WordLevelLegend on={levelOn} loading={loading} onChange={setLevelOn} />
            <p className="hint">
              点击单词查义;段落右上角 🔊 逐段朗读
              {index.type === 'ted-lessons' ? '。TED 笔记已含中英对照与讲解。' : ';每段可展开「🌐 翻译与讲解」(需配置 AI,结果本地缓存)。'}
            </p>
            {passage.sections && passage.sections.length > 0 ? (
              passage.sections.map((sec, si) => (
                <div key={si} className="passage-section">
                  <h4>{sec.heading}</h4>
                  {sec.paragraphs.map((p, pi) => (
                    <ParagraphBlock
                      key={pi}
                      passageId={passage.id}
                      idx={si * 1000 + pi}
                      text={p}
                      onWord={onWord}
                      levelOf={levelOf}
                      allowAnnotate={index.type !== 'ted-lessons'}
                      audioUrl={paraAudio(passage.id, si * 1000 + pi)}
                    />
                  ))}
                </div>
              ))
            ) : (
              passage.paragraphs.map((p, i) => (
                <ParagraphBlock
                  key={i}
                  passageId={passage.id}
                  idx={i}
                  text={p}
                  onWord={onWord}
                  levelOf={levelOf}
                  allowAnnotate={index.type !== 'ted-lessons'}
                  audioUrl={paraAudio(passage.id, i)}
                />
              ))
            )}
            {passage.questions && passage.questions.length > 0 && (
              <PassageQuiz questions={passage.questions} />
            )}
          </div>
        )}
      </section>
    </div>
  )
}
