# 英语语境学习系统 · Go 单文件可执行服务与轻量数据库架构升级计划书 (P7-Go)

> **文档性质**：架构设计与实施规范指南（已定稿，取代原 Node.js 伴随服务方案）  
> **制定时间**：2026-08-17  
> **核心定位**：构建 **“单二进制文件（`english-app.exe`）+ 单文件 SQLite（`.db`）+ 瘦身音频库（`audio_assets/`）”** 的终极绿色便携架构。在目标设备上实现 **100% 零运行环境依赖（免装 Node.js、免装 Python、免装数据库）**，双击即用。

---

## 1. 背景与核心目标

### 1.1 当前痛点分析
1. **音频资产体积庞大与构建拖累**：
   离线 TTS 生成的全量音频（单词发音、课文逐句、听力、真题长难句、语法例句等）累计数万个文件、体积达数 GB。若将大量 WAV 直接放在前端 `public/content/audio` 目录，会导致 Vite 打包构建极慢、NTFS 小文件 I/O 性能下降。
2. **浏览器 localStorage 存储上限（5MB～10MB）**：
   用户学习进度、错题集、SM-2 掌握度、AI 批改记录均存放在浏览器 `localStorage` 中，迫使系统对 AI 查词、段落笔记和教练记忆做强制截断与上限清理。
3. **跨设备迁移与多端同享不便**：
   传统方式下迁移需手动在设置页“导出/导入 JSON”，且无法在同局域网下的手机或 iPad 上协同背单词与听音频。

### 1.2 升级核心指标与目标
- **资产极致瘦身**：将海量 WAV 音频通过批处理脚本转码为 `Opus (48kbps Mono)` 或 `MP3 (64kbps)`，保持人声高保真的同时将体积**压缩 80%～85%**（如 5GB $\rightarrow$ 约 750MB）。
- **真正的零依赖绿色便携（Portable）**：服务端采用 **Go (Golang)** 编译为独立单个 `english-app.exe`（Windows）或二进制文件，体积仅约 15MB～20MB，**目标设备免装 Node.js / Python / VS 运行库，双击即用**。
- **前端内嵌（`//go:embed`）**：将打包后的 React SPA 静态产物直接内嵌进同一个可执行文件，无需单独启动前端静态服务器。
- **毫秒级查词引擎**：词典检索由前端按字母拉取 26 个 JSON 改为本地 SQLite FTS5 索引命中，单次查询耗时 `< 1ms`。
- **工业级流式音频支持（HTTP 206）**：Go 原生支持 RFC 7233（`HTTP 206 Partial Content`）分片流式读取，长难句/课文音频拖拽零卡顿。
- **多端局域网同享**：PC 端启动时自动扫描网卡并在控制台输出局域网 IP，同 WiFi 下的手机/iPad 浏览器输入地址即可同步背词与播放音频。
- **平滑双模降级（Dual-Mode）**：前端采用“Go 伴随服务优先，静态/离线兜底”策略，未启动后端服务时自动无缝降级为原有纯前端模式。

---

## 2. 总体系统拓扑与目录架构

```
+-------------------------------------------------------------------------------+
|                    Go 单文件自包含可执行系统架构拓扑图                          |
+-------------------------------------------------------------------------------+

  [ 多终端访问 ]
  +--------------------------------+       +--------------------------------+
  | PC 浏览器 (主屏学习)           |       | 局域网 手机 / iPad (移动背词)  |
  | http://127.0.0.1:8787          |       | http://192.168.1.x:8787        |
  +---------------+----------------+       +---------------+----------------+
                  |                                        |
                  +--------------------+-------------------+
                                       | (HTTP 1.1 / 206 Stream / REST API)
                                       v
  [ 核心单文件二进制：english-app.exe (约 18MB，纯 Go 编译，零环境依赖) ]
  +-----------------------------------------------------------------------------+
  |  1. //go:embed dist/*           -> 内嵌全部 React 前端单页应用 (SPA 自动兜底) |
  |  2. 原生 HTTP 206 流媒体服务    -> 支持海量 Opus/MP3 音频秒开与进度条拖拽    |
  |  3. 纯 Go SQLite (无 CGo 依赖)  -> 30万词库 FTS5 毫秒级查词、掌握度读写     |
  |  4. 内置高性能反向代理          -> OpenAI 兼容接口 / 本地 Piper TTS 转发     |
  |  5. 局域网 IP 嗅探 & 浏览器唤起 -> 自动识别本机 IP 并弹窗打开默认浏览器       |
  +------------------------------------+----------------------------------------+
                                       |
                   +-------------------+-------------------+
                   v                                       v
  [ 本地数据层 (SQLite 双库) ]               [ 本地多媒体资产 (瘦身压缩) ]
  +---------------------------+              +-----------------------------+
  | D:/英语单词资料/data/     |              | D:/英语单词资料/audio_assets|
  | - english_core.db (只读)  |              | - words/a..z/*.opus         |
  |   (词库/例句/真题/音频索引) |              | - units/*/*.opus            |
  | - user_learning.db (读写) |              | - extra/zhenti/*.opus       |
  |   (SM-2 状态/错题/AI批改) |              | (单声道 48kbps Opus，省 85%)|
  +---------------------------+              +-----------------------------+
```

### 2.1 交付与部署目录规范
```
📁 D:\英语单词资料\ (便携总目录，可直接拷贝迁移)
├── 🚀 english-app.exe          # [核心程序] Go 单文件独立可执行程序 (内嵌完整前端)
├── 📄 点击我一键打开.bat        # [快捷方式] Windows 一键启动脚本 (唤起 .exe)
├── 📁 data\                    # [数据层] 单文件 SQLite 数据库 (直接拷贝即备份)
│   ├── english_core.db         # 系统只读数据库（词库、释义、例句、真题、音频注册表）
│   └── user_learning.db        # 用户个人数据库（SM-2 掌握度、错题集、学习笔记）
├── 📁 audio_assets\            # [音频层] 转码后的高质量音频（按首字母与模块分片）
│   ├── words\ {a..z}\ *.opus   # 单词发音
│   ├── units\ {s1u1..s5u6}\    # 课文逐句、听力逐轮、对话节点音频
│   └── extra\                  # 扩展阅读、真题长难句、语法例句音频
└── 📁 english-learning-site\   # [开发工程源码]
    ├── server\                 # Go 后端源码 (main.go, dict, audio, user, proxy)
    ├── scripts\                # 构建与转码工具链 (convert_audio.py, init_database.py)
    └── src\                    # React / TypeScript 前端源码
```

---

## 3. 数据契约与双库隔离设计

采用**双库物理隔离**：`english_core.db`（系统内容，只读）与 `user_learning.db`（个人学习记录，读写），保障词库更新不影响学习历史。使用纯 Go 版 SQLite 驱动（如 `modernc.org/sqlite`），无 CGo 依赖。

### 3.1 `english_core.db`（核心资源库）
```sql
-- 1. 全量词条与释义表
CREATE TABLE IF NOT EXISTS dict_entries (
    word TEXT PRIMARY KEY,
    phonetic_us TEXT,
    phonetic_uk TEXT,
    pos_json TEXT,           -- 词性与释义 JSON: [{"pos":"n.","tr":"..."}]
    phrases_json TEXT,       -- 短语搭配 JSON
    synonyms_json TEXT,      -- 近义词 JSON
    cognates_json TEXT,      -- 同根词 JSON
    level INTEGER DEFAULT 0, -- 0:初中 1:高中 2:四级 3:六级 4:考研 5:雅思
    freq_order INTEGER,      -- 考频排序
    affix_tags TEXT          -- 词根词缀标签
);

-- 2. 全文检索虚拟表 (FTS5，毫秒级前缀联想与释义反查)
CREATE VIRTUAL TABLE IF NOT EXISTS dict_fts USING fts5(
    word,
    tr,
    content='dict_entries',
    content_rowid='rowid'
);

-- 3. 全局音频资源注册表 (替代原有的庞大 JSON 清单)
CREATE TABLE IF NOT EXISTS audio_manifest (
    audio_key TEXT PRIMARY KEY,   -- 格式: 'word:apple', 'unit:s1u1:article:0', 'zhenti:cet6:114:1'
    audio_type TEXT NOT NULL,     -- 'word' | 'article' | 'listen' | 'dialogue' | 'extra'
    file_path TEXT NOT NULL,      -- 相对 audio_assets/ 的相对路径 (如 'words/a/apple.opus')
    duration_ms INTEGER,          -- 音频时长 (毫秒)
    format TEXT DEFAULT 'opus',   -- 'opus' | 'mp3' | 'wav'
    file_size INTEGER             -- 文件大小 (字节)
);
CREATE INDEX IF NOT EXISTS idx_audio_type ON audio_manifest(audio_type);
```

### 3.2 `user_learning.db`（用户动态库）
```sql
-- 1. SM-2 记忆算法掌握度状态表
CREATE TABLE IF NOT EXISTS user_word_states (
    word TEXT PRIMARY KEY,
    reps INTEGER DEFAULT 0,
    interval_days REAL DEFAULT 0,
    ef REAL DEFAULT 2.5,
    next_review_at INTEGER NOT NULL,
    status TEXT DEFAULT 'learning',   -- 'learning' | 'reviewing' | 'mastered'
    box INTEGER DEFAULT 1,
    wrong_count INTEGER DEFAULT 0,
    sources_json TEXT,                -- 来源数组 ['wordbook', 'exam-wrong']
    added_at INTEGER,
    last_review_at INTEGER
);

-- 2. 单元与真题学习进度
CREATE TABLE IF NOT EXISTS user_progress (
    module_id TEXT PRIMARY KEY,       -- 如 's1u1', 'cet6-001'
    progress_json TEXT NOT NULL,      -- 各小节完成状态、得分明细
    updated_at INTEGER
);

-- 3. AI 批改、教练记忆与长难句笔记 (彻底突破 localStorage 限制)
CREATE TABLE IF NOT EXISTS user_notes_and_ai (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,           -- 'writing_fb' | 'passage_note' | 'coach_memory'
    target_key TEXT,                  -- 关联文章/题目 ID
    content_json TEXT NOT NULL,
    created_at INTEGER
);
```

---

## 4. Go 伴随服务接口规范与特性

Go 服务默认监听 `8787` 端口，提供以下接口与能力：

### 4.1 静态资源与前端 SPA 挂载
- `GET /*`：
  挂载 `//go:embed dist/*`。请求首先寻找静态文件（JS/CSS/图片），未命中且非 `/api/` 路径时自动返回 `index.html`，天然支持前端 HTML5 History 路由。

### 4.2 音频流媒体接口
- `GET /api/audio/stream?key={audioKey}`：
  通过 `audio_manifest` 查找文件相对路径，使用 Go 标准库 `http.ServeContent` 输出音频流，**原生支持 `Range: bytes=start-end` 断点续传与进度条拖拽**。
- `GET /api/audio/check?keys=word:apple,word:banana`：
  批量检查音频是否存在于本地硬盘，返回命中清单供前端高亮原声音频。

### 4.3 高性能查词与联想接口
- `GET /api/dict/lookup?word={word}`：
  毫秒级（`< 1ms`）返回单词原形、派生词、释义、音标、词频及对应音频路径。
- `GET /api/dict/suggest?q={prefix}&limit=10`：
  基于 FTS5 实现前缀实时联想补全。

### 4.4 数据持久化与多端同步接口
- `GET /api/user/sync`：
  拉取用户全量/增量学习数据（供手机端打开时同步）。
- `POST /api/user/sync`：
  前端提交最新打卡记录、错词本与掌握度，持久化写入 `user_learning.db`。

### 4.5 AI 代理与 TTS 转发
- `POST /__ai_proxy`：
  透传请求到云端大模型供应商（DeepSeek / OpenAI / Kimi 等），解决浏览器 CORS 跨域问题。
- `POST /piper`：
  转发本地 Piper TTS 语音合成请求。

---

## 5. 开发态与便携运行模式

```
                    ┌────────────────────────────────────────────────────────┐
                    │                      双运行模式设计                    │
                    └────────────────────────────────────────────────────────┘

  【开发模式 (UI 调试与热重载)】
    * 终端 1: go run server/main.go  (启动 Go API 服务，监听 :8787)
    * 终端 2: npm run dev            (Vite 前端热更新，监听 :5273，API 代理至 :8787)

  【发布/便携模式 (新设备单文件直接运行)】
    * 运行一键构建脚本: 
        1) cd english-learning-site && npm run build
        2) cd server && go build -ldflags "-s -w" -o ../../english-app.exe .
    * 最终交付物目录结构 (插上 U 盘即可带走):
      📁 D:\英语单词资料\
      ├── 🚀 english-app.exe      <-- (单文件可执行程序，内嵌全部前端，双击即启动)
      ├── 📁 data\                <-- (english_core.db + user_learning.db)
      └── 📁 audio_assets\        <-- (瘦身后的数万条音频文件)
```

---

## 6. 前端双模适配与平滑降级（Dual-Mode Adapter）

前端保持独立健壮性，具备智能感知能力：

1. **查词层 (`src/lib/dict.ts`)**：
   - 优先通过 `fetch('http://127.0.0.1:8787/api/dict/lookup?word=...')` 查词。
   - 若 Go 服务未启动，**自动回退至现有的 `content/dict/{a..z}.json` 懒加载机制**。
2. **音频层 (`src/lib/audio.ts` & `src/lib/speech.ts`)**：
   - 优先请求 `/api/audio/stream` 本地转码流。
   - 若本地无对应音频，自动按需路由至浏览器 Piper WASM / 系统 Web Speech 进行实时发音。
3. **存储层 (`src/lib/storage.ts`)**：
   - 保持现有的 `localStorage` 快速响应机制作为一级内存/本地缓存。
   - 在后台通过防抖（Debounce）异步向 `/api/user/sync` 投递写入 SQLite，实现双保险。

---

## 7. 分阶段实施里程碑（Roadmap）

| 阶段 | 任务模块 | 关键交付物与验收标准 | 状态 |
| :--- | :--- | :--- | :--- |
| **P7-Go-1 资产瘦身与核心库构建** | 音频批量转码 + SQLite 核心库建表 | 1. `scripts/convert_audio.py` 默认跳过(源已是 MP3)。<br>2. `scripts/init_database.py` 写入 `data/english_core.db`。<br>3. 验收：灌库 `< 5s`，查词 SQL `< 1ms`。本轮不转 Opus。 | ✅ 2026-08-18 |
| **P7-Go-2 Go 独立单文件服务开发** | `server/main.go` 及各 API 模块 | 1. `modernc.org/sqlite` 纯 Go。<br>2. `/api/dict/*`、`/api/audio/*`(HTTP 206)、`/api/user/*`。<br>3. `//go:embed` + 局域网 IP。<br>4. 验收：单个 `english-app.exe`(约 33MB,含 SPA)。 | ✅ 2026-08-18 |
| **P7-Go-3 前端双模适配与降级** | `dict.ts` / `audio.ts` / `storage.ts` 适配 | 1. Go 优先 + 离线降级。<br>2. 验收：`npm run build` 零错误。 | ✅ 2026-08-18 |
| **P7-Go-4 一键构建与多端移植验证** | 一键打包脚本与跨设备测试 | 1. `build_app.bat`。<br>2. `点击我一键打开.bat` 优先 exe。 | ✅ 2026-08-18 |

---

## 8. 风险与防御策略

1. **零 CGo 编译保障**：
   - 使用 `modernc.org/sqlite`，在 Windows/macOS/Linux 任何机器上 `go build` 均无需安装 C++ 编译环境。
2. **多端并发写入数据冲突**：
   - 采用“时间戳最后写入优先（LWW）+ 集合合并（Set Union）”策略，错题与生词只增不减，确保多端同步无损。
3. **音频文件意外缺失**：
   - 前端检测到本地流 404 时，自动无缝切换到浏览器端 Piper WASM 或系统 TTS 现场发音，用户端零感知。
