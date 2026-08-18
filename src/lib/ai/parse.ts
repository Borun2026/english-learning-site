import type { AiParsedSentence, GrammarPoint } from '../types'
import { chatJSON, getAiConfig } from './provider'

const SYSTEM = `你是英语长难句拆解专家。按 JSON 格式逐句分析英文文本:
- translation: 准确流畅的中文翻译
- chunks: 句子成分拆解,必须完整覆盖整句的每个单词。类型:主干/时间状语/地点状语/让步状语从句/条件状语从句/宾语从句/定语从句/定语/补语/插入语 等。主干用 parts 标出主语/谓语/宾语/表语。
- grammar: 2-3 个语法点,中文讲解,可附例句。

colors 使用固定色:#a8dab5(主干) #8ab4f8(状语) #f6c177(条件/让步) #c8a5e0(各类从句) #f4a8b8(定语/修饰) #9fd8e8(插入语/补语)`

function promptFor(batch: string[]): string {
  return `请拆解以下 ${batch.length} 个句子,输出 JSON:{"sentences":[{"text":"原句","translation":"...","chunks":[{"label":"主干","color":"#a8dab5","text":"...","parts":[{"role":"主语","text":"..."}]}],"grammar":[{"name":"...","note":"...","example":"...","exampleCn":"..."}]}]}\n\n句子列表:\n${batch.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
}

/**
 * 分批解析:长文一次全发容易超出模型输出上限,按 8 句一批请求,
 * 批次间顺序执行以避免触发并发限流。onProgress 用于页面显示进度。
 */
export async function aiParseSentences(
  sentences: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<AiParsedSentence[]> {
  const cfg = getAiConfig()
  const BATCH = 8
  const results: AiParsedSentence[] = []
  for (let i = 0; i < sentences.length; i += BATCH) {
    const batch = sentences.slice(i, i + BATCH)
    const out = await chatJSON<{ sentences: AiParsedSentence[] }>(cfg, SYSTEM, promptFor(batch))
    results.push(...(out.sentences ?? []).filter((s) => s.text && s.translation))
    onProgress?.(Math.min(i + BATCH, sentences.length), sentences.length)
  }
  return results
}
