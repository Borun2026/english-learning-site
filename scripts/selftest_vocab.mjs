// P5-2 词汇引擎自测(零依赖):node scripts/selftest_vocab.mjs
// 验证:SM-2 四档调度 / 入池与来源合并 / 错词当日重排队 / 到期队列 / 统计 / 提词
import assert from 'node:assert/strict'

globalThis.window = { addEventListener: () => {} }
globalThis.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] ?? null },
  setItem(k, v) { this._store[k] = v },
}

const { applySrs } = await import('../src/lib/srs.ts')
const { addWord, reviewWord, requeueWrongWord, dueTodayWords, dueWords, vocabStats, markMastered, extractWords, allWordStates, wordKey } = await import('../src/lib/vocab.ts')

/* 1) SM-2 纯函数 */
const fresh = { reps: 0, interval: 0, ef: 2.5, box: 1 }
const easy1 = applySrs(fresh, 'easy')
assert.deepEqual([easy1.reps, easy1.interval, easy1.box, easy1.status], [1, 5, 2, 'reviewing'], '新词 easy → 1 次/5 天/箱2/复习中')
const again1 = applySrs(fresh, 'again')
assert.equal(again1.reps, 0, 'again 连续记录清零')
assert.equal(again1.interval, 0, 'again 间隔归 0(调用方置 next=now → 当日队尾)')
assert.ok(Math.abs(again1.ef - 2.3) < 1e-9, 'again EF-0.2')
const hard1 = applySrs(fresh, 'hard')
assert.deepEqual([hard1.reps, hard1.interval, hard1.box], [1, 1, 1], '新词 hard → 1 次/1 天/箱不变')
let g = fresh
for (let i = 0; i < 4; i++) g = applySrs(g, 'good')
assert.equal(g.box, 5, '连续 good 4 次 → 箱 5')
assert.equal(g.status, 'mastered', '箱≥5 → mastered')
let e = fresh
for (let i = 0; i < 4; i++) e = applySrs(e, 'easy')
assert.equal(e.status, 'mastered', '连续 easy 4 次 → mastered')
assert.ok(e.ef <= 2.5, 'EF 上限 2.5')

/* 2) 入池 / 来源合并 / 归一化 */
const s1 = addWord('Apple', 'unit-vocab')
assert.equal(s1.word, 'apple', '词归一化小写')
assert.deepEqual(s1.sources, ['unit-vocab'], '来源记录')
addWord('APPLE', 'popup')
const appleState = allWordStates().find((s) => s.word === 'apple')
assert.deepEqual(appleState.sources, ['unit-vocab', 'popup'], '同词不同来源合并、不重复')

/* 3) 复习调度与错词重排队 */
const g1 = reviewWord('apple', 'good')
assert.equal(g1.reps, 1, 'good 后 reps=1')
assert.equal(g1.interval, 3, '新词 good → 3 天')
assert.equal(g1.status, 'reviewing', '状态转复习中')
const a1 = reviewWord('apple', 'again')
assert.equal(a1.wrongCount, 1, 'again 记错次数')
assert.ok(a1.next <= Date.now() + 1000, 'again 当日到期(队尾)')
assert.ok(dueTodayWords().some((s) => s.word === 'apple'), 'again 词出现在今日到期队列')

const w1 = requeueWrongWord('ExamWord', 'exam-wrong')
assert.equal(w1.wrongCount, 1, '错词新词 wrongCount=1')
requeueWrongWord('ExamWord', 'coach-wrong')
const examState = dueTodayWords().find((s) => s.word === 'examword')
assert.equal(examState.wrongCount, 2, '错词重排队累加')
assert.deepEqual(examState.sources.slice().sort(), ['coach-wrong', 'exam-wrong'].sort(), '错词多来源合并')

/* 4) 到期队列与统计 */
assert.ok(dueWords().length >= 2, 'dueWords 包含到期词')
const st = vocabStats()
assert.equal(st.total, 2, '统计总数')
assert.equal(st.dueToday, 2, '今日到期数')
assert.equal(st.learning, 2, '学习中(apple 被 again 打回 + ExamWord)')
assert.equal(st.reviewing, 0, '无复习中词')
assert.equal(st.mastered, 0, '尚未有掌握词')

/* 5) 快标掌握 */
const m = markMastered('QuickMaster', 'popup')
assert.equal(m.status, 'mastered', '快标 → 掌握')
assert.equal(m.box, 5, '快标 → 箱 5')
assert.equal(vocabStats().mastered, 1, '掌握数=1')
assert.equal(dueWords().some((s) => s.word === 'quickmaster'), false, '已掌握词不进到期队列')

/* 6) 提词(停用词过滤 + 去重 + 上限) */
const words = extractWords('The quick brown fox jumps over the lazy dog. The fox!')
assert.deepEqual(words, ['quick', 'brown', 'fox', 'jumps', 'lazy', 'dog'], '停用词过滤、去重')
assert.equal(wordKey("Don't"), "don't", '保留撇号')

console.log('P5-2 词汇引擎断言: 全部通过 ✔')
console.log(`  SM-2 四档调度 ✔ · 入池/来源合并 ✔ · 错词重排队 ✔ · 到期队列/统计 ✔ · 快标掌握 ✔ · 提词 ✔`)
