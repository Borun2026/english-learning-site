import type { ArticleSentence } from '../lib/types'
import GrammarBlock from './GrammarBlock'

export default function SentenceBreakdown({ sentence }: { sentence: ArticleSentence }) {
  return (
    <div className="breakdown">
      <section className="bd-section">
        <h4 className="bd-section-title">🧩 结构拆解</h4>
        <div className="chunks">
          {sentence.chunks.map((c, ci) => (
            <div key={ci} className="chunk" style={{ borderLeftColor: c.color }}>
              <span className="chunk-label" style={{ background: c.color }}>
                {c.label}
              </span>
              <span className="chunk-text">{c.text}</span>
              {c.parts && (
                <div className="parts">
                  {c.parts.map((p, pi) => (
                    <span key={pi} className="part">
                      <b>{p.role}</b> {p.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="bd-section">
        <h4 className="bd-section-title">💬 中文译文</h4>
        <div className="translation">{sentence.translation}</div>
      </section>
      {sentence.grammar.length > 0 && (
        <section className="bd-section">
          <h4 className="bd-section-title">📌 语法要点</h4>
          <GrammarBlock points={sentence.grammar} />
        </section>
      )}
    </div>
  )
}
