import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { lookupWord } from '../lib/dict'
import { aiExplainWord } from '../lib/ai/provider'
import { loadFreq } from '../lib/zhenti'
import { addWordbook, cacheAiWord, loadData } from '../lib/storage'
import { addWord, getWordState, markMastered, wordKey } from '../lib/vocab'
import { affixesOfWord, affixTypeLabel, type AffixItem } from '../lib/affix'
import type { AiWordExplain, DictEntry, WordBankEntry, WordState } from '../lib/types'

function wordInBook(w: string) {
  return loadData().wordbook.some((x) => wordKey(x) === wordKey(w)) || !!getWordState(w)
}

const STATUS_LABEL: Record<WordState['status'], string> = {
  learning: '🆕 学习中',
  reviewing: '🔁 复习中',
  mastered: '✅ 已掌握',
}

interface Props {
  word: string
  x: number
  y: number
  onClose: () => void
  onSpeak: (w: string) => void
}

export default function WordPopup({ word, x, y, onClose, onSpeak }: Props) {
  const [dict, setDict] = useState<DictEntry | null>(null)
  const [bank, setBank] = useState<WordBankEntry | null>(null)
  const [ai, setAi] = useState<AiWordExplain | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiError, setAiError] = useState('')
  const [freqRank, setFreqRank] = useState<number | null>(null)
  const [inBook, setInBook] = useState(() => wordInBook(word))
  // P5-2:词汇池状态(点词即显示掌握度;入池/快标按钮更新)
  const [poolState, setPoolState] = useState<WordState | undefined>(() => getWordState(word))
  // P5-4:词根词缀命中
  const [affixes, setAffixes] = useState<AffixItem[]>([])

  const refreshPool = () => setPoolState(getWordState(word))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    onSpeak(word)
  }, [word])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setDict(null)
    setBank(null)
    setAi(null)
    setAiError('')
    setFreqRank(null)
    setAffixes([])
    setInBook(wordInBook(word))
    setPoolState(getWordState(word))
    lookupWord(word).then(({ dict: d, bank: b }) => {
      if (!alive) return
      setDict(d)
      setBank(b)
      const lemma = d?.word ?? b?.word ?? word
      affixesOfWord(lemma).then((a) => {
        if (alive) setAffixes(a)
      })
      // 词频只在真题页需要,课程页面避免多拉一个 180KB 的 freq.json
      if (location.pathname.startsWith('/zhenti')) {
        loadFreq().then((f) => {
          if (!alive || !f) return
          const e = f[lemma.toLowerCase()]
          if (e) setFreqRank(e.rank)
        })
      }
      if (!d && !b) {
        const cached = loadData().aiWordCache[wordKey(word)] || loadData().aiWordCache[word]
        if (cached) {
          setAi(cached)
          setLoading(false)
          return
        }
        const cfg = loadData().aiConfig
        if (cfg.enabled && cfg.apiKey) {
          aiExplainWord(word)
            .then((r) => {
              if (!alive) return
              setAi(r)
              cacheAiWord(r)
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
      } else {
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [word])

  const phon = dict?.phon || bank?.phon || ai?.phon || ''
  const trans = dict ? dict.trans : bank ? [{ pos: '', cn: bank.cn }] : ai ? [{ pos: '', cn: ai.cn }] : []
  const sentences = dict ? dict.sentences.slice(0, 1) : bank?.example ? [bank.example] : ai?.example ? [ai.example] : []
  const enDef = dict ? undefined : bank?.enDef || ai?.enDef
  const phrases = dict?.phrases.slice(0, 3) ?? []

  const popupWidth = 340
  const adjustedX = Math.max(12, Math.min(x, window.innerWidth - popupWidth - 16))
  const isNearBottom = y > window.innerHeight - 320
  const adjustedY = isNearBottom ? Math.max(12, y - 280) : y

  return (
    <div className="popup-backdrop" onClick={onClose}>
      <div
        className="popup popup-animated"
        style={{
          left: adjustedX,
          top: adjustedY,
          width: `min(${popupWidth}px, calc(100vw - 24px))`,
          maxHeight: 'min(420px, calc(100vh - 40px))',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="popup-head">
          <b className="popup-word">{word}</b>
          {phon && <span className="popup-phon">{phon}</span>}
          {(() => {
            const base = dict?.word ?? bank?.word ?? ''
            return base && base.toLowerCase() !== word.toLowerCase() ? (
              <span className="dim">原形:{base}</span>
            ) : null
          })()}
          {freqRank && freqRank <= 2444 && <span className="freq-badge">🏆 真题 TOP{freqRank}</span>}
          <div className="popup-head-actions">
            <button className="icon-btn" onClick={() => onSpeak(word)} title="朗读">
              🔊
            </button>
            <button className="icon-btn popup-close" onClick={onClose} aria-label="关闭" title="关闭">
              ✕
            </button>
          </div>
        </div>
        {poolState && (
          <div className="popup-pool">
            <span className="tag">{STATUS_LABEL[poolState.status]}</span>
            <span className="dim">箱 {poolState.box}/5 · 错 {poolState.wrongCount} 次</span>
            {poolState.next > Date.now() && <span className="dim">下次 {new Date(poolState.next).toLocaleDateString()}</span>}
          </div>
        )}
        {loading ? (
          <div className="dim" style={{ padding: '12px 0' }}>🔍 正在查询释义与词根…</div>
        ) : (
          <>
            {enDef && <div className="popup-en">🇬🇧 {enDef}</div>}
            {trans.map((t, i) => (
              <div key={i} className="popup-cn">
                {t.pos && <b className="popup-pos">{t.pos}.</b>} {t.cn}
                {t.en && <div className="dim" style={{ fontSize: 12 }}>{t.en}</div>}
              </div>
            ))}
            {dict?.synos?.slice(0, 2).map((s, i) => (
              <div key={i} className="dim">
                近义 {s.pos}: {s.words.slice(0, 4).join(', ')}
              </div>
            ))}
            {dict?.mnemonic && (
              <div className="dim">助记: {dict.mnemonic.length > 80 ? dict.mnemonic.slice(0, 80) + '…' : dict.mnemonic}</div>
            )}
            {sentences.map((s, i) => (
              <div key={i} className="popup-ex">
                <div className="popup-ex-en">{s.en}</div>
                <div className="dim">{s.cn}</div>
              </div>
            ))}
            {phrases.map((p, i) => (
              <div key={i} className="popup-ex dim">
                <span style={{ fontWeight: 600 }}>{p.p}</span> {p.cn}
              </div>
            ))}
            {affixes.length > 0 && (
              <div className="popup-affix">
                <div className="popup-affix-title">🧬 词根词缀助记</div>
                {affixes.map((a) => (
                  <div key={a.affix + a.type} className="popup-affix-item">
                    <b>{a.affix}</b>
                    <span className="tag">{affixTypeLabel(a.type)}</span>
                    <span>{a.meaning}</span>
                    {a.examples[0] && <span className="dim">例 {a.examples[0]}</span>}
                  </div>
                ))}
              </div>
            )}
            {!dict && !bank && !ai && !aiError && (
              <div className="dim">
                词库未收录
                {(() => {
                  const cfg = loadData().aiConfig
                  return cfg.enabled && cfg.apiKey ? ',正在询问 AI…' : ',可在设置中开启 AI 兜底查词'
                })()}
              </div>
            )}
            {aiError && <div className="popup-ex" style={{ color: 'var(--color-danger)' }}>AI 查询失败:{aiError.slice(0, 80)}</div>}
            <div className="row-btns" style={{ marginTop: 12 }}>
              <button
                className="btn small"
                disabled={inBook}
                onClick={() => {
                  addWordbook(word)
                  addWord(word, 'popup')
                  refreshPool()
                  setInBook(true)
                }}
              >
                {inBook ? '✓ 已在词汇池' : '+ 收进词汇池'}
              </button>
              <button
                className="btn small ghost"
                onClick={() => {
                  markMastered(word, 'popup')
                  refreshPool()
                  setInBook(wordInBook(word))
                }}
                title="直接标记为已掌握(连续 easy 至箱 5)"
              >
                ✓ 快标掌握
              </button>
              <Link to={'/dict?q=' + encodeURIComponent(dict?.word ?? word)} className="btn small ghost">
                完整词条 →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
