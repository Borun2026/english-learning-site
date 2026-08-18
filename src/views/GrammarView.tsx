import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GrammarQuiz from '../components/GrammarQuiz'
import { renderMarkdown } from '../components/Markdown'
import { passageWavUrl } from '../lib/audio'
import { loadGrammarRef, rulesOfUnit, type GrammarRule } from '../lib/grammarRef'
import { speak } from '../lib/speech'
import type { ExamSet, GrammarLesson } from '../lib/types'

export default function GrammarView({
  lesson,
  exam,
  onComplete,
  onOpenExam,
}: {
  lesson: GrammarLesson
  exam?: ExamSet | null
  onComplete: (score: number, total: number) => void
  onOpenExam?: () => void
}) {
  const [related, setRelated] = useState<GrammarRule[] | null>(null)

  useEffect(() => {
    let alive = true
    loadGrammarRef()
      .then((ref) => {
        if (alive) setRelated(rulesOfUnit(ref, lesson.id))
      })
      .catch(() => {
        if (alive) setRelated([])
      })
    return () => {
      alive = false
    }
  }, [lesson.id])

  const nodeId = lesson.grammarId ?? `g-${lesson.id}`

  return (
    <div>
      <div className="card-head">
        <div>
          <h2>📚 语法:{lesson.title}</h2>
          {lesson.cefr && <span className="tag">CEFR {lesson.cefr}</span>}
          {lesson.refs?.map((r, i) => (
            <span key={i} className="tag">
              📚 {r}
            </span>
          ))}
        </div>
      </div>

      <div className="gt-links">
        <Link className="btn small ghost" to={`/grammar?node=${nodeId}`}>
          🧭 在语法树查看本课考点 →
        </Link>
        {exam ? (
          <button className="btn small ghost" onClick={onOpenExam}>
            📝 本单元真题组 {exam.questions.length} 题 →
          </button>
        ) : (
          <span className="dim" style={{ fontSize: 13 }}>
            📝 本单元暂无真题组
          </span>
        )}
      </div>

      {related === null ? (
        <p className="hint">加载语法树关联规则中…</p>
      ) : related.length > 0 ? (
        <div className="gt-related">
          <h4>🧭 语法树相关规则({related.length})</h4>
          {related.map((r) => (
            <Link
              key={r.id}
              className="gt-link-item"
              to={`/grammar?node=${r.grammarId ?? nodeId}&rule=${r.id}`}
            >
              <b>📌 {r.text}</b>
              {r.topicCn && <span className="tag">📖 {r.topicCn}</span>}
              {r.note && <span className="dim"> · {r.note}</span>}
            </Link>
          ))}
        </div>
      ) : (
        <p className="hint">🧭 语法树暂无关联规则(不影响学习)。</p>
      )}

      <div className="grammar-lesson">{renderMarkdown(lesson.explanation)}</div>

      <h4>例句</h4>
      {lesson.examples.map((ex, i) => (
        <div key={i} className="g-ex">
          <span className="sentence-x" onClick={() => speak(ex.en, { audioUrl: passageWavUrl('grammar', lesson.id, i) })}>
            🔊
          </span>{' '}
          {ex.en}
          <br />
          <span className="dim">{ex.cn}</span>
          {ex.note && (
            <>
              <br />
              <span className="dim">💡 {ex.note}</span>
            </>
          )}
        </div>
      ))}

      <h4>常见错误</h4>
      {lesson.errors.map((er, i) => (
        <div key={i} className="g-ex err">
          ❌ {er.wrong}
          <br />✅ {er.right}
          <br />
          <span className="dim">💡 {er.note}</span>
        </div>
      ))}

      <GrammarQuiz quiz={lesson.quiz} onDone={onComplete} />
    </div>
  )
}
