# 平台内容升级方案 v2 —— 融合 10 个外部仓库

> 本文件是融合方案的**详细附录**;总进度与后续开发清单以 **[docs/ROADMAP.md](./ROADMAP.md)** 为准。
>
> 状态:P0 + P1 + P2(语法树/资料库)已完成;剩余项见 ROADMAP 第 2 节。

---

## 1. 十个仓库盘点与用途

| # | 仓库 | 核心资产 | 融入方式 |
|---|------|---------|---------|
| 1 | protogenesis/New-Concept-English (702★) | NCE1–4 中文语法笔记 Markdown(NCE1 47 课 / NCE2 93 课 / NCE3 / NCE4) | **精读课主力素材**:NCE 每课天然就是"课文 + 语法点(Main knowledge)",正是"语法融入文章"的现成模型;映射到 S1–S4 各单元 |
| 2 | jinzhenglin/NewConceptEnglish | NCE3 完整逐课笔记 docx ×60、NCE2 迷你笔记 txt、自学导读 PDF | 补充 #1 缺少的逐课详解,`python-docx` 解析后合并进 NCE 精读库 |
| 3 | Nikola-Ver/English-grammar-tree (7★) | 149 条 CEFR A1–B2+ 语法规则(结构化 TS)、Murphy 115 单元、时态树/时间线/对比 | **语法知识图谱 + 时态时间线组件**;规则补齐现有 40+ 语法点的例句/错误/CEFR 级别 |
| 4 | guilherme-reis/English-Grammar-Mental-Map-In-Markdown | 完整语法思维导图 Markdown + Markmap 交互页 | **语法地图页**(可视化全景,节点链接到单元语法课与文章例句) |
| 5 | chihyungchang/95PercentEnglishGrammar | 20 页中文语法书(JSX,覆盖 95% 语法) | 抽取为 20 篇"语法专题精讲",作为语法课的延伸阅读与总复习 |
| 6 | shizhengLi/Learning-English-With-TED (44★) | 1285 篇中文标注笔记:篮球 22 课、The Worlds I See、美国大亨、经济学人、YouTube | **主题泛读/听力扩展库**;格式(原文 → 创世词汇表 → Deep Dive → Listen&Learn)直接套用为交互精读模板 |
| 7 | wangqiyue26-lab/english-reading | 199 篇文章(经济学人 77/纽约客 55/大西洋 29/连线 38)+ **CET-6 真题语篇 114 篇(2024.06–2025.12)**;雅思/托福/GRE 词汇高亮阅读器 | **真题专区扩容** + 分级词高亮功能;四级/六级真题作为 S3/S4 单元结尾真题 |
| 8 | Elomami1976/typogrammar (9★) | IELTS/TOEFL 学术英语:分带词汇、语法准确性、写作清晰度、PDF 电子书、每日泛读音频 | S5 雅思阶段:band 词汇表、高分句式库、常见错误库、写作练习 |
| 9 | murasamadsp/llm-english-tutor | AI 教练完整设计:CEFR A0–C2 教学大纲(block/micro_goals/进出标准)、严格教师算法、错误分析、操练生成、学生画像 | **AI 对话/AI 解析升级为 AI 教练**:诊断 → 讲解 → 纠错 → 专项操练 → 能力画像 |
| 10 | subham-cse/Learn-English-In-100-days | 百日学习路径概念(现有 5 天内容) | 借鉴其"每日一课+测验"节奏,做**百日冲刺计划生成器**(把 48 单元重排为 100 天日程) |

---

## 2. 新单元课程模型(每节课 6 步)

现有:① 词汇预习 → ② 语法课 → ③ 文章精读 → ④ 目标对话 → ⑤ 听力挑战
升级后:**① 词汇 → ② 语法 → ③ 语法精读(核心改造)→ ④ 对话 → ⑤ 听力 → ⑥ 真题演练**

### 步骤 ③ 语法精读:从"读文章"变成"可展开的语法课"

一篇文章 = 原文 + 三层可展开内容,语法讲解全部挂在句子上:

1. **原文层**:英文原文(可逐词朗读高亮),点击单词查义;
2. **句子讲解层**:点击句子展开——
   - 成分拆解(现有 chunks 着色)与翻译(现有);
   - **句内语法标签**:每个语法点以标签形式出现在对应短语上(如让步状语从句、现在完成时),点击跳转到本单元语法课对应小节;
   - **原文回指**:语法点旁边给"本课例句"与"95% 语法书/NCE 笔记同类例句";
3. **句内小练习层**(新增交互):
   - 填空(挖掉目标语法词)、判断正误、仿写(给结构提示)、翻译回译;
   - 做完即判分,成绩计入单元进度;
4. **文章结尾**:本课语法速览卡片(本课讲了哪 3 个语法点 + 各 1 个原文例句)+"进入真题演练 →"按钮。

### 步骤 ⑥ 真题演练(每节结尾)

- 每单元配置 1 组"相关真题":按**语法点 + 词池 + 难度**匹配,不追求整卷;
- 题型来源:
  - S1/S2:语法单选/完形小题(自研 + NCE 课后练习改造);
  - S3:四级/六级真题对应题型(english-reading 的 CET 语篇 + 自建题);
  - S4:现有考研真题库(2005–2020,640 题)按考点标签自动匹配到单元;
  - S5:雅思/托福写作与阅读题型(typogrammar 素材);
- 展示:真题原文 + 题目 + 判分 + 解析 + "考点回溯"(答错 → 跳回本单元语法/精读对应句子);
- 进度:`UnitProgress` 增加 `exam` 字段。

---

## 3. 数据结构扩展(增量,不破坏现有 48 单元)

```
public/content/
├── curriculum/{unitId}/
│   ├── grammar.json     # 扩展:grammarId、cefr、相关真题题号、NCE/语法书引用
│   ├── article.json     # 扩展:sentences[].grammarTags[](指向 grammarId 与短语区间)
│   │                    #      sentences[].exercises[](填空/判断/仿写/回译,答案+解析)
│   │                    #      lessonGrammar[](本课语法速览)、source(NCE1-L25/TED…)
│   ├── dialogue.json    # 不变(可加 grammarTags)
│   ├── listen.json      # 不变
│   └── exam.json        # 新增:本单元真题组 {questions[], source, 考点映射}
├── grammar-map.json     # 新增:语法知识图谱(节点/层级/对应单元/CEFR)← #3 #4
├── cefr-profile.json    # 新增:AI 教练 CEFR 教学大纲(block/micro_goals/进出标准)← #9
├── intensive/           # 新增:扩展精读库(主题泛读)
│   ├── nce/{nce1,nc2,nc3,nc4}/lesson-XX.json     # ← #1 #2
│   ├── ted/{basketball,books,magazines}/xx.json  # ← #6
│   └── index.json
├── zhenti/              # 扩容:CET-4/CET-6 真题语篇 2024–2025 ← #7
└── writing/s5/          # 新增:S5 高分句式库/band 词汇/常见错误 ← #8
```

`src/lib/types.ts` 增量(向后兼容,旧文件照常加载):
- `ArticleSentence.exercises?: SentenceExercise[]`
- `ArticleSentence.grammarTags?: {grammarId: string; phrase: string}[]`
- `Article.exam?: string[]`(关联 exam.json 题号)
- `GrammarLesson.grammarId/cefr/refs`
- `UnitProgress.exam?: {done: boolean; score: number; total: number}`
- `ExamSet` / `IntensiveArticle` / `GrammarMapNode` / `CefrBlock` 等新类型

---

## 4. 内容映射:48 单元 ↔ 外部资料 ↔ 真题

| 阶段 | 语法课补充 | 精读文章补充 | 结尾真题 |
|------|-----------|-------------|---------|
| S1 入门 | 95% 语法书 1–8 页;NCE1 语法点;语法地图基础区 | NCE1 奇数课课文(受控改写)+ 现有文章 | 自研语法小题 + NCE 课后练习 |
| S2 四级 | 95% 语法书 9–14 页;NCE2 L1–48;Murphy EL | NCE2 课文(每单元 1–2 篇)+ 现有文章 | 四级真题小题 + NCE2 练习 |
| S3 六级 | 语法树 B1 规则;NCE2 L49–96 + NCE3 | NCE3 课文 + TED/经济学人浅层笔记 | 六级真题语篇(english-reading 114 篇按难度分配) |
| S4 考研 | 语法树 B2;NCE4;95% 语法书 15–20 页 | NCE4 长难句 + 考研真题原文回读 | **现有考研真题 640 题按考点标签匹配单元** |
| S5 雅思 | typogrammar 高分句式/band 词汇;语法地图高级区 | 学术写作范文 + 图表描述素材 | 雅思写作/阅读题型(自研判分 + AI 批改) |

原则:
1. **语法是主线**:每单元 grammar.json 的 `grammarId` 在语法地图、精读标签、真题考点中三处引用,形成"学习闭环";
2. **受控用词规则保留**:外部文章进入课程前必须经过 `wordRange` 校验与受控改写;
3. 外部文章一律标注 `source` 与许可,版权敏感内容(如 NCE 原文全文、杂志全文)仅作**本地个人学习**使用,不做公开分发,必要时用"笔记+转述"代替原文。

---

## 5. 内容生产流水线(新增 scripts/)

| 脚本 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `import_grammar_tree.py` | Nikola-Ver `grammar.ts`/`murphy/*.ts` | `grammar-map.json` + 补充 grammar.json | 解析 TS 字面量为 JSON;俄语讲解丢弃,保留规则/例句/错误;中文讲解由 AI 翻译 + 人工校对 |
| `import_mental_map.py` | Mental-Map.md | `grammar-map.json` 节点 | 大纲 → 图谱节点 |
| `import_95grammar.py` | 20 个 Page*.jsx | `content/grammar-topics/*.json` | 抽取中文讲解为专题精讲 |
| `import_nce.py` | protogenesis NCE1–4.md + jinzhenglin docx(NCE3) | `content/intensive/nce/*.json` | 按 Lesson 切分;语法点与 48 单元 grammarId 对齐;原文仅本地存储 |
| `import_ted.py` | shizhengLi 各主题 .md | `content/intensive/ted/*.json` | 解析"Opening Scene/创世词汇/Deep Dive/Listen&Learn"结构 |
| `import_cet.py` | english-reading `data.js` | `content/zhenti/cet4|6/*.json` | 提取 114 篇 CET-6 真题语篇 + 199 篇杂志文(难度分级词高亮数据) |
| `import_typo.py` | typogrammar PDF/素材 | `content/writing/s5/*.json` | 句式/band 词汇/常见错误(需 PDF 文本提取) |
| `ai_annotate.py` | 上述半成品 | 逐句拆解/句内练习/仿写题 | 离线批量调 AI(复用现有 OpenAI 兼容协议 + chatJSON),输出必须过 validate;人工抽检 |
| `build_exam_map.py` | 考研 640 题 + grammar.json | 每单元 exam.json | 考点→单元匹配规则(关键词 + 词池 + 难度) |
| 扩展 `validate_content.py` / `audit_content.js` | 全部新文件 | 0 错误门禁 | 校验语法标签引用、练习答案、真题考点映射、CEFR 一致性 |

---

## 6. 前端改造清单

1. **ArticleView 重构**(核心):
   - 句子展开区加"语法标签 → 跳转语法课"、"句内练习"折叠面板、`lessonGrammar` 速览卡;
   - 练习判分复用 GrammarQuiz 逻辑;进度写回 `UnitProgress.article`。
2. **GrammarTree 页面**(新):Markmap 风格语法地图 + Nikola 时态时间线/时态对比组件;节点链接到单元与真题。
3. **ExamBridge 组件**(新):每单元结尾真题卡片组,复用 ZhentiReader 判分/解析/AI 讲题,加"考点回溯"跳转。
4. **阅读器分级高亮**(借鉴 english-reading):雅思/托福/GRE 词标色开关 + 词频徽章。
5. **AI 教练**(改造 AiDialogue/AiParse):引入 llm-english-tutor 的 CEFR block 大纲与严格教师算法;诊断错误 → 生成专项操练 → 更新本地能力画像(复用 `aiWordCache` 结构存 profile)。
6. **百日计划页**(新):100 天日程生成器(48 单元 + 扩展泛读 + 真题按天数重排),日历视图 + 每日打卡。
7. **S5 写作练习**(新):句式仿写 + AI 批改(typogrammar 素材)。

---

## 7. 实施路线图

| 阶段 | 内容 | 预计工作量 |
|------|------|-----------|
| **P0 数据与契约(1 周)** | types.ts 扩展;grammar-map.json;语法标签协议;validate/audit 扩展;先做 s1u1 全量样板 | 契约冻结 |
| **P1 内容导入(2–3 周)** | import_grammar_tree / import_95grammar / import_mental_map → 语法课全面增厚;import_nce(S1–S4 精读);import_cet + build_exam_map → 每单元真题组 | 48 单元 × 4 文件全量升级 |
| **P2 前端交互(2–3 周)** | ArticleView 重构(语法标签/句内练习/速览卡);ExamBridge;GrammarTree + 时态时间线;分级词高亮;百日计划页 | 与 P1 可并行 |
| **P3 AI 与 S5(1–2 周)** | AI 教练算法接入;S5 写作/句式库;TED 泛读库 UI;全量 validate + audit + build 回归 | 收尾 |

里程碑验收:
- 每个单元:语法点 ≥3 且全部有原文例句回指;**每句可展开讲解与练习**;结尾真题组 ≥5 题且考点可回溯;
- `validate_content.py` 0 错误;`audit_content.js` 0 硬错误;`npm run build` 通过;
- 手动回归:s1u1(样板单元)完整走通 6 步。

---

## 8. 版权与合规底线

- 所有外部资料仅用于**本地个人学习**,不部署公网、不打包分发第三方原文;
- NCE 课文原文、杂志文章、真题全文:仅在本地内容库中引用,UI 标注来源;对外发布前需替换为笔记/转述;
- 生成式标注(AI 拆解/练习/讲解)必须人工抽检,防止幻觉误导;
- 保留现有 README 版权提示,新增"外部资源来源与许可"清单。

---

## 9. 建议的第一步(P0 样板)

先做 **s1u1 完整样板**,跑通全链路:
1. 扩展 types.ts 与 article.json(grammarTags + exercises + lessonGrammar);
2. 用 import_95grammar + import_mental_map 生成 s1u1 语法讲解;
3. 用 NCE1 Lesson 1–5 笔记补 s1u1 精读与句内练习;
4. build_exam_map 给 s1u1 配 1 组语法真题;
5. ArticleView 按新协议渲染 + ExamBridge 收尾。
样板验收后再批量铺开 48 单元。

---

## 10. P5 新参考仓库(8 个)——下一阶段升级的外部来源

> 完整计划(决策 / 升级·拓展·取代清单 / P5-1…P5-8 / 里程碑)见 **[docs/ROADMAP.md](./ROADMAP.md) 第 2 节「P5 系列」**,本文只登记仓库盘点。

| # | 仓库 | 许可 | 核心资产 | P5 用途 |
|---|------|------|---------|---------|
| 1 | rhasspy/piper | MIT(声音按 MODEL_CARD) | 本地神经网络 TTS;Windows wheel + HTTP 服务;浏览器端 `@diffusionstudio/vits-web`(npm MIT) | P5-1 三档朗读引擎(浏览器 Piper 默认 → 本地服务 → Web Speech);P5-4 预生成 48 单元音频 |
| 2 | cuixueshe/earthworm | AGPL-3.0 | 连词成句玩法、词块课程格式 `{chinese, english, soundmark}` | 代码与数据**不进仓库**;仅借鉴玩法思路,自研连词成句引擎(P5-3) |
| 3 | Hexdigest123/open-lingo | 无 LICENSE | 7 类题型引擎、心/XP/连击/成就、答错 AI 讲解、口语评测、Realtime 语音对话 | 参考实现并在上架时声明(P5-3 / P5-5 / P5-6) |
| 4 | Kilokiyiu/Listen-en-web-pub | MIT | 词根词缀库与测验、CET 听力逐题+同步字幕、每日外刊推送 | 词根数据直接导入;听力考试模式;今日一篇(P5-4) |
| 5 | V3D1/spaced-english | MIT | `sm2.ts`、打字听写、四档闪卡、连击日历、输入输出平衡、AI 造句教练 | SM-2 直移植 + 各模式实现(P5-2 / P5-3 / P5-6) |
| 6 | liyang-27/ai-vocab-agent | 无 LICENSE | 词根星状图、近义词语义雷达、SRS 错词循环、docx OCR 词库导入 | 参考实现并在上架时声明(错词循环 / 星图 / 近义词 / OCR 脚本) |
| 7 | TICKurt/english-dictionary-web | MIT | 键盘流闪卡(空格/1-4/Esc)、学习队列、自动连读、词形/近义数据 | 键盘交互与学习队列(P5-2);词典增强数据(P5-4) |
| 8 | artcc/freelingo | AGPL-3.0 | 分级测评 → 学习强度周计划、AI 生成听力/阅读练习(音频缓存)、LLM 持久记忆、XP/技能分 | 代码**不进仓库**;仅借鉴流程思路自研(P5-5 / P5-6) |

政策要点(2026-08-16 定稿):
1. MIT 仓库直接移植并保留署名;AGPL 代码与数据一律不进仓库(项目计划上架 GitHub 开源);无 LICENSE 仓库尽量借鉴实现,上架时在 `docs/THIRD_PARTY_NOTICES.md` 声明;
2. 第三方版权内容(真题/NCE/外刊/词库)保留在仓库并标注「仅限个人学习使用」,保证他人本地部署体验与本人一致;
3. 声音模型与预生成音频不入库,由 `scripts/setup_audio.bat` 一键获取与生成。
