import type React from 'react'
import { LEVEL_NAMES, type WordLevelMark } from '../lib/wordLevel'

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
        const mark = levelOf?.(token)
        return (
          <span
            key={i}
            className={'word' + (hl ? ' speaking' : '') + (className ? ' ' + className : '')}
            onClick={
              onWord
                ? (e) => {
                    // 单词点击不冒泡到句子,避免"点词查义"时同时触发"点句拆解"
                    e.stopPropagation()
                    onWord(e, w)
                  }
                : undefined
            }
          >
            {w}{' '}
            {mark?.level !== undefined && mark.level >= 2 && (
              <span
                className={'wl-badge lv' + mark.level}
                title={`词库分级:${LEVEL_NAMES[mark.level] ?? `L${mark.level}`}`}
              >
                {LEVEL_NAMES[mark.level] ?? `L${mark.level}`}
              </span>
            )}
            {mark?.freqRank !== undefined && (
              <span className="wl-badge freq" title={`考研真题高频第 ${mark.freqRank} 位`}>
                🔥{mark.freqRank}
              </span>
            )}
          </span>
        )
      })}
    </>
  )
}

export function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z']/g, '')
}
