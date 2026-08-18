import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import WordText from '../components/WordText'
import WordLevelLegend from '../components/WordLevelLegend'
import SentenceBreakdown from '../components/SentenceBreakdown'
import { speak, speakSentences, stopSpeech } from '../lib/speech'
import { useWordLevelMarks } from '../lib/wordLevel'
import { loadNceLinks } from '../lib/curriculum'
import { articleWavUrls } from '../lib/audio'
import ShadowRead from '../components/ShadowRead'
import type { Article, NceLink, SentenceExercise } from '../lib/types'

export default function ReaderView({
  article,
  onWord,
  onSpeak,
  onComplete,
  onOpenGrammar,
  onOpenExam,
}: {
  article: Article
  onWord: (e: React.MouseEvent<HTMLElement>, w: string) => void
  onSpeak: (w: string) => void
  onComplete: () => void
  onOpenGrammar?: () => void
  onOpenExam?: () => void
}) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [hlIdx, setHlIdx] = useState<number | null>(null)
  const [hlSentence, setHlSentence] = useState<number | null>(null)
  const [reading, setReading] = useState(false)
  const [done, setDone] = useState(false)
  const [levelOn, setLevelOn] = useState(false)
  const [nceLinks, setNceLinks] = useState<NceLink[] | null>(null)
  const [articleWavs, setArticleWavs] = useState<(string | undefined)[]>([])

  // 切换文章/离开页面时停止朗读并复位高亮
  useEffect(() => {
    return () => stopSpeech()
  }, [article.unitId])

  // P5-4:加载本地预生成文章音频(逐句 wav,缺则回退在线引擎)
  useEffect(() => {
    let alive = true
    articleWavUrls(article.unitId, article.sentences.length).then((urls) => {
      if (alive) setArticleWavs(urls)
    })
    return () => {
      alive = false
    }
  }, [article.unitId, article.sentences.length])

  useEffect(() => {
    let alive = true
    loadNceLinks()
      .then((f) => {
        if (alive) setNceLinks(f.links[article.unitId] ?? [])
      })
      .catch(() => {
        if (alive) setNceLinks([])
      })
    return () => {
      alive = false
    }
  }, [article.unitId])

  const wordCounts = useMemo(() => article.sentences.map((s) => s.text.split(' ').length), [article])
  const fullText = useMemo(() => article.sentences.map((s) => s.text).join(' '), [article])
  const { marks, loading } = useWordLevelMarks(fullText, levelOn)
  const levelOf = useMemo(() => (marks ? (w: string) => marks.get(w) : undefined), [marks])
  // 当前朗读句(供 onBoundary 把句内 charIndex 换算成全文词下标)
  const readingSentenceRef = useRef(0)

  const readFull = () => {
    if (reading) {
      stopSpeech()
      setReading(false)
      setHlIdx(null)
      setHlSentence(null)
      return
    }
    setReading(true)
    // P5-1:全文朗读改逐句队列 + 句级高亮;P5-4:优先本地预生成 wav,缺则在线引擎
    speakSentences(
      article.sentences.map((s) => s.text),
      {
        audioUrls: articleWavs,
        onSentence: (i) => {
          readingSentenceRef.current = i
          setHlSentence(i)
          setHlIdx(null)
        },
        onBoundary: (ci) => {
          // 逐句朗读的 charIndex 是句内偏移:换算成该句词下标,再叠加全文偏移
          const text = article.sentences[readingSentenceRef.current]?.text ?? ''
          let cursor = 0
          let local = -1
          text.split(' ').forEach((w, wi) => {
            const start = text.indexOf(w, cursor)
            if (ci >= start && ci < start + w.length) local = wi
            cursor = start + w.length
          })
          if (local >= 0) {
            const globalStart = wordCounts.slice(0, readingSentenceRef.current).reduce((a, b) => a + b, 0)
            setHlIdx(globalStart + local)
          }
        },
        onEnd: () => {
          setReading(false)
          setHlIdx(null)
          setHlSentence(null)
        },
      },
    )
  }

  const finish = () => {
    setDone(true)
    onComplete()
  }

  return (
    <div>
      <div className="card-head">
        <div>
          <h2>📖 {article.title}</h2>
          <span className="tag">
            新词 {article.newWords.length} 个 · 点击句子展开逐句语法讲解 · 点击词查义
          </span>
          {article.source && <span className="tag">📚 {article.source}</span>}
        </div>
        <button className="btn" onClick={readFull}>
          {reading ? '⏹ 停止朗读' : '🔊 朗读全文'}
        </button>
      </div>

      <WordLevelLegend on={levelOn} loading={loading} onChange={setLevelOn} />

      {article.sentences.map((s, si) => {
        const globalStart = wordCounts.slice(0, si).reduce((a, b) => a + b, 0)
        const open = expanded === si
        return (
          <div key={si} className="sentence-block">
            <div
              className={'sentence' + (open ? ' active' : '') + (hlSentence === si ? ' reading' : '')}
              onClick={() => setExpanded(open ? null : si)}
              title={open ? '收起讲解' : '点击展开逐句语法讲解'}
            >
              <WordText text={s.text} hlIdx={hlIdx} hlStart={globalStart} onWord={onWord} levelOf={levelOf} />
              <button
                className="icon-btn sentence-x"
                title="朗读本句"
                onClick={(e) => {
                  e.stopPropagation()
                  speak(s.text, { audioUrl: articleWavs[si] })
                }}
              >
                🔊
              </button>
              <span onClick={(e) => e.stopPropagation()}>
                <ShadowRead text={s.text} />
              </span>
            </div>
            {open && (
              <>
                {s.grammarTags && s.grammarTags.length > 0 && (
                  <div className="grammar-tags">
                    <h4 className="bd-section-title">📌 本句考点</h4>
                    <div className="grammar-tags-list">
                      {s.grammarTags.map((t, ti) => (
                        <button
                          key={ti}
                          className="grammar-tag"
                          onClick={onOpenGrammar}
                          title="跳转到本单元语法课"
                        >
                          📌 {t.name}
                          <span className="grammar-tag-phrase">{t.phrase}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <SentenceBreakdown sentence={s} />
                {s.exercises && s.exercises.length > 0 && <SentenceExercises exercises={s.exercises} />}
              </>
            )}
          </div>
        )
      })}

      {article.lessonGrammar && article.lessonGrammar.length > 0 && (
        <div className="card lesson-summary">
          <h4>📚 本课语法速览</h4>
          <p className="hint">本课文章用到的语法点,点击可回到语法课复习完整讲解。</p>
          {article.lessonGrammar.map((g, gi) => (
            <div key={gi} className="lesson-summary-item">
              <button className="grammar-tag" onClick={onOpenGrammar}>
                📌 {g.name}
              </button>
              <div className="rec-npc">
                <div>{g.sourceExample}</div>
                <div className="dim">{g.sourceExampleCn}</div>
              </div>
              <div className="dim" style={{ fontSize: 13 }}>
                {g.note}
              </div>
            </div>
          ))}
        </div>
      )}

      {nceLinks && nceLinks.length > 0 && (
        <div className="nce-extend">
          <h4>📗 扩展阅读:NCE 笔记课</h4>
          <p className="hint">学完本篇可对照新概念英语同名语法点精讲笔记(课文原文仅本地个人学习使用,版权归原作者)。</p>
          {nceLinks.map((l) => (
            <Link key={l.id} className="gt-link-item" to="/library?tab=nce">
              {l.book.toUpperCase()} · {l.title} 语法笔记 →
            </Link>
          ))}
        </div>
      )}

      <div className="step-actions">
        <button className="btn" onClick={finish} disabled={done}>
          {done ? '✅ 已完成' : '完成阅读,标记进度'}
        </button>
        {article.examIds && article.examIds.length > 0 && onOpenExam && (
          <button className="btn ghost" onClick={onOpenExam}>
            📝 进入真题演练 →
          </button>
        )}
      </div>
    </div>
  )
}

function SentenceExercises({ exercises }: { exercises: SentenceExercise[] }) {
  const [open, setOpen] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})

  const isChoice = (e: SentenceExercise) => e.type === 'blank' || e.type === 'judge'
  const label = (e: SentenceExercise) =>
    e.type === 'blank' ? '✏️ 填空' : e.type === 'judge' ? '⚖️ 判断' : e.type === 'rewrite' ? '✍️ 仿写' : '🔄 回译'

  return (
    <div className="exercises">
      <button type="button" className="ex-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? `▾ 本句练习 (${exercises.length})` : `▸ 本句练习 (${exercises.length})`}
      </button>
      {open && exercises.map((e, ei) => {
        const mine = answers[ei]
        const showReveal = revealed[ei]
        return (
          <div key={ei} className="exercise">
            <div className="exercise-head">
              <span className="tag">{label(e)}</span>
              <span className="dim">{e.point}</span>
            </div>
            <div className="exercise-prompt">{e.prompt}</div>
            {isChoice(e) && (
              <div className="quiz-opts">
                {e.options?.map((o, oi) => {
                  let cls = 'quiz-opt'
                  if (mine != null) {
                    if (o === e.answer) cls += ' right'
                    else if (o === mine) cls += ' bad'
                    else cls += ' dim'
                  }
                  return (
                    <button key={oi} className={cls} disabled={mine != null} onClick={() => setAnswers((a) => ({ ...a, [ei]: o }))}>
                      {String.fromCharCode(65 + oi)}. {o}
                    </button>
                  )
                })}
              </div>
            )}
            {(e.type === 'rewrite' || e.type === 'translate') && (
              <button className="btn small ghost" onClick={() => setRevealed((r) => ({ ...r, [ei]: !r[ei] }))}>
                {showReveal ? '收起参考' : '显示参考回答'}
              </button>
            )}
            {showReveal && (
              <div className="exercise-answer">
                💬 {e.answer}
                <div className="dim">💡 {e.note}</div>
              </div>
            )}
            {mine != null && <div className="quiz-note">💡 {e.note}</div>}
          </div>
        )
      })}
    </div>
  )
}
