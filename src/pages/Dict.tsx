import { useEffect, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import type { AppContext } from '../App'
import { affixesOfWord, affixTypeLabel, type AffixItem } from '../lib/affix'
import { aiExplainWord } from '../lib/ai/provider'
import { prefetchWordAudio } from '../lib/audio'
import { lookupWord, searchDict } from '../lib/dict'
import { addWordbook, cacheAiWord, loadData } from '../lib/storage'
import type { AiWordExplain, DictEntry, WordBankEntry } from '../lib/types'
import { addWord, getWordState, markMastered, wordKey } from '../lib/vocab'

function inCollection(w: string): boolean {
  const key = wordKey(w)
  return !!getWordState(w) || loadData().wordbook.some((x) => wordKey(x) === key)
}

export default function Dict() {
  const { onSpeak } = useOutletContext<AppContext>()
  const [sp, setSp] = useSearchParams()
  const qParam = sp.get('q') ?? ''
  const q = qParam.trim()

  const [draft, setDraft] = useState(qParam)
  const [loading, setLoading] = useState(false)
  const [dict, setDict] = useState<DictEntry | null>(null)
  const [bank, setBank] = useState<WordBankEntry | null>(null)
  const [ai, setAi] = useState<AiWordExplain | null>(null)
  const [aiError, setAiError] = useState('')
  const [affixes, setAffixes] = useState<AffixItem[]>([])
  const [suggests, setSuggests] = useState<{ word: string }[]>([])
  const [saved, setSaved] = useState(false)

  const display = dict?.word || bank?.word || ai?.word || q
  const lemma = dict?.word || bank?.word || q

  useEffect(() => {
    setDraft(qParam)
  }, [qParam])

  useEffect(() => {
    const text = draft.trim()
    if (text.length < 2) {
      setSuggests([])
      return
    }
    let alive = true
    searchDict(text)
      .then((rows) => {
        if (!alive) return
        const hit = q.toLowerCase()
        setSuggests(rows.filter((r) => r.word.toLowerCase() !== hit))
      })
      .catch(() => {
        if (alive) setSuggests([])
      })
    return () => {
      alive = false
    }
  }, [draft, q])

  useEffect(() => {
    if (q.length < 1) {
      setLoading(false)
      setDict(null)
      setBank(null)
      setAi(null)
      setAiError('')
      setAffixes([])
      setSaved(false)
      return
    }
    let alive = true
    setLoading(true)
    setDict(null)
    setBank(null)
    setAi(null)
    setAiError('')
    setAffixes([])
    setSaved(inCollection(q))

      lookupWord(q).then(({ dict: d, bank: b }) => {
      if (!alive) return
      setDict(d)
      setBank(b)
      const base = d?.word || b?.word || q
      prefetchWordAudio(base)
      setSaved(inCollection(base))
      affixesOfWord(base).then((a) => {
        if (alive) setAffixes(a)
      })
      if (q.length >= 2) {
        searchDict(q)
          .then((rows) => {
            if (!alive) return
            const hit = (d?.word || b?.word || q).toLowerCase()
            setSuggests(rows.filter((r) => r.word.toLowerCase() !== hit))
          })
          .catch(() => {})
      }
      if (d || b) {
        setLoading(false)
        return
      }
      const cache = loadData().aiWordCache
      const cached = cache[wordKey(q)] || cache[q.toLowerCase()]
      if (cached) {
        setAi(cached)
        setSaved(inCollection(cached.word || q))
        setLoading(false)
        return
      }
      const cfg = loadData().aiConfig
      if (cfg.enabled && cfg.apiKey) {
        aiExplainWord(q)
          .then((r) => {
            if (!alive) return
            setAi(r)
            cacheAiWord(r)
            setSaved(inCollection(r.word || q))
            setLoading(false)
          })
          .catch((e) => {
            if (!alive) return
            setAiError((e as Error).message)
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })

    return () => {
      alive = false
    }
  }, [q])

  const go = (word: string) => {
    const t = word.trim()
    setDraft(t)
    setSp(t ? { q: t } : {})
  }

  const phon = dict?.phon || bank?.phon || ai?.phon || ''
  const hit = !!(dict || bank)

  return (
    <section className="card">
      <div className="card-head">
        <h2>🔍 词典</h2>
        <span className="tag">查词 / 词组</span>
      </div>

      <form
        className="form-row"
        onSubmit={(e) => {
          e.preventDefault()
          go(draft)
        }}
      >
        <input
          className="grow-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="输入单词或词组，回车查询"
          autoFocus
        />
        <button className="btn" type="submit">
          查询
        </button>
      </form>

      {suggests.length > 0 && (
        <div className="row-btns" style={{ flexWrap: 'wrap' }}>
          {suggests.map((s) => (
            <button key={s.word} type="button" className="btn small ghost" onClick={() => go(s.word)}>
              {s.word}
            </button>
          ))}
        </div>
      )}

      {q.length < 1 && <p className="hint">输入单词或词组回车查询</p>}
      {q.length >= 1 && loading && <p className="hint">查询中…</p>}

      {q.length >= 1 && !loading && (hit || ai) && (
        <>
          <div className="card-head" style={{ marginTop: 8 }}>
            <div>
              <h2 style={{ display: 'inline', marginRight: 8 }}>{display}</h2>
              {phon && <span className="popup-phon">{phon}</span>}
              {dict?.phonUs && dict.phonUs !== phon && <span className="popup-phon">美 {dict.phonUs}</span>}
              {lemma && lemma.toLowerCase() !== q.toLowerCase() && <span className="dim"> 原形: {lemma}</span>}
            </div>
            <button className="icon-btn" onClick={() => onSpeak(display)} title="朗读">
              🔊
            </button>
          </div>

          {dict &&
            dict.trans.map((t, i) => (
              <div key={i}>
                <div className="popup-cn">
                  {t.pos && <b className="popup-pos">{t.pos}.</b>} {t.cn}
                </div>
                {t.en && <div className="dim">{t.en}</div>}
              </div>
            ))}

          {!dict && bank && (
            <>
              <div className="popup-cn">{bank.cn}</div>
              {bank.enDef && <div className="popup-en dim">{bank.enDef}</div>}
              {bank.example && (
                <div className="popup-ex">
                  <div className="popup-en">{bank.example.en}</div>
                  <div className="dim">{bank.example.cn}</div>
                </div>
              )}
            </>
          )}

          {!dict && !bank && ai && (
            <>
              <div className="popup-cn">{ai.cn}</div>
              {ai.enDef && <div className="popup-en dim">{ai.enDef}</div>}
              {ai.example && (
                <div className="popup-ex">
                  <div className="popup-en">{ai.example.en}</div>
                  <div className="dim">{ai.example.cn}</div>
                </div>
              )}
            </>
          )}

          {dict?.sentences.slice(0, 3).map((s, i) => (
            <div key={i} className="popup-ex">
              <div className="popup-en">{s.en}</div>
              <div className="dim">{s.cn}</div>
            </div>
          ))}

          {dict?.phrases.slice(0, 5).map((p, i) => (
            <div key={i} className="popup-ex dim">
              <span style={{ fontWeight: 600 }}>{p.p}</span> {p.cn}
            </div>
          ))}

          {dict?.synos?.map((s, i) => (
            <div key={i} className="dim">
              近义 {s.pos}: {s.words.join(', ')}
            </div>
          ))}

          {dict?.rels?.map((r, i) => (
            <div key={i} className="dim">
              同根 {r.pos}: {r.words.map((w) => `${w.w}(${w.cn})`).join(' ')}
            </div>
          ))}

          {dict?.mnemonic && <div className="dim">助记 {dict.mnemonic}</div>}

          {affixes.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="dim">词根</div>
              {affixes.map((a) => (
                <div key={a.affix + a.type} className="dim">
                  <b>{a.affix}</b> <span className="tag">{affixTypeLabel(a.type)}</span> {a.meaning}
                  {a.examples[0] && <span> 例 {a.examples[0]}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="row-btns" style={{ marginTop: 12 }}>
            <button
              className="btn small"
              disabled={saved}
              onClick={() => {
                addWordbook(display)
                addWord(display, 'popup')
                setSaved(true)
              }}
            >
              {saved ? '✓ 已收藏' : '+ 收藏'}
            </button>
            <button
              className="btn small ghost"
              onClick={() => {
                markMastered(display, 'popup')
                setSaved(inCollection(display))
              }}
            >
              ✓ 快标掌握
            </button>
          </div>
        </>
      )}

      {q.length >= 1 && !loading && !hit && !ai && (
        <p className="hint">{aiError ? `AI 查询失败: ${aiError}` : '词库未收录，可在设置中开启 AI 兜底查词'}</p>
      )}
    </section>
  )
}
