// P4-2 数据迁移与跨标签页同步自测(零依赖):node scripts/selftest_storage.mjs
// 验证:旧备份导入补默认值 / 嵌套字段迁移 / 新备份往返无迁移项 /
//       跨标签页 storage 事件后缓存失效并读到另一页新数据。
import assert from 'node:assert/strict'

// 先 mock 浏览器环境,再动态导入 storage.ts(模块级 storage 监听才会注册)
globalThis.window = { addEventListener: (type, fn) => { globalThis.__storageListener = fn } }
globalThis.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] ?? null },
  setItem(k, v) { this._store[k] = v },
}
const { migrateBackup, DEFAULT_DATA, loadData, saveData } = await import('../src/lib/storage.ts')

// 1) M1 时代的旧备份(只有 progress + 精简 aiConfig)
const old = {
  progress: { s1u1: { vocab: true, grammar: { done: true }, article: true, dialogue: { done: true }, listen: { done: true } } },
  aiConfig: { provider: 'deepseek', apiKey: 'sk-old' },
}
const m1 = migrateBackup(old)
assert.ok(m1, '旧备份应可迁移')
assert.equal(m1.data.plan, null, 'plan 补默认 null')
assert.deepEqual(m1.data.aiProfile.weakPoints, [], 'aiProfile.weakPoints 补空数组')
assert.deepEqual(m1.data.aiProfile.errors, [], 'aiProfile.errors 补空数组')
assert.deepEqual(m1.data.aiProfile.history, [], 'aiProfile.history 补空数组')
assert.deepEqual(m1.data.passageNotes, {}, 'passageNotes 补空对象')
assert.deepEqual(m1.data.writingFeedback, {}, 'writingFeedback 补空对象')
assert.equal(m1.data.aiConfig.proxyBase, '', 'aiConfig.proxyBase 补默认')
assert.equal(m1.data.aiConfig.apiFormat, 'chat', 'aiConfig.apiFormat 补默认')
assert.equal(m1.data.tts.engine, 'browser', '旧备份 tts.engine 补默认 browser')
assert.equal(m1.data.tts.voiceId, 'en_US-lessac-medium', '旧备份 tts.voiceId 补默认')
assert.deepEqual(m1.data.wordbook, [], 'wordbook 补空数组')
assert.ok(m1.migrated.includes('plan') && m1.migrated.includes('aiProfile'), '迁移清单包含缺失顶层字段')
assert.ok(m1.migrated.includes('aiConfig.proxyBase') && m1.migrated.includes('aiConfig.apiFormat'), '迁移清单包含 aiConfig 嵌套字段')
assert.equal(m1.data.progress.s1u1.grammar.done, true, '原字段保留')

// 2) 部分画像字段的备份
const m2 = migrateBackup({ progress: {}, aiConfig: {}, aiProfile: { level: 'B1' }, plan: null })
assert.equal(m2.data.aiProfile.level, 'B1', '已有画像级别保留')
assert.deepEqual(m2.data.aiProfile.errors, [], '缺失 errors 补默认')

// 3) 非法备份
assert.equal(migrateBackup(null), null, 'null 拒绝')
assert.equal(migrateBackup({ foo: 1 }), null, '无 progress/aiConfig 拒绝')

// 4) 当前版本完整导出往返:不应产生迁移项
const current = {
  progress: {}, wordbook: [], wordStates: {}, aiConfig: { provider: 'deepseek', baseURL: 'https://x', apiKey: '', model: 'm', enabled: false, apiFormat: 'chat', proxyBase: '' },
  aiProfiles: [], gameBest: {}, gameAiNotes: {}, libraryFlags: {},
  tts: { engine: 'browser', voiceId: 'en_US-lessac-medium', rate: 0.95, piperBase: 'http://127.0.0.1:5000', autoReadAi: false },
  myArticles: [], aiWordCache: {}, passageNotes: {},
  aiProfile: { level: 'B1', weakPoints: ['时态'], errors: [], history: [], memories: [] },
  plan: null, planCheckins: {}, writingFeedback: {},
  practiceCache: {},
  stats: { xp: 0, level: 1, streak: 0, lastActiveDay: '', activityLog: {}, achievements: [] },
}
const m4 = migrateBackup(current)
assert.ok(m4, '当前备份可迁移')
assert.equal(m4.migrated.length, 0, '当前备份不应有迁移项')

// 4b) P5-1 旧版 tts({voiceURI, rate})自动迁移
const m5 = migrateBackup({ progress: {}, aiConfig: {}, tts: { voiceURI: 'Google US English', rate: 1.1 } })
assert.ok(m5, '旧 tts 备份可迁移')
assert.equal(m5.data.tts.engine, 'system', '旧版选过系统音色 → engine=system 保留其选择')
assert.equal(m5.data.tts.voiceId, 'Google US English', '旧 voiceURI → voiceId')
assert.equal(m5.data.tts.rate, 1.1, '旧 rate 保留')
assert.ok(m5.migrated.includes('tts.voiceURI→voiceId'), '迁移清单标注 voiceURI→voiceId')

// 4c) P5-2:旧 wordbook → 词汇池 learning 态;aiProfiles 补默认并清洗非法条目
const m6 = migrateBackup({
  progress: {}, aiConfig: {}, wordbook: ['Apple', 'banana'],
  aiProfiles: [
    { id: 'p1', name: '主力', createdAt: 1, updatedAt: 2, config: { provider: 'deepseek', baseURL: 'https://x', apiKey: 'sk-1', model: 'deepseek-chat', enabled: true } },
    { id: 'bad', name: 123, createdAt: 1, updatedAt: 2, config: null },
  ],
})
assert.ok(m6, 'P5-2 备份可迁移')
assert.equal(m6.data.wordStates['apple'].status, 'learning', '旧 wordbook 词转 learning 态(小写归一)')
assert.equal(m6.data.wordStates['banana'].sources[0], 'wordbook', '来源标注 wordbook')
assert.ok(m6.migrated.includes('wordbook→wordStates(2)'), '迁移清单标注 wordbook 转换数量')
assert.equal(m6.data.aiProfiles.length, 1, '非法档案被丢弃')
assert.equal(m6.data.aiProfiles[0].config.apiFormat, 'chat', '档案 config 补默认 apiFormat')

console.log('迁移断言: 全部通过 ✔')
console.log(`  旧备份迁移清单示例: ${m1.migrated.slice(0, 8).join(', ')} …`)

// 5) 跨标签页同步机制模拟
saveData({ ...structuredClone(DEFAULT_DATA), progress: { s1u1: { vocab: true } } })
// 模拟另一个标签页写入并触发 storage 事件(本页缓存应失效并读到新数据)
globalThis.localStorage._store['english-learning-site:v1'] = JSON.stringify({
  progress: { s1u1: { vocab: true }, s2u1: { vocab: true } },
  aiConfig: {},
})
globalThis.__storageListener({ key: 'english-learning-site:v1' })
const after = loadData()
assert.ok(after.progress.s2u1 && after.progress.s2u1.vocab === true, '跨标签页 storage 事件后应读到另一页的新进度')

console.log('跨标签页同步模拟: ✔ 另一页写入后本页 loadData 即时可见新进度')
