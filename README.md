# 英语语境学习网站

从零基础到考研英语的分级语境学习站:受控用词的文章精读 + 目标式情景对话 + 听力挑战 + 精简语法课,五阶段渐进(S1 入门 → S2 四级 → S3 六级 → S4 考研 → S5 雅思)。

> 🚀 便携模式:`build_app.bat` 产出上级目录的 `english-app.exe`,免装 Node,双击即用。

## 快速开始

开发(热更新):

```bash
npm install --registry=https://registry.npmmirror.com
npm run dev
```

浏览器打开 **http://127.0.0.1:5273**(端口已固定 5273 + IPv4)。可选另开 `cd server && go run .` 启用 SQLite 查词/音频流/进度同步(Vite 已把 `/api` `/health` 代理到 :8787)。

便携单文件(需 Node + Go):

```bat
build_app.bat
```

得到上级目录的 `english-app.exe` + `data\*.db`,双击运行后访问 **http://127.0.0.1:8787**。音频仍读 `public/content/audio`(或同级 `audio_assets\`),不打进 exe。

> 🔊 **语音朗读(默认引擎)**:浏览器内 Piper 自然音,首次点击朗读会自动下载声音模型(约 60-70MB,HF 官方源失败自动切 hf-mirror 镜像)缓存到浏览器,之后**断网可用**;也可在「设置 → 语音朗读」提前下载/删除三个声音模型,或切换到本地 Piper 服务/系统语音(三档自动降级)。

## 构建与发布

```bash
npm run build      # tsc + vite build → dist/(首屏约 96KB 压缩后,页面级分包)
npm run preview    # 本地预览 dist(http://localhost:4173,内置 SPA fallback)
```

静态托管需配置 SPA fallback(nginx:`try_files $uri $uri/ /index.html`)并建议开启 gzip。

## 功能

| 功能 | 说明 |
|------|------|
| 🏠 首页目录 | 五阶段 48 单元;仪表盘显示到期词 / 连击 / Lv / XP;今日任务打卡 + **今日一篇外刊**;入口含分级测评 / 成就墙 / AI 练习 |
| 📅 学习计划 | 自选天数(7-365)、从什么程度学到什么程度(S1-S5)与开始日期,自动生成日程:单元精读 + NCE/CET6 泛读 + 考研真题 + 每周复盘;逐日打卡,默认 100 天覆盖全部 48 单元 |
| ✍️ S5 写作 | 雅思/托福句式仿写卡(63 个高分句式:观点/讨论/报告/图表/倒装)+ Band 7-9 替换词 1484 个(可搜索)+ 常见错误 110 条;**AI 批改**:语法/用词/连贯三项反馈 + 雅思估分 + 打磨版,结果本机缓存,离线可看全部素材 |
| 📖 文章精读 | 点词查义(音标/英英/中文/例句/朗读/收藏/**🧬 词根**)+ 逐句语法讲解与句内练习;全文逐句朗读优先本地 wav,每句 🔊 + **🎙 跟读打分**;词级高亮;S1-S4 文末 NCE 扩展阅读 |
| 🎯 目标对话 | 带着目标与 NPC 对话,不同选择走向不同结局;NPC 台词优先本地预生成 wav |
| 🎧 听力挑战 | 练习/考试双模式;音频优先本地 wav,揭晓后可跟读;缺失回退在线引擎 |
| 📚 语法课 | 40+ 语法点(顺序参考《英语在用》精简版):讲解+例句+常见错误+5 题练习,标注 CEFR 与 NCE/语法书参考 |
| 📝 单元真题 | 每单元结尾⑥真题演练:按语法点匹配真题小题,判分+解析+**考点回溯语法课**(48 单元全部就绪;S4 含真实考研真题) |
| 📚 扩展资料库 | NCE 190 课 + CET-6 114 篇(每篇 3 题)+ 外刊 199 篇 + TED 35 篇;外刊**今日一篇**/已读/收藏;TED 已含中英对照,**不再显示段落翻译讲解**;朗读优先本地 wav |
| 🧭 语法树 | CEFR A1-C2 语法规则树 + Murphy 三册索引 + 12 时态速查卡(公式/标志词/例句/常见错误);**全中文手册**:CEFR 53 个小节、Murphy 52 个章节均有中文讲解与单元对照,规则级中文注释;**三向互链**:单元语法课 ↔ 语法树章节 ↔ 单元真题组(深链定位 + 真题组题数) |
| 📝 真题专区 | 考研英语一 2005-2020 阅读 64 篇 + 完形 16 篇:左侧点词/拆句,右侧做题判分看解析;完形点空位跳题;AI 讲题;点词显示"真题高频"排名 |
| 🗂 我的文章 | 查看/删除 AI 解析保存的文章 |
| 🤖 AI 对话 | 选项 / 自由输入双模式 + 🎤 语音输入;教练模式闭环;台词实时合成(**不走预生成**) |
| 🧪 AI 练习 | `/practice` 按 CEFR 生成听力/阅读练习,结果按级别缓存,无 Key 隐藏 |
| 🎯 分级测评 | `/placement` 20 题 → 建议起点 S1-S5,可一键带入 100 天计划 |
| 🏆 成就 | XP / 连击 / 成就墙(`/achievements`);单元、复习、游戏、今日一篇、跟读均加分 |
| 🔍 AI 解析 | 粘贴任意英文,AI 逐句拆解(主干/从句/翻译/语法点),可保存"我的文章";解析样本自动记入教练画像 |
| 📒 词汇中心 | 新词统一入池(单元自测/点词收藏/快标掌握/真题错词/教练纠错),**SM-2 遗忘曲线复习**:今日到期闪卡(空格揭义、1-4 四档评分、Again 当日回队尾),学习中/复习中/已掌握分类 + 来源筛选 + 掌握度统计 + **🧬 词根词缀测验**(8 题四选一),Anki 导出保留 |
| 🔍 词典 | 顶栏搜索 + /dict 页;多义词按词性分条(中英释义/例句/词组/近义/同根/助记);点词弹层同步分义 |
| 🎮 词汇游戏 | **6 种离线模式**:🧩 连词成句(114 题,来自 48 单元对话/听力台词)、⌨️ 打字操练、🔗 词义配对、✍️ 拼写挑战、⚡ 60 秒闪卡快跑、📅 每日挑战(按日期固定题目);键盘全程可操作、移动端点选可用;对词记 good、错词进今日错词重排队,答错可「🤖 AI 讲讲」(无 Key 自动隐藏) |
| ⚙️ 设置 | 任意 OpenAI 兼容 API 配置(DeepSeek/智谱/Kimi/通义/OpenAI/自定义)+ 测试连接 + **已保存 AI 配置档案**(整组保存服务商/Key/模型/代理,一键使用、可编辑、可删除,手动输入的模型也可保存复用)+ **三档语音朗读引擎**(浏览器 Piper 自然音 / 本地 Piper 服务 / 系统语音;选好后点「✅ 应用设置」生效并保存,试听按草稿预览;音色下载删除、本地服务测试、AI 台词自动朗读)+ 进度导入导出(旧备份自动迁移补全、多标签页实时同步) |

## 内容体系

- **词库**:`public/content/wordbank/` 9251 词,全局 `order` 升序=由易到难,6 级(初中/高中/四级/六级/考研/雅思)
- **词典**:`public/content/dict/` 8678 词,含音标/多义项(中英释义)/例句/词组/近义/同根/助记
- **课程**:`public/content/curriculum/{unitId}/` 每单元 5 个文件(grammar/article/dialogue/listen.json + exam.json 真题组)
- **语法地图**:`public/content/grammar-map.json`(48 语法节点,由 `scripts/build_grammar_map.py` 生成)
- **语法参考库**:`public/content/grammar-reference.json`(CEFR A1-C2 共 143 规则 + Murphy 360 单元,源自 English-grammar-tree)
- **AI 教练大纲**:`public/content/cefr-profile.json`(A0-C2 能力描述/进出标准/模块微目标,由 `scripts/build_cefr_profile.py` 生成)
- **S5 写作库**:`public/content/writing/s5/`(patterns/band-words/errors.json,由 `scripts/build_writing_s5.py` + `scripts/import_typo.py` 生成)
- **扩展精读库**:`public/content/intensive/`(NCE 笔记 190 课 + 外刊 199 篇 + TED 主题笔记 35 篇);**CET-6 真题语篇**:`public/content/zhenti/cet6/` 114 篇(每篇 3 道理解题,由 `scripts/gen_cet6_questions.py` 生成)
- **预生成音频**:`public/content/audio/`(课程 wav + `words/` + `extra/{mag,cet6,ted,zhenti,grammar,writing}/` + `index.json`;音频文件不入库,可由脚本重新生成)

## 重新生成词库

```bash
python scripts/build_wordbank.py   # 生成 wordbank + curriculum/index.json(48 单元定义)
python scripts/build_dict.py       # 生成查词词典
python scripts/build_grammar_map.py # 生成语法知识地图
python scripts/import_grammar_tree.mjs  # 生成 grammar-reference.json
python scripts/enrich_units.py     # 为 48 单元批量补充句内标签/练习/速览/真题组
python scripts/validate_content.py # 内容校验(质量门禁,自动识别屈折形式的原形)
node scripts/audit_content.js      # 深度内容审计(词池一致性/新词复现/真题完整性)
node scripts/selftest_plan.mjs     # 学习计划排程自测(纯 Node,零依赖)
node scripts/ai-proxy-server.mjs   # 生产环境独立 AI 代理(零依赖,见「AI 跨域代理」)
python scripts/build_cefr_profile.py # 生成 AI 教练 CEFR 大纲 cefr-profile.json
python scripts/build_writing_s5.py  # 生成 S5 写作练习库(句式库/band 词汇/常见错误)
python scripts/gen_cet6_questions.py # 为 114 篇 CET-6 语篇生成理解题
python scripts/build_nce_links.py   # 生成单元 ↔ NCE 笔记课关联(S1-S4 每单元 1-2 课)
python scripts/import_affix.py       # 生成词根词缀库 affix.json(429 条,全部命中词库词)
python scripts/build_grammar_cn.py  # 生成语法树中文讲解手册 grammar-cn.json(CEFR/Murphy 全小节)
node scripts/selftest_storage.mjs   # 数据迁移与跨标签页同步自测(零依赖)
node scripts/selftest_vocab.mjs     # SM-2 词汇引擎自测(零依赖)
node scripts/selftest_game.mjs      # 词汇游戏纯函数自测(零依赖)
node scripts/selftest_affix.mjs     # 词根测验/今日一篇纯函数自测(零依赖)
node scripts/selftest_stats.mjs     # 跟读打分 + XP/连击自测(零依赖)
python scripts/build_vocab_games.py # 生成连词成句游戏题库(114 题,离线可玩)
python scripts/pregen_audio.py      # Piper:课程听力/文章/对话/单词(需本机 piper 服务)
python scripts/pregen_all_tts.py    # Coqui Tacotron2-DDC:覆盖课程音并补资料库/真题/语法/写作
```

## 本地预生成音频

静态内容(课程/资料库/真题/语法/写作/单词)优先播 `public/content/audio/` 本地 wav;缺文件回退浏览器 Piper / 系统语音。**AI 对话实时合成,不预生成。**

Piper 补生成课程音(需本机服务):

```bash
# 1) 启动本地 Piper(模型首次自动下载;国内网络可先设置 HF_ENDPOINT=https://hf-mirror.com)
python -m piper.http_server --model en_US-lessac-medium.onnx
# 2) 另开终端,一键生成(全量约 759 段,可 --units s1u1,s1u2 分批、--kinds listen 只生成听力)
python scripts/pregen_audio.py
```

前端按 `index.json` 清单优先播放本地 wav、缺失自动回退在线引擎;`validate_content.py` 会自动校验清单与文件一致性。

重新生成(覆盖旧音,约数小时):

```bash
python scripts/pregen_all_tts.py          # 课程+单词+外刊+CET6+TED英文+真题+语法例句+写作句式
python scripts/pregen_all_tts.py --no-force  # 只补缺失
```

## AI 配置

设置页填写服务商/BaseURL/API Key/模型名(存本机 localStorage)。支持 OpenAI 兼容 `/chat/completions` 与 Codex `/responses` 两种接口格式,输出强制 JSON+自动重试。不配置也不影响全部离线功能。

🎓 **AI 教练**:AI 对话开启「教练模式」后,对话结束自动完成「纠错分析 → CEFR 级别评估(A0-C2)→ 2 道针对性操练」,画像(级别/薄弱点/错误记录)存本机并可随备份导出;AI 解析的文本也会自动记入画像。

### AI 跨域代理(两种模式)

浏览器直连部分 AI 供应商会被 CORS 拦截(Failed to fetch):

| 模式 | 用法 | 说明 |
|------|------|------|
| 开发模式 | `npm run dev` | Vite 内置 `/__ai_proxy` 中间件,自动生效,无需配置 |
| 生产模式 | `npm run proxy`(即 `node scripts/ai-proxy-server.mjs`) | 独立零依赖代理,默认 `http://127.0.0.1:8787`;在设置页「独立 AI 代理地址」填入该地址即可 |

```bash
# 生产部署(vite preview / 静态托管)示例
npm run proxy -- --port 8787     # 终端 1:启动独立代理(可另开端口)
npm run preview                  # 终端 2:预览构建产物
# 浏览器打开页面 → 设置 → 独立 AI 代理地址填 http://127.0.0.1:8787
```

代理仅转发到 https 目标,原样透传上游状态码/响应体(请求体上限 20MB);默认只监听 127.0.0.1,请勿改绑公网地址。

## 真题数据说明

- 考研英语一 2005-2020 阅读 64 篇 + 完形 16 篇,640 题已全部含答案与中文解析
- 校验命令:`python scripts/validate_content.py --zhenti`(期望 0 错误 0 警告)

## 版权提示

内置真题/词库数据仅限个人学习使用,请勿公开发布或二次传播。
