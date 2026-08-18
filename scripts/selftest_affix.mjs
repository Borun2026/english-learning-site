// P5-4 词根测验 + 今日一篇纯函数自测(零依赖):node scripts/selftest_affix.mjs
import assert from 'node:assert/strict'

const { makeAffixQuiz } = await import('../src/lib/affixCore.ts')
const { pickDailyId } = await import('../src/lib/daily.ts')

const items = [
  { affix: 'un-', type: 'prefix', meaning: '不,相反', examples: ['unhappy', 'unfair'], count: 10 },
  { affix: 're-', type: 'prefix', meaning: '再次,回', examples: ['rewrite', 'return'], count: 20 },
  { affix: 'pre-', type: 'prefix', meaning: '在前,预先', examples: ['preview'], count: 8 },
  { affix: '-able', type: 'suffix', meaning: '可…的', examples: ['readable'], count: 12 },
  { affix: '-tion', type: 'suffix', meaning: '行为,状态', examples: ['action'], count: 15 },
  { affix: 'port', type: 'root', meaning: '搬运', examples: ['export', 'import'], count: 6 },
]

/* 1) 同种子可复现 */
const a = makeAffixQuiz(items, 4, 42)
const b = makeAffixQuiz(items, 4, 42)
assert.deepEqual(a, b, '同种子词根测验一致')
assert.equal(a.length, 4, '恰好 4 题')

/* 2) 选项含正确答案、不重复、长度 4 */
for (const q of a) {
  assert.equal(q.options.length, 4, '四选一')
  assert.equal(new Set(q.options).size, 4, '选项不重复')
  assert.ok(q.options.includes(q.meaning), '选项含正确含义')
  assert.ok(q.examples.length >= 1, '带例句')
}

/* 3) 题库过小返回空 */
assert.deepEqual(makeAffixQuiz(items.slice(0, 3), 4, 1), [], '不足 5 条不出题')

/* 4) 今日一篇:同一天稳定、跨天可换、空列表空 */
const ids = ['econ-001', 'econ-002', 'ny-001', 'time-001']
assert.equal(pickDailyId(ids, 20260816), pickDailyId(ids, 20260816), '同一天同一篇')
assert.ok(ids.includes(pickDailyId(ids, 20260816)), '抽中的 id 在列表内')
assert.equal(pickDailyId([], 20260816), null, '空列表返回 null')
const set = new Set([pickDailyId(ids, 1), pickDailyId(ids, 2), pickDailyId(ids, 3), pickDailyId(ids, 4)])
assert.ok(set.size >= 2, '不同日期能换到不同篇')

console.log('P5-4 词根测验 / 今日一篇断言: 全部通过 ✔')
