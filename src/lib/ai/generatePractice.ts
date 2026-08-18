import type { PracticeQuestion, PracticeSet } from '../types'
import { getAiConfig, chatJSON } from './provider'
import { loadData, setPracticeSet } from '../storage'

function ensureKey() {
  if (!getAiConfig().apiKey) throw new Error('未配置 API Key')
}

function memoriesHint(): string {
  const mem = loadData().aiProfile.memories ?? []
  if (!mem.length) return ''
  return `\n教练记忆(优先照顾):${mem
    .slice(0, 6)
    .map((m) => m.text)
    .join('；')}`
}

export async function generatePractice(kind: 'listen' | 'read', level: string): Promise<PracticeSet> {
  ensureKey()
  const weak = loadData().aiProfile.weakPoints.slice(0, 4).join('、') || '综合'
  const out = await chatJSON<{
    title?: string
    text?: string
    textCn?: string
    questions?: { q?: string; options?: string[]; answer?: number; analysis?: string }[]
  }>(
    getAiConfig(),
    '你是英语练习出题老师。文本必须是自然英语,题目可离线四选一判分,解析用中文。只输出 JSON。',
    `请生成 1 套 ${kind === 'listen' ? '听力' : '阅读'}练习。
CEFR 级别:${level}
薄弱点:${weak}${memoriesHint()}
要求:
- text:英文短文,听力 80-120 词,阅读 120-180 词
- textCn:中文大意
- questions:恰好 5 题,每题 4 个选项,answer 为 0-3 下标,analysis 中文
- 题目覆盖细节/主旨/词义,不要超纲

输出 JSON:{"title":"...","text":"...","textCn":"...","questions":[{"q":"...","options":["A","B","C","D"],"answer":0,"analysis":"..."}]}`,
  )
  const qs: PracticeQuestion[] = (out.questions ?? [])
    .map((q) => ({
      q: String(q.q ?? '').slice(0, 240),
      options: Array.isArray(q.options) ? q.options.map((o) => String(o).slice(0, 120)).slice(0, 4) : [],
      answer: typeof q.answer === 'number' ? q.answer : 0,
      analysis: String(q.analysis ?? '').slice(0, 240),
    }))
    .filter((q) => q.q && q.options.length === 4)
    .slice(0, 5)
  if (!out.text || qs.length < 3) throw new Error('练习生成不完整,请重试')
  const set: PracticeSet = {
    id: `${kind}-${level}-${Date.now()}`,
    kind,
    level,
    title: String(out.title ?? (kind === 'listen' ? '听力练习' : '阅读练习')).slice(0, 80),
    text: String(out.text).slice(0, 2000),
    textCn: out.textCn ? String(out.textCn).slice(0, 800) : undefined,
    questions: qs,
    createdAt: Date.now(),
  }
  setPracticeSet(set)
  return set
}
