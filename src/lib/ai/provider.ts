import type { AiConfig, AiWordExplain } from '../types'
import { isCompanionUp, probeCompanion } from '../companion'
import { AI_PRESETS, loadData } from '../storage'

/**
 * 请求端点:BASE 切换逻辑
 * 1. 设置里填了「独立 AI 代理地址」(生产环境)→ 走独立代理 scripts/ai-proxy-server.mjs
 * 2. 开发模式 → 走 Vite 内置 /__ai_proxy 中间件
 * 3. 便携模式(Go english-app 在线)→ 同源 /__ai_proxy
 * 4. 其余 → 直连供应商
 */
async function aiFetch(cfg: AiConfig, endpoint: string, init: RequestInit): Promise<Response> {
  const proxy = (cfg.proxyBase || '').trim().replace(/\/+$/, '')
  if (proxy) {
    return fetch(`${proxy}/__ai_proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: endpoint, headers: init.headers, body: init.body }),
      signal: init.signal,
    })
  }
  if (import.meta.env.DEV) {
    return fetch('/__ai_proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: endpoint, headers: init.headers, body: init.body }),
      signal: init.signal,
    })
  }
  if (isCompanionUp() || (await probeCompanion())) {
    return fetch('/__ai_proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: endpoint, headers: init.headers, body: init.body }),
      signal: init.signal,
    })
  }
  return fetch(endpoint, init)
}

/** OpenAI 兼容聊天请求(支持 Chat Completions 与 Codex/OpenAI Responses 两种格式)。返回 assistant 文本内容,失败抛错 */
export async function chat(
  cfg: AiConfig,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  if (!cfg.apiKey) throw new Error('未配置 API Key')
  const base = (cfg.baseURL || '').replace(/\/+$/, '')
  const format = cfg.apiFormat === 'responses' ? 'responses' : 'chat'
  const isResponses = format === 'responses'

  const body = isResponses
    ? {
        model: cfg.model,
        input: messages.map((m) => ({
          role: m.role,
          content: [{ type: 'input_text', text: m.content }],
        })),
        temperature: opts.temperature ?? 0.6,
        max_output_tokens: opts.maxTokens ?? 2048,
      }
    : {
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 2048,
        stream: false,
      }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)
  let res: Response
  try {
    res = await aiFetch(cfg, `${base}${isResponses ? '/responses' : '/chat/completions'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (e) {
    if (controller.signal.aborted) throw new Error('AI 请求超时(60 秒),请稍后重试')
    if (e instanceof TypeError && /fetch/i.test(e.message)) {
      throw new Error(
        cfg.proxyBase
          ? '无法连接独立 AI 代理。请确认代理已启动且地址正确。'
          : '无法连接 AI 服务。开发请用 npm run dev;便携模式由 english-app 提供 /__ai_proxy。',
      )
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`AI 请求失败 HTTP ${res.status}: ${errBody.slice(0, 300)}`)
  }
  const data = await res.json()
  const content = isResponses ? extractResponsesText(data) : (data?.choices?.[0]?.message?.content ?? '')
  if (!content) throw new Error('AI 返回为空')
  return content
}

/** 解析 OpenAI/Codex Responses API 返回:output[].content[].text(output_text/refusal),兼容 choices 回退 */
function extractResponsesText(data: unknown): string {
  const d = data as Record<string, unknown>
  const output = d?.output
  if (Array.isArray(output)) {
    const texts: string[] = []
    for (const item of output) {
      const it = item as Record<string, unknown>
      const content = it?.content
      if (typeof content === 'string') {
        if (content.trim()) texts.push(content)
        continue
      }
      if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part === 'string') {
            if (part.trim()) texts.push(part)
          } else if (part && typeof part === 'object') {
            const p = part as Record<string, unknown>
            const t = p?.text ?? p?.refusal
            if (typeof t === 'string' && t.trim()) texts.push(t)
          }
        }
      }
    }
    if (texts.length) return texts.join('\n')
  }
  if (typeof d?.output_text === 'string' && d.output_text.trim()) return d.output_text
  const cc = (d?.choices as { message?: { content?: unknown } }[] | undefined)?.[0]?.message?.content
  if (typeof cc === 'string' && cc.trim()) return cc
  return ''
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1))
  }
  return JSON.parse(cleaned)
}

/** 请求 JSON 输出:解析失败自动重试 1 次,再失败抛错 */
export async function chatJSON<T>(
  cfg: AiConfig,
  system: string,
  user: string,
  retry = true,
): Promise<T> {
  const messages = [
    { role: 'system' as const, content: system + '\n只输出合法 JSON,不要 markdown 代码块,不要任何多余文字。' },
    { role: 'user' as const, content: user },
  ]
  try {
    const text = await chat(cfg, messages, { temperature: 0.3 })
    return extractJson(text) as T
  } catch (e) {
    if (retry) {
      try {
        const text = await chat(cfg, [
          ...messages,
          { role: 'assistant' as const, content: '(上一次输出)' },
          { role: 'user' as const, content: `你上次的输出不是合法 JSON。请严格按要求的 JSON 格式重新输出:${(e as Error).message}` },
        ], { temperature: 0.1 })
        return extractJson(text) as T
      } catch (e2) {
        throw new Error('AI JSON 解析失败(已重试): ' + (e2 as Error).message)
      }
    }
    throw new Error('AI JSON 解析失败: ' + (e as Error).message)
  }
}

export function getAiConfig(): AiConfig {
  return loadData().aiConfig
}

/** 测试连接:发一条最小请求,返回耗时 ms */
export async function testConnection(cfg: AiConfig): Promise<number> {
  const t0 = Date.now()
  await chat(cfg, [{ role: 'user', content: 'hi' }], { maxTokens: 8 })
  return Date.now() - t0
}

export function presetOf(key: string) {
  return AI_PRESETS.find((p) => p.key === key) ?? AI_PRESETS[AI_PRESETS.length - 1]
}

/* ---------------- AI 查词兜底 ---------------- */

export async function aiExplainWord(word: string): Promise<AiWordExplain> {
  const cfg = getAiConfig()
  const out = await chatJSON<AiWordExplain>(
    cfg,
    '你是一名英语词典编辑。为单词给出:音标(英式 IPA)、中文释义、英文解释(剑桥风格,简单词必给,困难词可给)、一个例句及中文翻译。',
    `单词: ${word}\n输出 JSON: {"word":"${word}","phon":"/.../","cn":"词性. 释义","enDef":"English definition","example":{"en":"...","cn":"..."}}`,
  )
  out.word = word.toLowerCase()
  return out
}

/* ---------------- AI 段落批注(翻译 + 讲解) ---------------- */

export async function aiAnnotateParagraph(
  text: string,
): Promise<{ translation: string; explanation: string }> {
  const cfg = getAiConfig()
  if (!cfg.apiKey) throw new Error('未配置 AI API Key')
  const out = await chatJSON<{ translation: string; explanation: string }>(
    cfg,
    '你是英语精读老师,面向中国学习者。翻译要准确通顺;讲解要简洁、用中文,用简短列表。',
    `请处理下面英文段落:\n\n${text}\n\n输出 JSON:{"translation":"通顺的中文翻译","explanation":"中文讲解:逐句指出主干结构、1-3 个关键语法点、1-3 个重点词汇,用简短列表"}`,
  )
  if (!out.translation && !out.explanation) throw new Error('AI 返回为空')
  return out
}
