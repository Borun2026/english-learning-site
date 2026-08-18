import { useState } from 'react'
import { canShadow, scoreShadow, type ShadowScore } from '../lib/shadow'
import { addWrongWords } from '../lib/vocab'
import { awardXp } from '../lib/stats'

interface SpeechRec {
  lang: string
  interimResults: boolean
  onresult: ((ev: { results: { 0: { 0: { transcript: string } } } }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
}

export default function ShadowRead({ text }: { text: string }) {
  const [listening, setListening] = useState(false)
  const [said, setSaid] = useState('')
  const [result, setResult] = useState<ShadowScore | null>(null)
  if (!canShadow() || !text.trim()) return null

  const start = () => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onresult = (ev) => {
      const t = ev.results[0][0].transcript
      setSaid(t)
      const sc = scoreShadow(text, t)
      setResult(sc)
      if (sc.missed.length) addWrongWords(sc.missed.join(' '), 'coach-wrong')
      awardXp(sc.score >= 70 ? 8 : 3, { shadow: true })
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    setListening(true)
    setResult(null)
    rec.start()
  }

  return (
    <span className="shadow-read">
      <button className="btn small ghost" onClick={start} disabled={listening} title="跟读打分">
        {listening ? '🎙 聆听中…' : '🎙 跟读'}
      </button>
      {result && (
        <span className={'tag ' + (result.score >= 70 ? '' : '')}>
          {result.score} 分{result.missed.length ? ` · 漏 ${result.missed.slice(0, 3).join('/')}` : ''}
        </span>
      )}
      {said && <span className="dim"> 「{said}」</span>}
    </span>
  )
}
