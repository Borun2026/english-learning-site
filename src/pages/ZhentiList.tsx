import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadZhentiIndex } from '../lib/zhenti'
import type { ZhentiIndex } from '../lib/types'

export default function ZhentiList() {
  const [index, setIndex] = useState<ZhentiIndex | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    loadZhentiIndex()
      .then(setIndex)
      .catch((e) => setErr((e as Error).message))
  }, [])

  if (err) return <section className="card"><h2>⚠️ {err}</h2></section>
  if (!index) return <section className="card"><div className="hint">加载真题目录…</div></section>

  return (
    <div>
      <section className="card">
        <div className="card-head">
          <h2>📝 真题专区</h2>
          <span className="tag">考研英语一 2005-2020 · 阅读 + 完形</span>
        </div>
        <p className="hint">真题为本地学习用途。点击进入做题:左侧文章可点词查义/拆句,右侧答题。完形点击空位选择。</p>
      </section>

      {index.years.map((y) => (
        <section key={y.year} className="card stage-card">
          <div className="stage-head">
            <h2>{y.year} 年</h2>
            <span className="dim">{y.items.length} 篇</span>
          </div>
          <div className="zhenti-grid">
            {y.items.map((it) => (
              <Link key={it.id} to={`/zhenti/${it.id}`} className="zhenti-card">
                <div className="zhenti-type">{it.section === 'cloze' ? '完形' : '阅读'}</div>
                <div className="zhenti-title">{it.title}</div>
                <div className="zhenti-go">▶</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
