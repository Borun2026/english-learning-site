import type { GrammarPoint } from '../lib/types'

export default function GrammarBlock({ points, compact = false }: { points: GrammarPoint[]; compact?: boolean }) {
  if (!points || points.length === 0) return null
  return (
    <div className="grammar-list">
      {points.map((g, i) => (
        <details key={i} className="grammar-item" open={compact}>
          <summary>📌 {g.name}</summary>
          <p>{g.note}</p>
          {g.example && (
            <p className="g-ex">
              {g.example}
              <br />
              <span className="dim">{g.exampleCn}</span>
            </p>
          )}
        </details>
      ))}
    </div>
  )
}
