import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { renderMarkdown } from '../components/Markdown'
import { loadExam } from '../lib/curriculum'
import {
  loadCefrProfile,
  loadGrammarCn,
  loadGrammarMap,
  loadGrammarRef,
  ruleById,
  rulesOfUnit,
  type GrammarBookChapter,
  type GrammarLevel,
  type GrammarRef,
  type GrammarRule,
  type GrammarTense,
} from '../lib/grammarRef'
import { MURPHY_GUIDE, TENSE_CN } from '../lib/grammarCn'
import type { CefrLevelProfile, ExamSet, GrammarCnFile, GrammarMapNode } from '../lib/types'

/** 外部数据渲染前的安全清洗:去掉脚本/iframe/事件属性 */
function sanitizeHtml(html: string): string {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
}

function scrollToEl(id: string, openDetails = false) {
  setTimeout(() => {
    const el = document.getElementById(id)
    if (!el) return
    if (openDetails && el instanceof HTMLDetailsElement) el.open = true
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('flash')
    setTimeout(() => el.classList.remove('flash'), 1600)
  }, 80)
}

type Tab = 'cefr' | 'murphy' | 'tenses' | 'book'

export default function GrammarTree() {
  const [sp] = useSearchParams()
  const nodeParam = sp.get('node') ?? ''
  const ruleParam = sp.get('rule') ?? ''
  const [data, setData] = useState<GrammarRef | null>(null)
  const [nodes, setNodes] = useState<GrammarMapNode[] | null>(null)
  const [exams, setExams] = useState<Record<string, ExamSet | null>>({})
  const [cefrLevels, setCefrLevels] = useState<CefrLevelProfile[]>([])
  const [cnBook, setCnBook] = useState<GrammarCnFile | null>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<Tab>('book')
  const [openRule, setOpenRule] = useState<string | null>(null)

  useEffect(() => {
    loadGrammarRef()
      .then(setData)
      .catch((e) => setErr((e as Error).message))
    loadGrammarMap()
      .then((m) => setNodes(m.nodes))
      .catch(() => setNodes([]))
    loadCefrProfile()
      .then((p) => setCefrLevels(p?.levels ?? []))
      .catch(() => setCefrLevels([]))
    loadGrammarCn()
      .then(setCnBook)
      .catch(() => setCnBook(null))
  }, [])

  // 中文语法书章节所属真题组(exam.json):48 个小文件并行加载,缺失显示"暂无"
  useEffect(() => {
    if (!data) return
    let alive = true
    Promise.all(data.book.chapters.map((c) => loadExam(c.unitId)))
      .then((list) => {
        if (!alive) return
        const rec: Record<string, ExamSet | null> = {}
        data.book.chapters.forEach((c, i) => {
          rec[c.unitId] = list[i]
        })
        setExams(rec)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [data])

  const node = nodes?.find((n) => n.id === nodeParam) ?? null

  // 深链:?rule= 直达具体规则;?node= 依次尝试映射规则 → 中文语法书章节
  useEffect(() => {
    if (!data || !nodes) return
    if (ruleParam) {
      const r = ruleById(data, ruleParam)
      if (r) {
        setTab('cefr')
        setOpenRule(r.id)
        scrollToEl(`gt-rule-${r.id}`)
      }
      return
    }
    if (!nodeParam) return
    const mapped = node?.unitId ? rulesOfUnit(data, node.unitId) : []
    if (mapped.length > 0) {
      setTab('cefr')
      setOpenRule(mapped[0].id)
      scrollToEl(`gt-rule-${mapped[0].id}`)
    } else if (node) {
      setTab('book')
      scrollToEl(`gt-chapter-${node.id}`, true)
    }
  }, [data, nodes, ruleParam, nodeParam, node])

  if (err) return <section className="card"><h2>⚠️ {err}</h2></section>
  if (!data) return <section className="card"><div className="hint">加载语法树…</div></section>

  return (
    <div>
      <section className="card">
        <div className="card-head">
          <h2>🧭 语法树 · 中文语法书</h2>
          <span className="tag">
            {data.book.chapters.length} 章中文讲解 · {data.stats.rules} 条 CEFR 规则 · Murphy {data.stats.murphyRules} 单元 · {data.stats.tenses} 时态
          </span>
        </div>
        <p className="hint">中文讲解来自本平台 48 单元语法课;英文规则树源自 Nikola-Ver/English-grammar-tree(已去除俄文),命中章节会附英文例句与易错点对照。</p>

        {nodeParam && (
          <div className="gt-node-banner">
            {node ? (
              <>
                <div>
                  <b>📍 考点:{node.name}</b>
                  <span className="dim">
                    {' '}
                    语法地图节点 {node.id}
                    {node.cefr ? ` · CEFR ${node.cefr}` : ''}
                  </span>
                </div>
                <div className="row-btns" style={{ justifyContent: 'flex-start' }}>
                  <Link className="btn small ghost" to={`/unit/${node.unitId}?step=grammar`}>
                    📖 单元语法课 →
                  </Link>
                  <Link className="btn small ghost" to={`/unit/${node.unitId}?step=exam`}>
                    📝 单元真题组 →
                  </Link>
                </div>
              </>
            ) : (
              <p className="hint">暂无该节点的关联信息,请从下方目录浏览(不报错)。</p>
            )}
          </div>
        )}

        <div className="tabs">
          {(
            [
              ['book', '📖 中文语法书'],
              ['cefr', 'CEFR 规则(A1-C2)'],
              ['murphy', 'Murphy 三册'],
              ['tenses', '时态速查'],
            ] as [Tab, string][]
          ).map(([k, label]) => (
            <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'book' && <BookView chapters={data.book.chapters} exams={exams} />}
        {tab !== 'book' && tab !== 'tenses' && (
          <>
            {tab === 'cefr' && (
              <p className="hint">
                🎯 中文引导:每个级别下方有「能做什么 / 进入与毕业标准 / 模块微目标」;点开规则即可看英文条目,
                命中本平台单元时可直接打开对应中文语法课。
              </p>
            )}
            {tab === 'murphy' && (
              <p className="hint">
                🎯 中文引导:Murphy 经典语法三册按「红书初级 → 蓝书中级 → 绿书高级」排列;每册下方有学习建议,
                建议与本平台中文语法书逐点对照、查漏补缺。
              </p>
            )}
            <LevelList
              levels={tab === 'cefr' ? data.levels : data.murphy}
              mode={tab === 'cefr' ? 'cefr' : 'murphy'}
              cefrLevels={cefrLevels}
              cnBook={cnBook}
              openRule={openRule}
              onOpenRule={setOpenRule}
              exams={exams}
            />
          </>
        )}
        {tab === 'tenses' && (
          <>
            <p className="hint">
              🎯 中文引导:12 个时态按「基本时态 → 进行时 → 完成时 → 将来系列」排列;每张卡片含中文名称、核心讲解、
              标志词中文说明与中文例句,对应单元可直接打开中文语法课。
            </p>
            <TenseGrid tenses={data.tenses} />
          </>
        )}
      </section>
    </div>
  )
}

function BookView({ chapters, exams }: { chapters: GrammarBookChapter[]; exams: Record<string, ExamSet | null> }) {
  const byStage = [1, 2, 3, 4, 5].map((s) => ({ stage: s, chapters: chapters.filter((c) => c.stage === s) }))
  return (
    <div>
      {byStage.map(({ stage, chapters: list }) => (
        <section key={stage} className="gt-level">
          <h3>阶段 {stage}</h3>
          {list.map((ch) => (
            <details key={ch.id} id={`gt-chapter-${ch.id}`} className="gt-cat book-chapter">
              <summary>
                {ch.title} {ch.cefr && <span className="tag">CEFR {ch.cefr}</span>}
                {ch.external.length > 0 && <span className="tag">英英对照 {ch.external.length} 条</span>}
                {exams[ch.unitId] ? (
                  <Link
                    className="tag"
                    style={{ textDecoration: 'none' }}
                    to={`/unit/${ch.unitId}?step=exam`}
                    onClick={(e) => e.stopPropagation()}
                    title="本单元真题组"
                  >
                    📝 真题组 {exams[ch.unitId]!.questions.length} 题
                  </Link>
                ) : (
                  <span className="tag">📝 暂无真题组</span>
                )}
                <Link
                  className="u-go"
                  style={{ float: 'right', textDecoration: 'none', fontSize: 13 }}
                  to={`/unit/${ch.unitId}?step=grammar`}
                  onClick={(e) => e.stopPropagation()}
                >
                  进入单元语法课 →
                </Link>
              </summary>
              <div className="grammar-lesson">{renderMarkdown(ch.explanation)}</div>
              <h4>例句</h4>
              {ch.examples.map((ex, i) => (
                <div key={i} className="g-ex">
                  {ex.en}
                  <br />
                  <span className="dim">{ex.cn}</span>
                </div>
              ))}
              {ch.errors.length > 0 && (
                <>
                  <h4>常见错误</h4>
                  {ch.errors.map((er, i) => (
                    <div key={i} className="g-ex err">
                      ❌ {er.wrong} <br />✅ {er.right}
                      <br />
                      <span className="dim">💡 {er.note}</span>
                    </div>
                  ))}
                </>
              )}
              {ch.external.length > 0 && (
                <>
                  <h4>英文规则对照(来自语法树)</h4>
                  {ch.external.map((r) => (
                    <div key={r.id} className="exercise">
                      <b>{r.text}</b>
                      {r.note && <div className="dim">{r.note}</div>}
                      {r.ex && r.ex.length > 0 && (
                        <ul className="gt-ex">
                          {r.ex.slice(0, 3).map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      )}
                      {r.mistakes && r.mistakes.length > 0 && (
                        <div className="g-ex err">
                          {r.mistakes.slice(0, 2).map((m, i) => (
                            <div key={i}>✏️ {m}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </details>
          ))}
        </section>
      ))}
    </div>
  )
}

function LevelList({
  levels,
  mode,
  cefrLevels,
  cnBook,
  openRule,
  onOpenRule,
  exams,
}: {
  levels: GrammarLevel[]
  mode: 'cefr' | 'murphy'
  cefrLevels: CefrLevelProfile[]
  cnBook: GrammarCnFile | null
  openRule: string | null
  onOpenRule: (id: string | null) => void
  exams: Record<string, ExamSet | null>
}) {
  return (
    <div>
      {levels.map((lv) => {
        const profile = mode === 'cefr' ? cefrLevels.find((l) => l.id === lv.id) : null
        const murphy = mode === 'murphy' ? MURPHY_GUIDE[lv.id] : null
        const cnSections = cnBook ? (mode === 'cefr' ? cnBook.cefr[lv.id] : cnBook.murphy[lv.id]) ?? [] : []
        return (
          <section key={lv.id} className="gt-level">
            <div className="card-head">
              <h3>
                {lv.id}
                {profile && <span className="tag"> {profile.name}</span>}
              </h3>
              <span className="dim">{lv.sub}</span>
            </div>
            {profile && (
              <div className="gt-cn-guide">
                <div>🎯 本级别:{profile.can}</div>
                <div className="dim">🚪 进入:{profile.entry}</div>
                <div className="dim">🎓 毕业:{profile.exit}</div>
                <div className="gt-cn-chips">
                  {profile.blocks.flatMap((b) => b.microGoals).map((g, i) => (
                    <span key={i} className="gt-cn-chip">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {murphy && (
              <div className="gt-cn-guide">
                <div>📗 {murphy.book}</div>
                <div className="dim">🎯 {murphy.levelCn}</div>
                <div className="dim">💡 {murphy.suggest}</div>
              </div>
            )}
            {lv.categories.map((c, ci) => {
              const cnSec = cnSections[ci]
              return (
                <details key={`${c.name}-${ci}`} className="gt-cat">
                  <summary>
                    {c.name} {cnSec && <span className="tag">{cnSec.cn}</span>}{' '}
                    <span className="dim">({c.rules.length})</span>
                  </summary>
                  <div className="gt-rules">
                    {cnSec && (
                      <div className="gt-cn-guide">
                        <b>📖 {cnSec.cn}</b>: {cnSec.guide}
                      </div>
                    )}
                    {c.rules.map((r) => {
                      const rcn = cnBook?.rules[r.text]
                      return (
                        <div key={r.id} id={`gt-rule-${r.id}`} className="gt-rule">
                          <button className="gt-rule-head" onClick={() => onOpenRule(openRule === r.id ? null : r.id)}>
                            <b>{r.text}</b>
                            {rcn && <span className="tag">{rcn.cn}</span>}
                            {r.unitId && (
                              <span className="tag" title="已映射到本平台中文语法课">
                                📖 {r.topicCn}
                              </span>
                            )}
                            <span className="dim" style={{ marginLeft: 'auto' }}>
                              {r.note}
                            </span>
                            <span className="stage-arrow">{openRule === r.id ? '▾' : '▸'}</span>
                          </button>
                          {openRule === r.id && (
                            <div className="gt-rule-body">
                              {rcn && <p className="quiz-note">💡 中文讲解:{rcn.note}</p>}
                              {r.unitId ? (
                                <div className="row-btns" style={{ justifyContent: 'flex-start' }}>
                                  <Link className="btn small ghost" to={`/unit/${r.unitId}?step=grammar`}>
                                    打开中文讲解:{r.topicCn} →
                                  </Link>
                                  <Link className="btn small ghost" to={`/unit/${r.unitId}?step=exam`}>
                                    📝 单元真题组 →
                                  </Link>
                                  {!exams[r.unitId] && <span className="dim" style={{ fontSize: 12 }}>该单元暂无真题组</span>}
                                </div>
                              ) : (
                                <p className="dim" style={{ fontSize: 12 }}>
                                  🈚 暂无中文精讲:可对照「中文语法书」同主题章节或 Murphy 单元学习。
                                </p>
                              )}
                              {r.exp && <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.exp) }} />}
                              {r.ex && r.ex.length > 0 && (
                                <ul className="gt-ex">
                                  {r.ex.map((e, i) => (
                                    <li key={i}>{e}</li>
                                  ))}
                                </ul>
                              )}
                              {r.mistakes && r.mistakes.length > 0 && (
                                <div className="g-ex err">
                                  {r.mistakes.map((m, i) => (
                                    <div key={i} dangerouslySetInnerHTML={{ __html: sanitizeHtml(m) }} />
                                  ))}
                                </div>
                              )}
                              {r.markers?.tags && r.markers.tags.length > 0 && (
                                <div className="dim" style={{ fontSize: 12 }}>
                                  🏷 {r.markers.tags.join(' · ')}
                                </div>
                              )}
                              {r.tip && <p className="quiz-note">💡 {r.tip}</p>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </details>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}

function TenseGrid({ tenses }: { tenses: Record<string, GrammarTense> }) {
  return (
    <div className="tense-grid">
      {Object.entries(tenses).map(([key, t]) => {
        const cn = TENSE_CN[key]
        return (
          <div key={key} className="tense-card">
            <div className="tense-bar" style={{ background: t.color }} />
            <h4>
              {cn ? cn.cn : t.name}
              <span className="tag"> {t.name}</span>
            </h4>
            {cn && (
              <div className="tense-cn">
                <p>{cn.explain}</p>
                <div className="dim" style={{ fontSize: 12 }}>
                  🏷 标志词:{cn.markersCn}
                </div>
              </div>
            )}
            <div className="part">
              <b>公式</b> {t.formula}
            </div>
            <div className="dim" style={{ fontSize: 12 }}>
              🏷 {t.markers}
            </div>
            {t.examplesEn.map((e, i) => (
              <div key={i} className="popup-ex">
                {e}
                {cn?.examplesCn?.[i] && <div className="dim">↳ {cn.examplesCn[i]}</div>}
              </div>
            ))}
            <div className="dim" style={{ fontSize: 12 }}>
              ⚠️ 常见错误 {t.mistakeCount} 处
            </div>
            {cn?.unitId && (
              <Link className="btn small ghost" to={`/unit/${cn.unitId}?step=grammar`}>
                📖 中文语法课 →
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
