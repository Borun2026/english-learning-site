// P5-3 词汇游戏自测(零依赖):node scripts/selftest_game.mjs
// 验证:可复现随机 / 洗牌 / 每日计划生成 / 文本归一化 / 日期种子
import assert from 'node:assert/strict'

const { mulberry32, shuffle, pickMany, normalizeText, buildDailyPlan, dateSeed } = await import('../src/lib/game/gen.ts')

// 1) 可复现随机
const r1 = mulberry32(42)
const a = [r1(), r1(), r1()]
const r2 = mulberry32(42)
const b = [r2(), r2(), r2()]
assert.deepEqual(a, b, '同种子序列一致')
assert.ok(a.every((x) => x >= 0 && x < 1), '输出在 [0,1)')

// 2) 洗牌不丢元素、结果受种子控制
const arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const s1 = shuffle(arr, mulberry32(7))
const s2 = shuffle(arr, mulberry32(7))
assert.deepEqual(s1, s2, '同种子洗牌结果一致')
assert.deepEqual(s1.slice().sort(), arr.slice().sort(), '洗牌不丢元素')

// 3) pickMany 数量与唯一性
const p = pickMany(arr, 3, mulberry32(9))
assert.equal(p.length, 3, 'pickMany 数量')
assert.equal(new Set(p).size, 3, 'pickMany 无重复')

// 4) normalizeText:忽略标点/大小写
assert.equal(normalizeText('Hello, World!'), 'helloworld', '归一化去标点')
assert.equal(normalizeText("What's up?"), normalizeText("whats up"), '撇号等价处理')

// 5) 每日计划:10 题、8 选择 + 2 拼写、选项含正确答案且不重复
const words = Array.from({ length: 12 }, (_, i) => ({ word: `word${i + 1}`, cn: `释义${i + 1}` }))
const plan = buildDailyPlan(words, mulberry32(20260816))
assert.equal(plan.length, 10, '每日计划 10 题')
assert.equal(plan.filter((q) => q.kind === 'choice').length, 8, '8 道选择题')
assert.equal(plan.filter((q) => q.kind === 'spell').length, 2, '2 道拼写题')
for (const q of plan.filter((x) => x.kind === 'choice')) {
  assert.ok(q.options.includes(q.cn), '选项包含正确答案')
  assert.equal(new Set(q.options).size, 4, '选项 4 个且不重复')
}

// 6) 日期种子:同一天稳定
const d1 = dateSeed(new Date(2026, 7, 16))
const d2 = dateSeed(new Date(2026, 7, 17))
assert.equal(d1, 20260816, '日期种子 YYYYMMDD')
assert.equal(d2 - d1, 1, '日期种子按天递增')

console.log('P5-3 游戏纯函数断言: 全部通过 ✔')
console.log('  可复现随机 ✔ · 洗牌/抽样 ✔ · 归一化 ✔ · 每日计划 8选择+2拼写 ✔ · 日期种子 ✔')
