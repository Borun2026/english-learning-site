import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadData, removeMyArticle } from '../lib/storage'

export default function MyArticles() {
  const [items, setItems] = useState(loadData().myArticles)
  const navigate = useNavigate()

  const refresh = () => setItems([...loadData().myArticles])

  const del = (id: string, title: string) => {
    if (!window.confirm(`确定删除「${title}」吗?删除后不可恢复。`)) return
    removeMyArticle(id)
    refresh()
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>🗂 我的文章({items.length})</h2>
        <span className="tag">来自 AI 解析并保存的文章</span>
      </div>
      {items.length === 0 ? (
        <p className="hint">
          还没有保存的文章。到「AI 解析」粘贴英文并点"保存到我的文章"后,会出现在这里。
        </p>
      ) : (
        <div className="record">
          {items.map((a) => (
            <div key={a.id} className="record-item my-article">
              <div>
                <b>{a.title}</b>
                <div className="dim">{new Date(a.createdAt).toLocaleString()}</div>
                <div className="dim">
                  {a.sentences.length} 句 · {a.sentences.reduce((s, x) => s + x.text.split(' ').length, 0)} 词
                </div>
              </div>
              <div className="row-btns" style={{ margin: 0 }}>
                <button className="btn small" onClick={() => navigate(`/ai-parse?open=${a.id}`)}>
                  打开
                </button>
                <button className="btn small ghost" onClick={() => del(a.id, a.title)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
