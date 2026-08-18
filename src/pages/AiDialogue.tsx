import { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { AppContext } from '../App'
import WordText from '../components/WordText'
import GrammarBlock from '../components/GrammarBlock'
import CoachDrills from '../components/CoachDrills'
import { aiRoleplayJudge, aiRoleplayTurn, judgeFreeInput, type RoleplayContext } from '../lib/ai/roleplay'
import { runCoachAssessment, type CoachLine } from '../lib/ai/coach'
import { loadData } from '../lib/storage'
import { addWrongWords } from '../lib/vocab'
import type { AiRoleplayTurn, CoachReport } from '../lib/types'

interface SpeechRec {
  lang: string
  interimResults: boolean
  onresult: ((ev: { results: { 0: { 0: { transcript: string } } } }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop?: () => void
  abort?: () => void
}

const SCENES = [
  { key: 'hotel', label: '🏨 酒店入住', goal: '成功办理入住,拿到安静的高楼层房间', level: '四级' },
  { key: 'restaurant', label: '🍽 餐厅点餐', goal: '点到自己想吃的主菜,并礼貌处理上错菜的情况', level: '四级' },
  { key: 'airport', label: '✈️ 机场值机', goal: '完成值机并把行李托运,拿到靠过道的座位', level: '四级' },
  { key: 'job', label: '💼 求职面试', goal: '回答得体,让面试官认可你的能力和态度', level: '六级' },
  { key: 'rent', label: '🏠 租房看房', goal: '问清租金和设施,成功谈下满意的房子', level: '六级' },
  { key: 'academic', label: '🎓 学术讨论', goal: '就研究课题与导师达成下一步计划共识', level: '考研' },
]

export default function AiDialogue() {
  const { openPopup, onSpeak } = useOutletContext<AppContext>()
  const [sceneIdx, setSceneIdx] = useState(0)
  const [history, setHistory] = useState<RoleplayContext['history']>([])
  const [turn, setTurn] = useState<AiRoleplayTurn | null>(null)
  const [chosen, setChosen] = useState<number | null>(null)
  const [judge, setJudge] = useState<{ feedback: string; summary?: string } | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [coachOn, setCoachOn] = useState(true)
  const [coachLoading, setCoachLoading] = useState(false)
  const [report, setReport] = useState<CoachReport | null>(null)
  const [freeMode, setFreeMode] = useState(false)
  const [draft, setDraft] = useState('')
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRec | null>(null)
  const aiReady = !!loadData().aiConfig.apiKey

  useEffect(() => () => { recRef.current?.abort?.() ?? recRef.current?.stop?.() }, [])

  const scene = SCENES[sceneIdx]

  const ctx: RoleplayContext = { scene: scene.label, goal: scene.goal, level: scene.level, history }

  const start = async () => {
    setLoading(true)
    setErr('')
    setHistory([])
    setChosen(null)
    setJudge(null)
    setSuccess(false)
    setReport(null)
    try {
      const t = await aiRoleplayTurn({ ...ctx, history: [] }, true)
      setTurn(t)
      setHistory([{ speaker: 'NPC', text: t.line }])
      // P5-1:设置页开启「自动朗读」后,NPC/AI 新台词自动出声
      if (loadData().tts.autoReadAi) onSpeak(t.line)
    } catch (e) {
      setErr((e as Error).message)
    }
    setLoading(false)
  }

  const assess = async (history: CoachLine[]) => {
    if (!coachOn || !history.some((h) => h.speaker === '学生')) return
    setCoachLoading(true)
    try {
      const rep = await runCoachAssessment(history, scene.label)
      setReport(rep)
      // P5-2 入池钩子:教练纠错涉及的词自动进错词重排队
      for (const e of rep.errors) {
        addWrongWords(`${e.text} ${e.correct ?? ''}`, 'coach-wrong')
      }
    } catch (e) {
      setErr((e as Error).message)
    }
    setCoachLoading(false)
  }

  const pick = async (idx: number) => {
    if (!turn || chosen != null || success) return
    setChosen(idx)
    await applyReply(turn.options[idx].text, 'option', idx)
  }

  const applyReply = async (userText: string, via: 'option' | 'free', optionIdx?: number) => {
    if (!turn || loading || success) return
    const h = [...history, { speaker: '学生', text: userText, userChoice: userText }]
    setHistory(h)
    setDraft('')
    setLoading(true)
    try {
      const r =
        via === 'option' && optionIdx != null
          ? await aiRoleplayJudge({ ...ctx, history: h }, turn, optionIdx)
          : await judgeFreeInput({ ...ctx, history: h }, turn, userText)
      setJudge({ feedback: r.feedback, summary: r.summary })
      if (r.success) {
        setSuccess(true)
        await assess(h)
      } else {
        setTurn(r.next)
        setHistory([...h, { speaker: 'NPC', text: r.next.line }])
        if (loadData().tts.autoReadAi) onSpeak(r.next.line)
      }
      setChosen(null)
    } catch (e) {
      setErr((e as Error).message)
    }
    setLoading(false)
  }

  const sendFree = async () => {
    const text = draft.trim()
    if (!text || !turn || chosen != null || success) return
    setChosen(-1)
    await applyReply(text, 'free')
  }

  const startVoice = () => {
    const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition
    if (!SR) {
      setErr('当前浏览器不支持语音输入,请改用打字。')
      return
    }
    const rec = new SR()
    recRef.current = rec
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onresult = (ev: { results: { 0: { 0: { transcript: string } } } }) => {
      const t = ev.results[0][0].transcript
      setDraft((d) => (d ? d + ' ' : '') + t)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    setListening(true)
    rec.start()
  }

  const finishNow = async () => {
    if (coachLoading || !history.some((h) => h.speaker === '学生')) return
    setTurn(null)
    setChosen(null)
    await assess(history)
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>🤖 AI 情景对话</h2>
        <span className="tag">需配置 API · 选项 / 自由输入</span>
      </div>

      {!aiReady && (
        <div className="goal-banner">
          ⚙️ 尚未配置 AI。请到
          <Link to="/settings"> 设置页 </Link>
          填写 API Key。也可使用离线版目标对话(单元内 ④ 目标对话)。
        </div>
      )}

      <div className="form-row">
        <label>
          场景
          <select value={sceneIdx} onChange={(e) => setSceneIdx(Number(e.target.value))}>
            {SCENES.map((s, i) => (
              <option key={s.key} value={i}>
                {s.label}({s.level})
              </option>
            ))}
          </select>
        </label>
        <button className="btn" onClick={start} disabled={loading || !aiReady}>
          {history.length ? '🔄 重新开始' : '🚀 开始对话'}
        </button>
      </div>

      {aiReady && (
        <>
          <div className="row-btns">
            <button className={'btn small ' + (freeMode ? 'ghost' : '')} onClick={() => setFreeMode(false)}>
              选项模式
            </button>
            <button className={'btn small ' + (freeMode ? '' : 'ghost')} onClick={() => setFreeMode(true)}>
              自由输入
            </button>
          </div>
          <label className="check-label coach-check">
            <input type="checkbox" checked={coachOn} onChange={(e) => setCoachOn(e.target.checked)} />
            🎓 教练模式:对话结束后自动「纠错分析 → CEFR 级别评估 → 2 道针对性操练」并更新能力画像
          </label>
        </>
      )}

      {history.length > 0 && (
        <div className="goal-banner">
          🎯 <b>你的目标:</b>
          {scene.goal} <span className="dim">· 已对话 {history.length} 轮</span>
          {coachOn && turn && !success && history.some((h) => h.speaker === '学生') && (
            <button className="btn small ghost" onClick={finishNow} disabled={coachLoading || loading}>
              🏁 结束对话,生成教练评估
            </button>
          )}
        </div>
      )}

      {err && <div className="feedback no">❌ {err.slice(0, 150)}</div>}

      {coachOn && (success || (!turn && history.length > 0)) && (
        <div className="coach-report">
          <h3>🎓 教练评估</h3>
          {coachLoading && <div className="hint">🤖 教练诊断中:纠错分析 → CEFR 级别评估 → 专项出题(约 10-30 秒)…</div>}
          {!coachLoading && report && <CoachReportPanel report={report} onRestart={start} />}
          {!coachLoading && !report && <div className="feedback no">❌ 评估未完成,可点击「🔄 重新开始」重试。</div>}
        </div>
      )}

      {!coachOn && success && judge?.summary && (
        <div className="dlg-result win">
          <h3>🎉 达成目标!</h3>
          <p>{judge.summary}</p>
          <button className="btn" onClick={start}>
            🔄 再来一轮
          </button>
        </div>
      )}

      {!success &&
        history.map((h, i) => (
          <div key={i} className={'npc-line ' + (h.speaker === '学生' ? 'you-line' : '')}>
            <span className="npc-name">{h.speaker === 'NPC' ? 'NPC' : '你'}</span>
            <WordText text={h.text} onWord={openPopup} />
            <div className="speak-inline">
              <button className="icon-btn" onClick={() => onSpeak(h.text)}>
                🔊
              </button>
            </div>
          </div>
        ))}

      {turn && !success && chosen == null && (
        <>
          <div className="line-cn">
            <b>中文:</b>
            {turn.lineCn}
          </div>
          {turn.grammar && <GrammarBlock points={turn.grammar} />}
          {!freeMode && (
            <>
              <p className="hint">选择你的回应:</p>
              <div className="options">
                {turn.options.map((o, oi) => (
                  <button key={oi} className="option" disabled={loading} onClick={() => pick(oi)}>
                    {String.fromCharCode(65 + oi)}. {o.text}
                    {o.textCn && <span className="dim"> · {o.textCn}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
          {freeMode && (
            <div className="free-input">
              <p className="hint">用英语写下你的回应(可参考下方提示),或点 🎤 语音输入。</p>
              {turn.options[0] && (
                <p className="dim">提示: {turn.options.map((o) => o.text).join(' / ')}</p>
              )}
              <textarea
                className="free-box"
                rows={3}
                value={draft}
                placeholder="Type your reply in English…"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    void sendFree()
                  }
                }}
              />
              <div className="row-btns">
                <button className="btn" disabled={loading || !draft.trim()} onClick={() => void sendFree()}>
                  发送回应
                </button>
                <button className={'btn ghost ' + (listening ? '' : '')} disabled={loading} onClick={startVoice}>
                  {listening ? '🎙 聆听中…' : '🎤 语音输入'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {judge && !success && (
        <div className="feedback ok">
          {judge.feedback}
          {loading && <span className="dim"> AI 生成中…</span>}
        </div>
      )}
    </section>
  )
}

const ERROR_KIND_LABEL: Record<string, string> = {
  grammar: '语法',
  lexis: '用词',
  pragmatics: '语用',
  fluency: '流利度',
}

function CoachReportPanel({ report, onRestart }: { report: CoachReport; onRestart: () => void }) {
  return (
    <div className="coach-panel">
      <div className="coach-level">
        <span>当前级别</span>
        <span className="score-badge">{report.level}</span>
        {report.levelNote && <span className="dim"> {report.levelNote}</span>}
      </div>
      {report.feedback && (
        <div className="feedback ok">
          <b>总体点评:</b> {report.feedback}
        </div>
      )}
      {report.errors.length > 0 && (
        <div className="coach-errors">
          <h4>✏️ 纠错记录(已存入能力画像)</h4>
          {report.errors.slice(0, 6).map((e, i) => (
            <div key={i} className="coach-error">
              <span className="tag">{ERROR_KIND_LABEL[e.kind] ?? e.kind}</span>
              <div>❌ {e.text}</div>
              {e.correct && <div>✅ {e.correct}</div>}
              <div className="dim">💡 {e.note}</div>
            </div>
          ))}
        </div>
      )}
      {report.weakPoints.length > 0 && (
        <div className="coach-weak">
          <h4>🎯 薄弱点</h4>
          <div className="wordbook">
            {report.weakPoints.slice(0, 6).map((w, i) => (
              <span key={i} className="wb-item" style={{ cursor: 'default' }}>
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
      <CoachDrills drills={report.drills} />
      <div className="row-btns">
        <button className="btn" onClick={onRestart}>
          🔄 再来一轮
        </button>
      </div>
    </div>
  )
}
