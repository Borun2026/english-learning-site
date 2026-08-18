import type React from 'react'
import { LEVEL_NAMES, STOP_WORDS, type WordLevelMark } from '../lib/wordLevel'

export default function WordText({
  text,
  hlIdx,
  hlStart = 0,
  onWord,
  className = '',
  levelOf,
}: {
  text: string
  hlIdx?: number | null
  hlStart?: number
  onWord?: (e: React.MouseEvent<HTMLSpanElement>, w: string) => void
  className?: string
  /** 词级高亮回调:返回该词的级别/词频徽章(由 lib/wordLevel 计算好的 Map 查表) */
  levelOf?: (w: string) => WordLevelMark | undefined
}) {
  return (
    <>
      {text.split(' ').map((w, i) => {
        const token = normalizeWord(w)
        if (!token) return <span key={i}>{w} </span>
        const hl = hlIdx === hlStart + i
        const mark = STOP_WORDS.has(token) ? undefined : levelOf?.(token)
        let lvClass = ''
        const tips: string[] = []
        if (mark?.level !== undefined && mark.level >= 2) {
          lvClass += ' wl-lv' + mark.level
          tips.push(`词库分级:${LEVEL_NAMES[mark.level] ?? `L${mark.level}`}`)
        }
        if (mark?.freqRank !== undefined) {
          lvClass += ' wl-freq'
          tips.push(`考研真题高频第 ${mark.freqRank} 位`)
        }
        return (
          <span key={i}>
            <span
              className={'word' + (hl ? ' speaking' : '') + lvClass + (className ? ' ' + className : '')}
              title={tips.length ? tips.join(' · ') : undefined}
              onClick={
                onWord
                  ? (e) => {
                      e.stopPropagation()
                      onWord(e, w)
                    }
                  : undefined
              }
            >
              {w}
            </span>{' '}
          </span>
        )
      })}
    </>
  )
}

export function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z']/g, '')
}
