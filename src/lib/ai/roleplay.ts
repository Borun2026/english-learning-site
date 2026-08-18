import type { AiRoleplayTurn, GrammarPoint } from '../types'
import { chatJSON, getAiConfig } from './provider'

export interface RoleplayContext {
  scene: string
  goal: string
  level: string
  history: { speaker: string; text: string; userChoice?: string }[]
}

const SYSTEM = `你是英语情景对话练习的对话引擎。学生是正在备考的中国人,目标:${''}在真实语境中练习英语。
规则:
1. 你扮演场景中的 NPC,用符合场景身份的自然英语说话。
2. 每轮输出:一句 NPC 台词(不超过 25 词)、中文翻译、1 个语法点、3 个学生可选的回应(其中 1 个最佳,标注 best:true)。
3. 学生的回应难度要与场景匹配,语气礼貌自然。
4. 如果学生的目标已经达成,success 设为 true 并给出简短总结。
5. 台词和选项中的用词要尽量简单常见。`

export async function aiRoleplayTurn(ctx: RoleplayContext, first: boolean): Promise<AiRoleplayTurn> {
  const cfg = getAiConfig()
  const histText = ctx.history
    .map((h) => `${h.speaker}: ${h.text}${h.userChoice ? `\n学生选了: ${h.userChoice}` : ''}`)
    .join('\n')

  const out = await chatJSON<AiRoleplayTurn>(
    cfg,
    SYSTEM,
    `场景:${ctx.scene}\n学生目标:${ctx.goal}\n难度:${ctx.level}\n${first ? '这是对话第一轮,由 NPC 开口。' : '请继续对话。'}\n对话历史:\n${histText || '(无)'}\n\n输出 JSON:
{"line":"NPC 台词","lineCn":"中文翻译","grammar":[{"name":"语法点名","note":"中文讲解","example":"例句","exampleCn":"例句翻译"}],"options":[{"text":"回应1","textCn":"中文","best":false},{"text":"回应2","textCn":"中文","best":false},{"text":"回应3","textCn":"中文","best":true}],"success":false,"summary":""}`,
  )
  return out
}

export async function aiRoleplayJudge(
  ctx: RoleplayContext,
  lastTurn: AiRoleplayTurn,
  chosenIdx: number,
): Promise<{ feedback: string; next: AiRoleplayTurn; success: boolean; summary?: string }> {
  const chosen = lastTurn.options[chosenIdx]
  const hint = chosen.best
    ? '这是最佳回应。'
    : '这不是最佳回应(最佳是:' + lastTurn.options.find((o) => o.best)?.text + ')。'
  return judgeFreeInput(ctx, lastTurn, chosen.text, hint)
}

/** 自由输入判分/续写:学生自写一句英语,NPC 点评并决定是否达成目标 */
export async function judgeFreeInput(
  ctx: RoleplayContext,
  lastTurn: AiRoleplayTurn,
  userText: string,
  extraHint = '',
): Promise<{ feedback: string; next: AiRoleplayTurn; success: boolean; summary?: string }> {
  const cfg = getAiConfig()
  const out = await chatJSON<{
    feedback: string
    success: boolean
    summary?: string
    next: AiRoleplayTurn
  }>(
    cfg,
    SYSTEM,
    `学生刚才的回应是:${userText}
${extraHint}
请给出:
1. feedback:针对学生回应的中文点评(1-2 句,指出优点或问题;自由输入时顺带点出明显语法/用词错误)
2. success:目标是否已达成
3. summary:若达成,给出中文总结
4. next:若未达成,NPC 的下一轮(结构同上一次输出,仍给 3 个选项供下一轮选用)

输出 JSON:{"feedback":"...","success":false,"summary":"","next":{"line":"...","lineCn":"...","grammar":[],"options":[],"success":false,"summary":""}}`,
  )
  return { feedback: out.feedback, next: out.next, success: !!out.success, summary: out.summary }
}
