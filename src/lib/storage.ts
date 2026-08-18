import { useEffect, useState } from 'react'
import { companionFetch, probeCompanion } from './companion.ts'
import type { AiConfig, AiConfigProfile, AiPreset, AiProfile, AiWordExplain, AiWritingFeedback, AppData, CoachMemory, GameBestEntry, MyArticle, PassageNote, PlanCheckins, PracticeSet, StudyPlan, TtsConfig, TtsEngineKind, UnitProgress, UserStats, WordSource, WordState } from './types'

const KEY = 'english-learning-site:v1'

/**
 * AI 供应商预设(参考 cc-switch 72 个供应商预设整理,仅收录 OpenAI Chat Completions 兼容项)。
 * 字段: baseURL / defaultModel / models(套餐) / apiKeyUrl / note / chatCompatible。
 */
export const AI_PRESETS: ({ key: string } & AiPreset)[] = [
  /* ---- 国内大模型 ---- */
  { key: 'deepseek', label: 'DeepSeek', group: '国内大模型', baseURL: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', models: ['deepseek-chat', 'deepseek-reasoner'], apiKeyUrl: 'https://platform.deepseek.com/api_keys', note: '通用对话/解析首选,价格低。' },
  { key: 'zhipu', label: '智谱 GLM', group: '国内大模型', baseURL: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4-flash', models: ['glm-4-flash', 'glm-4.5', 'glm-4.5-air'], apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys' },
  { key: 'kimi', label: 'Kimi (月之暗面)', group: '国内大模型', baseURL: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k', models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'kimi-k2.5'], apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys' },
  { key: 'qwen', label: '通义千问 (阿里云百炼)', group: '国内大模型', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-turbo', models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen3-coder-plus'], apiKeyUrl: 'https://bailian.console.aliyun.com/?apiKey=1' },
  { key: 'minimax', label: 'MiniMax (国内)', group: '国内大模型', baseURL: 'https://api.minimaxi.com/v1', defaultModel: 'MiniMax-M2.5', models: ['MiniMax-M2.5', 'MiniMax-M3', 'MiniMax-Text-01', 'abab6.5s'], apiKeyUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key' },
  { key: 'xiaomi-mimo', label: '小米 MiMo', group: '国内大模型', baseURL: 'https://api.xiaomimimo.com/v1', defaultModel: 'mimo-v2.5-pro', models: ['mimo-v2.5-pro', 'mimo-v2.5'], apiKeyUrl: 'https://platform.xiaomimimo.com/#/console/api-keys', note: '小米 MiMo 官方 OpenAI 兼容端点。' },
  { key: 'xiaomi-mimo-plan', label: '小米 MiMo Token Plan (套餐)', group: '国内大模型', baseURL: 'https://token-plan-cn.xiaomimimo.com/v1', defaultModel: 'mimo-v2.5-pro', models: ['mimo-v2.5-pro', 'mimo-v2.5'], apiKeyUrl: 'https://platform.xiaomimimo.com/#/console/plan-manage', note: 'MiMo Token 套餐专线(按套餐计费),模型名与普通端点一致。' },
  { key: 'bailian', label: '阿里云百炼', group: '国内大模型', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus', models: ['qwen-turbo', 'qwen-plus', 'qwen-max'], apiKeyUrl: 'https://bailian.console.aliyun.com/?apiKey=1' },
  { key: 'hunyuan-tokenhub', label: '腾讯混元 TokenHub', group: '国内大模型', baseURL: 'https://tokenhub.tencentmaas.com/v1', defaultModel: 'hy3', models: ['hy3', 'hunyuan-turbos-latest'], apiKeyUrl: 'https://cloud.tencent.com/product/tokenhub', note: '腾讯 TokenHub 套餐端点(OpenAI 兼容)。' },
  { key: 'stepfun-plan', label: '阶跃星辰 Step Plan', group: '国内大模型', baseURL: 'https://api.stepfun.com/step_plan/v1', defaultModel: 'step-3.7-flash', models: ['step-3.7-flash', 'step-3.7', 'step-2.5'], apiKeyUrl: 'https://platform.stepfun.com/step-plan' },
  { key: 'siliconflow', label: '硅基流动 SiliconFlow', group: '国内大模型', baseURL: 'https://api.siliconflow.cn/v1', defaultModel: 'MiniMaxAI/MiniMax-M2.5', models: ['MiniMaxAI/MiniMax-M2.5', 'Qwen/Qwen3-32B', 'deepseek-ai/DeepSeek-V3.2'], apiKeyUrl: 'https://cloud.siliconflow.cn/account/ak' },
  { key: 'modelscope', label: 'ModelScope 魔搭', group: '国内大模型', baseURL: 'https://api-inference.modelscope.cn/v1', defaultModel: 'Qwen/Qwen3-Coder-Plus', models: ['Qwen/Qwen3-Coder-Plus', 'ZhipuAI/GLM-5.2', 'deepseek-ai/DeepSeek-V3.2'], apiKeyUrl: 'https://modelscope.cn/my/myaccesstoken' },

  /* ---- 国际大模型 ---- */
  { key: 'openai', label: 'OpenAI', group: '国际大模型', baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'], apiKeyUrl: 'https://platform.openai.com/api-keys' },
  { key: 'minimax-intl', label: 'MiniMax (国际)', group: '国际大模型', baseURL: 'https://api.minimax.io/v1', defaultModel: 'MiniMax-M3', models: ['MiniMax-M3', 'MiniMax-Text-01'], apiKeyUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key' },
  { key: 'xai-grok', label: 'xAI Grok', group: '国际大模型', baseURL: 'https://api.x.ai/v1', defaultModel: 'grok-4.5', models: ['grok-4.5'], apiKeyUrl: 'https://x.ai/api' },
  { key: 'novita', label: 'Novita AI', group: '国际大模型', baseURL: 'https://api.novita.ai/openai/v1', defaultModel: 'zai-org/glm-5.1', models: ['zai-org/glm-5.1', 'deepseek/deepseek-v3.2', 'meta-llama/llama-4-maverick'], apiKeyUrl: 'https://novita.ai/dashboard/key' },

  /* ---- 聚合路由与套餐 ---- */
  { key: 'openrouter', label: 'OpenRouter', group: '聚合路由与套餐', baseURL: 'https://openrouter.ai/api/v1', defaultModel: 'deepseek/deepseek-chat', models: ['deepseek/deepseek-chat', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-haiku', 'google/gemini-2.0-flash'], apiKeyUrl: 'https://openrouter.ai/keys' },
  { key: 'opencodego', label: 'OpenCode Go', group: '聚合路由与套餐', baseURL: 'https://opencode.ai/zen/go/v1', defaultModel: 'kimi-k2.7-code', models: ['kimi-k2.7-code'], apiKeyUrl: 'https://opencode.ai/go', note: 'Codex Responses 格式端点,本站已兼容(自动走 /responses 协议)。', apiFormat: 'responses' },
  { key: 'ppio', label: 'PPIO', group: '聚合路由与套餐', baseURL: 'https://api.ppio.com/openai/v1', defaultModel: 'deepseek/deepseek-v3.2', models: ['deepseek/deepseek-v3.2', 'deepseek/deepseek-v4-flash-0731'], apiKeyUrl: 'https://ppio.com' },
  { key: 'jiekou', label: 'JieKou AI', group: '聚合路由与套餐', baseURL: 'https://api.jiekou.ai/openai/v1', defaultModel: 'claude-fable-5', models: ['claude-fable-5', 'gpt-4o-mini'], apiKeyUrl: 'https://jiekou.ai/#model-library' },
  { key: 'aihubmix', label: 'AiHubMix', group: '聚合路由与套餐', baseURL: 'https://aihubmix.com/v1', defaultModel: '', models: [], apiKeyUrl: 'https://aihubmix.com' },
  { key: 'therouter', label: 'TheRouter', group: '聚合路由与套餐', baseURL: 'https://api.therouter.ai/v1', defaultModel: '', models: [], apiKeyUrl: 'https://therouter.ai' },
  { key: 'crazyrouter', label: 'CrazyRouter', group: '聚合路由与套餐', baseURL: 'https://cn.crazyrouter.com/v1', defaultModel: '', models: [], apiKeyUrl: 'https://www.crazyrouter.com' },

  /* ---- 自定义 ---- */
  { key: 'custom', label: '自定义 (OpenAI 兼容)', group: '自定义', baseURL: '', defaultModel: '', models: [], note: '填写任意 OpenAI Chat Completions 兼容地址与模型名。' },
]

export const DEFAULT_DATA: AppData = {
  progress: {},
  wordbook: [],
  wordStates: {},
  aiConfig: { provider: 'deepseek', baseURL: AI_PRESETS[0].baseURL, apiKey: '', model: AI_PRESETS[0].defaultModel, enabled: false, apiFormat: 'chat', proxyBase: '' },
  aiProfiles: [],
  gameBest: {},
  gameAiNotes: {},
  libraryFlags: {},
  tts: { engine: 'browser', voiceId: 'en_US-lessac-medium', rate: 0.95, piperBase: 'http://127.0.0.1:5000', autoReadAi: false },
  myArticles: [],
  aiWordCache: {},
  passageNotes: {},
  aiProfile: { level: '', weakPoints: [], errors: [], history: [], memories: [] },
  plan: null,
  planCheckins: {},
  writingFeedback: {},
  practiceCache: {},
  stats: { xp: 0, level: 1, streak: 0, lastActiveDay: '', activityLog: {}, achievements: [] },
}

let cache: AppData | null = null

/* ---------------- 跨标签页同步(P4-2) ---------------- */

let dataVersion = 0
const listeners = new Set<() => void>()

function notify() {
  dataVersion++
  listeners.forEach((fn) => fn())
}

/** 订阅数据变化(本页保存 + 其他标签页 storage 事件都会触发) */
export function subscribeData(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** React hook:数据版本号,变化时组件重渲染后调用 loadData() 即可拿到最新数据 */
export function useDataVersion(): number {
  const [v, setV] = useState(dataVersion)
  useEffect(() => subscribeData(() => setV(dataVersion)), [])
  useEffect(() => { void hydrateFromCompanion() }, [])
  return v
}

if (typeof window !== 'undefined') {
  // 其他标签页保存 → 本页失效缓存并广播刷新(验收:双开页面改进度另一页即时刷新)
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = null
      notify()
    }
  })
}

/** 新建一个「学习中」的 SM-2 词状态(P5-2) */
export function makeWordState(word: string, source: WordSource): WordState {
  const now = Date.now()
  return {
    word: word.toLowerCase(),
    reps: 0,
    interval: 0,
    ef: 2.5,
    next: now,
    status: 'learning',
    box: 1,
    wrongCount: 0,
    sources: [source],
    addedAt: now,
  }
}

/** 纯函数:旧备份 → 新版 AppData(缺失字段补默认值),并返回被迁移补全的字段清单 */
export function migrateBackup(parsed: unknown): { data: AppData; migrated: string[] } | null {
  if (typeof parsed !== 'object' || parsed == null) return null
  const p = parsed as Record<string, unknown>
  if (!('progress' in p || 'aiConfig' in p)) return null
  const fresh = structuredClone(DEFAULT_DATA)
  const migrated: string[] = []
  for (const key of Object.keys(DEFAULT_DATA)) {
    if (!(key in p)) migrated.push(key)
  }
  const cfgIn = (p.aiConfig ?? {}) as Record<string, unknown>
  for (const k of Object.keys(DEFAULT_DATA.aiConfig)) {
    if (!(k in cfgIn)) migrated.push(`aiConfig.${k}`)
  }
  // tts 迁移:旧版 {voiceURI, rate} → P5-1 {engine, voiceId, rate, piperBase, autoReadAi}
  const ttsIn = (p.tts ?? {}) as Record<string, unknown>
  const legacyVoiceURI = typeof ttsIn.voiceURI === 'string' ? ttsIn.voiceURI : ''
  const engineOk =
    ttsIn.engine === 'system' || ttsIn.engine === 'browser' || ttsIn.engine === 'local'
  for (const k of Object.keys(DEFAULT_DATA.tts)) {
    if (!(k in ttsIn)) migrated.push(`tts.${k}`)
  }
  if (legacyVoiceURI && !ttsIn.voiceId) migrated.push('tts.voiceURI→voiceId')
  const tts: TtsConfig = {
    engine: engineOk
      ? (ttsIn.engine as TtsEngineKind)
      : legacyVoiceURI
        ? 'system' // 旧版用户特意选过系统音色 → 保留其选择
        : fresh.tts.engine,
    voiceId: (typeof ttsIn.voiceId === 'string' && ttsIn.voiceId) || legacyVoiceURI || fresh.tts.voiceId,
    rate: typeof ttsIn.rate === 'number' && Number.isFinite(ttsIn.rate) ? ttsIn.rate : fresh.tts.rate,
    piperBase: (typeof ttsIn.piperBase === 'string' && ttsIn.piperBase.trim()) || fresh.tts.piperBase,
    autoReadAi: ttsIn.autoReadAi === true,
  }
  // wordStates 迁移:逐条补齐默认值;旧 wordbook 的词全部转为 learning 态入池(P5-2)
  const wordStates: Record<string, WordState> = {}
  const wsIn = p.wordStates
  if (wsIn && typeof wsIn === 'object') {
    for (const [w, raw] of Object.entries(wsIn as Record<string, unknown>)) {
      const st = raw as Record<string, unknown>
      if (!st || typeof st !== 'object' || typeof st.word !== 'string' || !st.word) continue
      const now = Date.now()
      wordStates[w] = {
        word: st.word.toLowerCase(),
        reps: typeof st.reps === 'number' ? st.reps : 0,
        interval: typeof st.interval === 'number' ? st.interval : 0,
        ef: typeof st.ef === 'number' ? st.ef : 2.5,
        next: typeof st.next === 'number' ? st.next : now,
        status: st.status === 'reviewing' || st.status === 'mastered' ? st.status : 'learning',
        box: typeof st.box === 'number' ? st.box : 1,
        wrongCount: typeof st.wrongCount === 'number' ? st.wrongCount : 0,
        sources: Array.isArray(st.sources)
          ? st.sources.filter((x): x is WordSource => typeof x === 'string' && ['wordbook', 'unit-vocab', 'popup', 'exam-wrong', 'coach-wrong', 'game'].includes(x))
          : ['wordbook'],
        addedAt: typeof st.addedAt === 'number' ? st.addedAt : now,
        lastReviewAt: typeof st.lastReviewAt === 'number' ? st.lastReviewAt : undefined,
      }
    }
  }
  const wordbook = Array.isArray(p.wordbook) ? p.wordbook.filter((x): x is string => typeof x === 'string' && x.length > 0) : []
  let legacyConverted = 0
  for (const w of wordbook) {
    const key = w.toLowerCase()
    if (!wordStates[key]) {
      wordStates[key] = makeWordState(key, 'wordbook')
      legacyConverted++
    }
  }
  if (legacyConverted > 0) migrated.push(`wordbook→wordStates(${legacyConverted})`)
  // aiProfiles 迁移:逐条补默认值,丢弃结构不合法的条目
  const aiProfiles: AiConfigProfile[] = []
  const profIn = p.aiProfiles
  if (Array.isArray(profIn)) {
    for (const raw of profIn) {
      const pr = raw as Record<string, unknown>
      const cfg = pr?.config as Record<string, unknown> | undefined
      if (!pr || typeof pr !== 'object' || !cfg || typeof cfg !== 'object') continue
      aiProfiles.push({
        id: typeof pr.id === 'string' && pr.id ? pr.id : `ap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: typeof pr.name === 'string' && pr.name ? pr.name : '未命名配置',
        createdAt: typeof pr.createdAt === 'number' ? pr.createdAt : Date.now(),
        updatedAt: typeof pr.updatedAt === 'number' ? pr.updatedAt : Date.now(),
        config: {
          provider: typeof cfg.provider === 'string' ? cfg.provider : 'custom',
          baseURL: typeof cfg.baseURL === 'string' ? cfg.baseURL : '',
          apiKey: typeof cfg.apiKey === 'string' ? cfg.apiKey : '',
          model: typeof cfg.model === 'string' ? cfg.model : '',
          enabled: cfg.enabled === true,
          apiFormat: cfg.apiFormat === 'responses' ? 'responses' : 'chat',
          proxyBase: typeof cfg.proxyBase === 'string' ? cfg.proxyBase : '',
        },
      })
    }
  }
  // gameBest / gameAiNotes 迁移(P5-3):结构清洗
  const gameBest: Record<string, GameBestEntry> = {}
  const gbIn = p.gameBest
  if (gbIn && typeof gbIn === 'object') {
    for (const [mode, raw] of Object.entries(gbIn as Record<string, unknown>)) {
      const e = raw as Record<string, unknown>
      if (!e || typeof e !== 'object') continue
      gameBest[mode] = {
        best: typeof e.best === 'number' ? e.best : 0,
        plays: typeof e.plays === 'number' ? e.plays : 0,
        lastAt: typeof e.lastAt === 'number' ? e.lastAt : Date.now(),
      }
    }
  }
  const gameAiNotes: Record<string, string> = {}
  const ganIn = p.gameAiNotes
  if (ganIn && typeof ganIn === 'object') {
    for (const [k, v] of Object.entries(ganIn as Record<string, unknown>)) {
      if (typeof v === 'string' && v) gameAiNotes[k] = v
    }
  }
  // libraryFlags 迁移(P5-4):结构清洗
  const libraryFlags: Record<string, { read: boolean; fav: boolean }> = {}
  const lfIn = p.libraryFlags
  if (lfIn && typeof lfIn === 'object') {
    for (const [id, raw] of Object.entries(lfIn as Record<string, unknown>)) {
      const f = raw as Record<string, unknown>
      if (f && typeof f === 'object') {
        libraryFlags[id] = { read: f.read === true, fav: f.fav === true }
      }
    }
  }
  const data: AppData = {
    ...fresh,
    ...p,
    aiConfig: { ...fresh.aiConfig, ...(p.aiConfig ?? {}) },
    aiProfiles,
    gameBest,
    gameAiNotes,
    libraryFlags,
    tts,
    wordbook,
    wordStates,
    myArticles: Array.isArray(p.myArticles) ? p.myArticles : fresh.myArticles,
    aiWordCache: { ...(p.aiWordCache ?? {}) },
    passageNotes: { ...(p.passageNotes ?? {}) },
    aiProfile: {
      ...fresh.aiProfile,
      ...(p.aiProfile ?? {}),
      weakPoints: Array.isArray((p.aiProfile as { weakPoints?: unknown } | undefined)?.weakPoints)
        ? (p.aiProfile as { weakPoints: string[] }).weakPoints
        : [],
      errors: Array.isArray((p.aiProfile as { errors?: unknown } | undefined)?.errors)
        ? (p.aiProfile as { errors: AiProfile['errors'] }).errors
        : [],
      history: Array.isArray((p.aiProfile as { history?: unknown } | undefined)?.history)
        ? (p.aiProfile as { history: AiProfile['history'] }).history
        : [],
      memories: migrateMemories((p.aiProfile as { memories?: unknown } | undefined)?.memories),
    },
    plan: (p.plan as StudyPlan | null | undefined) ?? null,
    planCheckins: { ...(p.planCheckins ?? {}) },
    writingFeedback: { ...(p.writingFeedback ?? {}) },
    practiceCache: migratePracticeCache(p.practiceCache),
    stats: migrateStats(p.stats),
  }
  return { data, migrated }
}

export function loadData(): AppData {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const m = migrateBackup(JSON.parse(raw))
      if (m) {
        cache = m.data
        return cache
      }
    }
  } catch {
    /* ignore */
  }
  const fresh: AppData = structuredClone(DEFAULT_DATA)
  cache = fresh
  return fresh
}

function localLooksEmpty(data: AppData): boolean {
  return Object.keys(data.progress).length === 0 && Object.keys(data.wordStates).length === 0
}

function dataWeight(data: AppData): number {
  return Object.keys(data.progress).length + Object.keys(data.wordStates).length
}

let lastHydratedAt = 0
let hydrateInflight: Promise<boolean> | null = null
let syncTimer: ReturnType<typeof setTimeout> | null = null

function pushCompanionSync(data: AppData) {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    void (async () => {
      try {
        if (!(await probeCompanion())) return
        await companionFetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updatedAt: Date.now(), data }),
        })
      } catch {
        /* fire-and-forget */
      }
    })()
  }, 500)
}

export async function hydrateFromCompanion(): Promise<boolean> {
  if (hydrateInflight) return hydrateInflight
  hydrateInflight = (async () => {
    try {
      if (!(await probeCompanion())) return false
      const res = await companionFetch('/api/user/sync')
      if (!res?.ok) return false
      const remote = (await res.json()) as { updatedAt?: number; data?: unknown }
      if (!remote.data) return false
      const remoteAt = typeof remote.updatedAt === 'number' ? remote.updatedAt : 0
      const local = loadData()
      const empty = localLooksEmpty(local)
      if (!empty && !(remoteAt > lastHydratedAt)) return false
      const m = migrateBackup(remote.data)
      if (!m) return false
      if (!empty && dataWeight(m.data) <= dataWeight(local)) return false
      lastHydratedAt = remoteAt || Date.now()
      saveData(m.data)
      return true
    } catch {
      return false
    }
  })().finally(() => {
    hydrateInflight = null
  })
  return hydrateInflight
}

export function saveData(data: AppData) {
  cache = data
  localStorage.setItem(KEY, JSON.stringify(data))
  notify()
  pushCompanionSync(data)
}

export function useData(): AppData {
  return cache ?? loadData()
}

export function setProgress(unitId: string, patch: Partial<UnitProgress>) {
  const d = loadData()
  const cur = d.progress[unitId] ?? {
    vocab: false,
    grammar: { done: false },
    article: false,
    dialogue: { done: false },
    listen: { done: false },
    exam: { done: false },
  }
  const mergedExam: NonNullable<UnitProgress['exam']> = { done: false, ...(cur.exam ?? {}), ...(patch.exam ?? {}) }
  d.progress[unitId] = {
    ...cur,
    ...patch,
    grammar: { ...cur.grammar, ...(patch.grammar ?? {}) },
    dialogue: { ...cur.dialogue, ...(patch.dialogue ?? {}) },
    listen: { ...cur.listen, ...(patch.listen ?? {}) },
    exam: mergedExam,
  }
  saveData(d)
}

export function getProgress(unitId: string): UnitProgress | undefined {
  return loadData().progress[unitId]
}

export function addWordbook(word: string) {
  const d = loadData()
  const key = word.toLowerCase().replace(/[^a-z'-]/g, '')
  if (!key) return
  if (!d.wordbook.some((w) => w.toLowerCase().replace(/[^a-z'-]/g, '') === key)) d.wordbook.push(key)
  if (!d.wordStates[key]) d.wordStates[key] = makeWordState(key, 'wordbook')
  saveData(d)
}

export function removeWordbook(word: string) {
  const d = loadData()
  const key = word.toLowerCase().replace(/[^a-z'-]/g, '')
  d.wordbook = d.wordbook.filter((w) => w.toLowerCase().replace(/[^a-z'-]/g, '') !== key)
  saveData(d)
}

/* ---------------- 词汇池(P5-2) ---------------- */

export function setWordState(word: string, state: WordState) {
  const d = loadData()
  d.wordStates[word.toLowerCase()] = state
  saveData(d)
}

export function removeWordState(word: string) {
  const d = loadData()
  const key = word.toLowerCase().replace(/[^a-z'-]/g, '')
  delete d.wordStates[key]
  d.wordbook = d.wordbook.filter((w) => w.toLowerCase().replace(/[^a-z'-]/g, '') !== key)
  saveData(d)
}

export function setAiConfig(cfg: AiConfig) {
  const d = loadData()
  d.aiConfig = cfg
  saveData(d)
}

/* ---------------- 已保存的 AI 配置档案(设置页) ---------------- */

const MAX_AI_PROFILES = 20

/** 保存/更新一条 AI 配置档案(按 id upsert),返回最新列表 */
export function upsertAiProfile(profile: AiConfigProfile): AiConfigProfile[] {
  const d = loadData()
  d.aiProfiles = [profile, ...d.aiProfiles.filter((p) => p.id !== profile.id)].slice(0, MAX_AI_PROFILES)
  saveData(d)
  return d.aiProfiles
}

export function removeAiProfile(id: string): AiConfigProfile[] {
  const d = loadData()
  d.aiProfiles = d.aiProfiles.filter((p) => p.id !== id)
  saveData(d)
  return d.aiProfiles
}

/* ---------------- 词汇游戏(P5-3) ---------------- */

/** 记录一局游戏:best 只取最高答对数,plays 累加 */
export function recordGameScore(mode: string, correct: number, total: number): GameBestEntry {
  const d = loadData()
  const cur = d.gameBest[mode] ?? { best: 0, plays: 0, lastAt: 0 }
  const entry: GameBestEntry = {
    best: Math.max(cur.best, correct),
    plays: cur.plays + 1,
    lastAt: Date.now(),
  }
  d.gameBest[mode] = entry
  saveData(d)
  void total
  return entry
}

const MAX_GAME_AI_NOTES = 300

export function setGameAiNote(key: string, text: string) {
  const d = loadData()
  d.gameAiNotes[key] = text
  const keys = Object.keys(d.gameAiNotes)
  while (keys.length > MAX_GAME_AI_NOTES) {
    delete d.gameAiNotes[keys.shift()!]
  }
  saveData(d)
}

/* ---------------- 资料库已读/收藏(P5-4) ---------------- */

export function markLibraryRead(id: string) {
  const d = loadData()
  d.libraryFlags[id] = { ...(d.libraryFlags[id] ?? {}), read: true }
  saveData(d)
}

export function toggleLibraryFav(id: string): boolean {
  const d = loadData()
  const cur = d.libraryFlags[id] ?? { read: false, fav: false }
  const fav = !cur.fav
  d.libraryFlags[id] = { ...cur, fav }
  saveData(d)
  return fav
}

function migrateMemories(raw: unknown): CoachMemory[] {
  if (!Array.isArray(raw)) return []
  const out: CoachMemory[] = []
  for (const it of raw) {
    const m = it as Record<string, unknown>
    if (!m || typeof m !== 'object' || typeof m.text !== 'string' || !m.text.trim()) continue
    out.push({
      id: typeof m.id === 'string' && m.id ? m.id : `mem-${Date.now()}-${out.length}`,
      text: String(m.text).slice(0, 200),
      at: typeof m.at === 'number' ? m.at : Date.now(),
    })
  }
  return out.slice(0, 20)
}

function migratePracticeCache(raw: unknown): Record<string, PracticeSet> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, PracticeSet> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const s = v as Record<string, unknown>
    if (!s || typeof s !== 'object' || (s.kind !== 'listen' && s.kind !== 'read')) continue
    if (!Array.isArray(s.questions) || !s.text) continue
    out[k] = {
      id: typeof s.id === 'string' ? s.id : k,
      kind: s.kind,
      level: typeof s.level === 'string' ? s.level : 'A2',
      title: typeof s.title === 'string' ? s.title : k,
      text: String(s.text),
      textCn: typeof s.textCn === 'string' ? s.textCn : undefined,
      questions: s.questions as PracticeSet['questions'],
      createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
    }
  }
  return out
}

function migrateStats(raw: unknown): UserStats {
  const fresh = DEFAULT_DATA.stats
  if (!raw || typeof raw !== 'object') return { ...fresh, activityLog: {}, achievements: [] }
  const s = raw as Record<string, unknown>
  return {
    xp: typeof s.xp === 'number' ? s.xp : 0,
    level: typeof s.level === 'number' && s.level >= 1 ? s.level : 1,
    streak: typeof s.streak === 'number' ? s.streak : 0,
    lastActiveDay: typeof s.lastActiveDay === 'string' ? s.lastActiveDay : '',
    activityLog: s.activityLog && typeof s.activityLog === 'object' ? { ...(s.activityLog as Record<string, number>) } : {},
    achievements: Array.isArray(s.achievements) ? s.achievements.filter((x): x is string => typeof x === 'string') : [],
  }
}

/** 更新 AI 能力画像(带上限:错误 100 条 / 历史 50 条 / 薄弱点 12 个 / 记忆 20 条) */
export function setAiProfile(patch: Partial<AiProfile>) {
  const d = loadData()
  const cur = d.aiProfile
  d.aiProfile = {
    ...cur,
    ...patch,
    weakPoints: (patch.weakPoints ?? cur.weakPoints).slice(0, 12),
    errors: (patch.errors ?? cur.errors).slice(0, 100),
    history: (patch.history ?? cur.history).slice(0, 50),
    memories: (patch.memories ?? cur.memories ?? []).slice(0, 20),
    updatedAt: Date.now(),
  }
  saveData(d)
}

export function addCoachMemory(text: string): CoachMemory[] {
  const t = text.trim().slice(0, 200)
  if (!t) return loadData().aiProfile.memories ?? []
  const cur = loadData().aiProfile.memories ?? []
  const item: CoachMemory = { id: `mem-${Date.now()}`, text: t, at: Date.now() }
  const next = [item, ...cur.filter((m) => m.text !== t)].slice(0, 20)
  setAiProfile({ memories: next })
  return next
}

export function removeCoachMemory(id: string): CoachMemory[] {
  const next = (loadData().aiProfile.memories ?? []).filter((m) => m.id !== id)
  setAiProfile({ memories: next })
  return next
}

export function setPracticeSet(set: PracticeSet) {
  const d = loadData()
  d.practiceCache[`${set.kind}:${set.level}`] = set
  const keys = Object.keys(d.practiceCache)
  while (keys.length > 20) delete d.practiceCache[keys.shift()!]
  saveData(d)
}

export function getPracticeSet(kind: PracticeSet['kind'], level: string): PracticeSet | undefined {
  return loadData().practiceCache[`${kind}:${level}`]
}

/* ---------------- 学习计划(P2-4) ---------------- */

/** 保存计划(打卡记录随新计划清空);传 null 重置 */
export function setPlan(plan: StudyPlan | null) {
  const d = loadData()
  d.plan = plan
  d.planCheckins = {}
  saveData(d)
}

export function resetPlan() {
  setPlan(null)
}

/** 某天某任务的打卡开/关(YYYY-MM-DD) */
export function togglePlanCheckin(dateStr: string, taskId: string) {
  const d = loadData()
  const list = d.planCheckins[dateStr] ?? []
  d.planCheckins[dateStr] = list.includes(taskId) ? list.filter((x) => x !== taskId) : [...list, taskId]
  saveData(d)
}

export function isPlanTaskDone(dateStr: string, taskId: string): boolean {
  return (loadData().planCheckins[dateStr] ?? []).includes(taskId)
}

/* ---------------- 写作批改缓存(P2-5,上限 200 条) ---------------- */

export function getWritingFeedback(key: string): AiWritingFeedback | undefined {
  return loadData().writingFeedback[key]
}

export function setWritingFeedback(key: string, fb: AiWritingFeedback) {
  const d = loadData()
  d.writingFeedback[key] = fb
  const MAX = 200
  const keys = Object.keys(d.writingFeedback)
  while (keys.length > MAX) {
    delete d.writingFeedback[keys.shift()!]
  }
  saveData(d)
}

export function setTts(patch: Partial<AppData['tts']>) {
  const d = loadData()
  d.tts = { ...d.tts, ...patch }
  saveData(d)
}

export function addMyArticle(art: MyArticle) {
  const d = loadData()
  d.myArticles.unshift(art)
  saveData(d)
}

export function removeMyArticle(id: string) {
  const d = loadData()
  d.myArticles = d.myArticles.filter((a) => a.id !== id)
  saveData(d)
}

export function cacheAiWord(w: AiWordExplain) {
  const d = loadData()
  d.aiWordCache[w.word] = w
  // 防止 AI 查词缓存无限增长撑爆 localStorage(约 5MB 上限)
  const MAX = 800
  const keys = Object.keys(d.aiWordCache)
  while (keys.length > MAX) {
    delete d.aiWordCache[keys.shift()!]
  }
  saveData(d)
}

/* ---------------- 段落批注(翻译/讲解)缓存 ---------------- */

export function getPassageNote(key: string): PassageNote | undefined {
  return loadData().passageNotes[key]
}

export function setPassageNote(key: string, patch: PassageNote) {
  const d = loadData()
  d.passageNotes[key] = { ...(d.passageNotes[key] ?? {}), ...patch }
  // 上限 600 段,超限删除最早的
  const MAX = 600
  const keys = Object.keys(d.passageNotes)
  while (keys.length > MAX) {
    delete d.passageNotes[keys.shift()!]
  }
  saveData(d)
}

export function exportData(): string {
  return JSON.stringify(loadData(), null, 2)
}

/**
 * 导入备份:旧备份缺失字段自动补默认值(深合并),返回迁移补全清单。
 * 验收:旧备份导入不报错且字段补默认值。
 */
export function importData(json: string): { ok: boolean; migrated: string[] } {
  try {
    const m = migrateBackup(JSON.parse(json))
    if (!m) return { ok: false, migrated: [] }
    saveData(m.data)
    return { ok: true, migrated: m.migrated }
  } catch {
    return { ok: false, migrated: [] }
  }
}
