# 英语语境学习平台 · 开发总计划(ROADMAP)

> 本文档是**唯一权威开发计划**。开发流程:先读该项的「验收标准」→ 开发 → 跑门禁(`tsc` / `validate_content.py` / `audit_content.js` / `npm run build`)→ 在本文档该项标注 **✅ 完成** 并写日期与结果。
>
> 图例:`✅ 完成` / `🚧 进行中` / `⬜ 待开发` / `⏸ 暂缓`

---

## 0. 现状总览(每次完成项后更新)

| 指标 | 数值 |
|---|---|
| 课程单元 | 48 单元 × 6 步(词汇/语法/语法精读/对话/听力/真题演练) |
| 句内语法标签 | 1055 个(48 单元全覆盖) |
| 句内练习 | 940 题(600 句全覆盖) |
| 本课语法速览 | 239 条 |
| 单元真题组 | 48/48 单元,288 题(含 28 道真实考研真题,全局去重) |
| 语法参考库 | CEFR A1–C2 规则 143 条(俄文 0 残留,42 条映射中文单元)+ Murphy 360 单元 + 12 时态 |
| 语法中文手册 | CEFR 53 小节 + Murphy 52 章节 + 57 条规则中文讲解(grammar-cn.json,可作查阅手册) |
| AI 教练 | CEFR A0–C2 大纲 7 级(cefr-profile.json)+ 对话教练闭环(纠错/估级/2 题操练),画像并入备份 |
| 中文语法书 | 48 章(本平台语法课 + 英文规则对照) |
| 语法树整合 | 语法树 ↔ 单元语法课 ↔ 真题组三向互链(深链 node/rule,章节显示真题组题数) |
| 扩展资料库 | NCE 笔记 190 课 + CET-6 真题语篇 114 篇(约 5.1 万词,每篇 3 道理解题)+ 外刊 199 篇 + TED 主题笔记 35 篇 |
| NCE 整合 | S1-S4 42 单元 ↔ 76 条 NCE 笔记课关联,文章末尾扩展阅读入口 + 版权标注 |
| 内容质量 | 264 条词池不一致已逐单元复核(结论保留);水印残留 72 处清零;S4 真题/940 练习抽样通过 |
| 考研真题 | 640 题,答案/解析 100% |
| 词级高亮 | 单元文章/资料库/真题 3 入口;词库 4 级徽章 + 考研高频 TOP1000,按字母懒加载 |
| 学习计划 | P6 ✅ 2026-08-17:能力窗锁练习档(入门不会第二天刷考研)+ 按日小节打包(可跨单元)+ 强度三选 + 按近况重排剩余天数;专文 `docs/PLAN_ADAPTIVE.md` |
| S5 写作 | `/writing` 句式库 63 条 / band 词汇 1484 词 / 常见错误 110 条;AI 三项批改 + 估分走缓存 |
| 词库/词典 | 9251 词 / 8678 词,结构无重复 |
| 门禁 | tsc 0 错误;validate 0 错误 **0 警告**;audit 0 错误 **0 警告**;生产构建通过 |
| 发布性能 | 页面级分包 18 chunk;首屏 ≈96KB(压缩后)<350KB;preview SPA fallback 全路由 200 |
| 数据管理 | 跨标签页 storage 事件同步;旧备份自动迁移补默认值并提示;备份覆盖全部数据 |
| P5 升级计划 | P5-1~7 ✅;P5-8 上架暂缓;静态朗读 wav 已入库并正在用 Coqui Tacotron2-DDC 覆盖(课程+资料库+真题+语法+写作,AI 对话除外) |
| 激励 / 测评 | 首页仪表盘(到期/连击/XP)+ `/achievements` 成就墙 + `/placement` 20 题分级测评可带入计划 |
| AI 练习 / 跟读 | `/practice` 按 CEFR 生成听力/阅读;设置页教练记忆;精读/听力句旁跟读打分 |
| 本地音频 | `public/content/audio/`:课程 600 文+159 听+476 对话+1570 词已入库;资料库/真题/语法/写作走 `extra/`;前端优先本地 wav |

---

## 1. 已完成

### M1 基础平台 ✅ 完成
48 单元五步流程、真题专区(考研 2005–2020)、AI 对话/AI 解析、生词本、设置、进度存取。详见 `docs/DEVELOPMENT.md`。

### M2 体验与质量修复 ✅ 完成
- ✅ 设置页链接改 `<Link>`(AiParse/AiDialogue)
- ✅ 音色下拉异步加载订阅 `voiceschanged`
- ✅ 首页/阶段进度口径统一;真题切换文章重置答题状态
- ✅ 点词不再触发点句;查词弹层关闭按钮/位置钳制/生词本状态/真题页才加载词频
- ✅ 朗读中断回调结算;Markdown 渲染(粗体/列表/表格)
- ✅ 「我的文章」入口 + 删除确认;键盘可访问性;SEO/favicon
- ✅ 查词自动还原屈折形式(不规则表 + 规则);词典命中不再加载词库
- ✅ AI 请求 60s 超时;AI 解析 8 句分批 + 进度;导入深合并;缓存 LRU 上限
- ✅ 内容修复:删除 38 个全单元未复现新词;3 处词典无法覆盖用词改写
- ✅ `validate_content.py` 支持屈折原形/连字符新词;CET6 语篇校验

### P0 六步流程样板(s1u1)✅ 完成
- ✅ types.ts 扩展(grammarTags/exercises/lessonGrammar/exam/grammar-map)
- ✅ `grammar-map.json`(48 节点)+ `build_grammar_map.py`
- ✅ s1u1 手写样板:句内标签/12 道练习/速览卡/exam.json/CEFR/refs
- ✅ `ExamView` + UnitPlayer 第 6 步 + Home 6 步口径
- ✅ `ReaderView` 重构(标签跳转/练习判分/速览/真题入口)

### P1 数据层 ✅ 完成
- ✅ `fetch_external.py` 下载 10 仓库原始素材到 `raw_materials/`(含版权声明)
- ✅ `import_grammar_tree.mjs` → `grammar-reference.json`(俄文清洗 + 中文单元映射)
- ✅ `import_nce.py` → NCE 精读笔记 190 课
- ✅ `import_cet.mjs` → CET-6 语篇 114 篇 + 外刊 199 篇(水印清理)
- ✅ `enrich_units.py` → 48 单元句内标签/练习/速览/exam.json(备份 `backup_curriculum_before_p1.zip`)
- ✅ 真题组全局去重(28 道真实考研题);ExamView 长题干折叠
- ✅ validate/audit 门禁扩展(exam/cet6/NCE/杂志)

### P2 第一批(语法树 + 资料库)✅ 完成
- ✅ 语法树俄文清零;规则映射中文单元 42 条
- ✅ `Markdown.tsx` 公共渲染器;「📖 中文语法书」48 章 + 英文规则对照
- ✅ 资料库左右栏独立滚动;标题两行截断;移动端适配
- ✅ 外刊/CET6 段落「🌐 翻译与讲解」(AI 生成 + localStorage 缓存 600 段上限)
- ✅ 生产构建通过(76 模块)

---

## 2. 待开发计划

> 🎉 **2026-08-16:P2–P4 待开发项已完成**。P5-1~7 ✅,P5-8 上架暂缓。
> 🎯 下一阶段:**P6 自适应学习计划**(能力窗锁练习档 + 按日小节打包),详见下方与 `docs/PLAN_ADAPTIVE.md`。

### P2-8 AI 配置扩展(参考 CC Switch)✅ 完成 2026-08-16
**目标**:AI 配置支持更多供应商与套餐模型,参考 cc-switch 源码(72 个预设)整理 OpenAI 兼容供应商:小米 MiMo / MiMo Token Plan(套餐)、MiniMax、OpenRouter、xAI Grok、硅基流动、百炼、腾讯 TokenHub、阶跃 Step Plan、ModelScope、Novita、PPIO 等;模型以「套餐下拉」呈现,附获取 Key 链接与格式提示(Codex 格式如 OpenCode Go 标注不可用于本站 Chat 功能)。
- 改动:`storage.ts` AI_PRESETS 扩展(group/models/apiKeyUrl/note/chatCompatible);`Settings.tsx` 分组选择 + 模型套餐下拉 + 手动输入;`types.ts` AiProviderPreset。
- 验收:新增供应商 ≥15 个且旧配置迁移无损;选择任一预设可自动带出 BaseURL 与模型套餐;OpenCode Go 显示"仅 Codex 格式"提示;tsc/validate/build 全绿。
- **验证结果(2026-08-16)**:供应商 26 个(国内 12 / 国际 4 / 聚合 9 / 自定义 1),分组下拉 + 模型套餐 + 获取 Key 链接 + Codex 格式警示;tsc 0 错误;validate 0 错误;audit 0 错误;生产构建通过(76 模块)。

### P2-9 Codex / Responses 接口兼容 ✅ 完成 2026-08-16
**目标**:让 OpenCode Go 等 Codex 格式供应商可用于本站全部 AI 功能。
- 改动:`AiConfig.apiFormat`('chat'|'responses');`provider.chat()` 按格式请求 `/chat/completions` 或 `/responses`(input 映射 + `max_output_tokens` + output/choices 双解析);设置页接口格式选择;OpenCode Go 预设切换为 `apiFormat: 'responses'`。
- 验收:选 OpenCode Go 自动走 Responses;测试连接/AI 对话/AI 解析/翻译讲解均可;旧配置默认 chat 无损。
- **验证结果(2026-08-16)**:tsc 0 错误;validate 0 错误;audit 0 错误;生产构建通过;设置页显示「Codex / OpenAI Responses」格式并可手动切换。

### P2-10 AI 跨域代理(修复 Failed to fetch)✅ 完成 2026-08-16
**目标**:浏览器直连 AI 供应商常被 CORS 拦截(如 OpenCode Go 无 ACAO 头),开发模式经本地代理转发。
- 改动:`vite.config.ts` 增加 `/__ai_proxy` 中间件(仅 https,POST 转发,20MB 上限);`provider.ts` 开发模式经代理请求并改进报错文案;生产环境仍直连。
- 验收:代理能原样透传上游状态码与响应体;设置页测试连接不再报 Failed to fetch;tsc/validate/audit/build 全绿。
- **验证结果(2026-08-16)**:经 `http://127.0.0.1:5273/__ai_proxy` 实测转发 OpenCode Go 上游 401(无效 Key)原样返回,链路畅通;门禁全绿。

### P2-11 开发服务器 watcher 稳定性 ✅ 完成 2026-08-16
**目标**:修复编辑文件时 Vite 监听 `.xxx.tmpdir` 临时目录导致的 EBUSY 崩溃。
- 改动:`vite.config.ts` server.watch.ignored 忽略 `**/.*.tmpdir/**`、`**/.tmp_*`、`raw_materials`。
- **验证结果(2026-08-16)**:模拟创建/删除 src 内 `.tmpdir` 临时文件后服务保持 200,不再崩溃。

### P4-3 生产环境独立 AI 代理 ✅ 完成 2026-08-16
- 内容:`vite preview`/静态部署无 Vite 中间件,AI 直连仍可能被 CORS 拦截;提供 `node scripts/ai-proxy-server.mjs` 独立代理与前端 BASE 切换。
- 验收:静态部署 + 独立代理可用;文档说明两种模式。
- **验证结果(2026-08-16)**:新增 `scripts/ai-proxy-server.mjs`(零依赖、`npm run proxy`、默认 127.0.0.1:8787;支持 CORS 预检、`/health`、20MB 上限、仅 https 目标、状态码/响应体原样透传、客户端断开同步中止上游);`AiConfig.proxyBase` 新字段 + 设置页「独立 AI 代理地址」+ `provider.ts` 三级 BASE 切换(独立代理 → Vite 内置代理 → 直连),旧配置自动补默认值;README/DEVELOPMENT 说明双模式。实测 OpenCode Go 无效 Key 经代理原样返回 401 JSON;tsc 0 错误;validate 0 错误(3 警告);audit 0 错误(6 警告);生产构建通过(76 模块)。

### P2-2 阅读器分级词高亮 ✅ 完成 2026-08-16
**目标**:文章/资料库/真题中按考试级别给单词标色(四级/六级/考研/雅思 + 真题高频 TOP)。
- 数据:wordbank `level` 字段 + `freq.json`;加载用 `dict.ts` 的按字母缓存(懒加载,避免全量 9MB)。
- 改动:`WordText` 增加可选 `levelOf?: (word) => WordLevelMark` 回调(级别+词频一次查表);`ReaderView`/`Library`/`ZhentiReader` 顶部加「词级高亮」开关;CSS 徽章(四级蓝/六级紫/考研红/雅思青/高频橙)。
- 验收:任一精读页开启开关后,命中词出现级别徽章;关闭即还原;性能:切换后 1s 内完成渲染;tsc/validate/audit/build 全绿。
- **验证结果(2026-08-16)**:新增 `lib/wordLevel.ts`(`useWordLevelMarks`/`computeWordLevelMarks`,按字母懒加载词库 + 词频 180KB 只拉一次 + 屈折原形还原,命中词同步查 Map 渲染);`WordText.levelOf` + 徽章;`WordLevelLegend` 开关/图例;接入单元文章/资料库(CET6+外刊)/真题(含完形正文)。实测命中:考研真题 294 词 → 33 个级别徽章 + 126 个高频徽章,懒加载 24 个字母文件约 2.7MB(<1s);dev 服务器与数据端点冒烟 200。tsc 0 错误;validate 0 错误(3 警告);audit 0 错误(6 警告);生产构建通过(78 模块)。

### P2-3 AI 教练升级 ✅ 完成 2026-08-16
**目标**:把 AI 对话/AI 解析升级为「诊断 → 讲解 → 纠错 → 专项操练 → 能力画像」闭环(参考 `raw_materials/llm_tutor/` 的 CEFR 大纲与严格教师算法)。
- 数据:新增 `cefr-profile.json`(A0–C2 block/micro_goals/进出标准);localStorage 增加 `aiProfile`(当前级别/薄弱点/错误记录,复用 storage 合并模式)。
- 改动:`ai/coach.ts`(detectLevel / generateDrills / analyzeErrors,输出强制 JSON + 重试);AiDialogue 增加教练模式开关与反馈面板;AiParse 保存错误到画像。
- 验收:无 API 时功能隐藏不报错;有 API 时对话结束后给出级别评估 + 2 条针对性操练;画像可导出(并入现有备份);tsc/validate/audit/build 全绿。
- **验证结果(2026-08-16)**:注:`raw_materials/llm_tutor/` 未随仓库存在,大纲按 CEFR 官方描述自建(`scripts/build_cefr_profile.py` → `cefr-profile.json`,7 级 × 2 模块 × 3 微目标 + 进出标准 + grammar-reference 统计的语法重点)。新增 `ai/coach.ts`(`analyzeErrors` 纠错四分类 / `detectLevel` 严格估级 A0-C2 / `generateDrills` 恰好 2 题可离线判分 / `runCoachAssessment` 闭环 / `recordReadingSample` AiParse 侧写,全部强制 JSON+重试);`AiProfile` 入 AppData(上限 100 错/50 史/12 弱点,旧配置与旧备份自动补默认值);AiDialogue 教练模式(对话结束或「🏁 结束对话」→ 评估面板:级别+依据+纠错+薄弱点+操练,可即时判分);Settings 展示/重置画像,导出备份已含画像。无 API 时开关与入口全部隐藏。tsc 0 错误;validate 0 错误(3 警告);audit 0 错误(6 警告);生产构建通过(80 模块);dev 冒烟 4 个页面与 cefr-profile.json 均 200。

### P2-4 学习计划页 ✅ 完成 2026-08-16
**目标**:学习日程生成器(默认 100 天,参考 Learn-English-In-100-days 节奏;**增强:自选天数(7-365)、自选起止阶段(S1-S5)、自选开始日期,自动生成**)。
- 改动:新路由 `/plan`;按所选阶段的单元 + NCE/CET6 泛读 + 真题 + 每周复盘自动生成计划;localStorage 存计划与打卡;首页显示「今日任务」卡片;导航入口。
- 验收:默认 100 天覆盖全部 48 单元且天数=100;自选范围生成正确;打卡状态刷新到首页;无内容依赖时降级提示;tsc/build 全绿。
- **验证结果(2026-08-16)**:新增 `lib/planCore.ts`(纯排程核心,Node 可直测)+ `lib/plan.ts`(generatePlan)+ `pages/Plan.tsx`(`/plan`,自选 7-365 天、S1-S5 起止、开始日期;天数≥单元数时单元均匀铺开+泛读/每周复盘,天数<单元数时加速打包;目标 ≥S4 穿插真题日);`StudyPlan/PlanTask/PlanCheckins` 入 AppData(旧配置/备份无损迁移);首页「今日任务」卡片可直达打卡;无内容依赖时加载失败降级提示+重试。`scripts/selftest_plan.mjs` 断言通过:100 天 S1-S5 → 48 单元/100 天/14 复盘/含真题日;7 天 S1-S5 压缩 → 48 单元/7 天;30 天 S2-S3 → 24 单元且无真题日;200 天 S1-S1 → 8 单元。tsc 0 错误;validate 0 错误 **0 警告**(专有名词白名单后);audit 0 错误 **0 警告**;生产构建通过(84 模块);dev 冒烟 `/plan` 200。

### P2-5 S5 写作练习 ✅ 完成 2026-08-16
**目标**:雅思/托福写作句式仿写 + AI 批改(素材:`raw_materials/` typogrammar PDF 提取)。
- 数据:`content/writing/s5/` 句式库/band 词汇/常见错误(`import_typo.py`,PDF 文本提取)。
- 改动:`WritingView`(句式卡 + 仿写输入 + AI 批改:grammar/lexical/coherence 三项反馈);S5 单元写作步骤或独立 `/writing` 页。
- 验收:离线可看句式库与仿写题;AI 批改走缓存;tsc/validate/audit/build 全绿。
- **验证结果(2026-08-16)**:注:typogrammar PDF 未随仓库存在,先由 `scripts/build_writing_s5.py` 生成人工整理种子库(12 句式 / 30 band 词 / 16 常见错误,P3-2 拿到 PDF 后可按同契约替换扩充)。新增 `lib/writing.ts`(三库懒加载)、`lib/ai/writing.ts`(`aiCorrectWriting`:grammar/lexical/coherence 三项 + 雅思 0-9 估分 + 打磨版,强制 JSON+重试)、`pages/Writing.tsx`(`/writing`:句式卡+仿写输入+AI 批改面板/Band 7-9 词汇卡/错误纠正卡,全部离线可看);批改结果缓存 localStorage `writingFeedback`(上限 200 条,旧备份无损迁移);`validate_content.py` 增加写作库结构校验(类型/id 重复/必填字段)。tsc 0 错误;validate 0 错误 **0 警告**;audit 0 错误 **0 警告**;生产构建通过(87 模块);dev 冒烟 `/writing` 与三库均 200。

### P2-6 语法树与单元双向整合 ✅ 完成 2026-08-16
**目标**:语法地图节点 ↔ 单元语法课 ↔ 真题考点三向互链。
- 改动:`GrammarTree` 中文语法书章节显示所属真题组(`exam.json`);`GrammarView` 顶部显示语法树相关规则(来自 grammar-reference 映射);`ExamView` 回溯按钮跳转到语法树对应章节(query 参数)。
- 验收:任意单元语法课 → 语法树章节 → 真题组均可双向跳转;无映射节点显示"暂无关联"不报错。
- **验证结果(2026-08-16)**:新增 `lib/grammarRef.ts`(grammar-reference / grammar-map 双缓存加载 + `rulesOfUnit`/`ruleById`,GrammarTree/GrammarView 共用);`GrammarTree` 支持 `?node=g-xxx&rule=a1_01` 深链——优先展开对应 CEFR 规则并滚动高亮,无映射规则时退到中文语法书章节自动展开,节点不存在显示「暂无关联」不报错;节点横幅含「单元语法课 → / 单元真题组 →」双向入口;中文语法书章节显示所属真题组题数(48 个 exam.json 并行加载,缺失显示「暂无真题组」);`GrammarView` 顶部新增「在语法树查看本课考点 →」+「本单元真题组 N 题 →」+ 语法树映射规则列表(42/48 单元有映射,无映射显示「暂无关联规则」);`ExamView` 每题解析新增「🌳 语法树考点」按钮——考点 `g-xxx` 精确跳转,28 道真实考研题(`zhenti:...`)回退到本单元节点。tsc 0 错误;validate 0 错误 **0 警告**;audit 0 错误 **0 警告**;生产构建通过(88 模块);dev 冒烟 `/grammar?node=g-s1u1&rule=a1_01` 等 6 端点均 200。

### P2-7 CET-6 真题语篇配题 ✅ 完成 2026-08-16
**目标**:为 114 篇 CET-6 语篇补充 3–5 道理解题(目前只有原文)。
- 数据:优先人工/历史真题题目;缺失时 AI 生成 + 人工抽检(标注 `source: AI 生成待校对`)。
- 改动:`cet6/{id}.json` 增加 `questions`;Library CET6 阅读页加做题面板(复用 ExamView 判分逻辑)。
- 验收:全部语篇 ≥3 题且答案有解析;validate --zhenti 0 错误;AI 题抽样 10% 人工校对记录在 `docs/`。
- **验证结果(2026-08-16)**:注:历史题目未随语篇源提供且本会话无 AI Key,采用**确定性规则生成** `scripts/gen_cet6_questions.py`(种子=文章 id,可复现;每篇 3 题 = 词汇语境义 + 细节补全 + 主旨大意,选项/解析全部来自原文、词典与标题;source 标注「程序生成待校对」;标题残留 `(JJ)`/`�` 已在生成器清洗);改前备份 `backup_cet6_before_p2-7.zip`。共 **114 篇 × 3 题 = 342 题**,词汇/细节/主旨各 114,fallback 0。前端:types 新增 `ReadingQuestion` + `ReadingPassage.questions?`,`components/PassageQuiz`(判分/解析/重做,复用 ExamView 交互)接入 Library CET6 阅读页。抽样人工校对 **12/114(10.5%)→ 35/36 通过**,2 处标题残留已修复、1 处多义词释义差异记录在案,详见 `docs/cet6-question-review-log.md`。validate --zhenti 0 错误 **0 警告**(校验器新增题目结构检查);validate/audit 0 错误 **0 警告**;tsc 0 错误;生产构建通过(89 模块);dev 冒烟 `/library?tab=cet6` 与语篇 200。

### P3-1 TED 泛读库 ✅ 完成 2026-08-16
**目标**:导入 shizhengLi/Learning-English-With-TED 的中文标注笔记(篮球 22 课、The Worlds I See、美国大亨等)。
- 数据:`import_ted.py` 解析「Opening Scene/创世词汇/Deep Dive/Listen&Learn」→ `content/intensive/ted/*.json` + index。
- 改动:Library 增加「🎤 TED 主题」标签页(复用 PassageTab + 段落翻译讲解)。
- 验收:首批 ≥30 篇入库且结构校验通过;Library 可读、可查词、可朗读、可翻译讲解。
- **验证结果(2026-08-16)**:新增 `scripts/import_ted.py`(GitHub API 枚举文件树 → 下载原始 .md 到 `raw_materials/ted/`(仅本地)→ 解析小节/表格/引用/词汇条目;美国大亨 07/08/09 为上游 0 字节空文件自动跳过)。入库 **35 篇 / 3 专辑**(篮球 22 + The Worlds I See 7 + 美国大亨 6)至 `content/intensive/ted/*.json` + `ted-index.json`,source 标注来源。前端:types 增加 `ReadingPassage.sections?/group?` 与 `ReadingIndex` item `group?`,`lib/ted.ts` 加载器;Library 新增「🎤 TED 主题」标签(复用 PassageTab:分组标题/小节渲染/查词/朗读/词级高亮/段落翻译讲解)。validate 增加 TED 库结构校验(35 篇,index↔文件一一对应、sections/paragraphs/wordCount)。tsc 0 错误;validate 0 错误 **0 警告**(含 TED);validate --zhenti 0 错误;audit 0 错误 **0 警告**;生产构建通过(90 模块);dev 冒烟 `/library?tab=ted`、ted-index、bb01/tws01 均 200。

### P3-2 typogrammar 素材导入 ✅ 完成 2026-08-16
**目标**:提取 IELTS/TOEFL 句式、band 词汇、常见错误(供 P2-5 使用)。
- 数据:PDF 文本提取脚本;输出 `content/writing/s5/*.json`。
- 验收:句式库 ≥50 条、band 词汇 ≥500 词、错误库 ≥100 条,均通过 JSON 校验。
- **验证结果(2026-08-16)**:素材确认为 typogrammar.com 免费学习 PDF,新增 `scripts/import_typo.py`(下载 3 份 PDF 到 `raw_materials/typogrammar/`(4.9MB,仅本地)→ pypdf 提取 → 合并输出)。入库:**句式 63 条**(P2-5 种子 12 + Task1 指南启发式抽取 12 + 人工整理 39)/ **band 词汇 1484 词**(种子 30 + 本平台词库雅思级 level=5 的 1454 词,带词典释义与例句)/ **错误 110 条**(typogrammar 错误手册 WRONG/RIGHT/RULE 95 组 + 种子 16,grammar-reference 187 条备用去重)。`validate_content.py` 增加三库数量硬门槛(≥50/≥500/≥100)与结构校验;Writing 页 band 词表增加搜索 + 前 300 条分页显示(1484 词全量可检索)。tsc 0 错误;validate 0 错误 **0 警告**(三库通过);validate --zhenti 0 错误;audit 0 错误 **0 警告**;生产构建通过;dev 冒烟 `/writing` 与三库端点均 200。

### P3-3 NCE 课文精读整合 ✅ 完成 2026-08-16
**目标**:把 NCE 课文作为单元精读扩展(语法点已在笔记库)。
- 数据:仅本地;课文原文 + 逐句拆解(chunks)由 AI 生成 + 人工抽检,或使用受控改写版。
- 改动:单元文章末尾「扩展阅读:NCE Lesson X」入口(跳 Library NCE 页)。
- 验收:S1–S4 每单元关联 1–2 课 NCE;版权声明在 UI 标注;validate 0 错误。
- **验证结果(2026-08-16)**:新增 `scripts/build_nce_links.py` → `public/content/curriculum/nce-links.json`:**42 个 S1-S4 单元 × 1-2 课 = 76 条关联**,S1→NCE1(8 单元 16 课)/S2→NCE2(12 单元 24 课)/S3→NCE3(12 单元 24 课)/S4→NCE4(10 单元 12 课,均匀分配);全部 id 校验存在于 190 课笔记索引。前端:types 新增 `NceLink/NceLinksFile`,`lib/curriculum.ts` 的 `loadNceLinks`,ReaderView 文章末尾「📗 扩展阅读:NCE 笔记课」卡片(每课跳 `/library?tab=nce`,**版权声明「课文原文仅本地个人学习使用,版权归原作者」在 UI 标注**)。validate 新增 check_nce_links(S1-S4 每单元 1-2 课、id 存在性)。tsc 0 错误;validate 0 错误 **0 警告**(含 42 单元/76 条关联);validate --zhenti 0 错误;audit 0 错误 **0 警告**;生产构建通过;dev 冒烟 `/unit/s1u1?step=article`、nce-links.json、NCE 资料库均 200。

### P3-4 内容质量加固 ✅ 完成 2026-08-16
**目标**:清理 `audit_content.js` 报告的存量警告与词池不一致。
- 内容:264 个 newWords 词池不一致(逐单元人工复核清单);6 个专有名词;S4 真题组人工抽检;940 道自动练习抽检。
- 验收:audit 警告降至 ≤20;人工复核记录写入 `docs/content-review-log.md`。
- **验证结果(2026-08-16)**:
  - 新增 `scripts/content_review.py` → `docs/p3-4-review-data.md`(与 audit 完全同口径:264 条词池不一致清单 + 26 条超出词池语境 + S4 真题组概览 + 940 练习每 20 取 1 抽样 47 题)。
  - **264 条逐单元复核结论:全部保留不改写**(26 条超出词池均为入门文章必需高频词,根因是词库 order=词书排名而非教学顺序,audit 注释本就不视为硬错误;238 条早于词池属有意复现);结论写入 `docs/content-review-log.md`。
  - **S4 真题组抽检(10 组全查 + 20 题)**:答案全部正确;修复 2 处文本瑕疵(5and→5 and、have s strong→have a strong)。
  - **全库清理 72 处来源水印残留**(淘宝店铺 URL/掌柜旺旺,49 个文件):新增 `scripts/clean_watermarks.py`,复查残留 0。
  - 940 练习抽样 47 题结构/语义合格。
  - audit 警告 **0(≤20 达标)**;validate 0 错误 0 警告;--zhenti 0 错误 0 警告;tsc/build 通过。

### P4-1 发布与性能 ✅ 完成 2026-08-16
- 内容:SPA fallback 说明、`vite preview` 使用文档、dist 发布流程;public 大 JSON 是否 gzip/分片评估;React.lazy 页面级分包。
- 验收:`npm run build && npm run preview` 全流程可用;首页首屏资源 <350KB(压缩后)。
- **验证结果(2026-08-16)**:`main.tsx` 改为 React.lazy 页面级分包(Home 保留首屏,其余 12 路由按需加载),`App.tsx` 增加 Suspense 兜底;产物由单 bundle 348KB → **入口 266KB(gzip 90.62KB)+ 18 个分包 chunk(合计 355KB)**,**首页首屏静态资源 ≈96KB(压缩后)<350KB 达标**。新增 `docs/PUBLISH.md`(构建/preview/nginx SPA fallback/gzip 建议/大 JSON 评估);`npm run build && npm run preview` 实测:7 条前端路由(含深链 `/grammar?node=g-s1u1`)全部 200(SPA fallback 生效)。大 JSON 评估结论:15.2MB public JSON 均按字母/按篇分片懒加载,**无需再分片**,托管层开 gzip 即可。tsc 0 错误;validate/--zhenti/audit 0 错误 0 警告。

### P4-2 数据管理增强 ✅ 完成 2026-08-16
- 内容:跨标签页 storage 事件同步;备份含 passageNotes/aiProfile;导入版本迁移提示。
- 验收:双开页面改进度另一页即时刷新;旧备份导入不报错且字段补默认值。
- **验证结果(2026-08-16)**:`storage.ts` 重构——`subscribeData`/`useDataVersion` 订阅机制 + 模块级 `storage` 事件监听(其他标签页保存 → 本页缓存失效 + 广播刷新);Home/Plan/Settings 三页接入订阅,双开页面改进度/打卡另一页即时刷新。新增纯函数 `migrateBackup(旧备份 → 新 AppData)`:顶层缺失字段 + aiConfig 嵌套字段自动补默认值并返回迁移清单;`importData` 改返回 `{ok, migrated}`,Settings 导入时提示「已自动迁移补全:…」。备份本已含 passageNotes/aiProfile/plan/writingFeedback,Settings 数据管理区明确列出备份范围。新增 `scripts/selftest_storage.mjs`(零依赖,Node 直测):M1 旧备份迁移断言、非法备份拒绝、当前备份往返 0 迁移项、**跨标签页 storage 事件模拟(另一页写入 → 本页 loadData 即时可见)**全部通过。tsc 0 错误;validate/--zhenti/audit 0 错误 0 警告;生产构建通过(首屏 gzip 90.73KB)。

### P5 系列:趣味化与自然语音升级(开源版)🚧 进行中(计划定稿 2026-08-16;P5-1 ✅ 2026-08-16)

> 前提:在现有 ROADMAP 全部完成的基础上开发。定位:把平台从「内容型精读站」升级为「**自然语音 + 趣味词汇 + AI 口语**」闭环学习平台。

**关键决策(2026-08-16 与用户确认)**:

1. 项目将上架 GitHub 开源,**他人本地部署体验必须与本人完全一致**;
2. 朗读走本地方案:**浏览器 Piper(vits-web)默认 → 本地 Piper 服务可选 → Web Speech 兜底**,不用云端 TTS;
3. AI 对话保留选项模式,新增**自由输入**(带提示 + 输入框旁语音转文字),AI 输出每条带 🔊 按钮点击自动朗读;
4. 许可证政策:MIT 仓库直接移植;**AGPL(earthworm/freelingo)代码与数据一律不进仓库**,只借鉴通用思路自实现;无 LICENSE 仓库(open-lingo/ai-vocab-agent)尽量借鉴实现,上架时在 `docs/THIRD_PARTY_NOTICES.md` 声明;
5. 第三方版权内容(真题/NCE/外刊/词库)保留并标注「仅限个人学习使用」;
6. 声音模型与预生成音频不入库,由 `scripts/setup_audio.bat` 一键获取与生成。

**参考仓库(8 个)与取舍**:

| 仓库 | 许可 | 取舍 |
|---|---|---|
| rhasspy/piper | MIT(声音按 MODEL_CARD) | 本地服务 + vits-web 浏览器引擎 + 预生成音频管线 |
| cuixueshe/earthworm | AGPL-3.0 | 不移植代码/数据;借鉴「连词成句」玩法,自研引擎 |
| Hexdigest123/open-lingo | 无 LICENSE | 参考实现 7 类题型 / 心·XP·成就 / 口语评测 / Realtime,上架声明 |
| Kilokiyiu/Listen-en-web-pub | MIT | 词根库与测验直接导入;听力逐题+字幕模式;今日一篇外刊 |
| V3D1/spaced-english | MIT | `sm2.ts` 直移植;打字听写 / 四档闪卡 / 连击日历 / 输入输出平衡 |
| liyang-27/ai-vocab-agent | 无 LICENSE | 参考实现错词循环 / 词根星图 / 近义词雷达 / OCR 脚本,上架声明 |
| TICKurt/english-dictionary-web | MIT | 键盘流闪卡 / 学习队列 / 自动连读 / 词形近义数据 |
| artcc/freelingo | AGPL-3.0 | 不移植代码;借鉴分级测评 / AI 生成听力阅读练习 / 持久记忆思路,自研 |

**与现有项目结合**(旧数据全部无损迁移):

- **升级**:朗读系统(`speech.ts` 三引擎)、词汇预习(VocabView 自测入队)、生词本(→ 词汇中心)、听力(ListenView 考试模式 + Piper 音频)、AI 对话(自由输入 + 自动朗读)、学习计划(分级测评带入 + 强度预设)、资料库(今日一篇 + 已读收藏)、首页(仪表盘)、设置(TTS/语音输入/Ollama)、词典弹层(词根/近义/快标)、AI 代理(新端点 + localhost 放行)、内容门禁(新校验)。
- **拓展**:词汇引擎 + SM-2、趣味模式 6 种(`/vocab-games`)、词根库 + 星图 + 近义词、AI 生成听力/阅读练习、教练持久记忆、跟读评测、OpenAI Realtime(可选)、XP/成就/连击、分级测评页、OCR 词库导入脚本。
- **取代**:Web Speech → 三档引擎(Web Speech 降为兜底);卡片式词汇预习 → 自测 + 复习队列;生词本 → 词汇中心;系统音听力 → 预生成 Piper 音频;词典弹层 → 增强版;AI 对话新增自由输入(选项模式保留)。

#### P5-1 自然朗读引擎 ✅ 完成 2026-08-16
- **目标**:全站朗读(单词/例句/句子/文章/AI 台词)使用自然音;断网可用;部署者零安装即用。
- **来源**:rhasspy/piper、`@diffusionstudio/vits-web`(npm MIT)。
- **改动**:`types.ts` 新增 `TtsEngineKind/TtsConfig`(`tts:{engine, voiceId, rate, piperBase, autoReadAi}`),`storage.ts` 旧 `{voiceURI,rate}` 自动迁移(voiceURI→voiceId,选过系统音色则 engine=system,迁移清单标注);新 `src/lib/tts/`:`engine.ts`(SpeakOptions/CancelToken/WAV 播放/停止公共层)、`ttsBrowser.ts`(vits-web 三声音 en_US-lessac/en_GB-alba/zh_CN-huayan-medium 存 OPFS,**官方 HF 失败自动回退 hf-mirror.com 镜像**、中文文本自动切中文音色、下载/删除/状态管理)、`ttsLocal.ts`(Piper http_server POST `/` 与 `/synthesize` 双端点兼容、`/voices` 声音列表、合成冒烟测试、开发走 Vite `/__piper_proxy`/生产走独立代理 `/piper`)、`ttsSystem.ts`(Web Speech 兜底,保留词级边界);`speech.ts` 改三档路由层(本地 → 浏览器 Piper → 系统,失败自动降级、全程无未捕获异常)+ `speakSentences` 逐句队列;`ReaderView` 全文朗读改逐句队列 + 句级高亮 + 每句 🔊 单句朗读(system 引擎仍逐词高亮);`Settings.tsx` 引擎/音色/语速/声音下载删除(带进度)/本地 Piper 地址测试/「AI 台词自动朗读」开关;`AiDialogue` NPC/AI 新台词按设置自动朗读(手动 🔊 保留);`vite.config.ts` 新增 `/__piper_proxy`(仅 localhost/127.0.0.1 http(s));`scripts/ai-proxy-server.mjs` 新增 `/piper`(同上白名单,GET/POST 二进制透传);WordPopup/VocabCard/ListenView/GoalDialogue/Wordbook/ZhentiReader/Library 经共享 onSpeak 路由全部接入。
- **验证结果(2026-08-16)**:tsc 0 错误;validate 0 错误 **0 警告**;audit 0 错误 **0 警告**;生产构建通过(onnxruntime 537.92KB / piper 88.76KB 均按需懒加载分包,首屏 gzip 96.82KB);`selftest_storage.mjs` 通过(新增旧 voiceURI→voiceId 迁移断言);dev 冒烟 `/settings`、`/unit/s1u1?step=article` 200;`/__piper_proxy` 与独立代理 `/piper` 实测:合成 200 audio/wav(144B mock)、`/voices` JSON 透传、非 localhost 目标 400 拦截;`/__ai_proxy` 回归:上游 401 原样透传;声音资产:hf-mirror.com 镜像实测 voices.json 200 / 模型 206 / 配置 200(HF 官方源在本机网络连接被重置,镜像回退可保证国内可下载;首次下载后模型在 OPFS、wasm 由浏览器 immutable 缓存,断网可读)。

#### P5-2 词汇引擎 + SM-2 间隔复习 ✅ 完成 2026-08-16
- **目标**:每章新词 / 点击生词 / 真题错词 / 教练错词统一入池,按遗忘曲线复习,记过的词有掌握度。
- **来源**:spaced-english `sm2.ts`(MIT 直移植)、english-dictionary-web(队列/键盘流)、ai-vocab-agent(错词循环)。
- **改动**:`types.ts` 新增 `WordStatus/WordSource/WordState{word,reps,interval,ef,next,status,box,wrongCount,sources,addedAt,lastReviewAt}` 与 `AppData.wordStates`;`storage.ts` 迁移(旧 `wordbook` 词转 learning 态、wordStates 逐条补默认、备份往返 0 迁移项)+ `makeWordState/setWordState/removeWordState`,`addWordbook` 同步入池;新 `src/lib/srs.ts`(纯函数 SM-2 四档:again 清零/当日队尾、hard ×1.2、good ×EF、easy ×EF×1.3,EF 夹 [1.3,2.5],箱≥5=mastered)+ `src/lib/vocab.ts`(addWord 来源合并/reviewWord/dueTodayWords/requeueWrongWord/vocabStats/markMastered/extractWords 停用词提词,`.ts` 扩展名导入 → Node 可直测);入池钩子:`VocabView` 改「预览 → 认识/不认识自测 → 收进队列」(认识=easy 排 5 天,不认识=今日到期,完成才打 vocab:true)、`WordPopup` 点词显示掌握度(状态/箱/错次/下次到期)+「收进词汇池」与「快标掌握」、`ExamView` 答错题题干+正确答案自动错词入池、`AiDialogue` 教练纠错词自动入池;`Wordbook.tsx` 升级词汇中心:统计条(总数/今日到期/学习/复习/掌握)、今日复习闪卡(空格揭义、1-4 评分、Again 当日回队尾)、学习中/已掌握/全部分类 + 来源筛选、移出词汇池、Anki 两种导出保留。
- **验收**:任意词可入池(单元/点词/快标/真题/教练 5 入口);到期队列每日正确;Again 词当日回到队尾;已掌握数准确;备份含 wordStates;四门禁全绿。
- **验证结果(2026-08-16)**:新增 `scripts/selftest_vocab.mjs`(零依赖,Node 直测)全过:SM-2 四档调度(新词 easy=1次/5天/箱2、again 清零+EF-0.2、hard=1次/1天/箱不变、连续 good/easy×4→箱5 mastered)、入池归一化与来源合并、错词当日重排队(wrongCount 累加/多来源)、dueTodayWords/vocabStats、快标掌握(箱5 且不进到期队列)、停用词提词;`selftest_storage.mjs` 扩展:旧 wordbook→wordStates(learning 态 + 来源标注 + 迁移清单数量)与 aiProfiles 清洗断言;tsc 0 错误;validate 0 错误 **0 警告**;audit 0 错误 **0 警告**;生产构建通过;dev 冒烟 `/wordbook`、`/unit/s1u1?step=vocab` 及 Wordbook/VocabView/WordPopup/vocab 模块均 200。

#### P5-3 趣味记单词中心 ✅ 完成 2026-08-16
- **目标**:6 种离线可玩模式,成绩回写掌握度与激励系统。
- **来源**:earthworm(玩法思路)、open-lingo(题型引擎/心/XP,参考实现)、spaced-english(打字操练)、english-dictionary-web(键盘体验)。
- **改动**:新 `scripts/build_vocab_games.py`(零依赖、确定性)从 48 单元 dialogue/listen 台词自动拆词块 + 同阶段干扰块 → `public/content/games/order-sentence.json`(**114 题**,S1=50/S2=41/S3=23);`types.ts` 的 `WordSource` 增加 `game`,`AppData` 增加 `gameBest`(各模式最佳/次数)与 `gameAiNotes`(AI 讲解缓存),`storage.ts` 迁移清洗 + `recordGameScore/setGameAiNote`;新 `src/lib/game/`:gen.ts(纯函数:mulberry32 可复现随机/shuffle/pickMany/normalizeText/dateSeed/buildDailyPlan,Node 可直测)、words.ts(词源=词汇池优先+词库字母懒加载补充)、score.ts(applyWordResults:对词记 good、错词当日重排队;finishGame 记最佳)、ai.ts(「🤖 AI 讲讲」复用 chat+缓存,无 Key 自动隐藏)、ui.tsx(AiExplain/ResultCard);六个模式组件:**orderSentence**(点击/数字键选词块拼句,Enter 检查)、**typing**(看词打字)、**matching**(单词↔释义 6 组配对,数字键选列)、**spelling**(看中文+听发音拼写)、**flashRun**(60 秒 J/F 闪卡快跑,不认识当场显示释义并进错词队)、**daily**(按日期种子固定 10 题=8 词义选择+2 拼写);新 `/vocab-games` 路由(React.lazy)+ 顶部导航「🎮 词汇游戏」+ 首页快捷入口 + 词汇中心「🎮 词汇游戏 →」;`validate_content.py` 新增题库校验(结构/块数对齐/干扰块≥2/单元存在/≥50 题)。
- **验收**:6 模式全离线可玩、键盘全程可操作、移动端点选可用;成绩写 wordStates/stats;四门禁全绿。
- **验证结果(2026-08-16)**:新增 `scripts/selftest_game.mjs`(零依赖)全过:同种子随机序列一致、洗牌不丢元素、pickMany 唯一、normalizeText 去标点、每日计划 8 选择+2 拼写且选项含正确答案不重复、日期种子 YYYYMMDD;`selftest_storage.mjs` 更新当前备份夹具(含 gameBest/gameAiNotes)0 迁移项;tsc 0 错误;validate 0 错误 **0 警告**(连词成句 114 题结构校验通过);audit 0 错误 **0 警告**;生产构建通过;dev 冒烟 `/vocab-games`、order-sentence.json、VocabGames 与 3 个模式模块均 200。注:激励系统(xp/level/成就)按计划在 P5-6 统一实现,本项已预留 gameBest 数据。

#### P5-4 听力升级 + 词根词缀 ✅ 完成 2026-08-16
- **目标**:听力用自然音 + 考试模式;词典与词汇中心具备词根维度。
- **来源**:Listen-en-web-pub(MIT)、rhasspy/piper。
- **改动(M1 音频部分已完成)**:
  - `scripts/pregen_audio.py`(零依赖):读 48 单元 listen/article 内容,调用本地 Piper http_server(POST `/`,兼容 `/synthesize`)批量生成 `public/content/audio/{unitId}/listen-{i}.wav` + `article-{i}.wav` 与 `index.json` 清单;支持 `--units/--kinds/--force/--dry-run`,复用已生成文件,分批运行自动合并旧清单,RIFF 校验,失败汇总退出码。
  - `src/lib/audio.ts`:`loadAudioManifest/listenWavUrls/articleWavUrls`(清单缺失静默 null,不打扰用户);`tts/engine.ts` 新增 `playAudioUrl`;`speech.ts` 的 `speak` 新增 `audioUrl`、`speakSentences` 新增 `audioUrls`,本地 wav 作为最高优先级档,404/损坏自动回退引擎链;并修复停止朗读的会话竞态(stopSpeech 递增会话号,取消后不再误降级续播)。
  - `ListenView.tsx` 练习/考试双模式:练习保留逐轮先听后选;**考试模式 = 整组连续盲听(显示进度、不显字幕)→ 逐题作答(每题可重播)→ 交卷统一揭字幕/翻译/讲解 + 判分**;音频优先本地 wav(界面显示「🎙 本地 Piper 自然音」),缺则浏览器 Piper 在线合成。
  - `ReaderView.tsx` 全文逐句队列与单句朗读优先本地 article wav。
  - `.gitignore` 忽略 `public/content/audio/`;`validate_content.py` 新增清单校验(结构/单元存在性/数量不超过内容条数/文件存在性,未生成时提示为可选)。
- **M1 音频部分验证结果(2026-08-16)**:dry-run 全量统计 48 单元 759 段;mock Piper 端到端生成 s1u1/s1u2 共 17 个 wav + 清单,分批重跑合并清单正确(s1u1+s1u2 并存)、复用跳过 0 合成;validate 清单校验通过(17 个 wav 无缺失);dev 冒烟 `/unit/s1u1?step=listen`、`/content/audio/index.json`、`listen-0.wav`(audio/wav)、ListenView 模块均 200;tsc 0 错误;validate 0 错误 **0 警告**(未生成音频时提示可选);audit 0 错误 **0 警告**;生产构建通过。**真实 Piper 实测(同日)**:piper-tts 1.7.0 + en_US-lessac-medium(63.2MB,hf-mirror 下载)本机服务 127.0.0.1:5000——直连 /synthesize 200、/voices 200、经 /__piper_proxy 合成 2.31s 22.05kHz WAV、`pregen_audio.py --units s1u1` 生成 8 段真实语音(1.2-3.0s)、validate 0 错误 0 警告。实测发现 piper 1.7 为 JSON `/synthesize` 协议且 /voices 返回字典,`ttsLocal.ts` 与 `pregen_audio.py` 已同步兼容三种协议(JSON /synthesize → 纯文本 / → 纯文本 /synthesize)与两种 /voices 形状。
- **词根部分进度(2026-08-16,进行中)**:
  - ✅ `scripts/import_affix.py`(零依赖)已生成 `public/content/affix.json`:**429 条**(prefix=167/suffix=175/root=87),每条 ≥1 个词库命中词(种子 189 条 + 词库统计派生 240 条;参考 Listen-en-web-pub 词根学习功能,该仓库未随数据分发,故按人工种子+词库统计自建,数据说明写入文件 source 字段)。
  - ✅ `src/lib/affix.ts`:`loadAffixFile/affixesOfWord(词命中前 4 条)/buildAffixQuiz(四选一题目,纯函数级可测)`。
  - ✅ `WordPopup.tsx` 词根区块:点词显示命中词根词缀(前缀/后缀/词根 + 中文含义 + 词库例句)。
  - ✅ `storage.ts`:`AppData.libraryFlags{read,fav}` 迁移清洗 + `markLibraryRead/toggleLibraryFav`(为「今日一篇」已读/收藏预留)。
  - ✅ 词汇中心词根测验(`AffixQuiz` 8 题四选一,再来一轮换种子)。
  - ✅ `Library.tsx`「今日一篇」外刊(按日期稳定抽取)+ 已读/收藏筛选 + 深链 `?tab=magazine&id=`。
  - ✅ 首页今日一篇卡片;点词弹层词根区块补齐展示。
  - ✅ `validate_content.py` 词根库校验(结构/类型/数量≥100/例句)。
  - ✅ `scripts/selftest_affix.mjs` 纯函数自测(出题可复现 + 今日一篇稳定抽取)。
- **词根部分验证结果(2026-08-16)**:`selftest_affix.mjs` 全过(同种子出题一致、选项含正确答案、不足 5 条不出题、今日一篇同日稳定/跨天可换);validate 0 错误 **0 警告**(词根库 429 条:前缀 167/后缀 175/词根 87);tsc 0 错误;selftest_vocab/game/storage 回归通过;生产构建通过(118 模块,首屏 gzip 102KB)。

#### P5-5 AI 对话与口语训练 ✅ 完成 2026-08-16(Realtime 明确不做)
- **目标**:对话训练支持语音输入、自由表达、自然朗读,并有练习生成与持久记忆。
- 来源:open-lingo(参考实现)、freelingo(思路)。
- **已完成**:`AiDialogue.tsx`「选项 / 自由输入」模式切换;输入框带场景提示 + 🎤 SpeechRecognition 语音转文字;`roleplay.ts` 新增 `judgeFreeInput` 自由输入判分/续写,选项模式复用同一路径;教练闭环兼容自由输入历史;NPC/AI 每条 🔊 + 设置页自动朗读保留。
- **本轮已完成**:
  1. `ai/generatePractice.ts` + `/practice`:有 Key 时按 CEFR 生成听力(5 问,先听后揭)与阅读(短文+5 问),按 `kind:level` 缓存;`AppData.practiceCache` 随备份迁移;无 Key 入口隐藏。
  2. 教练持久记忆:`AiProfile.memories`(上限 20);设置页增删清空;生成练习 / 教练出题 prompt 优先带入。
  3. 跟读评测:`lib/shadow.ts` 词重合率打 0-100 + `ShadowRead`;精读句旁 / 听力揭晓后可跟读;漏词入池;无麦克风隐藏。
- **明确不做**:OpenAI Realtime 真语音(依赖云端实时、与「离线优先」冲突);实时 AI 对话朗读仍走现有三档引擎。
- **验证结果(2026-08-16)**:`selftest_stats.mjs` 跟读/XP/连击断言通过;tsc 0 错误;validate 0 错误 0 警告;生产构建通过。

#### P5-6 激励系统与仪表盘 ✅ 完成 2026-08-16
- **目标**:XP/连击/成就形成正反馈,首页一屏看到今日状态。
- 来源:open-lingo、spaced-english、freelingo(思路)。
- 改动:`types.ts`/`storage.ts` 增加 `UserStats{xp,level,streak,lastActiveDay,activityLog,achievements}`;新 `src/lib/stats.ts`(经验、升级曲线、连击、成就判定);`Home.tsx` 今日仪表盘(到期复习/连击/XP)+ 连击日历 + 每日一句;成就 toast + `/achievements` 成就墙;新 `src/pages/Placement.tsx`(`/placement`):20 题自适应测评 → CEFR 建议 → 学习计划一键带入 `startStage`。
- 挂钩(顺手):单元完成/今日复习/游戏通关/今日一篇已读/跟读一次 均加 XP 并刷新连击。
- 验收:连续两天活动连击正确;成就解锁可回看;测评结果能带进计划生成;数据全入备份;四门禁全绿。

#### P5-7 内容生产流水线 ✅ 完成 2026-08-16
- **目标**:词根/游戏题/AI 练习题可批量生产,全部过门禁;前端预取加速翻单元。
- 改动:
  - `scripts/import_affix.py` 已有,本轮只补 README 登记与校验(已完成)。
  - 新 `scripts/ai_generate_lessons.py`:按 48 单元词池批量生成连词成句补充题(强制 JSON,标注 `source: AI 生成待校对`),validate 结构门槛;无 Key 时脚本跳过并打印提示。
  - 新 `scripts/ocr_vocab_import.py` 骨架:docx/图片目录 → 词表 JSON 契约(需 Vision Key 才跑;无 Key 打印用法,不阻断门禁)。
  - 前端:`lib/prefetch.ts` 预取相邻单元 5 文件,UnitPlayer 切入时后台预热下一单元。
- 验收:脚本可重复运行;无 Key 不报错;生成物结构通过 validate;预取不阻塞首屏。

#### P5-UX 顺手优化(夹在上述项中)
- TED 精读:笔记本身已有中英对照与讲解,段落不再显示「🌐 翻译与讲解」(CET-6/外刊保留)。顺手清掉 Practice 小节末尾「要我直接接着写第 02 篇…」生成残留。
- 首页仪表盘信息密度:到期词 / 连击 / XP / 今日一篇 一屏可见。
- 资料库 TED 列表不再被「今日一篇」逻辑误伤(仅外刊 daily)。

#### P5-TTS 离线预生成 ✅ 完成 2026-08-17(Coqui 全量覆盖进行中)
- **原则**:静态内容预生成一次并嵌进 `public/content/audio/`;**AI 对话等实时文本仍走浏览器 Piper / 系统语音**,不预生成。
- **第一批(Piper,已入库)**:`pregen_audio.py` 生成 48 单元文章 600 + 听力 159 + 情景对话 476 + 单词 1570,0 失败;`.gitignore` 已放行 wav(仅忽略 `_tmp/`)。
- **第二批(Coqui Tacotron2-DDC 覆盖旧 Piper)**:`scripts/pregen_all_tts.py` 全量约 14354 段——课程音 + 单词 + 外刊/CET6/TED 英文段 + 考研真题逐句 + 语法例句 + 写作句式;默认 `--force` 覆盖,`--no-force` 只补缺失。Jenny 1.6GB / VITS(缺 espeak)已放弃;Tacotron2-DDC CPU 可跑。后台日志 `scripts/_all_tts.log`。
- **Bark**:脚本 `pregen_bark.py` 已就位,本机未跑(依赖重);对话目前用 Coqui 覆盖。
- **前端路由**:本地 wav 优先(`speech.ts` 的 `audioUrl`);`wordWavUrl`(点词/词汇中心)、`dialogueWavUrl`(目标对话)、`passageWavUrl`(资料库/真题/语法/写作);404 自动回退在线引擎。
- **红线**:不把 Coqui/Bark 模型塞进仓库;实时 AI 对话禁止走预生成。

#### P5-8 开源上架与「体验一致」工程 ⏸ 暂缓
- 按用户指示本轮不做上架。计划保留,等内容与语音资产稳定后再启动。
- **目标**:上 GitHub 后任何人 clone 后与你本地体验完全一致。
- 改动:仓库直接携带全部生成内容 JSON(wordbank/dict/curriculum/intensive/zhenti),clone 后 `npm install && npm run dev` 即全功能,无需 Python;新 `scripts/setup_audio.bat` 一键下载 3 个 Piper 声音 + 可选预生成 48 单元音频,README「快速开始」写明;第三方版权内容保留并在文件头/UI 标注「仅限个人学习使用」,README 顶部版权声明;新增 `docs/THIRD_PARTY_NOTICES.md`(借鉴与使用清单)、`docs/LICENSES.md`(依赖与声音许可),主 LICENSE 采用 MIT(与移植物兼容);代理放行 `127.0.0.1/localhost` 的 http(仅本地 Ollama 预设),其余仍仅 https;`.gitignore` 更新(忽略 `node_modules/`、`dist/`、`raw_materials/`、`zhenti_raw/`、`public/content/audio/`);上架自检清单:干净目录 clone → 两条命令跑通 → 逐页冒烟 → 版权标注完整 → 门禁全绿。
- 验收:干净目录 clone 后两条命令跑通全部功能;版权标注完整;门禁全绿;通知文件齐全。

**实施里程碑**:M1 语音优先(P5-1 → P5-4 音频部分)→ M2 词汇闭环(P5-2 → P5-3 → P5-4 词根部分)→ M3 AI 口语(P5-5)→ M4 激励收口(P5-6)→ M5 上架收口(P5-7 → P5-8)。

**红线与风险**:AGPL 代码与数据不进仓库;无许可仓库借鉴实现并在上架时声明;第三方版权内容标注「仅限个人学习」;声音模型与生成音频不入库、随脚本获取;AI 生成内容强制 JSON + 重试 + 缓存 + 标注 + 抽检;批量内容改动先备份。

### P6 自适应学习计划 ✅ 完成 2026-08-17(P6-1/2/3/4 全部完成)

> 专文:`docs/PLAN_ADAPTIVE.md`(契约、算法、并行分工、验收)。本项只改排程与计划 UI,不改 48 单元内容和 UnitPlayer 六步。

**问题**:现网 `buildSchedule` 在 `endStage>=4` 时空白天轮转考研真题——入门选 S1→S5 可能第 2 天就刷考研;一天只能排整单元(或加速打包成一条「N 个单元」),不能按基础/日期拆成多小节。

**原则**:练习档 = 当天已解锁阶段,绝不提前两档;一天按小节预算打包,可 1 小节也可跨单元多小节。

#### P6-1 排程核 + 契约 ✅ 完成 2026-08-17
- 改动:`types.ts` 计划段(`UnitStepKey`/`intensity`/`unit-step`/`tier`/`version:2`/`dailySections`/`abilityStage`);重写 `planCore.buildSchedule`(阶段窗口 + 每日小节预算 + 同档 filler + 每周复盘);`computeDailySections`/`stageWindows`/`dayUnlockStage` 导出;`selftest_plan.mjs` 锁死「前 10 天零考研/CET-6」「阶段窗口 Σ 天数=totalDays」「7 天压缩覆盖 288 小节」「同日跨单元(daily 非 6 倍数时)」。
- 验证:tsc 0 错误;selftest 7 组断言全过;v1 `kind:'unit'` 只读兼容,`isV1Plan` 提供。

#### P6-2 生成器 / 测评带入 ✅ 完成 2026-08-17
- 改动:`generatePlan` 增加 `intensity`/`abilityStage`,写回 `version:2`/`dailySections`;`/placement` 结果页可选目标阶段/计划天数/强度三控件,applyPlan 用选中值并传 `abilityStage=suggested`,删除"自适应"夸大。
- 验证:tsc 0 错误;build 通过。

#### P6-3 计划页 + 首页 ✅ 完成 2026-08-17
- 改动:`Plan.tsx` 强度三选一、范围 hint 改为单元/小节数与单日约排小节数、v1 老计划「升级为按小节+按基础」提示、v2 卡片 tag 含强度/小节每天;`Home.tsx` 标题加 `· N 小节`(v2 且 >1 任务)。
- 验证:tsc 0 错误;build 通过(分包不变)。

#### P6-4 按近况重排剩余天数 ✅ 完成 2026-08-17
- 改动:`planCore.adjustRemainingPlan` 纯函数:近 7 日打卡完成率 < 0.5 或近期单元 exam 均分 < 60% 时,在剩余「纯泛读日」每 3 天插一条 `vocab-review-recover`,已过去任务与打卡不动;无信号返回原对象引用(惰性);v1 不动;未开始日期不动。`Plan.tsx` 加「按近况重排剩余天数」按钮,信号由 checkins/progress/wordStates 计算;alert 提示新增条数或"状态良好无需重排"。`selftest_plan` 新增 6 组断言(无信号/弱信号/exam 低/未开始/v1/today=day1)。
- 验证:tsc 0 错误;build 通过;selftest 全过(13 组断言)。

**并行**:WG-A 核 ✅ → B/C/D ✅ → E=P6-4 ✅。文件所有权见专文 §8。

---

### P7 Go 单文件可执行服务与轻量数据库架构升级 ✅ 完成 2026-08-18

> 专文:`docs/PLAN_COMPANION_DATABASE.md` (架构、Go 单文件自包含设计、双库隔离、音频流式协议与便携规范)。

**背景与目标**:
1. **Go 独立单文件服务 (`english-app.exe`)**: 编译为约 18MB 单二进制可执行程序，`//go:embed` 内嵌全部 React 前端产物。在新设备上 **100% 零依赖（免装 Node.js、免装 Python、免装数据库）**，双击即用，内存占用 `< 20MB`；
2. **海量音频（数 GB）解耦与流式播放**: 批量转码 WAV $\rightarrow$ Opus/MP3 (体积压缩 80%~85%)，脱离前端静态打包构建，Go 服务基于 `http.ServeContent` 提供原生的 RFC 7233 HTTP 206 Range 分片流；
3. **突破 localStorage 存储瓶颈**: 采用无 CGo 依赖的纯 Go SQLite（`english_core.db` 核心只读库 + `user_learning.db` 用户动态库），无容量上限存储全量做题记录、笔记与 AI 批改；
4. **毫秒级查词引擎**: 26 个 JSON 词库转为 SQLite FTS5 全文索引，查询耗时 `< 1ms`；
5. **多端局域网同享与双模降级**: 自动扫描网卡输出局域网 IP 供手机/iPad 同步学习；前端保留双模平滑降级机制。

#### P7-Go-1 资产瘦身与核心库构建 ✅ 完成 2026-08-18
- 任务: `scripts/init_database.py` 灌 `data/english_core.db`(词库 9251 + 音频清单);`scripts/convert_audio.py` 默认跳过(源已是 MP3,约 832MB / 15219 文件,本轮不转 Opus)。
- 验收:灌库约 2s;`apple` 查词命中。

#### P7-Go-2 Go 独立单文件服务开发 ✅ 完成 2026-08-18
- 任务:`server/` 纯 Go(`modernc.org/sqlite`);`/api/dict/*` `/api/audio/*`(ServeContent 206)`/api/user/sync` `/__ai_proxy` `/piper`(仅 loopback)`//go:embed dist` SPA 回退;启动打印 LAN IP 并打开浏览器。

#### P7-Go-3 前端双模适配与降级 ✅ 完成 2026-08-18
- 任务:`lib/companion.ts` 探测 `service==='english-app'`;`dict.ts`/`audio.ts`/`storage.ts` Go 优先,失败回退 JSON/localStorage;生产 AI/Piper 仅在 companion 在线时走同源代理。Vite 代理 `/api` `/health` → :8787。

#### P7-Go-4 一键构建与多端移植验证 ✅ 完成 2026-08-18
- 任务:`build_app.bat` 产出上级 `english-app.exe`(dist 不含 audio);`点击我一键打开.bat` 优先 exe,否则回退 `npm run dev`。

---

## 3. 开发流程与验收规范

1. 每个待开发项开工前,在文档中改为 `🚧 进行中` 并附开始日期。
2. 完成后改为 `✅ 完成`,并写:`完成日期 / 验证结果(tsc、validate、audit、build)/ 备注`。
3. 契约文件 `src/lib/types.ts`、`index.json`、wordbank/dict 生成物改动必须同步 `docs/DEVELOPMENT.md`。
4. 内容批量修改前必须先备份(参照 `backup_curriculum_before_p1.zip`)。
5. 外部资料仅本地个人学习,UI 必须标注来源;AI 生成内容必须标注生成方式并抽检。
6. 所有新脚本写入 `scripts/`,并在 README「重新生成词库」一节登记。

---

## 4. 外部资源与版权

来源清单与用途见 `docs/ENRICHMENT_PLAN.md` 第 1 节。红线:
- 不公开发布第三方原文(新概念课文、杂志全文、真题全文);
- `raw_materials/` 仅本地留存;
- AI 生成讲解/题目需人工抽检后进入正式内容。

---

## 5. 变更记录

| 日期 | 事件 |
|---|---|
| 2026-XX-XX | 建立 ROADMAP;M1/M2/P0/P1/P2 第一批标记完成(详见各节) |
| 2026-08-16 | P4-3 完成:生产环境独立 AI 代理(`scripts/ai-proxy-server.mjs` + `AiConfig.proxyBase` 前端 BASE 切换) |
| 2026-08-16 | P2-2 完成:阅读器分级词高亮(单元文章/资料库/真题,词库 4 级 + 考研高频 TOP1000) |
| 2026-08-16 | P2-3 完成:AI 教练升级(CEFR A0-C2 大纲 + 纠错/估级/专项操练闭环 + aiProfile 画像) |
| 2026-08-16 | 门禁警告清零:专有名词白名单(li/hua/beijing/wang/ming/ping/amy)→ validate/audit 均 0 警告,复核记录见 docs/content-review-log.md |
| 2026-08-16 | P2-4 完成:学习计划页(自选天数/起止阶段/开始日期自动生成 + 打卡 + 首页今日任务) |
| 2026-08-16 | P2-5 完成:S5 写作练习(句式仿写 + band 词汇 + 常见错误 + AI 三项批改缓存) |
| 2026-08-16 | P2-6 完成:语法树与单元双向整合(语法树↔单元语法课↔真题组三向互链) |
| 2026-08-16 | P2-7 完成:CET-6 语篇配题(114 篇 × 3 题 + 做题面板 + 10.5% 抽样校对记录) |
| 2026-08-16 | P3-1 完成:TED 泛读库(35 篇 / 3 专辑,Library 新标签页 + 小节精读) |
| 2026-08-16 | P3-2 完成:typogrammar 素材导入(句式 63 / band 词汇 1484 / 错误 110,三库达标) |
| 2026-08-16 | P3-3 完成:NCE 课文精读整合(S1-S4 每单元 1-2 课入口 + 版权标注) |
| 2026-08-16 | P3-4 完成:内容质量加固(264 条词池复核清单 + 水印 72 处清零 + S4/练习抽样) |
| 2026-08-16 | P4-1 完成:发布与性能(React.lazy 分包,首屏 96KB<350KB;docs/PUBLISH.md) |
| 2026-08-16 | P4-2 完成:数据管理增强(跨标签页同步 + 旧备份自动迁移提示);**ROADMAP 全部待开发项完成** |
| 2026-08-16 | 语法树中文手册增强:CEFR 53 小节 + Murphy 52 章节全量中文讲解(grammar-cn.json),规则级中文注释,可作查阅手册 |
| 2026-08-16 | **P5 系列立项**:趣味化与自然语音升级(开源版)——8 项待开发 + 8 个参考仓库取舍 + 开源上架决策,详见第 2 节 P5 |
| 2026-08-16 | **P5-1 完成**:自然朗读引擎(浏览器 Piper vits-web 默认 + 本地 Piper 服务 + Web Speech 兜底三档降级;声音下载 HF→hf-mirror 回退;全文逐句朗读高亮;设置页声音管理;旧 voiceURI 自动迁移) |
| 2026-08-16 | **P5-4 M1 音频部分完成**:听力练习/考试双模式(整组盲听→逐题作答→统一揭字幕)+ `pregen_audio.py` 一键生成 48 单元本地 wav + 音频优先路由(本地 wav→浏览器 Piper→系统);词根部分按里程碑排 M2 |
| 2026-08-16 | **P5-2 完成**:词汇引擎 + SM-2 间隔复习(WordState 入 AppData,旧 wordbook 自动迁移;四档复习闪卡;单元自测/点词快标/真题错词/教练纠错五入口入池;Wordbook 升级词汇中心) |
| 2026-08-16 | 设置页优化:语音朗读「草稿 → 应用设置」;新增「已保存 AI 配置档案」(整组保存/使用/编辑/删除,自定义模型可保存复用,随备份迁移) |
| 2026-08-16 | **P5-3 完成**:趣味记单词中心 6 模式(连词成句/打字/配对/拼写/闪卡快跑/每日挑战,114 题连词成句题库,离线可玩,成绩回写词汇池) |
| 2026-08-16 | **P5-4 词根部分推进**:`import_affix.py` 生成 affix.json **429 条**(前缀 167/后缀 175/词根 87,全部命中词库词);`lib/affix.ts` + WordPopup 点词词根区块上线;libraryFlags 已读/收藏字段与迁移就绪;词根测验与「今日一篇」待续 |
| 2026-08-16 | **P5-4 收口**:词汇中心词根测验 + 资料库/首页「今日一篇」+ 已读/收藏筛选 + 点词词根展示 + validate 词根校验 + selftest_affix;P5-5 先行落地自由输入/语音输入 |
| 2026-08-16 | **P5-5/6/7 收口**:TED 去掉多余翻译讲解;AI 生成练习 /practice;教练记忆;跟读评测;XP/连击/成就墙;/placement 分级测评;单元预取;ai_generate_lessons/ocr 脚本;Coqui+Bark 预生成脚本就位(缺依赖跳过)。P5-8 上架暂缓 |
| 2026-08-17 | **语音入库**:Piper 全量预生成并嵌进 `public/content/audio/`——文章 600 + 听力 159 + 情景对话 476 + 单词 1570,0 失败;点词/词汇中心走单词 wav,目标对话走 dlg wav |
| 2026-08-17 | **P5-5/6/7 文档收口**:`/practice` 生成练习、教练记忆、跟读、XP/成就/分级测评、单元预取、TED 去掉多余翻译讲解,全部已落地并过门禁 |
| 2026-08-17 | **Coqui 覆盖开跑**:`pregen_all_tts.py` 用 Tacotron2-DDC 覆盖旧 Piper,并补资料库/真题/语法/写作英文段(约 14354 段);前端 `passageWavUrl` 已接入 Library/Zhenti/Grammar/Writing;AI 对话仍实时合成 |
| 2026-08-17 | **P6 立项**:自适应学习计划——练习档跟当天解锁阶段走(入门不会第二天刷考研);一天按小节预算打包可跨单元;专文 `docs/PLAN_ADAPTIVE.md` |
| 2026-08-17 | **P6-1/2/3 完成**:排程核重写(阶段窗口 + 每日小节预算 + 同档 filler);`generatePlan` 传 intensity/abilityStage;`/plan` 强度选择 + v1 老计划升级提示;`/placement` 选天数/目标/强度带入;首页今日任务列多小节;`selftest_plan` 7 组断言;旧 v1 计划只读兼容;tsc/build 全绿 |
| 2026-08-17 | **P6-4 完成**:`adjustRemainingPlan` 按近况(7 日打卡完成率/exam 均分)在剩余纯泛读日插词汇减负复习;已过去任务与打卡不动;`/plan` 加按钮;`selftest_plan` 增 6 组断言;tsc/build 全绿 — **P6 系列完成** |
