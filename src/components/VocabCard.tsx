import { useEffect, useState } from 'react'
import { lookupWord } from '../lib/dict'
import type { DictEntry, WordBankEntry } from '../lib/types'

export default function VocabCard({
  word,
  onSpeak,
  masked = false,
}: {
  word: string
  onSpeak: (w: string) => void
  masked?: boolean
}) {
  const [result, setResult] = useState<{ dict: DictEntry | null; bank: WordBankEntry | null } | null>(null)
  const [peeked, setPeeked] = useState(false)

  useEffect(() => {
    let alive = true
    setPeeked(false)
    lookupWord(word).then((r) => {
      if (alive) setResult(r)
    })
    return () => {
      alive = false
    }
  }, [word])

  const d = result?.dict
  const b = result?.bank
  const base = d?.word ?? b?.word ?? ''
  const phon = d?.phon || b?.phon || ''
  const trans = d ? d.trans : b?.cn ? [{ pos: '', cn: b.cn }] : []
  const enDef = d ? undefined : b?.enDef
  const example = d?.sentences?.[0] ?? b?.example
  const resolved = base && base.toLowerCase() !== word.toLowerCase()
  const hide = masked && !peeked

  return (
    <div className="vocab-card">
      <div className="vocab-head">
        <b>{word}</b>
        <span className="popup-phon">{phon}</span>
        <button className="icon-btn" onClick={() => onSpeak(word)} title="朗读">
          🔊
        </button>
      </div>
      <div
        className={'vocab-body' + (hide ? ' is-masked' : '')}
        onClick={() => hide && setPeeked(true)}
        title={hide ? '点击查看释义' : undefined}
      >
        <div className={hide ? 'vocab-mask' : undefined}>
          {resolved && <div className="dim">原形:{base}</div>}
          {enDef && <div className="popup-en">🇬🇧 {enDef}</div>}
          {trans.map((t, i) => (
            <div key={i} className="popup-cn">
              {t.pos && <b className="popup-pos">{t.pos}.</b>} {t.cn}
            </div>
          ))}
          {example && (
            <div className="popup-ex">
              <div>{example.en}</div>
              <div className="dim">{example.cn}</div>
            </div>
          )}
        </div>
        {hide && <div className="vocab-mask-hint">点击揭开释义</div>}
      </div>
    </div>
  )
}
