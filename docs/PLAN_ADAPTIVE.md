# P6 自适应学习计划(能力窗 + 按日小节打包)

> 权威开发项见 `docs/ROADMAP.md` P6。本文是排程契约与并行分工。改排程只动本文列出的文件。
>
> 图例:`✅ 完成` / `🚧 进行中` / `⬜ 待开发`

---

## 0. 为什么要改

现网 `buildSchedule`(P2-4)三条硬伤:

1. **练习难度跟目标绑死、不跟基础走。** `endStage >= 4` 时空白天轮转 NCE / CET-6 / **考研真题**。入门用户选「S1→S5、100 天」时,第 2 天就可能刷考研阅读。
2. **一天 = 一个整单元(或加速打包成一条「N 个单元」任务)。** 单元实际是 6 小节(词汇/语法/精读/对话/听力/真题演练)。基础好、时间够的人一天可以连学多小节甚至跨单元;时间紧的人应拆开,而不是整单元硬塞或整单元跳过。
3. **生成后不再随日期/掌握度改难度。** 测评只改 `startStage`,后面日程仍按终点阶段撒真题。

原则:**练习题档位 = min(当前已解锁阶段, 用户目标),绝不提前两档。一天按「小节预算」打包,可以 1 小节,也可以跨多个单元的多小节。**

---

## 1. 现状(对照,勿回归)

| 项 | 现网 |
|---|---|
| 入口 | `/plan` 自选 7–365 天、S1–S5 起止、开始日期;` /placement` 20 题 → 只带入 `startStage`,固定 100 天、`endStage=5` |
| 排程 | `planCore.buildSchedule`:天数≥单元数则 1 单元/天均匀铺开,空白天 `fillerTask`;天数<单元数则每天打包多个**整单元**为 1 条任务 |
| 真题日 | `endStage>=4` 即进入 filler 池,与当天学到哪一档无关 |
| 任务粒度 | `PlanTaskKind = unit \| nce \| cet6 \| zhenti \| review`;`link` 最多到 `/unit/{id}`,不带 `?step=` |
| 打卡 | `planCheckins[YYYY-MM-DD] = taskId[]` |
| 自测 | `scripts/selftest_plan.mjs`(现断言「S1–S5 必含真题日」——**本项必须改掉**) |

单元六步(已冻结,排程按此拆,不改 UnitPlayer 步骤本身):

```
vocab → grammar → article → dialogue → listen → exam
```

S1 单元的 `exam.json` 已是 NCE 改编基础题,与 `/zhenti` 考研真题不是同一档。排程里「真题演练」小节跟单元走;「考研真题日」只有解锁到 S4 才能进 filler。

---

## 2. 能力窗与练习档位

### 2.1 阶段 = 练习档(`PracticeTier` 与 `StageId` 同值)

| 档 | 阶段 | 可学单元 | 可排泛读/练习 | 禁止 |
|---|---|---|---|---|
| 1 | 入门 | S1 | NCE1 笔记、词汇复习、本单元 exam 小节 | CET-6 语篇、考研真题、S5 写作任务 |
| 2 | 四级 | S2 | NCE2、简单外刊(今日一篇可选用) | 考研真题 |
| 3 | 六级 | S3 | NCE3、CET-6 语篇+理解题 | 考研真题 |
| 4 | 考研 | S4 | 考研阅读/完形限时 | — |
| 5 | 雅思 | S5 | 外刊/写作句式 | — |

硬规则(自测必须锁死):

- 任意任务 `task.tier <= dayUnlockStage`。
- `kind === 'zhenti'` 仅当 `dayUnlockStage >= 4`。
- `kind === 'cet6'` 仅当 `dayUnlockStage >= 3`。
- `kind === 'nce'` 必须带 `nceBook`(1–4),且 `nceBook <= dayUnlockStage`(S5 仍用 NCE4)。
- 入门起点的计划,**前若干天(至少直到 S1 单元小节排完)不得出现考研/CET-6**。

### 2.2 某天解锁到哪一档

按各阶段**小节总量**把 `totalDays` 切成连续窗口,而不是 `endStage` 一天生效。

```
stageSections[s] = 该阶段在本次计划内的单元数 × 6
days[s] = max(1, round(totalDays * stageSections[s] / sum(stageSections)))
再微调使 Σ days[s] === totalDays
```

第 `day` 天的 `dayUnlockStage` = 该天落入的窗口阶段。窗口按 `startStage → endStage` 顺序前进,不会倒退。

例:S1→S5、100 天(48 单元 = 288 小节)

| 窗口 | 小节 | 约几天 | 当天可排 |
|---|---|---|---|
| S1 | 48 | 17 | S1 小节 + NCE1 + 复盘 |
| S2 | 72 | 25 | S2 小节 + NCE2 |
| S3 | 72 | 25 | S3 小节 + CET-6 |
| S4 | 60 | 21 | S4 小节 + 考研真题 |
| S5 | 36 | 12 | S5 小节 + 写作/外刊 |

测评建议起点 S3 时,窗口从 S3 起算,前几天就是六级档,不会倒回去刷 S1,也仍要等窗口走到 S4 才出现考研。

### 2.3 测评如何带入

`/placement` 不再写死 100 天 + `endStage=5`。带入字段:

- `abilityStage = startStage = 建议档`
- `endStage` 用户选(默认 5,可改)
- `totalDays` 用户选(默认 100)
- `intensity` 默认 `normal`

---

## 3. 一天可以很多小节

### 3.1 强度 → 每日小节预算

| 强度 | 每天目标小节 | 体感 |
|---|---|---|
| `light` | 3 | 半单元出头,约 30–45 分钟 |
| `normal` | 6 | 约 1 个整单元,约 60–90 分钟 |
| `intense` | 9 | 1.5 个单元,约 2 小时 |

计划页可改强度。生成时若 `ceil(总小节 / totalDays) > 预算`,自动把预算抬到刚好排完(上限 **18** = 3 整单元),并在 UI 提示「天数偏紧,当天会排多个小节/跨单元」。若仍排不完(极短天数 + 全阶段),保持 18、单元仍不丢,当天任务变多——这是加速,不是跳课。

天数远大于小节时:日预算可降到 **2**(最少),多出来的天用**同档**泛读/复盘填,禁止用高档真题填空。

### 3.2 打包算法(`buildSchedule` 重写)

输入:`units[]`、`totalDays`、`startStage`、`endStage`、`intensity`。

1. 展开队列:`units.flatMap(u => 6 个 unit-step)`,每步带 `unitId/step/tier=u.stage`。
2. 按 §2.2 切阶段窗口,得到每天的 `dayUnlockStage`。
3. 逐日:
   - 从队列头取不超过 `dailySections` 条、且 `step.tier <= dayUnlockStage` 的小节(同阶段窗口内通常刚好匹配)。
   - **同一天允许来自多个单元**(例如收尾 s1u8 的 listen+exam,再接下 s2u1 的 vocab+grammar)。
   - 预算未用完:优先同档 filler(nce/cet6/zhenti/写作/词汇复习),每周第 7 天追加 `review`(可与小节并存)。
4. 跨窗口那天:先把上一阶段剩余小节排完,再开始下一阶段;当天 `dayUnlockStage` 取当天窗口(若仍有上一阶段残留小节,残留小节的 `tier` 更低,仍合法)。
5. 排序:`day` 升序,同日 `unit-step` 保持队列顺序,再跟 filler。

旧「加速模式一条任务包 N 个整单元」删除。改成多条 `unit-step`,每条可点进 `/unit/{id}?step={vocab|grammar|article|dialogue|listen|exam}`。

### 3.3 任务种类

| kind | 含义 | link 示例 |
|---|---|---|
| `unit-step` | 某一单元的一小节 | `/unit/s1u1?step=grammar` |
| `nce` | 同档 NCE 笔记 1 课 | `/library?tab=nce` |
| `cet6` | 六级档语篇 1 篇 | `/library?tab=cet6` |
| `zhenti` | 考研档限时 1 篇 | `/zhenti` |
| `review` | 每周复盘 | `/wordbook` |
| `vocab-review` | 词汇到期复习 | `/wordbook` |
| `writing` | 仅 S5 窗口 | `/writing` |

兼容:读到旧计划 `kind:'unit'` 时,Plan/Home 仍渲染为整单元链接 `/unit/{id}`,不自动拆。用户点「重新生成」才升级到 v2。

---

## 4. 契约改动(`src/lib/types.ts`)

**本项授权修改 types.ts 计划段。** 其它结构不动。旧备份缺字段必须能迁移。

```ts
export type UnitStepKey = 'vocab' | 'grammar' | 'article' | 'dialogue' | 'listen' | 'exam'

export type PlanTaskKind =
  | 'unit'          // 仅兼容 v1
  | 'unit-step'
  | 'nce'
  | 'cet6'
  | 'zhenti'
  | 'review'
  | 'vocab-review'
  | 'writing'

export type PlanIntensity = 'light' | 'normal' | 'intense'

export interface PlanTask {
  id: string
  day: number
  kind: PlanTaskKind
  title: string
  detail?: string
  link?: string
  /** 本任务能力档,缺省=按 kind 推断(zhenti=4, cet6=3, writing=5) */
  tier?: StageId
  unitId?: string
  step?: UnitStepKey
  nceBook?: 1 | 2 | 3 | 4
}

export interface StudyPlan {
  id: string
  createdAt: number
  totalDays: number
  startStage: StageId
  endStage: StageId
  startDate: string
  unitIds: string[]
  tasks: PlanTask[]
  /** 缺省按 v1 只读 */
  version?: 1 | 2
  intensity?: PlanIntensity
  dailySections?: number
  abilityStage?: StageId
}
```

`generatePlan` 新增可选 `intensity?`、`abilityStage?`(默认 `startStage`)。写出的计划 `version: 2`。

`storage.migrateBackup`:旧计划原样保留(`version` 缺省),不在导入时重排(避免打卡对不上)。新字段只在「重新生成」时出现。

---

## 5. 自适应(第二刀,可后做)

生成后仍可按掌握度改**未开始的日子**,已过去的任务与打卡不动。

信号(全本地,已有数据):

- 近 7 日打卡完成率
- 已完成单元 `exam.score/total`、`grammar.quizScore`
- `dueTodayWords().length`

规则(纯函数 `adjustRemainingPlan`):

| 信号 | 动作 |
|---|---|
| 完成率 < 50% 或 近期 exam 均分 < 60% | 余下 `dailySections` −1(下限 2),插入 1 次同档 review |
| 完成率 ≥ 90% 且 exam 均分 ≥ 80% 且到期词 < 10 | 余下 `dailySections` +1(上限 18) |
| 其它 | 不改 |

计划页按钮「按近况重排剩余天数」,不自动半夜改日程。P6-1 先不上按钮也可以,但纯函数与自测要先写好,避免 UI 各写各的。

---

## 6. UI

### `/plan`

- 增加强度三选一;展示「约每天 N 小节 / 所选范围 M 个单元 = 6M 小节」。
- 生成后按日列出多条小节(可点进对应 step);同日多单元要能一眼看出。
- 文案去掉「目标 ≥ S4 就穿插考研」。改为「练习难度跟当天解锁阶段走」。
- 旧 v1 计划顶部提示:「当前是旧版整单元日程,重新生成可升级为按小节+按基础排难度」。

### `/placement`

- 结果页可选目标阶段、天数、强度,再生成。
- 文案去掉「自适应」夸大(题库仍是 20 道固定顺序);只承诺「建议起点 + 按起点锁练习档」。

### 首页今日任务

- 展示当天全部 `unit-step` + filler,不再假设一天一条。
- 标题写小节名,如 `S1U1 ② 语法课`。

不改 UnitPlayer 六步本身;`?step=` 深链已存在。

---

## 7. 自测必须改/新增的断言

文件:`scripts/selftest_plan.mjs`(可拆 `selftest_plan_adapt.mjs`,但一个文件即可)。

1. **S1→S5、100 天、normal**:288 条 `unit-step`;单元不重不漏;每天任务数 ≥1;`zhenti` 只出现在 unlock≥4 的日子;前 10 天零 `zhenti`、零 `cet6`。
2. **S1→S1、30 天**:零 `zhenti`、零 `cet6`;有 `nce` 则 `nceBook===1`。
3. **测评起点 S3→S5**:任务 `tier>=3` 或复习;无 S1/S2 的 `unit-step`。
4. **7 天 S1→S5**:仍覆盖 48 单元全部小节;单日可 >6 条;仍禁止第 1 天 `zhenti`(第 1 天窗口是 S1)。
5. **同一天可含 ≥2 个不同 `unitId` 的 unit-step**(构造:预算 6、上一单元剩 2 步)。
6. **旧断言删除**:「S1–S5 必含真题日」改为「S1–S5 在后期窗口含真题日,前期不含」。
7. `adjustRemainingPlan` 完成率低则减小后续日预算。

日期工具(`addDays`/`dayIndexOf`/`tasksOfDay`)保持原语义。

---

## 8. 并行分工(文件所有权,禁止抢改)

开工前先把本文 + ROADMAP P6 标 🚧。各组只改自己的文件。契约以 §4 为准,WG-A 先合 types+planCore,其它组按本文类型写,不要各发明字段。

| 组 | 文件 | 做什么 | 依赖 |
|---|---|---|---|
| **WG-A 排程核** | `src/lib/types.ts`(仅计划段)、`src/lib/planCore.ts`、`scripts/selftest_plan.mjs` | 类型、窗口、打包、filler 档位、自测 | 无 |
| **WG-B 生成/测评/迁移** | `src/lib/plan.ts`、`src/lib/storage.ts`(migrate 注释/默认即可,旧计划原样)、`src/pages/Placement.tsx` | `generatePlan` 传 intensity/abilityStage;测评带入三字段 | WG-A 类型 |
| **WG-C 计划页** | `src/pages/Plan.tsx` + 必要 CSS(只加 class,不重构全局) | 强度选择、小节列表、旧计划提示、紧天数提示 | WG-A 类型 |
| **WG-D 首页** | `src/pages/Home.tsx` 的 `TodayPlanCard` | 多小节今日任务;标题用 step | WG-A 类型 |
| **WG-E 自适应(已做)** | `planCore.adjustRemainingPlan` + Plan 页一按钮 | §5 | WG-A ✅ |

合并顺序:A → B/C/D 可同时 → E。门禁:`node scripts/selftest_plan.mjs`、`npx tsc --noEmit`、`npm run build`。

---

## 9. 验收

- 入门(S1 起)前 10 天日程里没有考研真题、没有 CET-6。
- 目标含 S4/S5 时,后期窗口仍有考研真题日(不是删掉真题,是推迟到解锁后)。
- 一天可以出现多个小节、可以跨两个单元;每条能跳到对应 `?step=`。
- 天数少时自动提高当天小节数,单元不丢。
- 旧 v1 计划能打开、能打卡;重新生成才变 v2。
- 四门禁:tsc / validate / audit / build 全绿;`selftest_plan` 全过。

---

## 10. 明确不做

- 不引入服务端推荐、不调用 AI 排课。
- 不改 48 单元内容、不改 UnitPlayer 六步顺序。
- 不做实时改当天已生成任务(只提供「重排剩余」)。
- 不把 AGPL 项目的排课代码搬进来。
- 不把「20 道固定语法题」改造成真正 CAT(若要做另立项)。

---

## 11. 关键文件

| 路径 | 角色 |
|---|---|
| `src/lib/planCore.ts` | 纯函数排程,Node 直测 |
| `src/lib/plan.ts` | 读目录 + `generatePlan` |
| `src/lib/types.ts` | 契约 |
| `src/pages/Plan.tsx` | 生成器 UI |
| `src/pages/Placement.tsx` | 测评带入 |
| `src/pages/Home.tsx` | 今日任务 |
| `scripts/selftest_plan.mjs` | 不变量 |
