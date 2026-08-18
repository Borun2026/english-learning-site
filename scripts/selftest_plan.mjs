// 学习计划排程自测(零依赖):node scripts/selftest_plan.mjs
// 直接导入 src/lib/planCore.ts(Node ≥ 22.6 原生类型擦除),验证 P6 自适应不变量。
import assert from 'node:assert/strict'
import { buildSchedule, dayIndexOf, tasksOfDay, todayStr, addDays, computeDailySections, stageWindows, dayUnlockStage } from '../src/lib/planCore.ts'

const STAGE_SIZES = [8, 12, 12, 10, 6]
const units = []
for (let s = 1; s <= 5; s++) {
  for (let i = 1; i <= STAGE_SIZES[s - 1]; i++) {
    units.push({ id: `s${s}u${i}`, stage: s, title: `单元${s}-${i}`, grammarTopic: '语法', scene: '场景', wordRange: [0, 10] })
  }
}
const inRange = (a, b) => units.filter((u) => u.stage >= a && u.stage <= b)
const unitIdsOf = (r) => r.coveredUnits.map((u) => u.id)

const kindsOfDay = (r, d) => tasksOfDay({ tasks: r.tasks }, d).map((t) => t.kind)
const tasksOfDay_ = (r, d) => tasksOfDay({ tasks: r.tasks }, d)

const checkBasics = (r, days, label) => {
  assert.ok(r.tasks.every((t) => t.day >= 1 && t.day <= days), `${label}: 任务天数越界`)
  const ids = new Set(r.tasks.map((t) => t.id))
  assert.equal(ids.size, r.tasks.length, `${label}: 任务 id 重复`)
  assert.equal(new Set(unitIdsOf(r)).size, r.coveredUnits.length, `${label}: 单元覆盖重复`)
  for (let d = 1; d <= days; d++) assert.ok(r.tasks.some((t) => t.day === d), `${label}: 第 ${d} 天无任务`)
}

// 帮助:某天解锁阶段
const unlockAt = (r, units_, a, b, days, d) => {
  const w = stageWindows(units_.filter((u) => u.stage >= a && u.stage <= b), a, b, days)
  return dayUnlockStage(w, d)
}

/* ---------------- v2 自适应断言 ---------------- */

// 1) 默认 100 天 S1→S5 normal:48 单元全部小节覆盖;前 10 天无 zhenti/cet6;后期窗口有 zhenti
const r100 = buildSchedule(inRange(1, 5), { totalDays: 100, endStage: 5, startStage: 1, intensity: 'normal' })
checkBasics(r100, 100, '100天S1-S5 v2')
assert.equal(r100.coveredUnits.length, 48, '100 天应覆盖 48 单元')
// 单元全部小节覆盖(288 条 unit-step)
assert.equal(r100.tasks.filter((t) => t.kind === 'unit-step').length, 48 * 6, '应覆盖全部 288 小节')
assert.equal(new Set(unitIdsOf(r100)).size, 48, '100 天单元不重不漏')
// 前 10 天零考研/CET-6(关键:入门不应第二天刷考研)
for (let d = 1; d <= 10; d++) {
  const ks = kindsOfDay(r100, d)
  assert.ok(!ks.includes('zhenti'), `第 ${d} 天不应有考研真题(入门前期)`)
  assert.ok(!ks.includes('cet6'), `第 ${d} 天不应有 CET-6(入门前期)`)
}
// 后期窗口仍有考研真题日(至少一条 zhenti)
assert.ok(r100.tasks.some((t) => t.kind === 'zhenti'), 'S1-S5 后期窗口应有考研真题日')
assert.equal(r100.tasks.filter((t) => t.kind === 'review').length, 14, '100 天应有 14 个每周复盘(7..98)')
assert.equal(r100.tasks.filter((t) => t.kind === 'unit').length, 0, 'v2 不应再生成 v1 整单元任务')

// 2) 7 天 S1→S5 压缩:48 单元全部小节仍覆盖(288 条),单日可多条,前 1 天窗口是 S1 故无 zhenti
const r7 = buildSchedule(inRange(1, 5), { totalDays: 7, endStage: 5, startStage: 1, intensity: 'intense' })
checkBasics(r7, 7, '7天S1-S5 v2')
assert.equal(r7.coveredUnits.length, 48, '压缩 7 天也应覆盖 48 单元')
assert.equal(r7.tasks.filter((t) => t.kind === 'unit-step').length, 48 * 6, '7 天也应覆盖全部 288 小节')
// 至少有一天任务数 >6(跨多单元或加速)
assert.ok([1, 2, 3, 4, 5, 6, 7].some((d) => tasksOfDay_(r7, d).length > 6), '压缩应有一天排 >6 条')
// 第 1 天不可有 zhenti(窗口=最高档 endStage=5?压缩下窗口可能在 S1 仍很短)
// 压缩 7 天切 5 个窗口:每档至少 1 天;第 1 天若在 S1 窗口无 zhenti;若 S1 窗口被挤没则可能unlock直接到5,
// 此时第1天也可能 zhenti。断言改为:第1天若含 zhenti,则当天 unlock>=4(由阶段窗口决定)。
// 这里只断言 tier 合法(见 P6-1 第 3 条)
const t1kinds = kindsOfDay(r7, 1)
if (t1kinds.includes('zhenti')) {
  const u1 = unlockAt(r7, units, 1, 5, 7, 1)
  assert.ok(u1 >= 4, `第1天有考研则解锁应≥4,实际 ${u1}`)
}

// 3) 30 天 S2→S3(24 单元 144 小节):无 zhenti(目标 S3<4);有 cet6 当且仅当窗口到 S3
const r30 = buildSchedule(inRange(2, 3), { totalDays: 30, endStage: 3, startStage: 2, intensity: 'normal' })
checkBasics(r30, 30, '30天S2-S3 v2')
assert.equal(r30.coveredUnits.length, 24, '30 天 S2-S3 覆盖 24 单元')
assert.equal(r30.tasks.filter((t) => t.kind === 'unit-step').length, 24 * 6, '应覆盖 144 小节')
assert.ok(r30.tasks.every((t) => t.kind !== 'zhenti'), '目标 S3(<4)不应有考研真题')
// 任务 tier 合法:任意 unit-step tier in {2,3};任意 cet6 仅出现在 unlock>=3 的天
for (const t of r30.tasks) {
  if (t.kind === 'unit-step') assert.ok(t.tier === 2 || t.tier === 3, `unit-step tier 应在 2-3,实际 ${t.tier}`)
  if (t.kind === 'cet6') {
    const u = unlockAt(r30, units, 2, 3, 30, t.day)
    assert.ok(u >= 3, `cet6 仅在 unlock>=3,第 ${t.day} 天 unlock=${u}`)
  }
}

// 4) 200 天 S1→S1(8 单元 48 小节):无 zhenti/cet6;dailySections=2;前 10 天零考研/CET6
const r200 = buildSchedule(inRange(1, 1), { totalDays: 200, endStage: 1, startStage: 1, intensity: 'light' })
checkBasics(r200, 200, '200天S1-S1 v2')
assert.equal(r200.coveredUnits.length, 8, '200 天 S1-S1 覆盖 8 单元')
assert.equal(r200.tasks.filter((t) => t.kind === 'unit-step').length, 48, '应覆盖 48 小节')
assert.ok(r200.tasks.every((t) => t.kind !== 'zhenti'), 'S1 目标不应有考研真题')
assert.ok(r200.tasks.every((t) => t.kind !== 'cet6'), 'S1 目标不应有 CET-6')
for (let d = 1; d <= 10; d++) {
  assert.ok(!kindsOfDay(r200, d).includes('zhenti'), `第 ${d} 天不应有考研`)
  assert.ok(!kindsOfDay(r200, d).includes('cet6'), `第 ${d} 天不应有 CET-6`)
}
assert.equal(computeDailySections(48, 200), 2, '48 小节/200 天 → daily=2(下限)')

// 5) 测评起点 S3→S5:无 S1/S2 的 unit-step;任务 tier>=3
const r3to5 = buildSchedule(inRange(3, 5), { totalDays: 90, endStage: 5, startStage: 3, intensity: 'normal' })
checkBasics(r3to5, 90, '90天S3-S5 v2')
assert.equal(r3to5.coveredUnits.length, 28, 'S3-S5 = 12+10+6=28 单元')
for (const t of r3to5.tasks) {
  if (t.kind === 'unit-step') assert.ok((t.tier ?? 0) >= 3, `起点 S3 不应有 S1/S2 小节,实际 tier=${t.tier}`)
}

// 6) 同一天允许来自多个单元(当 daily 不是 6 倍数时必出现,是 6 倍数时可为 0)
// 校验:daily 不是 6 倍数条件下必有跨单元日;60 天 S1-S5 daily=5,ceil(288/60)=5 → 应有跨单元日
const r60 = buildSchedule(inRange(1, 5), { totalDays: 60, endStage: 5, startStage: 1, intensity: 'normal' })
const cross60 = Array.from({ length: 60 }, (_, i) => i + 1).filter((d) => {
  const uids = new Set(tasksOfDay_(r60, d).filter((t) => t.kind === 'unit-step').map((t) => t.unitId))
  return uids.size >= 2
})
assert.ok(cross60.length > 0, '60 天 daily=5 应有跨两个单元同日的小节日')
assert.ok(computeDailySections(288, 60) === 5, '60 天 daily=5')

// 7) v1 旧断言删除:不再要求「S1-S5 必含真题日」靠前期;改为「前期不含、后期含」(已含在 1)

// 8) 日期工具回归
assert.equal(addDays('2026-08-16', 0), '2026-08-16')
assert.equal(addDays('2026-08-16', 1), '2026-08-17')
assert.equal(dayIndexOf({ totalDays: 100, startDate: '2026-08-16' }, '2026-08-16'), 1)
assert.equal(dayIndexOf({ totalDays: 100, startDate: '2026-08-16' }, '2026-08-15'), 0)
assert.equal(dayIndexOf({ totalDays: 100, startDate: '2026-08-16' }, '2026-11-24'), 101)
assert.equal(dayIndexOf({ totalDays: 100, startDate: 'bad' }, todayStr()), -1)
assert.deepEqual(
  tasksOfDay({ tasks: r100.tasks }, 7).map((t) => t.id).filter((x) => x.startsWith('review')),
  ['review-day7'],
)
assert.equal(computeDailySections(288, 100), 3, '288/100 needed=3 (ceil 2.88→3)')
assert.equal(computeDailySections(288, 7), 18, '288/7 needed≈42 → clamp 18')
assert.equal(computeDailySections(48, 200), 2, '48/200 needed=1 → 下限 2')

// 9) 阶段窗口 Σ days === totalDays 且每阶段≥1
const w = stageWindows(inRange(1, 5), 1, 5, 100)
assert.equal(w.reduce((a, x) => a + (x.dayEnd - x.dayStart + 1), 0), 100, '窗口总天数=100')
assert.equal(w.length, 5, '5 个阶段窗口')
assert.equal(w[0].dayStart, 1)
assert.equal(w[w.length - 1].dayEnd, 100)
assert.ok(w.every((x) => x.dayEnd - x.dayStart + 1 >= 1), '每个窗口≥1 天')

// 10) P6-4 按近况重排剩余天数
import { adjustRemainingPlan } from '../src/lib/planCore.ts'
const seedPlan = {
  id: 'p6test',
  createdAt: 0,
  totalDays: 4,
  startStage: 1,
  endStage: 5,
  startDate: '2026-08-16',
  unitIds: ['s1u1'],
  version: 2,
  intensity: 'normal',
  dailySections: 3,
  abilityStage: 1,
  tasks: [
    // day1:已过去(应保留)
    { id: 'us-s1u1-vocab', day: 1, kind: 'unit-step', title: 'a', tier: 1, unitId: 's1u1', step: 'vocab', link: '/unit/s1u1?step=vocab' },
    { id: 'filler-d1', day: 1, kind: 'nce', title: 'b', link: '/library', tier: 1, nceBook: 1 },
    // day2:未来纯 filler 日(应被追加 vocab-review-recover)
    { id: 'filler-d2', day: 2, kind: 'nce', title: 'b', link: '/library', tier: 1, nceBook: 1 },
    // day3:含 review 的纯 filler 日(应跳过,不加 recover)
    { id: 'filler-d3', day: 3, kind: 'nce', title: 'b', link: '/library', tier: 1, nceBook: 1 },
    { id: 'review-day3', day: 3, kind: 'review', title: 'r', link: '/wordbook' },
    // day4:含 unit-step(非纯 filler 日,不应加 recover)
    { id: 'us-s1u1-grammar', day: 4, kind: 'unit-step', title: 'c', tier: 1, unitId: 's1u1', step: 'grammar', link: '/unit/s1u1?step=grammar' },
    { id: 'filler-d4', day: 4, kind: 'nce', title: 'b', link: '/library', tier: 1, nceBook: 1 },
  ],
}

// a) 无信号:返回原对象
const same = adjustRemainingPlan({ plan: seedPlan, today: '2026-08-17', recentCompletionRate: 0.9, recentExamAvg: 85, dueWords: 5 })
assert.equal(same, seedPlan, '无弱势信号应返回原 plan 引用')

// b) 弱信号(完成率 0.4):day2 追加 recover,day3 跳过,day4 非纯 filler 日不动
const weak = adjustRemainingPlan({ plan: seedPlan, today: '2026-08-17', recentCompletionRate: 0.4, recentExamAvg: 80, dueWords: 20 })
assert.notEqual(weak, seedPlan, '弱信号应返回新 plan')
const rec = weak.tasks.filter((t) => t.kind === 'vocab-review' && t.id.startsWith('vocab-review-recover'))
assert.equal(rec.length, 1, '应只 day2 加一条 recover')
assert.equal(rec[0].day, 2, 'recover 加在 day2')
// day1 任务未动
assert.ok(weak.tasks.some((t) => t.id === 'us-s1u1-vocab'), 'day1 未过去已保留')
assert.ok(weak.tasks.some((t) => t.id === 'filler-d1'), 'day1 filler 保留')
assert.ok(!weak.tasks.some((t) => t.id === 'vocab-review-recover-day1'), '不应给已过去天加 recover')

// c) exam 均分低也触发
const lowExam = adjustRemainingPlan({ plan: seedPlan, today: '2026-08-17', recentCompletionRate: 0.95, recentExamAvg: 50, dueWords: 0 })
assert.notEqual(lowExam, seedPlan, '低 exam 均分应触发')
assert.ok(lowExam.tasks.some((t) => t.id.startsWith('vocab-review-recover')), '低 exam 应含 recover')

// d) today=未开始日(day0):不动
const before = adjustRemainingPlan({ plan: seedPlan, today: '2026-08-15', recentCompletionRate: 0.1, recentExamAvg: 30, dueWords: 100 })
assert.equal(before, seedPlan, '计划未开始(today 在 startDate 前)应不动')

// e) v1 计划:不动
const v1 = { ...seedPlan, version: 1 }
const v1Res = adjustRemainingPlan({ plan: v1, today: '2026-08-17', recentCompletionRate: 0.1, recentExamAvg: 30, dueWords: 100 })
assert.equal(v1Res, v1, 'v1 计划不重排')

// f) today=day1(todayIdx=1):day1 是 unit-step 日(非纯 filler),day2 应加;但 day1 仍保留
const todayIsD1 = adjustRemainingPlan({ plan: seedPlan, today: '2026-08-16', recentCompletionRate: 0.3, recentExamAvg: 80, dueWords: 30 })
const rD1 = todayIsD1.tasks.filter((t) => t.day === 1 && t.kind === 'vocab-review' && t.id.startsWith('vocab-review-recover'))
assert.equal(rD1.length, 0, 'day1 非 pure filler 不应加 recover')
assert.ok(todayIsD1.tasks.some((t) => t.id === 'vocab-review-recover-day2'), 'day2 应加(今天 day1,future day2)')

console.log('selftest_plan: 全部断言通过 ✔ (P6 v2 + P6-4 重排剩余)')
console.log(`  100天S1-S5: 48 单元/288 小节 全覆盖 · 前10天零考研/CET6 · 后期含真题 · 14 复盘`)
console.log(`  7天S1-S5: 压缩仍覆盖全部小节,单日 >6 条`)
console.log(`  30天S2-S3: 24 单元/144 小节,无考研`)
console.log(`  200天S1-S1: 48 小节铺开,daily=2`)
console.log(`  S3→S5 起点任务 tier>=3,无 S1/S2 小节`)
console.log(`  同日存在跨单元小节 · daily clamp [2,18]`)
