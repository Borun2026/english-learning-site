import type { GoalDialogue } from '../lib/types'
import GrammarBlock from './GrammarBlock'

export interface RecordItem {
  nodeId: string
  chosenIdx: number
}

export default function DialogueRecord({
  dialogue,
  history,
  finalNodeId,
  onClose,
}: {
  dialogue: GoalDialogue
  history: RecordItem[]
  finalNodeId: string
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>📜 对话记录 · {dialogue.scene}</h3>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="record">
          {history.map((h, i) => {
            const n = dialogue.nodes[h.nodeId]
            const opt = n.options?.[h.chosenIdx]
            return (
              <div key={i} className="record-item">
                <div className="rec-npc">
                  <b>{n.speaker}</b>
                  <div>{n.line}</div>
                  <div className="dim">{n.lineCn}</div>
                  {n.grammar && <GrammarBlock points={n.grammar} compact />}
                </div>
                <div className="rec-you">
                  <b>你:</b>
                  {opt?.text}
                  <div className="dim">{opt?.textCn}</div>
                </div>
              </div>
            )
          })}
          <div className="record-item">
            <div className="rec-npc">
              <b>{dialogue.nodes[finalNodeId].speaker}</b>
              <div>{dialogue.nodes[finalNodeId].line}</div>
              <div className="dim">{dialogue.nodes[finalNodeId].lineCn}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
