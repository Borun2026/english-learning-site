import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import type { AppContext } from '../App'
import WordText from '../components/WordText'
import WordLevelLegend from '../components/WordLevelLegend'
import { passageWavUrl } from '../lib/audio'
import { loadZhentiArticle } from '../lib/zhenti'
import { chatJSON, getAiConfig } from '../lib/ai/provider'
import { useWordLevelMarks, type WordLevelMark } from '../lib/wordLevel'
import type { ZhentiArticle } from '../lib/types'

export default function ZhentiReader() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { openPopup, onSpeak } = useOutletContext<AppContext>()
  const [article, setArticle] = useState<ZhentiArticle | null>(null)
  const [err, setErr] = useState('')
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [aiLoading, setAiLoading] = useState<number | null>(null)
  const [aiNotes, setAiNotes] = useState<Record<number, string>>({})
  const [levelOn, setLevelOn] = useState(false)
  const aiReady = !!getAiConfig().apiKey

  useEffect(() => {
    setArticle(null)
    setErr('')
    setAnswers({})
    setSubmitted(false)
    setAiNotes({})
    setAiLoading(null)
    loadZhentiArticle(id).then((a) => {
      if (a) setArticle(a)
      else setErr('未找到该真题')
    }).catch((e) => setErr(e instanceof Error ? e.message : '加载失败'))
  }, [id])

  const isCloze = article?.section === 'cloze'

  const passageText = useMemo(
    () => (article ? article.sentences.map((s) => s.text).join(' ') : ''),
    [article],
  )
  const { marks, loading } = useWordLevelMarks(passageText, levelOn)
  const levelOf = useMemo(() => (marks ? (w: string) => marks.get(w) : undefined), [marks])

  const hasAnswer = (q: ZhentiArticle['questions'][number]) =>
    q.answer != null && q.answer >= 0

  const scoredTotal = useMemo(
    () => (article ? article.questions.filter(hasAnswer).length : 0),
    [article],
  )

  const score = useMemo(() => {
    if (!article) return 0
    return article.questions.reduce(
      (acc, q, i) => (hasAnswer(q) ? acc + (answers[i] === q.answer ? 1 : 0) : acc),
      0,
    )
  }, [article, answers])

  const pick = (qi: number, oi: number) => {
    if (submitted) return
    setAnswers((a) => ({ ...a, [qi]: oi }))
  }

  const submit = () => setSubmitted(true)
  const reset = () => {
    setAnswers({})
    setSubmitted(false)
    setAiNotes({})
  }

  const askAi = async (qi: number) => {
    if (!article) return
    setAiLoading(qi)
    try {
      const q = article.questions[qi]
      const mine = answers[qi] != null ? String.fromCharCode(65 + answers[qi]) : '未选'
      const correct = hasAnswer(q) ? String.fromCharCode(65 + q.answer) : '未知'
      const passage = article.sentences.map((s) => s.text).join(' ').slice(0, 3000)
      const note = await chatJSON<{ explain: string }>(
        getAiConfig(),
        '你是考研英语老师,用中文讲解考研英语真题题目,简洁有重点。',
        `题目: ${q.q}\n选项: ${q.options.join(' | ')}\n我的选择: ${mine}\n正确答案: ${correct}\n原文(截取): ${passage}\n输出 JSON: {"explain":"中文讲解"}`,
      )
      setAiNotes((n) => ({ ...n, [qi]: note.explain }))
    } catch (e) {
      setAiNotes((n) => ({ ...n, [qi]: 'AI 讲解失败: ' + (e as Error).message.slice(0, 60) }))
    }
    setAiLoading(null)
  }

  if (err) return <section className="card"><h2>⚠️ {err}</h2></section>
  if (!article) return <section className="card"><div className="hint">加载中…</div></section>

  const answeredCount = Object.keys(answers).length
  const total = article.questions.length
  const unscored = total - scoredTotal

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>
            📝 {article.year} 年 · {isCloze ? '完形填空' : article.title}
          </h2>
          <span className="tag">{article.source}</span>
        </div>
        <button className="btn ghost" onClick={() => navigate('/zhenti')}>
          ← 真题列表
        </button>
      </div>

      <div className="goal-banner">
        <b>{isCloze ? '完形填空' : '阅读理解'}</b>
        <span className="dim">
          {' '}
          · 已答 {answeredCount}/{total} {submitted ? `· 得分 ${score}/${scoredTotal}` : ''}
          {submitted && unscored > 0 ? ` · ${unscored} 题暂缺答案不计分` : ''}
        </span>
      </div>

      <WordLevelLegend on={levelOn} loading={loading} onChange={setLevelOn} />

      <div className="zhenti-layout">
        {/* 左:文章 */}
        <div className="zhenti-article">
          {article.sentences.map((s, i) => (
            <div key={i} className="sentence-block">
              {isCloze ? (
                <ClozeText sentence={s.text} answers={answers} onPick={pick} submitted={submitted} levelOf={levelOf} />
              ) : (
                <div className="sentence">
                  <WordText text={s.text} onWord={openPopup} levelOf={levelOf} />
                  <span className="sentence-x" onClick={() => onSpeak(s.text, undefined, passageWavUrl('zhenti', article.id, i))}>
                    🔊
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 右:题目 */}
        <div className="zhenti-questions">
          {article.questions.map((q, qi) => (
            <div key={qi} id={`zq-${qi}`} className="zq">
              <div className="zq-q">
                {qi + 1}. {q.q}
              </div>
              <div className="zq-opts">
                {q.options.map((o, oi) => {
                  let cls = 'zq-opt'
                  if (submitted) {
                    if (!hasAnswer(q)) {
                      if (oi === answers[qi]) cls += ' chosen'
                      else cls += ' dim'
                    } else if (oi === q.answer) cls += ' right'
                    else if (oi === answers[qi]) cls += ' wrong'
                    else cls += ' dim'
                  } else if (answers[qi] === oi) cls += ' chosen'
                  return (
                    <button key={oi} className={cls} disabled={submitted} onClick={() => pick(qi, oi)}>
                      {String.fromCharCode(65 + oi)}. {o}
                    </button>
                  )
                })}
              </div>
              {submitted && !hasAnswer(q) && (
                <div className="zq-analysis dim">本题答案待补全,已不计分。</div>
              )}
              {submitted && hasAnswer(q) && q.analysis && <div className="zq-analysis">📖 {q.analysis}</div>}
              <div className="zq-ai">
                {aiReady && (
                  <button className="btn small ghost" onClick={() => askAi(qi)} disabled={aiLoading === qi}>
                    {aiLoading === qi ? '讲解中…' : '🤖 问 AI'}
                  </button>
                )}
                {aiNotes[qi] && <div className="zq-ainote">{aiNotes[qi]}</div>}
              </div>
            </div>
          ))}

          <div className="row-btns">
            {!submitted ? (
              <button className="btn" disabled={answeredCount < total} onClick={submit}>
                交卷({answeredCount}/{total})
              </button>
            ) : (
              <>
                <span className={'score-badge ' + (score === scoredTotal ? 'full' : '')}>
                  {score === scoredTotal ? '🌟 满分!' : `得分 ${score}/${scoredTotal}`}
                </span>
                <button className="btn ghost" onClick={reset}>
                  🔄 重做
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function ClozeText({
  sentence,
  answers,
  onPick: _onPick,
  submitted: _submitted,
  levelOf,
}: {
  sentence: string
  answers: Record<number, number>
  onPick: (qi: number, oi: number) => void
  submitted: boolean
  levelOf?: (w: string) => WordLevelMark | undefined
}) {
  const parts = sentence.split(/(___\d+___)/g)
  return (
    <div className="sentence cloze-line">
      {parts.map((p, i) => {
        const m = p.match(/^___(\d+)___$/)
        if (!m) return <WordText key={i} text={p} levelOf={levelOf} />
        const no = parseInt(m[1], 10)
        const chosen = answers[no - 1]
        let cls = 'cloze-blank'
        if (chosen != null) cls += ' filled'
        return (
          <button
            key={i}
            className={cls}
            onClick={() => {
              const el = document.getElementById(`zq-${no - 1}`)
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              el?.classList.add('flash')
              setTimeout(() => el?.classList.remove('flash'), 1200)
            }}
            title={chosen != null ? `已选 ${String.fromCharCode(65 + chosen)}` : `第 ${no} 题`}
          >
            {chosen != null ? String.fromCharCode(65 + chosen) : `${no}`}
          </button>
        )
      })}
    </div>
  )
}
