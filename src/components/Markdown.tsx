import type { ReactNode } from 'react'

/** 极简 Markdown 内联渲染:支持 **粗体**、`行内代码`、*斜体* */
export function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <b key={i}>{p.slice(2, -2)}</b>
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={i}>{p.slice(1, -1)}</code>
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <i key={i}>{p.slice(1, -1)}</i>
    return p
  })
}

function isTableSeparator(line: string): boolean {
  return line.includes('-') && /^\s*\|?[\s:|-]+\|[\s:|-]+\|?\s*$/.test(line)
}

/** 渲染 Markdown:支持 ## 标题、粗体、无序/有序列表、简单表格 */
export function renderMarkdown(text: string): ReactNode {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  let table: string[][] | null = null
  let key = 0

  const flushList = () => {
    if (!list) return
    const items = list.items.map((it, i) => <li key={i}>{renderInline(it)}</li>)
    blocks.push(list.ordered ? <ol key={key++}>{items}</ol> : <ul key={key++}>{items}</ul>)
    list = null
  }

  const flushTable = () => {
    if (!table) return
    const rows = table.filter((cells) => cells.some((c) => c.trim() !== ''))
    blocks.push(
      <table key={key++} className="grammar-table">
        <tbody>
          {rows.map((cells, ri) => (
            <tr key={ri}>
              {cells.map((c, ci) => (
                <td key={ci}>{renderInline(c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>,
    )
    table = null
  }

  for (const line of lines) {
    const t = line.trim()
    if (t.startsWith('##')) {
      flushList()
      flushTable()
      blocks.push(<h4 key={key++}>{t.replace(/^#+\s*/, '')}</h4>)
    } else if (isTableSeparator(t)) {
      /* 跳过表格分隔行 |---|---| */
    } else if (t.startsWith('|') && t.endsWith('|')) {
      flushList()
      if (!table) table = []
      table.push(t.split('|').slice(1, -1).map((c) => c.trim()))
    } else if (/^[-*]\s+/.test(t)) {
      flushTable()
      if (!list || list.ordered) {
        flushList()
        list = { ordered: false, items: [] }
      }
      list.items.push(t.replace(/^[-*]\s+/, ''))
    } else if (/^\d+[.)]\s+/.test(t)) {
      flushTable()
      if (!list || !list.ordered) {
        flushList()
        list = { ordered: true, items: [] }
      }
      list.items.push(t.replace(/^\d+[.)]\s+/, ''))
    } else {
      flushList()
      flushTable()
      if (t === '') blocks.push(<br key={key++} />)
      else blocks.push(<p key={key++}>{renderInline(t)}</p>)
    }
  }
  flushList()
  flushTable()
  return blocks
}
