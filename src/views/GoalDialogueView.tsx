import { useEffect, useState } from 'react'
import WordText from '../components/WordText'
import GrammarBlock from '../components/GrammarBlock'
import DialogueRecord, { type RecordItem } from '../components/DialogueRecord'
import { dialogueWavUrl } from '../lib/audio'
import type { GoalDialogue } from '../lib/types'

export default function GoalDialogueView({
  dialogue,
  onWord,
  onSpeak,
  onComplete,
}: {
  dialogue: GoalDialogue
  onWord: (e: React.MouseEvent<HTMLElement>, w: string) => void
  onSpeak: (w: string, r?: number, audioUrl?: string) => void
  onComplete: (success: boolean, rounds: number) => void
}) {
  const [curId, setCurId] = useState(dialogue.start)
  const [dlgWav, setDlgWav] = useState<string | undefined>()
  const [chosen, setChosen] = useState<number | null>(null)
  const [history, setHistory] = useState<RecordItem[]>([])
  const [finished, setFinished] = useState(false)
  const [showRecord, setShowRecord] = useState(false)
  const [reported, setReported] = useState(false)

  const node = dialogue.nodes[curId]

  useEffect(() => {
    let alive = true
    dialogueWavUrl(dialogue.unitId, curId).then((u) => {
      if (alive) setDlgWav(u)
    })
    return () => {
      alive = false
    }
  }, [dialogue.unitId, curId])

  const speakLine = () => onSpeak(node.line, undefined, dlgWav)

  const choose = (idx: number) => {
    if (chosen != null || finished) return
    setChosen(idx)
    setHistory((h) => [...h, { nodeId: curId, chosenIdx: idx }])
  }

  const next = () => {
    if (chosen == null || !node.options) return
    const nextNode = dialogue.nodes[node.options[chosen].next]
    setCurId(nextNode.id)
    setChosen(null)
    if (nextNode.end) {
      setFinished(true)
      if (!reported) {
        setReported(true)
        onComplete(!!nextNode.success, history.length + 1)
      }
    }
  }

  const restart = () => {
    setCurId(dialogue.start)
    setChosen(null)
    setHistory([])
    setFinished(false)
    setShowRecord(false)
    setReported(false)
  }

  return (
    <div>
      <div className="card-head">
        <div>
          <h2>🎯 {dialogue.scene}</h2>
          <span className="tag">目标式情景对话</span>
        </div>
        <button className="btn ghost" onClick={speakLine}>
          🔊 朗读台词
        </button>
      </div>

      <div className="goal-banner">
        🎯 <b>你的目标:</b>
        {dialogue.goal} <span className="dim">· 已对话 {history.length} 轮</span>
      </div>

      {finished ? (
        <div className={'dlg-result ' + (node.success ? 'win' : 'lose')}>
          <h3>{node.success ? '🎉 达成目标!' : '😞 未能达成目标'}</h3>
          <p className="result-line">
            {node.line}
            <br />
            <span className="dim">{node.lineCn}</span>
          </p>
          {node.grammar && <GrammarBlock points={node.grammar} />}
          <div className="row-btns">
            <button className="btn" onClick={() => setShowRecord(true)}>
              📜 查看对话记录
            </button>
            <button className="btn ghost" onClick={restart}>
              🔄 重新挑战
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="npc-line">
            <span className="npc-name">{node.speaker}</span>
            <WordText text={node.line} onWord={onWord} />
            <div className="speak-inline">
              <button className="icon-btn" onClick={speakLine}>
                🔊
              </button>
            </div>
            {chosen != null && (
              <div className="line-cn">
                <b>中文:</b>
                {node.lineCn}
              </div>
            )}
            {chosen != null && node.grammar && <GrammarBlock points={node.grammar} />}
          </div>

          <p className="hint">选择你的回应(选择后显示翻译与解析):</p>
          <div className="options">
            {node.options?.map((o, oi) => {
              let cls = 'option'
              if (chosen != null) {
                if (chosen === oi) cls += ' chosen'
                else cls += ' dim'
              }
              return (
                <button key={oi} className={cls} onClick={() => choose(oi)}>
                  <div>
                    {String.fromCharCode(65 + oi)}. {o.text}
                  </div>
                  {chosen === oi && <div className="opt-cn">{o.textCn}</div>}
                </button>
              )
            })}
          </div>

          {chosen != null && node.options && (
            <div className="feedback ok">
              <div>
                <div className="fb-opt-cn">{node.options[chosen].textCn}</div>
                {node.options[chosen].feedback}
              </div>
              <button className="btn small" onClick={next}>
                继续对话 →
              </button>
            </div>
          )}
        </>
      )}

      {showRecord && (
        <DialogueRecord
          dialogue={dialogue}
          history={history}
          finalNodeId={curId}
          onClose={() => setShowRecord(false)}
        />
      )}
    </div>
  )
}
