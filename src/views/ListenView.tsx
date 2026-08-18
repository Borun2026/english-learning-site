import { useEffect, useRef, useState } from 'react'
import WordText from '../components/WordText'
import GrammarBlock from '../components/GrammarBlock'
import type { ListenChallenge } from '../lib/types'
import { listenWavUrls } from '../lib/audio'
import { speak, stopSpeech } from '../lib/speech'
import ShadowRead from '../components/ShadowRead'

type Mode = 'practice' | 'exam'
type ExamPhase = 'idle' | 'listening' | 'answering' | 'done'

export default function ListenView({
  challenge,
  onWord,
  onSpeak,
  onComplete,
}: {
  challenge: ListenChallenge
  onWord: (e: React.MouseEvent<HTMLElement>, w: string) => void
  onSpeak: (w: string, r?: number, audioUrl?: string) => void
  onComplete: (score: number, total: number) => void
}) {
  /* ---------- 练习模式状态 ---------- */
  const [roundIdx, setRoundIdx] = useState(0)
  const [played, setPlayed] = useState(false)
  const [chosen, setChosen] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [reported, setReported] = useState(false)

  /* ---------- 考试模式状态 ---------- */
  const [mode, setMode] = useState<Mode>('practice')
  const [phase, setPhase] = useState<ExamPhase>('idle')
  const [examPlayIdx, setExamPlayIdx] = useState(0)
  const [examAnswers, setExamAnswers] = useState<(number | null)[]>([])
  const [examReported, setExamReported] = useState(false)

  /* ---------- 本地预生成音频(P5-4:本地 wav 优先,缺则在线合成) ---------- */
  const [wavUrls, setWavUrls] = useState<(string | undefined)[]>([])
  const hasLocal = wavUrls.some(Boolean)
  useEffect(() => {
    let alive = true
    listenWavUrls(challenge.unitId, challenge.rounds.length).then((urls) => {
      if (alive) setWavUrls(urls)
    })
    return () => {
      alive = false
      stopSpeech()
    }
  }, [challenge.unitId, challenge.rounds.length])

  const round = challenge.rounds[roundIdx]
  const total = challenge.rounds.length

  const playRound = (idx: number, next?: () => void) => {
    const line = challenge.rounds[idx].line
    if (next) {
      // 考试模式整组连播:直接走 lib/speech,拿到 onEnd 才能串下一轮
      speak(line, { rate: challenge.rate, audioUrl: wavUrls[idx], onEnd: next })
    } else {
      onSpeak(line, challenge.rate, wavUrls[idx])
    }
  }

  /* ---------- 练习模式 ---------- */
  const choose = (idx: number) => {
    if (!played || chosen != null) return
    setChosen(idx)
    if (round.options[idx].correct) setScore((s) => s + 1)
  }

  const nextRound = () => {
    if (roundIdx + 1 >= total) {
      setFinished(true)
      if (!reported) {
        setReported(true)
        onComplete(score, total)
      }
    } else {
      setRoundIdx((r) => r + 1)
      setPlayed(false)
      setChosen(null)
    }
  }

  const restart = () => {
    stopSpeech()
    setRoundIdx(0)
    setPlayed(false)
    setChosen(null)
    setScore(0)
    setFinished(false)
    setReported(false)
  }

  /* ---------- 考试模式:整组盲听 → 逐题作答 → 统一揭字幕 ---------- */
  const examIdRef = useRef(0)
  const phaseRef = useRef<ExamPhase>('idle')

  const startExam = () => {
    const id = ++examIdRef.current
    phaseRef.current = 'listening'
    setExamAnswers(challenge.rounds.map(() => null))
    setExamReported(false)
    setPhase('listening')
    setExamPlayIdx(0)
    playSeq(0, id)
  }

  const playSeq = (idx: number, id: number) => {
    if (examIdRef.current !== id || phaseRef.current !== 'listening') return
    if (idx >= total) {
      phaseRef.current = 'answering'
      setPhase('answering')
      return
    }
    setExamPlayIdx(idx)
    playRound(idx, () => playSeq(idx + 1, id))
  }

  const stopExam = () => {
    stopSpeech()
    phaseRef.current = 'idle'
    setPhase('idle')
  }

  const pickExam = (roundNo: number, optIdx: number) => {
    if (phase !== 'answering') return
    setExamAnswers((a) => a.map((v, i) => (i === roundNo ? optIdx : v)))
  }

  const submitExam = () => {
    const s = examAnswers.reduce<number>((acc, a, i) => acc + (a === null ? 0 : challenge.rounds[i].options[a].correct ? 1 : 0), 0)
    setScore(s)
    phaseRef.current = 'done'
    setPhase('done')
    if (!examReported) {
      setExamReported(true)
      onComplete(s, total)
    }
  }

  const switchMode = (m: Mode) => {
    stopSpeech()
    setMode(m)
    phaseRef.current = 'idle'
    setPhase('idle')
    setExamAnswers(challenge.rounds.map(() => null))
  }

  /* ---------- 考试模式完成:统一揭字幕 ---------- */
  if (mode === 'exam' && phase === 'done') {
    return (
      <div>
        <div className={'dlg-result ' + (score === total ? 'win' : 'lose')}>
          <h3>{score === total ? '🌟 听力满分!' : '考试完成'}</h3>
          <p>
            得分:{score} / {total}
          </p>
          <p className="hint">字幕与讲解已统一揭晓,逐轮核对:</p>
          <div className="record">
            {challenge.rounds.map((r, i) => {
              const a = examAnswers[i]
              const ok = a != null && r.options[a].correct
              return (
                <div key={i} className="record-item">
                  <div className="rec-npc">
                    <b>
                      {i + 1}. {r.speaker} {ok ? '✅' : a == null ? '⏭' : '❌'}
                    </b>
                    <div>{r.line}</div>
                    <div className="dim">{r.lineCn}</div>
                  </div>
                  {r.grammar && <GrammarBlock points={r.grammar} />}
                </div>
              )
            })}
          </div>
          <div className="row-btns">
            <button className="btn" onClick={() => switchMode('exam')}>
              🔄 再考一次
            </button>
            <button className="btn ghost" onClick={() => switchMode('practice')}>
              回练习模式
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- 考试模式:盲听 / 作答 ---------- */
  if (mode === 'exam') {
    return (
      <div>
        <div className="card-head">
          <div>
            <h2>🎧 {challenge.title} · 考试模式</h2>
            <span className="tag">整组盲听 → 逐题作答 → 结束统一揭字幕</span>
            {hasLocal && <span className="tag">🎙 本地 Piper 自然音</span>}
          </div>
          <div className="row-btns">
            <button className="btn small" onClick={() => switchMode('practice')}>
              练习模式
            </button>
            <button className="btn small ghost" onClick={() => switchMode('exam')}>
              考试模式
            </button>
          </div>
        </div>

        {phase === 'idle' && (
          <div className="listen-stage">
            <p className="hint">
              规则:{total} 轮台词将整组连续盲听一遍,期间不显示字幕;听完后逐题作答,全部答完才统一揭晓原文、翻译与讲解。
            </p>
            <button className="btn big" onClick={startExam}>
              🎬 开始整组盲听
            </button>
          </div>
        )}

        {phase === 'listening' && (
          <div className="listen-stage">
            <div className="goal-banner">
              🔊 <b>盲听中 · 第 {Math.min(examPlayIdx + 1, total)} / {total} 轮</b>
              <span className="dim">字幕将在全部作答后统一揭晓</span>
            </div>
            <div className="played-row">
              <span className="dim">正在连续播放整组台词…</span>
            </div>
            <button className="btn ghost" onClick={stopExam}>
              ⏹ 停止
            </button>
          </div>
        )}

        {phase === 'answering' && (
          <div className="listen-stage">
            <div className="goal-banner">
              ✍️ <b>作答阶段</b>
              <span className="dim">
                已完成 {examAnswers.filter((a) => a != null).length} / {total} 题
              </span>
            </div>
            {challenge.rounds.map((r, i) => (
              <div key={i} className="exam-round">
                <div className="exam-round-head">
                  <b>第 {i + 1} 题</b>
                  <span className="dim">{r.speaker} 说了一句话…</span>
                  <button className="icon-btn" onClick={() => playRound(i)} title="再听一次">
                    🔊
                  </button>
                </div>
                <div className="options">
                  {r.options.map((o, oi) => (
                    <button
                      key={oi}
                      className={'option' + (examAnswers[i] === oi ? ' chosen' : '')}
                      onClick={() => pickExam(i, oi)}
                    >
                      {String.fromCharCode(65 + oi)}. {o.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="row-btns">
              <button className="btn" disabled={examAnswers.some((a) => a == null)} onClick={submitExam}>
                📮 交卷,揭晓字幕与得分
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ---------- 练习模式(原逐轮流程,保留;音频优先本地 wav) ---------- */
  if (finished) {
    return (
      <div>
        <div className={'dlg-result ' + (score === total ? 'win' : 'lose')}>
          <h3>{score === total ? '🌟 完美通关!' : '完成挑战'}</h3>
          <p>
            得分:{score} / {total}
          </p>
          <div className="record">
            {challenge.rounds.map((r, i) => (
              <div key={i} className="record-item">
                <div className="rec-npc">
                  <b>{r.speaker}</b>
                  <div>{r.line}</div>
                  <div className="dim">{r.lineCn}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="row-btns">
            <button className="btn" onClick={restart}>
              🔄 重来
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card-head">
        <div>
          <h2>🎧 {challenge.title}</h2>
          <span className="tag">先听 → 再选 → 才看原文</span>
          {hasLocal && <span className="tag">🎙 本地 Piper 自然音</span>}
        </div>
        <div className="row-btns">
          <button className="btn small ghost" onClick={() => switchMode('practice')}>
            练习模式
          </button>
          <button className="btn small" onClick={() => switchMode('exam')}>
            考试模式
          </button>
        </div>
      </div>

      <div className="goal-banner">
        🎯 <b>第 {roundIdx + 1} / {total} 轮</b>
        <span className="dim">· 得分 {score} · 语速 {challenge.rate}x</span>
      </div>

      <div className="listen-stage">
        {!played ? (
          <button className="btn big" onClick={() => playRound(roundIdx)}>
            🔊 开始听(播完再选)
          </button>
        ) : (
          <div className="played-row">
            <span className="dim">{round.speaker} 说了一句话…</span>
            <button className="icon-btn" onClick={() => playRound(roundIdx)}>
              🔊 再听一次
            </button>
          </div>
        )}

        {!played && <p className="hint">先盲听台词,再选择最佳回应。选择后才会显示原文和翻译。</p>}

        <div className="options">
          {round.options.map((o, oi) => {
            let cls = 'option'
            if (chosen != null) {
              if (o.correct) cls += ' correct'
              else if (chosen === oi) cls += ' wrong'
              else cls += ' dim'
            }
            return (
              <button key={oi} className={cls} disabled={!played || chosen != null} onClick={() => choose(oi)}>
                {String.fromCharCode(65 + oi)}. {o.text}
              </button>
            )
          })}
        </div>

        {chosen != null && (
          <div className="reveal">
            <div className={'feedback ' + (round.options[chosen].correct ? 'ok' : 'no')}>
              {round.options[chosen].feedback}
            </div>
            <div className="npc-line">
              <span className="npc-name">{round.speaker}</span>
              <WordText text={round.line} onWord={onWord} />
              <div className="line-cn">
                <b>原文翻译:</b>
                {round.lineCn}
              </div>
              {round.grammar && <GrammarBlock points={round.grammar} />}
              <ShadowRead text={round.line} />
            </div>
            <div className="row-btns">
              <button className="btn" onClick={nextRound}>
                {roundIdx + 1 >= total ? '查看结果 →' : '下一轮 →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
