import { useCallback, useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { AppContext } from '../App'
import AffixQuiz from '../components/AffixQuiz'
import { lookupWord } from '../lib/dict'
import { useDataVersion, removeWordState } from '../lib/storage'
import { allWordStates, dueTodayWords, reviewWord, vocabStats } from '../lib/vocab'
import { GRADE_LABELS, type SrsGrade } from '../lib/srs'
import { awardXp } from '../lib/stats'
import type { DictEntry, WordBankEntry, WordSource, WordState } from '../lib/types'

type Tab = 'due' | 'learning' | 'mastered' | 'all' | 'affix'

const STATUS_LABEL: Record<WordState['status'], string> = {
  learning: '🆕 学习',
  reviewing: '🔁 复习',
  mastered: '✅ 掌握',
}

const SOURCE_LABEL: Record<WordSource, string> = {
  wordbook: '生词本',
  'unit-vocab': '单元词汇',
  popup: '点词收藏',
  'exam-wrong': '真题错词',
  'coach-wrong': '教练纠错',
  game: '词汇游戏',
}

export default function Wordbook() {
  const { onSpeak } = useOutletContext<AppContext>()
  const [tab, setTab] = useState<Tab>('due')
  const [source, setSource] = useState<'all' | WordSource>('all')
  const [queue, setQueue] = useState<string[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [lookup, setLookup] = useState<{ dict: DictEntry | null; bank: WordBankEntry | null } | null>(null)
  const [stats, setStats] = useState(() => vocabStats())
  const [tick, setTick] = useState(0)

  const dv = useDataVersion()

  const refresh = useCallback(() => {
    setStats(vocabStats())
    setQueue(dueTodayWords().map((s) => s.word))
    setTick((t) => t + 1)
  }, [])

  useEffect(refresh, [refresh, dv])

  const current = queue[qIdx] ?? null
  const sessionTotal = queue.length

  // 当前词查释义
  useEffect(() => {
    if (!current) {
      setLookup(null)
      return
    }
    let alive = true
    setLookup(null)
    setRevealed(false)
    lookupWord(current).then((r) => {
      if (alive) setLookup(r)
    })
    return () => {
      alive = false
    }
  }, [current])

  const grade = (g: SrsGrade) => {
    if (!current) return
    reviewWord(current, g)
    if (g !== 'again') awardXp(2, { review10: vocabStats().mastered + vocabStats().reviewing >= 10 })
    setRevealed(false)
    if (g === 'again') {
      // Again:当日回到队尾
      setQueue((q) => [...q.slice(0, qIdx), ...q.slice(qIdx + 1), current])
    } else {
      setQueue((q) => {
        const nq = q.filter((_, i) => i !== qIdx)
        setQIdx((i) => (i >= nq.length ? 0 : i))
        return nq
      })
    }
    setStats(vocabStats())
  }

  // 键盘流:空格/回车揭义,1-4 评分,5 收起
  useEffect(() => {
    if (tab !== 'due') return
    const onKey = (e: KeyboardEvent) => {
      if (!current) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setRevealed(true)
      } else if (revealed) {
        const map: Record<string, SrsGrade> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' }
        if (map[e.key]) grade(map[e.key])
        else if (e.key === '5') setRevealed(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, current, revealed, queue, qIdx])

  /* ---------- 列表(学习中/已掌握/全部) ---------- */
  const list = allWordStates()
    .filter((s) => (tab === 'learning' ? s.status === 'learning' : tab === 'mastered' ? s.status === 'mastered' : true))
    .filter((s) => (source === 'all' ? true : s.sources.includes(source)))
    .sort((a, b) => (tab === 'due' ? 0 : a.next - b.next))

  const exportTsv = (full: boolean) => {
    const words = full ? allWordStates().map((s) => s.word) : list.map((s) => s.word)
    if (!words.length) return
    ;(async () => {
      const rows: string[] = []
      for (const w of words) {
        if (!full) {
          rows.push(`${w}\t`)
          continue
        }
        const { dict, bank } = await lookupWord(w)
        const cn = dict?.trans.map((t) => (t.pos ? t.pos + '. ' : '') + t.cn).join('; ') || bank?.cn || ''
        const ex = dict?.sentences[0] || bank?.example
        rows.push(`${w}\t${cn}\t${ex ? ex.en + ' ' + ex.cn : ''}`)
      }
      const blob = new Blob(['#separator:tab\n' + rows.join('\n')], { type: 'text/tab-separated-values' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = full ? 'vocab-anki-full.txt' : 'vocab-list.txt'
      a.click()
    })()
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>📒 词汇中心</h2>
          <span className="tag">
            共 {stats.total} 词 · 今日到期 {stats.dueToday} · 学习 {stats.learning} · 复习 {stats.reviewing} · 掌握 {stats.mastered}
          </span>
        </div>
        <div className="row-btns" style={{ margin: 0 }}>
          <Link className="btn ghost small" to="/vocab-games">
            🎮 词汇游戏 →
          </Link>
          <button className="btn ghost" onClick={() => exportTsv(false)} disabled={!list.length}>
            导出单词表
          </button>
          <button className="btn ghost" onClick={() => exportTsv(true)} disabled={!stats.total}>
            导出 Anki 完整版
          </button>
        </div>
      </div>

      <div className="row-btns">
        {(
          [
            ['due', `⏰ 今日复习(${stats.dueToday})`],
            ['learning', `🆕 学习中(${stats.learning})`],
            ['mastered', `✅ 已掌握(${stats.mastered})`],
            ['all', `📚 全部(${stats.total})`],
            ['affix', '🧬 词根测验'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} className={'btn small ' + (tab === k ? '' : 'ghost')} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
        <select value={source} onChange={(e) => setSource(e.target.value as 'all' | WordSource)} style={{ marginLeft: 'auto' }}>
          <option value="all">全部来源</option>
          {Object.entries(SOURCE_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {tab === 'affix' && <AffixQuiz n={8} />}

      {tab === 'due' && (
        <div className="review-stage">
          {!current ? (
            <div className={'dlg-result ' + (stats.dueToday === 0 ? 'win' : '')}>
              <h3>🎉 今日复习完成</h3>
              <p>
                已掌握 {stats.mastered} 词 · 学习中 {stats.learning} 词。新词会在单元词汇、点词收藏、错题/教练纠错时自动入池。
              </p>
            </div>
          ) : (
            <>
              <div className="goal-banner">
                <b>
                  剩余 {sessionTotal - qIdx} / {sessionTotal}
                </b>
                <span className="dim">空格=显示释义 · 1=Again(回队尾) 2=Hard 3=Good 4=Easy</span>
              </div>
              <div className={'review-card card-3d ' + (revealed ? 'is-revealed' : '')} key={current + tick}>
                <div className="review-card-front">
                  <div className="review-word">
                    {current}{' '}
                    <button className="icon-btn" onClick={() => onSpeak(current)} title="朗读">
                      🔊
                    </button>
                  </div>
                  {lookup?.dict?.phon && <div className="popup-phon">{lookup.dict.phon}</div>}
                  <div className="review-card-hint">
                    {!revealed && (
                      <button className="btn game big" onClick={() => setRevealed(true)}>
                        👁 翻转卡片 · 显示释义 (Space)
                      </button>
                    )}
                  </div>
                </div>

                {revealed && (
                  <div className="review-meaning-box">
                    {lookup?.dict ? (
                      lookup.dict.trans.map((t, i) => (
                        <div key={i} className="popup-cn">
                          {t.pos && <b className="popup-pos">{t.pos}.</b>} {t.cn}
                        </div>
                      ))
                    ) : (
                      <div className="popup-cn" style={{ fontSize: 16 }}>
                        {lookup?.bank?.cn ?? '词库未收录'}
                      </div>
                    )}
                    {lookup?.dict?.trans.find((t) => t.en)?.en && (
                      <div className="dim">{lookup.dict.trans.find((t) => t.en)!.en}</div>
                    )}
                    {(lookup?.dict?.sentences[0] ?? lookup?.bank?.example) && (
                      <div className="popup-ex" style={{ marginTop: 8 }}>
                        <div className="popup-ex-en">
                          {(lookup?.dict?.sentences[0] ?? lookup?.bank!.example!)!.en}
                        </div>
                        <div className="dim">
                          {(lookup?.dict?.sentences[0] ?? lookup?.bank!.example!)!.cn}
                        </div>
                      </div>
                    )}
                    <div className="grade-row" style={{ marginTop: 14 }}>
                      {(['again', 'hard', 'good', 'easy'] as SrsGrade[]).map((g, i) => (
                        <button
                          key={g}
                          className={'btn game ' + (g === 'good' || g === 'easy' ? 'grade-positive' : 'ghost')}
                          onClick={() => grade(g)}
                        >
                          {i + 1}. {GRADE_LABELS[g]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab !== 'due' && tab !== 'affix' && (
        <div className="wordbook">
          {list.length === 0 ? (
            <p className="hint">该分类暂无单词。新词会从:单元词汇自测 / 点词收藏 / 真题错题 / 教练纠错 自动入池。</p>
          ) : (
            list.map((s) => (
              <div key={s.word} className="wb-row">
                <Link to={'/dict?q=' + encodeURIComponent(s.word)} className="wb-item">
                  {s.word}
                </Link>
                <button className="icon-btn" onClick={() => onSpeak(s.word)} title="朗读">
                  🔊
                </button>
                <span className="tag">{STATUS_LABEL[s.status]}</span>
                <span className="dim">箱 {s.box}/5 · 下次 {s.next <= Date.now() ? '现在' : new Date(s.next).toLocaleDateString()}</span>
                <span className="dim">{s.sources.map((x) => SOURCE_LABEL[x]).join('、')}</span>
                <button
                  className="icon-btn wb-del"
                  title="移出词汇池"
                  onClick={() => {
                    removeWordState(s.word)
                    refresh()
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <p className="hint">
        SM-2 遗忘曲线:Again 当日回到队尾,Hard/Good/Easy 分别按 1.2×/EF/1.3×EF 增长间隔;箱满 5 视为已掌握。Anki 导出保留原格式(Tab 分隔)。
      </p>
    </section>
  )
}
