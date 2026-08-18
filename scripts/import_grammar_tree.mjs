// import_grammar_tree.mjs —— 把 Nikola-Ver/English-grammar-tree 的 TS 数据编译为 JSON
// 输出: public/content/grammar-reference.json
//   - levels: CEFR 语法规则(已清洗俄文,只保留英文;命中平台 48 单元的规则附 unitId/中文主题)
//   - murphy: Murphy 三册单元(清洗俄文)
//   - tenses: 12 时态速查
//   - book: 中文语法书(由平台 48 单元 grammar.json 组成,并附各单元命中的外部规则 id)
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RAW = path.join(ROOT, 'raw_materials', 'grammar_tree')
const OUT = path.join(ROOT, 'public', 'content', 'grammar-reference.json')
const CURR = path.join(ROOT, 'public', 'content', 'curriculum')

async function bundleTs(p) {
  const res = await build({
    entryPoints: [p],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: false,
    logLevel: 'silent',
  })
  const tmp = path.join(ROOT, 'scripts', `.tmp_${path.basename(p)}.mjs`)
  fs.writeFileSync(tmp, res.outputFiles[0].text)
  const mod = await import('file://' + tmp.replace(/\\/g, '/') + '?t=' + Date.now())
  fs.unlinkSync(tmp)
  return mod
}

const hasCyrillic = (s) => /[\u0400-\u04FF]/.test(String(s ?? ''))

/** 去掉俄文:破折号后内容、纯俄文文本、俄文列表项 */
function cleanText(s) {
  if (!s) return ''
  let t = String(s).replace(/[—–].*$/, '').trim()
  return hasCyrillic(t) ? '' : t
}

function cleanMistakes(arr) {
  return (arr ?? []).filter((m) => !hasCyrillic(m)).map((m) => m.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function cleanRule(r) {
  const rawText = String(r.text ?? '')
  const text = cleanText(rawText)
  const note = cleanText(r.note)
  const exp = hasCyrillic(r.exp) ? '' : (r.exp ?? '')
  const markers = r.markers
    ? {
        tags: (r.markers.tags ?? []).filter((t) => !hasCyrillic(t)),
        note: hasCyrillic(r.markers.note) ? '' : (r.markers.note ?? ''),
      }
    : undefined
  return {
    id: r.id,
    text: text || `Rule ${r.id}`,
    mappable: !!text,
    note,
    exp,
    ex: (r.ex ?? []).map(([en]) => en).filter((x) => !hasCyrillic(x)),
    tip: cleanText(r.tip),
    mistakes: cleanMistakes(r.mistakes),
    markers,
  }
}

/** 俄文类别名只保留其中的英文词 */
function cleanCategoryName(name) {
  const en = String(name ?? '').split(/\s+/).filter((w) => !hasCyrillic(w)).join(' ')
  return en || 'Grammar'
}

function cleanLevel(lv) {
  return {
    id: lv.id,
    name: lv.id,
    sub: cleanText(lv.sub),
    categories: (lv.categories ?? []).map((c) => ({
      name: cleanCategoryName(c.name),
      rules: (c.rules ?? []).map(cleanRule),
    })),
  }
}

/* ---- 平台 48 单元 → 中文语法书 + 外部规则匹配 ---- */
const idx = JSON.parse(fs.readFileSync(path.join(CURR, 'index.json'), 'utf8'))
const units = idx.stages.flatMap((s) => s.units)

// 英文规则关键词 → 平台单元(顺序敏感,只用精确模式)
const TOPIC_MAP = [
  [/am\s+\/\s+is\s+\/\s+are/, 's1u1'],
  [/\bto be\b/, 's1u1'],
  [/present simple|simple present/, 's1u2'],
  [/present continuous|present progressive/, 's2u1'],
  [/past simple|simple past/, 's1u3'],
  [/past continuous/, 's2u1'],
  [/present perfect continuous/, 's2u2'],
  [/present perfect/, 's2u2'],
  [/past perfect/, 's2u3'],
  [/future|going to|will/, 's1u4'],
  [/passive/, 's2u6'],
  [/relative clause/, 's2u7'],
  [/comparative|superlative/, 's2u8'],
  [/modal/, 's1u8'],
  [/conditional|if clause|if-clause/, 's3u1'],
  [/wish|subjunctive/, 's3u2'],
  [/reported|noun clause/, 's3u5'],
  [/inversion/, 's3u6'],
  [/cleft|emphasis/, 's3u7'],
  [/participle|gerund|infinitive|non-finite/, 's3u3'],
  [/phrasal verb/, 's3u10'],
  [/preposition/, 's2u12'],
  [/determiner|quantifier/, 's3u12'],
  [/articles?\b/, 's1u5'],
  [/adjective|adverb/, 's1u7'],
  [/pronoun/, 's1u6'],
  [/complex sentence|long sentence/, 's4u1'],
]

function matchUnit(ruleText, category) {
  const hay = `${category} ${ruleText}`.toLowerCase()
  for (const [re, unitId] of TOPIC_MAP) {
    if (re.test(hay)) return unitId
  }
  return null
}

const chapters = []
const unitById = new Map(units.map((u) => [u.id, u]))
for (const u of units) {
  const g = JSON.parse(fs.readFileSync(path.join(CURR, u.id, 'grammar.json'), 'utf8'))
  chapters.push({
    id: g.grammarId || g.id,
    title: g.title,
    stage: g.stage,
    cefr: g.cefr ?? '',
    unitId: u.id,
    explanation: g.explanation,
    examples: g.examples,
    errors: g.errors,
    refs: g.refs ?? [],
    externalRuleIds: [],
  })
}

function attachToBook(rule, categoryName) {
  if (!rule.mappable) return null
  const uid = matchUnit(rule.text, categoryName)
  if (!uid) return null
  const ch = chapters.find((c) => c.unitId === uid)
  if (ch && !ch.externalRuleIds.includes(rule.id)) ch.externalRuleIds.push(rule.id)
  return uid
}

/* ---- 组装 ---- */
const mod = await bundleTs(path.join(RAW, 'grammar.ts'))
const DATA = mod.DATA ?? mod.default?.DATA
if (!Array.isArray(DATA)) throw new Error('grammar.ts 未导出 DATA')

const levels = DATA.map((lv) => {
  const clean = cleanLevel(lv)
  for (const c of clean.categories) {
    for (const r of c.rules) {
      const uid = attachToBook(r, c.name)
      if (uid) {
        const u = unitById.get(uid)
        r.unitId = uid
        r.grammarId = `g-${uid}`
        r.topicCn = u?.grammarTopic ?? ''
      }
    }
  }
  return clean
})

const murphyMod = await bundleTs(path.join(RAW, 'murphy_levels.ts'))
const murphy = ['ELEMENTARY_DATA', 'INTERMEDIATE_DATA', 'ADVANCED_DATA']
  .map((k) => murphyMod[k])
  .filter(Boolean)
  .map((lv) => {
    const clean = cleanLevel(lv)
    for (const c of clean.categories) {
      for (const r of c.rules) attachToBook(r, c.name)
    }
    return clean
  })

const tensesMod = await bundleTs(path.join(RAW, 'tenses.ts'))
const tenses = tensesMod.TENSES ?? {}

const ruleCount = levels.reduce((a, lv) => a + lv.categories.reduce((b, c) => b + c.rules.length, 0), 0)
const murphyCount = murphy.reduce((a, lv) => a + lv.categories.reduce((b, c) => b + c.rules.length, 0), 0)
const mapped = levels.reduce((a, lv) => a + lv.categories.reduce((b, c) => b + c.rules.filter((r) => r.unitId).length, 0), 0)

// 把所有外部规则按 id 建索引,供语法书章节内嵌英文例句/易错点
const ruleIndex = new Map()
for (const lv of [...levels, ...murphy]) {
  for (const c of lv.categories) {
    for (const r of c.rules) ruleIndex.set(r.id, r)
  }
}
for (const ch of chapters) {
  ch.external = ch.externalRuleIds.map((id) => ruleIndex.get(id)).filter(Boolean)
  delete ch.externalRuleIds
}

const out = {
  version: 2,
  source: 'Nikola-Ver/English-grammar-tree(俄文已清洗)+ 本平台中文语法书',
  levels,
  murphy,
  tenses,
  book: { chapters },
  stats: {
    levels: levels.length,
    rules: ruleCount,
    murphyBooks: murphy.length,
    murphyRules: murphyCount,
    tenses: Object.keys(tenses).length,
    mappedRules: mapped,
    chapters: chapters.length,
  },
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
console.log(`grammar-reference.json v2: rules=${ruleCount}(映射中文单元 ${mapped}) murphy=${murphyCount} tenses=${Object.keys(tenses).length} book=${chapters.length}章`)
