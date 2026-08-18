// 词典 lemma / 前缀搜索自测(零依赖):node scripts/selftest_dict.mjs
import assert from 'node:assert/strict'

globalThis.fetch = async (url) => {
  const u = String(url)
  if (u.includes('dict/l.json')) {
    return {
      ok: true,
      json: async () => [
        { word: 'light', phon: '', trans: [{ pos: 'n', cn: '光' }], sentences: [], phrases: [] },
        { word: 'like', phon: '', trans: [{ pos: 'v', cn: '喜欢' }], sentences: [], phrases: [] },
        { word: 'bank', phon: '', trans: [{ pos: 'n', cn: '银行' }], sentences: [], phrases: [] },
      ],
    }
  }
  return { ok: false, json: async () => [] }
}

const { lemmaCandidates, searchDict } = await import('../src/lib/dict.ts')

/* 1) lemma:原词精确优先 */
const news = lemmaCandidates('news')
assert.equal(news[0], 'news', 'news 原词第一')
assert.ok(news.includes('news'), 'news 在候选里')
assert.ok(!news.includes('new') || news.indexOf('news') < news.indexOf('new'), 'new 不得排在 news 前')

assert.equal(lemmaCandidates('building')[0], 'building', 'building 原词第一')
assert.equal(lemmaCandidates('left')[0], 'left', 'left 原词第一(不规则 leave 在后)')

const went = lemmaCandidates('went')
assert.equal(went[0], 'went', 'went 原词第一')
assert.ok(went.includes('go'), 'went 含 go')

assert.ok(lemmaCandidates('running').includes('run'), 'running → run')
assert.ok(lemmaCandidates('tries').includes('try'), 'tries → try')
assert.ok(lemmaCandidates('photos').includes('photo'), 'photos → photo')
assert.equal(lemmaCandidates('interesting')[0], 'interesting', 'interesting 不剥 -ing 抢先、不剥 -ly')

/* 2) searchDict:短查询 / 前缀 / 精确优先 */
const emptyA = await searchDict('a')
assert.deepEqual(emptyA, [], '长度<2 返回空')
const emptySp = await searchDict('  ')
assert.deepEqual(emptySp, [], '空白返回空')

const li = await searchDict('li')
assert.deepEqual(li.map((e) => e.word), ['light', 'like'], 'li 前缀命中 light/like')
assert.equal(li.some((e) => e.word === 'bank'), false, 'li 不含 bank')

const exact = await searchDict('light')
assert.equal(exact[0]?.word, 'light', '精确命中 light 排第一')

console.log('词典 lemma / 搜索断言: 全部通过 ✔')
console.log('  news/building/left 原词优先 ✔ · went→go · running→run · tries→try · photos→photo · interesting 不误剥 ✔')
console.log('  searchDict 短查询空 · li 前缀 · light 精确第一 ✔')
