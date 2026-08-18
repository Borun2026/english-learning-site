// =====================================================================
// 游戏「🤖 AI 讲讲」(P5-3):答错后让 AI 讲清这个词/这个句子。
// 复用 chat(纯文本),结果按 key 缓存到 localStorage;未配置 Key 自动隐藏。
// =====================================================================

import { chat } from '../ai/provider'
import { loadData, setGameAiNote } from '../storage'

export function gameAiReady(): boolean {
  return !!loadData().aiConfig.apiKey
}

export async function explainGameItem(
  cacheKey: string,
  topic: string,
  question: string,
  answer: string,
): Promise<string> {
  const cfg = loadData().aiConfig
  if (!cfg.apiKey) throw new Error('未配置 AI API Key(设置页配置后可用)')
  const cached = loadData().gameAiNotes[cacheKey]
  if (cached) return cached
  const text = await chat(
    cfg,
    [
      {
        role: 'system',
        content:
          '你是英语学习平台的趣味讲解助手。用 2-4 句简洁中文讲解,先讲正确理解,再给一个记忆小技巧;不输出 markdown 标题,总长不超过 150 字。',
      },
      {
        role: 'user',
        content: `游戏主题:${topic}\n题目/单词:${question}\n正确答案:${answer}`,
      },
    ],
    { temperature: 0.4 },
  )
  setGameAiNote(cacheKey, text.trim())
  return text.trim()
}
