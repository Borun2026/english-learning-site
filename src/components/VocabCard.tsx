import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { lookupWord } from '../lib/dict'
import type { DictEntry, WordBankEntry } from '../lib/types'

export default function VocabCard({ word, onSpeak }: { word: string; onSpeak: (w: string) => void }) {
  const [result, setResult] = useState<{ dict: DictEntry | null; bank: WordBankEntry | null } | null>(null)

  useEffect(() => {
    let alive = true
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

  return (
    <div className="vocab-card">
      <div className="vocab-head">
        <b>{word}</b>
        <span className="popup-phon">{phon}</span>
        <button className="icon-btn" onClick={() => onSpeak(word)} title="朗读">
          🔊
        </button>
        <Link to={'/dict?q=' + encodeURIComponent(d?.word ?? word)} className="btn small ghost">
          词典
        </Link>
      </div>
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
  )
}
