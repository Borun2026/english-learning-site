import type { AiWritingFeedback } from '../types'
import { chatJSON, getAiConfig } from './provider'

/**
 * AI 写作批改:针对目标句式的仿写,给出 grammar / lexical / coherence 三项反馈 +
 * 雅思 0-9 估分 + 打磨建议。缓存由页面层负责(localStorage writingFeedback)。
 */
export async function aiCorrectWriting(
  patternName: string,
  sentence: string,
): Promise<AiWritingFeedback> {
  const cfg = getAiConfig()
  if (!cfg.apiKey) throw new Error('未配置 AI API Key')
  const out = await chatJSON<AiWritingFeedback>(
    cfg,
    '你是雅思/托福写作批改老师,面向中国学习者。点评要具体、简短、可操作,用中文;没有问题的类别输出空数组。估分按雅思写作标准 0-9(可保留一位小数),严格不虚高。',
    `学生仿写的目标句式:${patternName}\n学生句子:${sentence}\n\n输出 JSON:{"grammar":["语法问题1"],"lexical":["用词问题1"],"coherence":["连贯/逻辑问题1"],"score":6.5,"rewrite":"打磨后的建议版本(保持原意)"}`,
  )
  return {
    grammar: (out.grammar ?? []).map((s) => String(s).slice(0, 200)),
    lexical: (out.lexical ?? []).map((s) => String(s).slice(0, 200)),
    coherence: (out.coherence ?? []).map((s) => String(s).slice(0, 200)),
    score: Number(out.score) || 0,
    rewrite: out.rewrite ? String(out.rewrite).slice(0, 500) : undefined,
  }
}
