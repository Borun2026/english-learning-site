import type { AiErrorRecord, AiProfile, CoachDrill, CoachReport } from '../types'
import { chatJSON, getAiConfig } from './provider'
import { loadData, setAiProfile } from '../storage'
import { loadCefrProfile } from '../grammarRef'

export const CEFR_IDS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.map((s) => String(s).trim()).filter(Boolean))]
}

function ensureKey() {
  if (!getAiConfig().apiKey) throw new Error('未配置 API Key')
}

/* ---------------- CEFR 大纲(懒加载 cefr-profile.json) ---------------- */

export { loadCefrProfile }

/* ---------------- 诊断:纠错分析(严格教师算法) ---------------- */

export interface CoachLine {
  speaker: string
  text: string
}

export async function analyzeErrors(
  lines: CoachLine[],
): Promise<{ errors: AiErrorRecord[]; weakPoints: string[]; feedback: string }> {
  ensureKey()
  const student = lines.filter((l) => l.speaker === '学生').map((l) => l.text.trim()).filter(Boolean)
  if (student.length === 0) {
    return { errors: [], weakPoints: [], feedback: '本轮没有学生发言,暂无可分析的错误。' }
  }
  const out = await chatJSON<{
    errors?: { text?: string; correct?: string; note?: string; kind?: string }[]
    weakPoints?: string[]
    feedback?: string
  }>(
    getAiConfig(),
    '你是严格但鼓励型的英语教练,面向中国学习者。逐条分析学生英语回应中的真实错误,不臆造、不重复;按 grammar(语法)/ lexis(用词)/ pragmatics(语用)/ fluency(流利度) 分类。',
    `学生的回应:\n${student.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n输出 JSON:{"errors":[{"text":"原句(截取相关部分)","correct":"建议改法(没有可留空)","note":"中文讲解","kind":"grammar|lexis|pragmatics|fluency"}],"weakPoints":["2-4 个薄弱点,中文,尽量用语法点或技能名"],"feedback":"总体中文点评(2-3 句):先肯定 1 个优点,再指出最重要的 1-2 个问题"}`,
  )
  const now = Date.now()
  const errors = (out.errors ?? [])
    .map((e) => ({
      text: String(e.text ?? '').slice(0, 200),
      correct: e.correct ? String(e.correct).slice(0, 200) : undefined,
      note: String(e.note ?? '').slice(0, 200),
      kind: String(e.kind ?? 'grammar').slice(0, 20),
      at: now,
    }))
    .filter((e) => e.text)
    .slice(0, 20)
  return {
    errors,
    weakPoints: dedupe(out.weakPoints ?? []).slice(0, 6),
    feedback: String(out.feedback ?? '').slice(0, 400),
  }
}

/* ---------------- 诊断:CEFR 级别评估 ---------------- */

export async function detectLevel(samples: {
  userLines?: string[]
  texts?: string[]
}): Promise<{ level: string; note: string }> {
  ensureKey()
  const cefr = await loadCefrProfile()
  const standards = cefr
    ? cefr.levels.map((l) => `${l.id} ${l.name}:${l.can}`).join('\n')
    : 'A0 零基础;A1 简单句;A2 常用时态与比较;B1 连贯观点;C1 高级结构;C2 母语级。'
  const sample = [...(samples.userLines ?? []).slice(-12), ...(samples.texts ?? []).slice(0, 8)]
    .join('\n')
    .slice(0, 3000)
  const out = await chatJSON<{ level?: string; note?: string }>(
    getAiConfig(),
    '你是严格按实际表现评级的 CEFR 考官,绝不虚高。级别必须从给定列表(A0-C2)中选择,只输出 JSON。',
    `CEFR 标准参考:\n${standards}\n\n学生英语样本:\n${sample || '(无)'}\n\n输出 JSON:{"level":"A0|A1|A2|B1|B2|C1|C2","note":"中文评估依据(2-3 句:能做什么 + 与上一级的主要差距)"}`,
  )
  const level = String(out.level ?? '').toUpperCase().trim()
  if (!CEFR_IDS.includes(level)) {
    throw new Error(`级别评估结果无效: ${out.level ?? '(空)'}`)
  }
  return { level, note: String(out.note ?? '').slice(0, 400) }
}

/* ---------------- 专项操练(针对薄弱点出题) ---------------- */

export async function generateDrills(profile: AiProfile): Promise<CoachDrill[]> {
  ensureKey()
  const cefr = await loadCefrProfile()
  const lv = cefr?.levels.find((l) => l.id === profile.level)
  const goals = lv
    ? lv.blocks.flatMap((b) => b.microGoals).join('、')
    : '综合提升听、说、读、写'
  const weak = profile.weakPoints.slice(0, 4).join('、') || '综合'
  const mem = (profile.memories ?? []).slice(0, 6).map((m) => m.text).join('；')
  const out = await chatJSON<{ drills?: CoachDrill[] }>(
    getAiConfig(),
    '你是英语教练的出题助手。题目必须可离线判分:blank/judge 给 3-4 个选项;rewrite/translate 给参考回答。题干用中文提示,解析用中文。',
    `学生当前级别:${profile.level || '未知'}\n薄弱点:${weak}\n教练记忆:${mem || '无'}\n该级别目标微技能:${goals}\n\n请针对薄弱点出恰好 2 道专项操练题。输出 JSON:{"drills":[{"kind":"blank|judge|rewrite|translate","prompt":"题干(blank 用 ___ 表示空位)","options":["选项A","选项B","选项C"](仅 blank/judge 需要)","answer":"标准答案或参考回答","note":"中文解析","point":"针对的语法点/技能名"}]}`,
  )
  return (out.drills ?? []).filter((d) => d && d.prompt && d.answer).slice(0, 2)
}

/* ---------------- 闭环:诊断 → 讲解 → 纠错 → 操练 → 画像 ---------------- */

export async function runCoachAssessment(history: CoachLine[], scene?: string): Promise<CoachReport> {
  ensureKey()
  const cur = loadData().aiProfile
  const [analysis, level] = await Promise.all([
    analyzeErrors(history),
    detectLevel({ userLines: history.filter((h) => h.speaker === '学生').map((h) => h.text) }),
  ])

  const next: AiProfile = {
    ...cur,
    level: level.level,
    levelNote: level.note,
    weakPoints: dedupe([...analysis.weakPoints, ...cur.weakPoints]).slice(0, 12),
    errors: [...analysis.errors, ...cur.errors].slice(0, 100),
    history: [
      {
        at: Date.now(),
        type: 'dialogue',
        scene,
        level: level.level,
        summary: analysis.feedback.slice(0, 120),
      },
      ...cur.history,
    ].slice(0, 50),
  }
  setAiProfile(next)

  const drills = await generateDrills(next)
  return {
    level: level.level,
    levelNote: level.note,
    feedback: analysis.feedback,
    errors: analysis.errors,
    weakPoints: next.weakPoints,
    drills,
  }
}

/* ---------------- AiParse 侧写:文本解析并入画像 ---------------- */

/**
 * 把一次 AI 解析的文本作为阅读样本记录到画像(估级 + 语法点并入薄弱点候选)。
 * 失败静默返回 null,不影响解析主流程;无 API Key 直接返回 null。
 */
export async function recordReadingSample(
  texts: string[],
  grammarNames: string[],
): Promise<{ level: string; note: string } | null> {
  if (!getAiConfig().apiKey) return null
  try {
    const est = await detectLevel({ texts: texts.slice(0, 10) })
    const d = loadData().aiProfile
    setAiProfile({
      level: d.level || est.level,
      levelNote: d.level ? d.levelNote : est.note,
      weakPoints: dedupe([...d.weakPoints, ...grammarNames.slice(0, 3)]).slice(0, 12),
      history: [
        {
          at: Date.now(),
          type: 'reading',
          level: est.level,
          summary: `解析文本 ${texts.length} 句,估级 ${est.level}`,
        },
        ...d.history,
      ].slice(0, 50),
    })
    return est
  } catch {
    return null
  }
}
