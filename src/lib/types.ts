// =====================================================================
// 接口契约 —— 所有工作组(前端/内容/AI/脚本)必须严格遵守本文件定义
// 修改本文件需全体工作组知会,同步更新所有实现
// =====================================================================

/** 学习阶段:1 入门 / 2 四级 / 3 六级 / 4 考研 / 5 雅思 */
export type StageId = 1 | 2 | 3 | 4 | 5

export const STAGE_NAMES: Record<StageId, string> = {
  1: '入门',
  2: '四级',
  3: '六级',
  4: '考研',
  5: '雅思',
}

/* ---------------- 词库 (public/content/wordbank/{a..z}.json) ---------------- */

/** 有序词库条目(受控用词依据)。order 为全局序号,升序=由易到难 */
export interface WordBankEntry {
  word: string
  phon: string
  cn: string
  enDef?: string
  example?: { en: string; cn: string }
  level: number
  order: number
  wordRank?: number
}

/** wordbank/meta.json */
export interface WordBankMeta {
  total: number
  levelCounts: Record<string, number>
  levelRanges: Record<string, [number, number]>
}

/* ---------------- 词典 (public/content/dict/{a..z}.json) ---------------- */

/** 完整词典条目(查词弹层 / 词典页用) */
export interface DictEntry {
  word: string
  phon: string
  phonUs?: string
  trans: { pos: string; cn: string; en?: string }[]
  sentences: { en: string; cn: string }[]
  phrases: { p: string; cn: string }[]
  synos?: { pos: string; cn: string; words: string[] }[]
  rels?: { pos: string; words: { w: string; cn: string }[] }[]
  mnemonic?: string
  level?: number
}

/* ---------------- 语法点(通用结构) ---------------- */

export interface GrammarPoint {
  /** 名称,如 "让步状语从句" */
  name: string
  /** 中文讲解(简短) */
  note: string
  /** 例句(可选) */
  example?: string
  exampleCn?: string
}

/* ---------------- 语法精读 v2:句内标签 / 句内练习 / 本课速览 ---------------- */

/** 句内语法标签:把句子里的某个短语挂到语法点上,点击跳转语法课 */
export interface SentenceGrammarTag {
  /** 指向语法课的 grammarId */
  grammarId: string
  /** 标签对应的句子短语(用于展示) */
  phrase: string
  /** 标签展示名 */
  name: string
}

/** 句内练习:嵌在句子讲解下方,做完即判分 */
export interface SentenceExercise {
  type: 'blank' | 'judge' | 'rewrite' | 'translate'
  /** 题干;blank 类型用 ___ 表示空位 */
  prompt: string
  /** blank/judge 的选项 */
  options?: string[]
  /** 标准答案 */
  answer: string
  /** 解析 */
  note: string
  /** 关联语法点名称 */
  point: string
}

/** 本课语法速览条目 */
export interface LessonGrammarPoint extends GrammarPoint {
  grammarId: string
  /** 来自本课文章的原文例句 */
  sourceExample: string
  sourceExampleCn: string
}

/* ---------------- 语法课 (content/curriculum/{unitId}/grammar.json) ---------------- */

export interface GrammarLesson {
  id: string
  stage: StageId
  title: string
  /** markdown 中文讲解 */
  explanation: string
  examples: { en: string; cn: string; note?: string }[]
  errors: { wrong: string; right: string; note: string }[]
  quiz: {
    q: string
    options: string[]
    /** 正确选项下标 */
    answer: number
    note: string
  }[]
  /** 语法点全局 id(语法标签/真题考点引用它),默认与 id 相同 */
  grammarId?: string
  /** CEFR 级别,如 A1 */
  cefr?: string
  /** 外部参考来源,如 "新概念英语第一册 Lesson 1" */
  refs?: string[]
}

/* ---------------- 文章 (content/curriculum/{unitId}/article.json) ---------------- */

export interface ChunkPart {
  role: string
  text: string
}

export interface Chunk {
  /** 主干 / 时间状语 / 让步状语从句 / 宾语从句 / 定语 ... */
  label: string
  /** 着色 hex,如 "#a8dab5" */
  color: string
  /** 该成分完整文本(必须是句子中连续片段) */
  text: string
  /** 主干细分成分(可选) */
  parts?: ChunkPart[]
}

export interface ArticleSentence {
  /** 完整句子文本 */
  text: string
  /** 中文翻译 */
  translation: string
  /** 拆解成分,必须完整覆盖整句(所有单词都落在某个 chunk 中) */
  chunks: Chunk[]
  /** 关联语法点(名称,不强制引用 id) */
  grammar: { name: string; note: string; example?: string; exampleCn?: string }[]
  /** 句内语法标签(点击跳转语法课) */
  grammarTags?: SentenceGrammarTag[]
  /** 句内练习(做完即判分) */
  exercises?: SentenceExercise[]
}

export interface Article {
  id: string
  stage: StageId
  unitId: string
  title: string
  /** 本篇出现的新词(必须来自本单元 wordRange) */
  newWords: string[]
  sentences: ArticleSentence[]
  /** 本课语法速览(文章结尾展示,点击跳转语法课) */
  lessonGrammar?: LessonGrammarPoint[]
  /** 关联真题组 id(单元结尾真题演练) */
  examIds?: string[]
  /** 内容来源,如 "NCE1-L1" / "自编" */
  source?: string
}

/* ---------------- 目标对话 (content/curriculum/{unitId}/dialogue.json) ---------------- */

export interface GoalOption {
  text: string
  textCn: string
  /** 选择后的反馈(中文) */
  feedback: string
  /** 下一节点 id */
  next: string
}

export interface GoalNode {
  id: string
  speaker: string
  /** NPC 台词 */
  line: string
  lineCn: string
  grammar?: GrammarPoint[]
  options?: GoalOption[]
  /** 结束节点标记 */
  end?: boolean
  /** 结束节点:是否达成目标 */
  success?: boolean
}

export interface GoalDialogue {
  id: string
  stage: StageId
  unitId: string
  scene: string
  /** 玩家目标(中文,如"成功办理入住,拿到安静的高楼层房间") */
  goal: string
  /** 起始节点 id */
  start: string
  nodes: Record<string, GoalNode>
}

/* ---------------- 听力挑战 (content/curriculum/{unitId}/listen.json) ---------------- */

export interface ListenOption {
  text: string
  correct: boolean
  feedback: string
}

export interface ListenRound {
  speaker: string
  /** 盲听台词(不得出现在选项中) */
  line: string
  lineCn: string
  grammar?: GrammarPoint[]
  options: ListenOption[]
}

export interface ListenChallenge {
  id: string
  stage: StageId
  unitId: string
  title: string
  /** TTS 语速 */
  rate: number
  rounds: ListenRound[]
}

/* ---------------- 目录 (content/curriculum/index.json) ---------------- */

export interface UnitDef {
  /** 如 "s1u1" */
  id: string
  stage: StageId
  title: string
  /** 语法主题名(该单元唯一语法点) */
  grammarTopic: string
  /** 情景对话场景名 */
  scene: string
  /** 可用词池全局序号区间 [start, end),内容组只能在此范围内选新词 */
  wordRange: [number, number]
}

export interface StageDef {
  id: StageId
  name: string
  desc: string
  units: UnitDef[]
}

export interface CurriculumIndex {
  version: number
  stages: StageDef[]
}

/* ---------------- AI(可配置,OpenAI 兼容) ---------------- */

export interface AiConfig {
  provider: string
  baseURL: string
  apiKey: string
  model: string
  enabled: boolean
  /** 接口格式:OpenAI Chat Completions 或 Codex/OpenAI Responses */
  apiFormat?: 'chat' | 'responses'
  /** 独立 AI 代理地址(生产环境无 Vite 中间件时用,如 http://127.0.0.1:8787);留空 = 开发走内置代理 / 生产直连 */
  proxyBase?: string
}

export interface AiPreset {
  label: string
  baseURL: string
  defaultModel: string
  /** 供应商分组(设置页下拉分组显示) */
  group?: string
  /** 套餐可选模型列表 */
  models?: string[]
  /** 获取 API Key 的链接 */
  apiKeyUrl?: string
  /** 说明/注意 */
  note?: string
  /** 是否为 OpenAI Chat Completions 兼容(Codex 格式供应商为 false) */
  chatCompatible?: boolean
  /** 接口格式:chat = /chat/completions;responses = /responses(Codex) */
  apiFormat?: 'chat' | 'responses'
}

/** 已保存的 AI 配置档案(设置页:可保存/复用/编辑服务商+Key+模型等组合) */
export interface AiConfigProfile {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  config: AiConfig
}

/* ---------------- 词汇游戏(P5-3,localStorage) ---------------- */

/** 每个游戏模式的最佳成绩 */
export interface GameBestEntry {
  /** 历史最佳答对数 */
  best: number
  /** 游玩次数 */
  plays: number
  lastAt: number
}

/** AI 目标对话:一轮的生成结果 */
export interface AiRoleplayTurn {
  line: string
  lineCn: string
  grammar: GrammarPoint[]
  options: { text: string; textCn: string; best: boolean }[]
  /** 该轮结束后是否达成目标 */
  success?: boolean
  /** 达成目标时的总结(可选) */
  summary?: string
}

/** AI 文章解析:单句结果 */
export interface AiParsedSentence {
  text: string
  translation: string
  chunks: Chunk[]
  grammar: GrammarPoint[]
}

/** AI 查词兜底结果 */
export interface AiWordExplain {
  word: string
  phon: string
  cn: string
  enDef?: string
  example?: { en: string; cn: string }
}

/* ---------------- AI 教练画像 (public/content/cefr-profile.json + localStorage) ---------------- */

/** CEFR 级别画像(A0-C2,由 scripts/build_cefr_profile.py 生成) */
export interface CefrLevelProfile {
  id: string
  name: string
  /** 该级别总体能做什么 */
  can: string
  /** 进入标准 */
  entry: string
  /** 离开标准 */
  exit: string
  blocks: { name: string; microGoals: string[] }[]
  /** 语法重点(来自 grammar-reference.json 统计) */
  focus?: string[]
  ruleCount?: number
  categoryCount?: number
}

export interface CefrProfile {
  version: number
  source: string
  levels: CefrLevelProfile[]
}

/** AI 教练错误记录 */
export interface AiErrorRecord {
  /** 学生原话 */
  text: string
  /** 建议改法(可为空) */
  correct?: string
  /** 中文讲解 */
  note: string
  /** grammar / lexis / pragmatics / fluency */
  kind: string
  at: number
}

/** 教练持久记忆点(P5-5,上限 20) */
export interface CoachMemory {
  id: string
  text: string
  at: number
}

/** AI 能力画像(localStorage,上限:错误 100 条 / 历史 50 条) */
export interface AiProfile {
  /** 当前 CEFR 级别(A0-C2;空 = 尚未评估) */
  level: string
  /** 级别评估依据 */
  levelNote?: string
  /** 薄弱点(中文语法点/技能名) */
  weakPoints: string[]
  /** 最近错误记录 */
  errors: AiErrorRecord[]
  /** 评估历史 */
  history: { at: number; type: string; scene?: string; level?: string; summary?: string }[]
  /** 教练持久记忆(设置页可增删,后续操练优先带入) */
  memories: CoachMemory[]
  updatedAt?: number
}

/** AI 生成听力/阅读练习(P5-5,/practice 缓存) */
export interface PracticeQuestion {
  q: string
  options: string[]
  answer: number
  analysis: string
}

export interface PracticeSet {
  id: string
  kind: 'listen' | 'read'
  level: string
  title: string
  /** 听力原文 / 阅读短文 */
  text: string
  textCn?: string
  questions: PracticeQuestion[]
  createdAt: number
}

/** 用户激励统计(P5-6) */
export interface UserStats {
  xp: number
  level: number
  streak: number
  lastActiveDay: string
  /** YYYY-MM-DD → 当日获得 XP */
  activityLog: Record<string, number>
  /** 已解锁成就 id */
  achievements: string[]
}

/** 教练专项操练题(针对薄弱点生成,每题必带解析) */
export interface CoachDrill {
  kind: 'blank' | 'judge' | 'rewrite' | 'translate'
  prompt: string
  /** blank/judge 的选项 */
  options?: string[]
  answer: string
  note: string
  point: string
}

/** 教练评估报告:诊断 → 讲解 → 纠错 → 专项操练 一次输出 */
export interface CoachReport {
  level: string
  levelNote: string
  feedback: string
  errors: AiErrorRecord[]
  weakPoints: string[]
  drills: CoachDrill[]
}

/* ---------------- 我的文章(AI 解析保存,localStorage) ---------------- */

export interface MyArticle {
  id: string
  title: string
  createdAt: number
  sentences: ArticleSentence[]
}

/* ---------------- 单元真题演练 (content/curriculum/{unitId}/exam.json) ---------------- */

/** 单元结尾真题:按"语法点+词池+难度"匹配的真题小题组 */
export interface ExamQuestion {
  q: string
  options: string[]
  /** 正确选项下标 0-3 */
  answer: number
  analysis: string
  /** 关联语法点 id(答错后回溯到语法课) */
  point: string
  /** 来源,如 "NCE1 课后练习" / "2024.6 四级真题" */
  source?: string
}

export interface ExamSet {
  id: string
  stage: StageId
  unitId: string
  title: string
  hint?: string
  questions: ExamQuestion[]
}

/* ---------------- 语法知识地图 (content/grammar-map.json) ---------------- */

export interface GrammarMapNode {
  id: string
  name: string
  category: string
  stage: StageId
  unitId?: string
  cefr?: string
}

export interface GrammarMap {
  version: number
  nodes: GrammarMapNode[]
}

/* ---------------- 扩展资料库(P1 导入,NCE 笔记 / 外刊 / CET-6 语篇) ---------------- */

export interface NceLesson {
  id: string
  book: string
  title: string
  mainKnowledge: string[]
  sections: { heading: string; content: string[] }[]
  notes: string[]
  raw: string
}

export interface NceIndex {
  version: number
  type: string
  source: string
  books: {
    id: string
    title: string
    source: string
    lessons: { id: string; title: string; points: number }[]
  }[]
}

export interface ReadingPassage {
  id: string
  title: string
  source?: string
  difficulty?: string
  difficultyLabel?: string
  wordCount?: number
  tags?: string[]
  paragraphs: string[]
  year?: number
  type?: string
  journal?: string
  journalEn?: string
  date?: string
  /** 阅读理解题(P2-7,114 篇 CET-6 语篇已配 3 题) */
  questions?: ReadingQuestion[]
  /** 分组小节(TED 笔记等结构化语篇;有值时按小节渲染,paragraphs 仍保留平铺) */
  sections?: { heading: string; paragraphs: string[] }[]
  /** 所属专辑/分组 */
  group?: string
}

/** 语篇阅读理解题(选项恰好 4 个,answer 为下标) */
export interface ReadingQuestion {
  q: string
  options: string[]
  answer: number
  analysis: string
  source?: string
}

export interface ReadingIndex {
  version: number
  type: string
  source: string
  items: { id: string; title: string; source?: string; difficulty?: string; wordCount?: number; year?: number; journal?: string; journalEn?: string; group?: string }[]
}

/** AI 段落批注(外刊/CET6 精读的翻译与讲解,localStorage 缓存) */
export interface PassageNote {
  translation?: string
  explanation?: string
}

/* ---------------- S5 写作练习 (public/content/writing/s5/*.json) ---------------- */

export interface WritingPattern {
  id: string
  /** opinion=观点 / discuss=双边讨论 / report=原因报告 / data=图表数据 / general=通用结构 */
  type: 'opinion' | 'discuss' | 'report' | 'data' | 'general'
  name: string
  cn: string
  template: string
  example: string
  exampleCn: string
  tips?: string[]
}

export interface BandWord {
  word: string
  cn: string
  /** 雅思词汇档次 7/8/9 */
  band: number
  pos: string
  /** 可替换的低阶词 */
  replaceFor?: string
  example?: string
  exampleCn?: string
}

export interface WritingErrorItem {
  id: string
  type: 'grammar' | 'lexis' | 'coherence'
  wrong: string
  right: string
  note: string
}

export interface WritingPatternsFile {
  version: number
  type: string
  source: string
  patterns: WritingPattern[]
}

export interface BandWordsFile {
  version: number
  type: string
  source: string
  words: BandWord[]
}

export interface WritingErrorsFile {
  version: number
  type: string
  source: string
  errors: WritingErrorItem[]
}

/** AI 写作批改:grammar/lexical/coherence 三项反馈 + 雅思估分 + 打磨版 */
export interface AiWritingFeedback {
  grammar: string[]
  lexical: string[]
  coherence: string[]
  score: number
  rewrite?: string
}

/** 语法树中文讲解手册(public/content/grammar-cn.json,由 scripts/build_grammar_cn.py 生成) */
export interface GrammarCnSection {
  /** 原始小节名(CEFR 分类名 / Murphy 章节名) */
  category: string
  /** 中文名称 */
  cn: string
  /** 中文讲解(可作手册查阅) */
  guide: string
  /** 小节内规则数 */
  rules: number
}

export interface GrammarCnFile {
  version: number
  source: string
  /** rule.text → 中文名称 + 一句话讲解 */
  rules: Record<string, { cn: string; note: string }>
  /** levelId(A1-C2)→ 小节列表 */
  cefr: Record<string, GrammarCnSection[]>
  /** 册 id(EL/INT/ADV)→ 章节列表 */
  murphy: Record<string, GrammarCnSection[]>
}

/* ---------------- NCE 课文精读整合 (public/content/curriculum/nce-links.json) ---------------- */

export interface NceLink {
  /** NCE 笔记课 id,如 nce1-lesson-01 */
  id: string
  /** nce1-nce4 */
  book: string
  title: string
}

export interface NceLinksFile {
  version: number
  source: string
  /** unitId → 1-2 课(S1-S4 全覆盖) */
  links: Record<string, NceLink[]>
}

/* ---------------- 学习计划 (localStorage,新路由 /plan) ---------------- */

/** 六步流程键(单元小节,与 UnitPlayer 的 STEPS 一致) */
export type UnitStepKey = 'vocab' | 'grammar' | 'article' | 'dialogue' | 'listen' | 'exam'

/**
 * 计划任务种类。
 * - `unit`:仅 v1 兼容(整单元一条),新生成器不再产出
 * - `unit-step`:v2,某单元某一步(vocab/grammar/...)
 * - `vocab-review`:词汇到期复习
 * - `writing`:仅 S5 窗口的写作练习
 * 其余沿用 v1。
 */
export type PlanTaskKind =
  | 'unit'
  | 'unit-step'
  | 'nce'
  | 'cet6'
  | 'zhenti'
  | 'review'
  | 'vocab-review'
  | 'writing'

/** 学习强度(仅 v2 计划) */
export type PlanIntensity = 'light' | 'normal' | 'intense'

export interface PlanTask {
  id: string
  /** 第几天(1 起) */
  day: number
  kind: PlanTaskKind
  title: string
  detail?: string
  /** 站内跳转路径(可带 ?step= 深链) */
  link?: string
  /** 任务能力档(1-5);缺省时按 kind 推断(zhenti=4/cet6=3/writing=5,否则=所属单元 stage) */
  tier?: StageId
  /** unit-step 任务所属单元 */
  unitId?: string
  /** unit-step 任务的一步 */
  step?: UnitStepKey
  /** nce 任务对应的 NCE 册次(1-4),必须 <= 当天解锁档 */
  nceBook?: 1 | 2 | 3 | 4
}

export interface StudyPlan {
  id: string
  createdAt: number
  /** 计划天数(7-365) */
  totalDays: number
  /** 起始阶段 S1-S5 */
  startStage: StageId
  /** 目标阶段 S1-S5(≥ startStage) */
  endStage: StageId
  /** 开始日期 YYYY-MM-DD */
  startDate: string
  /** 计划覆盖的单元 id(升序) */
  unitIds: string[]
  tasks: PlanTask[]
  /** 排程版本:缺省=旧 v1(整单元铺开);2=能力窗+按日小节打包 */
  version?: 1 | 2
  /** v2:用户选定的强度(仅展示,实际日预算由 needed 决定) */
  intensity?: PlanIntensity
  /** v2:实际每天小节预算(2-18) */
  dailySections?: number
  /** v2:能力基线阶段(默认=startStage),测评带入时可为测得档 */
  abilityStage?: StageId
}

/** 打卡记录:'YYYY-MM-DD' → 已完成任务 id 列表 */
export type PlanCheckins = Record<string, string[]>

/* ---------------- 语音朗读(P5-1 三档引擎) ---------------- */

/** TTS 引擎:system = Web Speech 兜底 / browser = 浏览器 Piper(vits-web,默认)/ local = 本地 Piper HTTP 服务 */
export type TtsEngineKind = 'system' | 'browser' | 'local'

export interface TtsConfig {
  engine: TtsEngineKind
  /**
   * browser/local:Piper voiceId(如 en_US-lessac-medium / en_GB-alba-medium / zh_CN-huayan-medium);
   * system:SpeechSynthesisVoice.voiceURI(空 = 自动选择)
   */
  voiceId: string
  rate: number
  /** 本地 Piper HTTP 服务地址(engine=local 时使用),如 http://127.0.0.1:5000 */
  piperBase: string
  /** AI 对话中 NPC/AI 新台词自动朗读 */
  autoReadAi: boolean
}

/* ---------------- 词汇引擎 + SM-2 间隔复习(P5-2,localStorage) ---------------- */

/** 单词掌握状态 */
export type WordStatus = 'learning' | 'reviewing' | 'mastered'

/** 入池来源 */
export type WordSource = 'wordbook' | 'unit-vocab' | 'popup' | 'exam-wrong' | 'coach-wrong' | 'game'

/** 单词的 SM-2 记忆状态 */
export interface WordState {
  word: string
  /** 连续成功复习次数 */
  reps: number
  /** 当前间隔(天) */
  interval: number
  /** 难易系数(1.3-2.5) */
  ef: number
  /** 下次到期时间戳(ms);Again 当日重排队 = 当前时间 */
  next: number
  status: WordStatus
  /** 记忆箱 1-5,≥5 视为已掌握 */
  box: number
  wrongCount: number
  sources: WordSource[]
  addedAt: number
  lastReviewAt?: number
}

/* ---------------- 进度(localStorage) ---------------- */

export interface UnitProgress {
  vocab: boolean
  grammar: { done: boolean; quizScore?: number; quizTotal?: number }
  article: boolean
  dialogue: { done: boolean; success?: boolean; rounds?: number }
  listen: { done: boolean; score?: number; total?: number }
  exam?: { done: boolean; score?: number; total?: number }
}

export interface AppData {
  progress: Record<string, UnitProgress>
  wordbook: string[]
  /** P5-2 词汇池:word → SM-2 记忆状态 */
  wordStates: Record<string, WordState>
  aiConfig: AiConfig
  /** 已保存的 AI 配置档案 */
  aiProfiles: AiConfigProfile[]
  /** P5-3 各游戏模式最佳成绩 */
  gameBest: Record<string, GameBestEntry>
  /** P5-3 游戏「AI 讲讲」缓存 */
  gameAiNotes: Record<string, string>
  /** P5-4 资料库文章已读/收藏标记 */
  libraryFlags: Record<string, { read: boolean; fav: boolean }>
  tts: TtsConfig
  myArticles: MyArticle[]
  aiWordCache: Record<string, AiWordExplain>
  passageNotes: Record<string, PassageNote>
  aiProfile: AiProfile
  plan: StudyPlan | null
  planCheckins: PlanCheckins
  writingFeedback: Record<string, AiWritingFeedback>
  /** P5-5 AI 生成听力/阅读练习缓存(按 kind+level) */
  practiceCache: Record<string, PracticeSet>
  /** P5-6 激励统计 */
  stats: UserStats
}

/* =====================================================================
   真题专区(2005-2020 考研英语一 · 阅读 + 完形)
   public/content/zhenti/{year}/reading-{1..4}.json | cloze.json
   ⚠️ 契约自 2026-08-14 冻结,详情见 docs/ZHENTI_PLAN.md
   ===================================================================== */

/** 真题题型 */
export type ZhentiSection = 'reading' | 'cloze'

/** 真题题目(阅读:每篇 5 题;完形:每篇 20 题) */
export interface ZhentiQuestion {
  /** 题干(完形填空为 "",选项即空位答案) */
  q: string
  /** 恰好 4 个选项 */
  options: string[]
  /** 正确选项下标 0-3 */
  answer: number
  /** 中文解析(来自答案解析 PDF) */
  analysis: string
}

/** 真题文章 */
export interface ZhentiArticle {
  /** 规范: "z{year}-{section}-{n}",如 "z2019-reading-1"、"z2019-cloze-0" */
  id: string
  year: number
  section: ZhentiSection
  /** reading: 1..4;cloze: 0 */
  index: number
  /** 如 "2019年全国硕士研究生招生考试英语(一)" */
  source: string
  title: string
  /** 真题生词(用于高亮,建议 15-30 个) */
  newWords: string[]
  /** 逐句内容;完形填空的文本用 ___1___…___20___ 标记空位(与题号对应) */
  sentences: ArticleSentence[]
  questions: ZhentiQuestion[]
}

/** 真题目录 public/content/zhenti/index.json */
export interface ZhentiIndex {
  years: { year: number; items: { id: string; section: ZhentiSection; title: string }[] }[]
}

/** 考研词频 public/content/freq.json:{ [word]: { rank, freq } } */
export interface FreqData {
  [word: string]: { rank: number; freq: number }
}
