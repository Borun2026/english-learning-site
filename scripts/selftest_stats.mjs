// P5-5/6 纯函数自测:node scripts/selftest_stats.mjs
import assert from 'node:assert/strict'

globalThis.window = { addEventListener: () => {} }
globalThis.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] ?? null },
  setItem(k, v) { this._store[k] = v },
}

const { applyXp, levelOfXp, unlockAchievements, yesterdayKey, todayKey } = await import('../src/lib/stats.ts')
const { scoreShadow, tokenizeEn } = await import('../src/lib/shadow.ts')

const empty = { xp: 0, level: 1, streak: 0, lastActiveDay: '', activityLog: {}, achievements: [] }

assert.equal(levelOfXp(0), 1)
assert.equal(levelOfXp(40), 2)
assert.equal(levelOfXp(160), 3)

const d1 = '2026-08-16'
const d2 = '2026-08-17'
const a = applyXp(empty, 10, d1)
assert.equal(a.xp, 10)
assert.equal(a.streak, 1)
assert.equal(a.lastActiveDay, d1)
const b = applyXp(a, 5, d1)
assert.equal(b.streak, 1, '同一天不叠加连击')
assert.equal(b.xp, 15)
const c = applyXp(b, 5, d2)
assert.equal(c.streak, 2, '连续第二天连击 +1')
const d = applyXp(c, 5, '2026-08-20')
assert.equal(d.streak, 1, '中断后连击归 1')

assert.deepEqual(unlockAchievements({ ...empty, xp: 10, streak: 1 }), ['first-xp'])
assert.ok(unlockAchievements({ ...empty, xp: 100, streak: 3 }).includes('streak-3'))
assert.ok(unlockAchievements({ ...empty, xp: 0 }, { game: true }).includes('game-1'))

const sc = scoreShadow('The quick brown fox jumps over the lazy dog', 'the quick brown fox jumps')
assert.equal(sc.score > 40, true, '部分重合应有分')
assert.ok(sc.missed.includes('lazy') || sc.missed.includes('dog'))
assert.deepEqual(tokenizeEn("Don't stop."), ["don't", 'stop'])
assert.equal(scoreShadow('Hello there friend', 'hello there friend').score, 100)

assert.deepEqual(tokenizeEn('I have 3 apples'), ['have', '3', 'apples'])
assert.deepEqual(tokenizeEn('I have three apples'), ['have', '3', 'apples'])
assert.deepEqual(tokenizeEn('twenty-one students'), ['21', 'students'])
assert.equal(scoreShadow('I have 3 apples', 'I have three apples').accuracy, 100)
assert.equal(scoreShadow('twenty one students', '21 students').score, 100)
assert.equal(scoreShadow('two hundred five', '205').accuracy, 100)

const near = scoreShadow('beautiful jumps', 'beautifull jump')
assert.equal(near.accuracy, 0, '近形不算精确命中')
assert.equal(near.fuzzy, 100, '1 编辑距离应算模糊命中')
assert.equal(near.score, 50)

assert.equal(yesterdayKey(new Date('2026-08-16T12:00:00')), '2026-08-15')
assert.equal(todayKey(new Date('2026-08-16T12:00:00')), '2026-08-16')

console.log('P5-5/6 统计/跟读断言: 全部通过 ✔')
