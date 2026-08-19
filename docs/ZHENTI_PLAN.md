# 真题专区并行开发计划(2026-08-14 冻结)

> 目标:把 2005–2020 考研英语一真题(阅读+完形)接入网站,做成可做题、可拆解、可点词的学习模块。
> 所有工作组开工前必读本文档 + `src/lib/types.ts`(权威契约)。

## 一、接口契约(已写入 types.ts,禁止修改)

```ts
export type ZhentiSection = 'reading' | 'cloze'

export interface ZhentiQuestion {
  q: string          // 题干(完形为 "")
  options: string[]  // 恰好 4 个
  answer: number     // 0-3
  analysis: string   // 中文解析
}

export interface ZhentiArticle {
  id: string         // "z{year}-{section}-{n}" 如 "z2019-reading-1"、"z2019-cloze-0"
  year: number
  section: ZhentiSection
  index: number      // reading: 1..4; cloze: 0
  source: string     // "2019年全国硕士研究生招生考试英语(一)"
  title: string
  newWords: string[] // 真题生词 15-30 个
  sentences: ArticleSentence[]  // text/translation/chunks/grammar(见 types.ts 原文定义)
  questions: ZhentiQuestion[]
}

export interface ZhentiIndex {
  years: { year: number; items: { id: string; section: ZhentiSection; title: string }[] }[]
}

export interface FreqData { [word: string]: { rank: number; freq: number } }
```

**完形空位硬规则:** 完形文章文本中空位写 `___1___`、`___2___`…`___20___`(下划线+题号+下划线);`questions[i]` 的 4 个选项即第 i+1 空的 ABCD 选项。

**sentences 拆解规范(与 48 单元文章一致,参考 `public/content/curriculum/s1u1/article.json`):**
- `chunks` 必须完整覆盖整句所有单词、无重叠
- 颜色固定:主干 `#a8dab5` / 状语 `#8ab4f8` / 让步条件连词 `#f6c177` / 各类从句 `#c8a5e0` / 定语修饰 `#f4a8b8` / 插入语补语 `#9fd8e8`
- 主干带 `parts`(主语/谓语/宾语/表语)
- `grammar`:每句 0–3 个 `{name, note, example?, exampleCn?}`(中文讲解)

## 二、目录与文件

```
public/content/
├── zhenti/
│   ├── index.json              # ZhentiIndex(年份×题型清单)
│   └── {year}/                 # 2005..2020
│       ├── reading-{1..4}.json # ZhentiArticle
│       └── cloze.json          # ZhentiArticle(index=0)
└── freq.json                   # FreqData 考研词频

zhenti_raw/                     # 提取中间产物(不进 public)
├── {year}/cloze.txt / reading-{n}.txt / answers.txt

scripts/
├── extract_zhenti.py           # WG-Z1:提取管线
├── zhenti_to_json.py           # WG-Z2:raw → 结构化 JSON 初稿
└── build_freq.py               # WG-Z5:词频数据
```

## 三、数据来源(本地文件,勿再下载)

| 文件 | 位置 |
|------|------|
| 2005—2016 真题 .doc 合集 | `D:\英语单词资料\02_真题\考研英语\KaoYan-English\真题集（纯真题可直接打印）英语一\2005—2016年历年考研英语真题集.doc` |
| 2017/2018/2019 真题 .doc | 同目录 `2017考研英语（一)真题.doc` 等 |
| 2019 真题 PDF(文本版) | 同目录 `2019考研英语（一)真题.pdf` |
| 2020+ 逐年 PDF | `D:\英语单词资料\02_真题\考研英语\kaoyanzhenti\公共课\英语真题\英语一\2020年考研英语真题.pdf` 等(先验证是否文本版) |
| 答案解析 PDF 2005–2020 | `D:\英语单词资料\02_真题\考研英语\KaoYan-English\答案解析\{年份}年考研英语一真题答案解析.pdf` |
| 考研词频表(5530词) | `D:\英语单词资料\01_词库\考研词频表\netem_full_list.json`(字段:序号/词频/单词/释义/分类) |

## 四、工作组任务

### WG-Z1 提取管线(scripts/extract_zhenti.py)
- 环境:Windows + 已装 Office + Python 3.12 + PyPDF2(已装)。Word COM 依赖 `pywin32`,若缺:`pip install pywin32 -i https://pypi.tuna.tsinghua.edu.cn/simple`
- Word COM 骨架:
```python
import win32com.client as win32
word = win32.Dispatch("Word.Application")
word.Visible = False
try:
    doc = word.Documents.Open(path, ReadOnly=True)
    text = doc.Content.Text
    doc.Close(False)
finally:
    word.Quit()
```
- 切分锚点:`Section I Use of English`(完形)、`Section II Reading Comprehension`、`Text 1`…`Text 4`、`Part B` 与 `Section III Translation` 跳过
- 完形:原文空位替换为 `___N___`;题目按 `1.` 至 `20.` 题号切分
- 阅读:每题按 `21.`/`26.`/`31.`/`36.` 类题号切分,选项 A. B. C. D.
- 答案:`答案解析` 各年 PDF 用 PyPDF2 提取(先验证可提取性,提取不出则跳过并在报告中标注"答案缺失,由 WG-Z3 补")
- 产出:`zhenti_raw/{year}/cloze.txt`、`reading-1..4.txt`、`answers.txt`(格式自定但需在脚本 docstring 里写明)
- 2020 年:.doc 没有,先用 PyPDF2 试 kaoyanzhenti 的 `2020年考研英语真题.pdf`;若 0 字符(扫描版),报告"2020 提取失败",跳过
- **验收:** 每年 5 个 txt 齐全(2020 除外),完形含 20 空、阅读含 5 题;Word 进程不残留

### WG-Z2 结构化(scripts/zhenti_to_json.py)
- 输入 zhenti_raw → 输出 `public/content/zhenti/{year}/*.json` 初稿 + `index.json`
- 初稿:questions.analysis 允许空字符串占位;sentences 的 text 必须完整(完形含 ___N___ 标记);translation/chunks/grammar 可为空数组(由 WG-Z3 填充)
- 完形切句:以句号/问号等切分,保持 `___N___` 完整不被切开
- **验收:** 80 个 JSON(2020 除外则 75)合法、字段齐全、answer 0-3、index.json 完整

### WG-Z3 拆解标注(内容组)
- 在 WG-Z2 的 JSON 上填充:每句 `translation` + `chunks`(完整覆盖无重叠,固定六色)+ `grammar`;`newWords` 15-30 个(从 `public/content/wordbank/{首字母}.json` 核对词库,词库没有的超纲词也允许放 newWords)
- 完形的 `___N___` 在 text 中保留原样;chunks 中该空位文本用 `___N___` 表示
- 每批 ≤10 篇;完成后运行:`python scripts/validate_content.py --zhenti {year}`(WG-Z6 提供)
- 质量:翻译准确、拆解成分合理(这是给学生看的中文注解,务必正确)
- **验收:** validate 0 错误

### WG-Z4 前端真题专区
- 路由:`/zhenti`(列表)、`/zhenti/:id`(详情);首页 tabs 加「📝 真题」入口;S4 阶段卡片加"真题延伸"链接
- 列表页:按年份分组展示,标签区分 完形/阅读 Text1-4
- 详情页两种模式:
  - **阅读模式**:左文章(复用 `components/WordText`+`components/SentenceBreakdown`,点词弹层 `components/WordPopup`)+ 右题目面板(四选一,选择后显示 ✓/✗ + 解析,交卷按钮)
  - **完形模式**:文章渲染时把 `___N___` 渲染为可点击空位(当前选中项显示在空位),下方选项面板 4 选 1,全部答完判分并逐空显示解析
- AI 讲题:题目旁「🤖 问 AI」按钮,调用 `lib/ai/provider.ts` 的 `chatJSON`,把题目+原文+你的选择发给 AI 要中文讲解;未配 key 时按钮置灰提示去设置
- 进度:答题结果存 localStorage(`zhenti:{id}` → 得分/答案),重进恢复
- 样式沿用现有 CSS 变量风格,新增样式加在 `src/style.css` 末尾
- **验收:** `npm run build` 零错误;用 mock 数据(见下)可走通两种模式

### WG-Z5 词频联动
- `scripts/build_freq.py`:读 `netem_full_list.json` → `public/content/freq.json`(word→{rank,freq},单词转小写)
- 前端:`WordPopup` 加词频显示(异步 fetch freq.json 一次缓存);命中显示「考研真题高频 TOP-{rank}」
- **验收:** freq.json 5530 词;build 通过

### WG-Z6 校验扩展+我的文章页
- `validate_content.py` 加 `--zhenti [year...]` 模式:校验 zhenti 目录(JSON 合法/字段齐全/questions 题量(完形20阅读5)/options=4/answer 0-3/空位标记与题号一一对应/index.json 完整)
- 新增页面「我的文章」:列表显示 `storage.myArticles`(标题/时间),可打开(渲染 sentences 复用 ReaderView)、删除;入口放首页 tabs
- **验收:** 全量 validate 0 错误(48 单元+真题);build 通过

## 五、Mock 数据(WG-Z4 先行用)

`public/content/zhenti/2019/reading-1.json` 可先手工造一份最小 mock(5 句+5 题),等 WG-Z2 产出后替换。

## 六、质量门禁(所有组)

1. 只写自己负责的文件;禁止修改:`types.ts` 已有字段、`content/curriculum/**`(48 单元)、`content/wordbank`、`content/dict`、他人产出
2. 内容组跑 validate 确认 0 错误;代码组 `npm run build` 零错误
3. 版权:真题仅本地学习使用,不公开传播

## 七、合并与终验(由主代理执行)

合并顺序:Z1 → Z2 → Z3(分批)→ Z4/Z5/Z6 → 全量 validate + build + 真题流程人工走查 + README 更新。
