# 开发交接文档(供并行工作组使用)

> 本文档是"接口契约 + 工作规范"。**开始任何开发前必须先读完本文档。**
> 框架已完成(M1):路由、10 个页面、设置页、词库管线、s1u1 样例单元全部就位并通过验证。

## 一、接口契约(唯一权威:`src/lib/types.ts`)

所有数据结构和前端交互都以 `src/lib/types.ts` 为准。**禁止修改该文件**;如需调整,必须先提出并在合并时同步所有实现。

- `WordBankEntry` / `WordBankMeta` → `public/content/wordbank/{a..z}.json` + `meta.json`
- `DictEntry` → `public/content/dict/{a..z}.json`
- `GrammarLesson` → `content/curriculum/{unitId}/grammar.json`(扩展字段:grammarId/cefr/refs)
- `Article` → `content/curriculum/{unitId}/article.json`(v2 扩展:grammarTags/exercises/lessonGrammar/examIds)
- `GoalDialogue` → `content/curriculum/{unitId}/dialogue.json`
- `ListenChallenge` → `content/curriculum/{unitId}/listen.json`
- `ExamSet` → `content/curriculum/{unitId}/exam.json`(⑥ 真题演练,标准单元必备;s1u1 已提供样板)
- `GrammarMap` → `public/content/grammar-map.json`(scripts/build_grammar_map.py 生成)
- `CurriculumIndex` / `UnitDef` → `content/curriculum/index.json`(已生成 48 单元,勿改 id/wordRange)
- AI 类型:`AiConfig/AiRoleplayTurn/AiParsedSentence/AiWordExplain`
  - `AiConfig.proxyBase?`:独立 AI 代理地址(P4-3 新增,生产环境无 Vite 中间件时用,如 `http://127.0.0.1:8787`;留空 = 开发走 Vite 内置代理 / 生产直连;旧配置自动补默认值)
- AI 教练(P2-3 新增):`CefrProfile/CefrLevelProfile`(`public/content/cefr-profile.json`,A0-C2 描述+进出标准+blocks/microGoals,由 `scripts/build_cefr_profile.py` 生成)、`AiProfile`(localStorage `aiProfile`,级别/薄弱点/错误记录/历史,上限 100/50/12)、`AiErrorRecord/CoachDrill/CoachReport`
- 学习计划(P2-4 新增,P6 升级中):`StudyPlan/PlanTask/PlanCheckins`(localStorage `plan`/`planCheckins`;路由 `/plan`;`generatePlan` 自选 7-365 天、S1-S5 起止、开始日期)。**P6** 增加 `version:2`、`intensity`、`unit-step` 小节任务、`tier` 能力档;排程见 `docs/PLAN_ADAPTIVE.md`;旧 v1 `kind:'unit'` 只读兼容,重新生成才升级。**本项授权改 types.ts 计划段。**
- S5 写作(P2-5 新增):`WritingPattern/BandWord/WritingErrorItem`(public/content/writing/s5/patterns.json、band-words.json、errors.json,由 `scripts/build_writing_s5.py` + `scripts/import_typo.py` 生成,P3-2 起三库数量门槛 ≥50/≥500/≥100)、`AiWritingFeedback`(localStorage `writingFeedback`,AI 批改缓存);路由 `/writing`
- 语篇阅读题(P2-7 新增):`ReadingQuestion` + `ReadingPassage.questions?`(public/content/zhenti/cet6/*.json 每篇 3 题,由 `scripts/gen_cet6_questions.py` 生成;Library 用 `components/PassageQuiz` 判分)
- TED 泛读库(P3-1 新增):`ReadingPassage.sections?/group?` + `ReadingIndex` item 的 `group?`(public/content/intensive/ted/{id}.json + ted-index.json,由 `scripts/import_ted.py` 从 shizhengLi/Learning-English-With-TED 导入;`lib/ted.ts` 加载)
- NCE 整合(P3-3 新增):`NceLink/NceLinksFile`(public/content/curriculum/nce-links.json,由 `scripts/build_nce_links.py` 生成;`lib/curriculum.ts` 的 `loadNceLinks`;ReaderView 文章末尾「扩展阅读:NCE 笔记课」入口 + 版权标注)
- 语法中文手册:`GrammarCnSection/GrammarCnFile`(public/content/grammar-cn.json,由 `scripts/build_grammar_cn.py` 生成;`lib/grammarRef.ts` 的 `loadGrammarCn`;GrammarTree 的 CEFR/Murphy 小节讲解与规则中文注释)
- 语音朗读(P5-1 新增):`TtsConfig`(localStorage `tts` 字段:`{engine:'browser'|'local'|'system', voiceId, rate, piperBase, autoReadAi}`;旧版 `{voiceURI,rate}` 自动迁移:voiceURI→voiceId,选过系统音色则 engine=system);实现见 `lib/tts/`(engine 公共层 + ttsBrowser/ttsLocal/ttsSystem)与 `lib/speech.ts`(路由与降级:本地 Piper → 浏览器 Piper → Web Speech)
- 词汇引擎(P5-2 新增):`WordState/WordStatus/WordSource`(localStorage `wordStates`;旧 `wordbook` 词自动转 learning 态)、`AiConfigProfile`(localStorage `aiProfiles`,已保存 AI 配置档案);实现见 `lib/srs.ts`(SM-2 纯函数)与 `lib/vocab.ts`(入池/复习/到期队列/错词重排队/统计;`.ts` 扩展名导入,Node 可直测 `scripts/selftest_vocab.mjs`)
- 词汇游戏(P5-3 新增):`GameBestEntry`(localStorage `gameBest`)与 `gameAiNotes`;`lib/game/gen.ts` 纯函数(Node 可直测 `scripts/selftest_game.mjs`)、`words.ts` 词源、`score.ts` 成绩回写、`ai.ts` AI 讲解;题库 `public/content/games/order-sentence.json` 由 `scripts/build_vocab_games.py` 生成(validate 校验);路由 `/vocab-games`
- 词根词缀 + 今日一篇(P5-4 完成):`AffixFile/AffixItem`(public/content/affix.json,429 条,由 `scripts/import_affix.py` 生成)、`lib/affixCore.ts` 纯函数出题(Node 可直测 `scripts/selftest_affix.mjs`)、`lib/affix.ts` 加载/点词命中、`lib/daily.ts` 按日期抽外刊、`AppData.libraryFlags`(资料库已读/收藏);词汇中心「🧬 词根测验」、资料库/首页「今日一篇」
- AI 对话 / 练习 / 跟读(P5-5 完成):`judgeFreeInput` + 选项/自由输入 + SpeechRecognition;`AiProfile.memories`;`PracticeSet` + `AppData.practiceCache` + `/practice`;`lib/shadow.ts` + `ShadowRead` 跟读打分
- 激励系统(P5-6 完成):`UserStats` + `AppData.stats`;`lib/stats.ts`(XP/连击/成就,Node 可直测 `selftest_stats.mjs`);路由 `/achievements`、`/placement`
- 预取(P5-7):`lib/prefetch.ts` 预热当前+下一单元 5 文件
- 预生成音频(P5-TTS):`lib/audio.ts` 的 `wordWavUrl` / `dialogueWavUrl` / `passageWavUrl`;清单 `public/content/audio/index.json`;生成脚本 `pregen_audio.py`(Piper)与 `pregen_all_tts.py`(Coqui);AI 对话不走预生成
- Go 单文件可执行服务与 SQLite (P7-Go):`docs/PLAN_COMPANION_DATABASE.md`;`server/` 纯 Go(`modernc.org/sqlite`,无 CGo)编译为上级目录 `english-app.exe`;`scripts/init_database.py` 灌 `data/english_core.db`;前端 `lib/companion.ts` 探测 `GET /health`(`service==='english-app'`)后优先走 `/api/dict` `/api/audio/stream` `/api/user/sync`,失败回退 JSON + localStorage。音频本轮保持现网 MP3,不转 Opus。`build_app.bat` 一键打包(dist 不含 audio)。
- 进度:`AppData/UnitProgress`(localStorage key:`english-learning-site:v1`)

## 二、目录结构

```
english-learning-site/
├── server/   main.go embed.go dict.go audio.go user.go proxy.go  # P7-Go 单文件服务
├── build_app.bat                                                # 产出 ../../english-app.exe
├── public/content/
│   ├── wordbank/{a..z}.json, meta.json      # 有序词库(生成产物,勿手改)
│   ├── dict/{a..z}.json                     # 词典(生成产物,勿手改)
│   └── curriculum/
│       ├── index.json                       # 48 单元目录(生成产物,勿手改)
│       └── s1u1/…s5u6/                      # ⭐ 内容组在这里产出 4 个 json
├── scripts/  build_wordbank.py build_dict.py validate_content.py export_anki.py
│             init_database.py(灌 data/english_core.db)/convert_audio.py(可选 Opus,默认跳过)
│             ai-proxy-server.mjs(生产环境独立代理:__ai_proxy 转发 AI + /piper 转发本地 Piper TTS,零依赖)
│             build_cefr_profile.py(生成 cefr-profile.json,AI 教练大纲)
│             build_writing_s5.py(生成写作句式库/band 词汇/常见错误)
│             gen_cet6_questions.py(为 114 篇 CET-6 语篇生成 3 道理解题)
│             import_ted.py(下载并导入 35 篇 TED 主题中文标注笔记)
│             import_typo.py(typogrammar PDF 提取:句式/band 词汇/错误库)
│             build_nce_links.py(生成单元 ↔ NCE 笔记课关联)
│             pregen_audio.py / pregen_all_tts.py(本地 wav 预生成)
│             selftest_affix.mjs / selftest_stats.mjs
└── src/  lib/(types/storage/dict/wordbank→dict.ts/curriculum/speech/ai/*) 
          components/ views/ pages/
```

## 三、工作组任务(可并行)

| 组 | 任务 | 产出位置 | 验收 |
|----|------|---------|------|
| **WG-A 内容:语法课** | 47 个单元的 `grammar.json`(s1u1 已完成,照抄格式) | `content/curriculum/{unitId}/grammar.json` | validate 无错误 |
| **WG-B 内容:文章** | 47 篇 `article.json`(受控用词+逐句拆解) | 同上 `article.json` | validate 无错误,警告 ≤ 专有名词数 |
| **WG-C 内容:对话** | 47 个 `dialogue.json` 目标对话树 | 同上 `dialogue.json` | validate 无错误 |
| **WG-D 内容:听力** | 47 个 `listen.json` 听力挑战 | 同上 `listen.json` | validate 无错误 |
| **WG-E 前端** | 页面/组件优化、样式、移动端适配 | `src/` | `npm run build` 零错误 |
| **WG-F AI** | ai/*.ts 优化、流式输出、AI 语法问答 | `src/lib/ai/` | 同上 |
| **WG-G 真题录入** | 4–6 篇考研真题阅读 → s4 单元 article.json | content/curriculum/s4u*/ | validate + 人工校对 |
| **WG-H 终验** | 全量 validate + 打包 + 回归测试清单 | — | 全绿报告 |

## 四、内容生产规范(内容组必读)

### 1. 单元编号与主题(已冻结,见 `index.json` 与下表)

| 阶段 | 单元 | 语法主题 | 场景 |
|------|------|---------|------|
| S1 入门 | s1u1~s1u8 | 基本句型与be动词 / 一般现在时 / 一般过去时 / 一般将来时 / 冠词与名词复数 / 代词与物主 / 形容词与副词基础 / 情态动词入门 | 问候自我介绍 / 日常生活 / 周末经历 / 旅行计划 / 购物 / 家人朋友 / 城市与天气 / 请求帮助 |
| S2 四级 | s2u1~s2u12 | 进行时 / 现在完成时 / 过去完成时 / 不定式 / 动名词 / 被动语态 / 定语从句 / 比较级 / 情态推测 / 连词状语从句 / will与going to / 介词基础 | 咖啡馆 / 人生经历 / 错过火车 / 计划目标 / 爱好 / 工厂参观 / 理想公寓 / 手机对比 / 包裹去向 / 迟到原因 / 天气 / 问路 |
| S3 六级 | s3u1~s3u12 | if条件句 / wish虚拟 / 非谓语定语 / 非谓语状语 / 名词性从句 / 倒装 / 强调句 / 分词状语 / 时态综合 / 短语动词 / 介词进阶 / 限定词 | 学习计划 / 懊悔愿望 / 新闻事件 / 奋斗故事 / 表达观点 / 正式演讲 / 澄清误解 / 事故经过 / 项目复盘 / 日常事务 / 商务邮件 / 数据分析 |
| S4 考研 | s4u1~s4u10 | 长难句拆解 / 从句嵌套 / 非谓语综合 / 省略指代 / 英译汉 / 阅读方法论 / 完形新题型 / 作文句式 / 翻译实战 / 真题长难句 | 复试自我介绍 / 导师交流 / 论文咨询 / 讲座问答 / 翻译讨论 / 备考策略 / 复习经验 / 写作批改 / 文献翻译 / 答辩演练 |
| S5 雅思 | s5u1~s5u6 | 学术写作句式 / 同义替换 / 图表描述 / 观点论述 / 学术搭配 / 口语流利 | 学术演讲 / 论文答辩 / 数据讨论 / 观点辩论 / 会议社交 / 职场谈判 |

### 2. 受控用词(硬性规则)

- 每个单元有 `wordRange: [start, end)`(全局 order 区间,见 index.json)。
- **文章/对话/听力中出现的实词,必须满足其一**:
  1. 该词 `order` < 本单元 `wordRange[1]`(即之前阶段+本单元词池内的词);或
  2. 该词声明在 `article.newWords` 里,且其 `order` 落在本单元 `wordRange` 内。
- 专有名词(人名地名)可以豁免,但**会报 WARN,人工复核后忽略**。
- 校验命令:`python scripts/validate_content.py s2u3`(可传多个单元或全量)。
- 查词顺序:`python -c "..."` 或看 `public/content/wordbank/{首字母}.json` 里单词的 `order` 字段。

### 3. 各文件写法要点

**grammar.json**
- `quiz` 必须恰好 5 题,`answer` 是正确选项下标,每题带 `note` 解析
- `explanation` 用简单 markdown(支持 ## 标题、列表、表格)
- 参考 `s1u1/grammar.json`(已完成,直接照格式)

**article.json**
- 每句 `chunks` 必须**完整覆盖整句所有单词、不重叠**(validator 会查,不通过会 WARN)
- chunks 颜色固定使用(契约):主干 `#a8dab5`、状语 `#8ab4f8`、让步/条件/连词 `#f6c177`、各类从句 `#c8a5e0`、定语/修饰 `#f4a8b8`、插入语/补语 `#9fd8e8`
- `newWords` 约 15–25 个,全部来自本单元 wordRange
- 字数:S1 80–120 / S2 120–180 / S3 180–250 / S4 250–350 / S5 300–400

**dialogue.json**
- 节点 id 任意字符串;`start` 指向起始节点
- 非结束节点必须有 `options`(3–4 个);每条选项 `next` 必须指向存在的节点
- 必须有 ≥1 个 success 结尾 + ≥1 个 fail 结尾(`end:true` 且 `success` 明确)
- NPC 台词挂 1 个 `grammar` 点(名称/讲解/例句)
- 轮次:S1 3–5 / S2 5–8 / S3 8–10 / S4 8–12 / S5 10+

**listen.json**
- `rate`:S1 0.75 / S2 0.85 / S3 0.95 / S4 1.0 / S5 1.1
- 轮次:S1 2 / S2 3 / S3 3–4 / S4 4 / S5 4–5
- **台词不得与任何选项文本相同或包含关系**(防泄题,validator 会 WARN)
- 恰好 1 个 `correct:true` 选项

### 4. 提交方式

- 内容组:只新增/修改 `public/content/curriculum/{unitId}/` 下自己负责的 json 文件
- 完成后跑 `python scripts/validate_content.py {自己的单元}` 确认 0 错误
- 代码组:只改 `src/`,完成后 `npm run build` 必须零错误
- **禁止**:修改 `src/lib/types.ts`、`index.json`、`wordbank`、`dict`、他人已完成的单元文件

## 五、常用命令

```bash
npm run dev                          # 开发 http://127.0.0.1:5273
npm run build                        # 类型检查+打包(门禁)
npm run preview                      # 预览 dist(内置 SPA fallback,发布文档见 docs/PUBLISH.md)
npm run proxy                        # 独立代理 http://127.0.0.1:8787(生产模式 AI 跨域 + 本地 Piper 转发)
python -m piper.http_server --model en_US-lessac-medium.onnx   # 可选:本地 Piper TTS(设置页选「本地 Piper 服务」)
python scripts/pregen_audio.py       # 可选:本地 Piper 批量生成 48 单元听力/文章 wav(public/content/audio/,gitignore 不入库)
python scripts/build_vocab_games.py  # 生成连词成句游戏题库(public/content/games/order-sentence.json,离线可玩)
python scripts/import_affix.py        # 生成词根词缀库(public/content/affix.json,≥300 条命中词库词)
node scripts/selftest_vocab.mjs      # P5-2 SM-2 词汇引擎自测(零依赖)
node scripts/selftest_game.mjs       # P5-3 词汇游戏纯函数自测(零依赖)
python scripts/build_cefr_profile.py # 生成 AI 教练 CEFR 大纲 cefr-profile.json
python scripts/build_writing_s5.py  # 生成 S5 写作练习库(句式/band 词汇/常见错误)
python scripts/validate_content.py   # 全量校验(自动还原屈折形式,如 went→go)
node scripts/audit_content.js        # 深度内容审计(词池一致性/新词复现/真题完整性)
python scripts/validate_content.py s2u3 s3u5   # 指定单元
python scripts/build_wordbank.py     # 重建词库与目录(勿轻易运行,会重算 wordRange)
```

## 六、前端已有能力(不要重复造轮子)

- `components/WordText`:可点击单词文本(带朗读高亮;P2-2 起支持 `levelOf` 回调渲染词级徽章)
- `components/WordLevelLegend`:「词级高亮」开关+图例;`lib/wordLevel.ts` 提供 `useWordLevelMarks(text, enabled)` / `computeWordLevelMarks`(词库 level 0-5:2 四级/3 六级/4 考研/5 雅思 + 考研词频 TOP1000,按字母懒加载)
- `components/WordPopup`:异步查词弹层(词典→词库→AI 兜底已实现,自动还原屈折形式)
- `components/GrammarBlock` / `GrammarQuiz` / `SentenceBreakdown` / `VocabCard` / `DialogueRecord` / `ProgressBar`
- `views/ReaderView`(语法精读:句内标签/练习/速览;P5-4 起全文朗读优先本地预生成文章 wav)/ `GoalDialogueView` / `ListenView`(P5-4 起练习+考试双模式:整组盲听 → 逐题作答 → 统一揭字幕,音频优先本地 wav)/ `GrammarView` / `VocabView` / `ExamView`(单元真题):单元六步全部可用(接真实数据即可)
- `lib/dict.ts`(lookupWord 综合查词,自动还原屈折形式:went→go、bigger→big)、`lib/curriculum.ts`(目录/单元加载)、`lib/storage.ts`(进度/生词本/设置;P4-2 起:`subscribeData`/`useDataVersion` 跨标签页同步、`migrateBackup` 旧备份迁移、`importData` 返回 `{ok, migrated}`)、`lib/speech.ts`(P5-1 起三档 TTS 路由:本地 Piper → 浏览器 Piper vits-web → Web Speech,`speakSentences` 逐句队列朗读)、`lib/tts/`(engine/ttsBrowser/ttsLocal/ttsSystem;浏览器 Piper 声音模型下载到 OPFS,官方 HF 失败自动回退 hf-mirror.com 镜像)、`lib/audio.ts`(P5-4 本地预生成音频清单:`loadAudioManifest`/`listenWavUrls`/`articleWavUrls`,清单缺失静默返回 null)、`lib/affix.ts`(P5-4 词根词缀:loadAffixFile/affixesOfWord/buildAffixQuiz)、`lib/vocab.ts` + `lib/srs.ts`(P5-2 词汇池与 SM-2)、`lib/game/`(P5-3 六个游戏模式组件 + gen/words/score/ai/ui)、`lib/ai/provider.ts`(chat/chatJSON/testConnection)、`lib/ai/coach.ts`(analyzeErrors/detectLevel/generateDrills/runCoachAssessment/recordReadingSample,教练闭环)、`lib/plan.ts` + `lib/planCore.ts`(P6:`generatePlan`/`buildSchedule` 按能力窗+小节预算排程,练习档不提前;`adjustRemainingPlan` 重排剩余天数)、`lib/writing.ts` + `lib/ai/writing.ts`(写作库加载 + AI 三项批改)、`lib/grammarRef.ts`(grammar-reference/grammar-map 加载 + rulesOfUnit/ruleById,P2-6 三向互链)、`lib/ted.ts`(TED 笔记加载)
- 页面:Home(目录+进度+今日任务+词汇入口)/ Plan(计划生成+打卡)/ UnitPlayer(五步流程)/ AiParse / AiDialogue / Writing(句式仿写+AI 批改)/ GrammarTree(深链 node/rule + 真题组)/ Wordbook(词汇中心)/ VocabGames(词汇游戏)/ Settings 均已通
