import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { findUnit, loadArticle, loadDialogue, loadExam, loadGrammar, loadIndex, loadListen } from '../lib/curriculum'
import { prefetchNearby } from '../lib/prefetch'
import { awardXp } from '../lib/stats'
import { getProgress, setProgress, useDataVersion } from '../lib/storage'
import type { Article, ExamSet, GoalDialogue, GrammarLesson, ListenChallenge, UnitDef } from '../lib/types'
import type { AppContext } from '../App'
import ExamView from '../views/ExamView'
import GrammarView from '../views/GrammarView'
import GoalDialogueView from '../views/GoalDialogueView'
import ListenView from '../views/ListenView'
import ReaderView from '../views/ReaderView'
import VocabView from '../views/VocabView'

type StepKey = 'vocab' | 'grammar' | 'article' | 'dialogue' | 'listen' | 'exam'

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'vocab', label: '① 词汇预习' },
  { key: 'grammar', label: '② 语法课' },
  { key: 'article', label: '③ 语法精读' },
  { key: 'dialogue', label: '④ 目标对话' },
  { key: 'listen', label: '⑤ 听力挑战' },
  { key: 'exam', label: '⑥ 真题演练' },
]

export default function UnitPlayer() {
  const { unitId = '' } = useParams()
  const [sp, setSp] = useSearchParams()
  const navigate = useNavigate()
  const { openPopup, onSpeak } = useOutletContext<AppContext>()
  useDataVersion()
  const rawStep = sp.get('step')
  const step: StepKey = STEPS.some((s) => s.key === rawStep) ? (rawStep as StepKey) : 'vocab'
  const [unit, setUnit] = useState<UnitDef | null>(null)
  const [nextUnit, setNextUnit] = useState<UnitDef | null>(null)
  const [grammar, setGrammar] = useState<GrammarLesson | null>(null)
  const [article, setArticle] = useState<Article | null>(null)
  const [dialogue, setDialogue] = useState<GoalDialogue | null>(null)
  const [listen, setListen] = useState<ListenChallenge | null>(null)
  const [exam, setExam] = useState<ExamSet | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    setUnit(null)
    setNextUnit(null)
    setGrammar(null)
    setArticle(null)
    setDialogue(null)
    setListen(null)
    setExam(null)
    loadIndex()
      .then((idx) => {
        const u = findUnit(idx, unitId)
        if (!u) {
          setError(`未找到单元:${unitId}`)
          return
        }
        setUnit(u)
        const all = idx.stages.flatMap((s) => s.units)
        const i = all.findIndex((x) => x.id === unitId)
        setNextUnit(i >= 0 && i < all.length - 1 ? all[i + 1] : null)
        loadGrammar(unitId).then(setGrammar)
        loadArticle(unitId).then(setArticle)
        loadDialogue(unitId).then(setDialogue)
        loadListen(unitId).then(setListen)
        loadExam(unitId).then(setExam)
        prefetchNearby(unitId)
      })
      .catch((e) => setError((e as Error).message))
  }, [unitId])

  if (error) {
    return (
      <section className="card">
        <div className="card-head">
          <h2>⚠️ {error}</h2>
        </div>
        <button className="btn ghost" onClick={() => navigate('/')}>
          ← 返回首页
        </button>
      </section>
    )
  }
  if (!unit) {
    return (
      <section className="card">
        <div className="hint">加载中…</div>
      </section>
    )
  }

  const mark = (patch: Parameters<typeof setProgress>[1], xp = 5) => {
    const before = getProgress(unitId)
    const already =
      ('vocab' in patch && !!before?.vocab) ||
      ('grammar' in patch && !!before?.grammar?.done) ||
      ('article' in patch && !!before?.article) ||
      ('dialogue' in patch && !!before?.dialogue?.done) ||
      ('listen' in patch && !!before?.listen?.done) ||
      ('exam' in patch && !!before?.exam?.done)
    setProgress(unitId, patch)
    if (already) return
    const p = getProgress(unitId)
    const unitDone = !!(p && p.vocab && !!p.grammar?.done && p.article && !!p.dialogue?.done && !!p.listen?.done && p.exam?.done)
    awardXp(xp, unitDone ? { unit: true } : {})
  }

  const progress = getProgress(unitId)
  const stepDone: Record<StepKey, boolean> = {
    vocab: !!progress?.vocab,
    grammar: !!progress?.grammar?.done,
    article: !!progress?.article,
    dialogue: !!progress?.dialogue?.done,
    listen: !!progress?.listen?.done,
    exam: !!progress?.exam?.done,
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{unit.title}</h2>
          <span className="tag">
            阶段 {unit.stage} · {unit.id} · 语法:{unit.grammarTopic}
          </span>
        </div>
        <div className="row-btns">
          {nextUnit && (
            <button className="btn ghost" onClick={() => navigate(`/unit/${nextUnit.id}`)}>
              下一单元 →
            </button>
          )}
          <button className="btn ghost" onClick={() => navigate('/')}>
            ← 首页目录
          </button>
        </div>
      </div>

      <div className="unit-steps">
        {STEPS.map((s) => (
          <button
            key={s.key}
            className={'ustep' + (step === s.key ? ' on' : '') + (stepDone[s.key] ? ' done' : '')}
            onClick={() => setSp({ step: s.key })}
          >
            {s.label}
            {stepDone[s.key] && ' ✅'}
          </button>
        ))}
      </div>

      <div className="step-body">
        {step === 'vocab' && (
          <VocabView
            words={article?.newWords ?? []}
            onSpeak={onSpeak}
            onComplete={() => {
              mark({ vocab: true })
              setSp({ step: 'grammar' })
            }}
          />
        )}
        {step === 'grammar' &&
          (grammar ? (
            <GrammarView
              lesson={grammar}
              exam={exam}
              onComplete={(score, total) =>
                mark({ grammar: { done: true, quizScore: score, quizTotal: total } })
              }
              onOpenExam={() => setSp({ step: 'exam' })}
            />
          ) : (
            <div className="hint">本单元语法课内容待补充</div>
          ))}
        {step === 'article' &&
          (article ? (
            <ReaderView
              article={article}
              onWord={openPopup}
              onSpeak={onSpeak}
              onComplete={() => mark({ article: true })}
              onOpenGrammar={() => setSp({ step: 'grammar' })}
              onOpenExam={() => setSp({ step: 'exam' })}
            />
          ) : (
            <div className="hint">本单元文章内容待补充</div>
          ))}
        {step === 'dialogue' &&
          (dialogue ? (
            <GoalDialogueView
              dialogue={dialogue}
              onWord={openPopup}
              onSpeak={onSpeak}
              onComplete={(success, rounds) => mark({ dialogue: { done: true, success, rounds } })}
            />
          ) : (
            <div className="hint">本单元对话内容待补充</div>
          ))}
        {step === 'listen' &&
          (listen ? (
            <ListenView
              challenge={listen}
              onWord={openPopup}
              onSpeak={onSpeak}
              onComplete={(score, total) => mark({ listen: { done: true, score, total } })}
            />
          ) : (
            <div className="hint">本单元听力内容待补充</div>
          ))}
        {step === 'exam' &&
          (exam ? (
            <ExamView
              key={unitId}
              exam={exam}
              onComplete={(score, total) => mark({ exam: { done: true, score, total } })}
              onReview={() => setSp({ step: 'grammar' })}
              onNextUnit={() => navigate(nextUnit ? `/unit/${nextUnit.id}` : '/')}
              nextLabel={nextUnit ? '下一单元 →' : '返回首页'}
              onOpenTree={(point) => {
                // 真题考点:优先精确节点(g-xxx);真实考研题(zhenti:...)回退到本单元语法地图节点
                const target = point.startsWith('g-') ? point : grammar?.grammarId ?? `g-${unitId}`
                navigate(`/grammar?node=${target}`)
              }}
            />
          ) : (
            <div className="hint">本单元真题组待补充(标准单元应包含 exam.json)</div>
          ))}
      </div>
    </section>
  )
}
