// audit_content.js —— 内容深度审计(比 validate_content.py 更细的统计与一致性检查)
// 用法: node scripts/audit_content.js [--zhenti]
// 退出码: 0 = 无 ERROR;1 = 存在 ERROR(ERROR 为硬性缺陷:结构损坏/重复/缺失)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = path.join(ROOT, 'public', 'content')

const errors = []
const warnings = []

const err = (msg) => { errors.push(msg); console.log('  [ERR]', msg) }
const warn = (msg) => { warnings.push(msg); console.log('  [WARN]', msg) }

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const tokenize = (text) => (text.toLowerCase().match(/[a-z']+/g) ?? [])

// 已人工复核的专有名词(人名/地名)白名单:命中只统计、不告警。
// 复核记录见 docs/content-review-log.md(2026-08-16 建立)。
const REVIEWED_PROPER_NOUNS = new Set(['li', 'hua', 'beijing', 'wang', 'ming', 'ping', 'amy'])

/* ---------- 词库 ---------- */
const bankDir = path.join(CONTENT, 'wordbank')
const bank = new Map() // word -> entry
let bankOrderIssues = 0
for (const fn of fs.readdirSync(bankDir)) {
  if (!/^[a-z]\.json$/.test(fn)) continue
  const arr = readJson(path.join(bankDir, fn))
  let last = -1
  const seen = new Set()
  for (const e of arr) {
    const w = e.word?.toLowerCase()
    if (!w) { err(`wordbank/${fn}: 存在缺 word 的条目`); continue }
    if (seen.has(w)) { err(`wordbank/${fn}: 单词重复 ${w}`); continue }
    seen.add(w)
    if (bank.has(w)) { err(`wordbank: 跨文件重复 ${w}`); continue }
    bank.set(w, e)
    if (typeof e.order !== 'number') err(`wordbank/${fn}: ${w} 缺 order`)
    if (e.order < last) bankOrderIssues++
    last = Math.max(last, e.order ?? -1)
    if (!e.cn) warn(`wordbank/${fn}: ${w} 缺 cn`)
  }
}
const bankMeta = readJson(path.join(bankDir, 'meta.json'))
console.log(`词库: ${bank.size} 词(meta=${bankMeta.total}) | 顺序异常 ${bankOrderIssues} 处`)
if (bank.size !== bankMeta.total) err(`词库词数与 meta.total 不一致: ${bank.size} vs ${bankMeta.total}`)

/* ---------- 词典 ---------- */
const dictDir = path.join(CONTENT, 'dict')
let dictCount = 0
let dictMissing = 0
let dictPolysemy = 0
let dictWithEn = 0
for (const fn of fs.readdirSync(dictDir)) {
  if (!/^[a-z]\.json$/.test(fn)) continue
  const arr = readJson(path.join(dictDir, fn))
  dictCount += arr.length
  const seen = new Set()
  for (const e of arr) {
    const w = e.word?.toLowerCase()
    if (!w) { err(`dict/${fn}: 存在缺 word 的条目`); continue }
    if (seen.has(w)) { err(`dict/${fn}: 单词重复 ${w}`); continue }
    seen.add(w)
    if (!e.phon && !e.trans?.length) dictMissing++
    if (!Array.isArray(e.trans)) {
      err(`dict/${fn}: ${w} trans 不是数组`)
    } else {
      const tseen = new Set()
      for (const t of e.trans) {
        if (!t?.cn) err(`dict/${fn}: ${w} trans 缺 cn`)
        const key = `${String(t?.pos ?? '').trim().toLowerCase()}\0${String(t?.cn ?? '').trim()}`
        if (tseen.has(key)) err(`dict/${fn}: ${w} 义项重复`)
        tseen.add(key)
      }
      if (e.trans.length > 1) dictPolysemy++
      if (e.trans.some((t) => t?.en)) dictWithEn++
    }
  }
}
console.log(`词典: ${dictCount} 词 | 缺音标且缺释义 ${dictMissing} 条 | 多义项 ${dictPolysemy} | 有英英 ${dictWithEn}`)

/* ---------- 词形还原(词库只收原形) ---------- */
const IRREGULAR_BASE = {
  went: 'go', gone: 'go', going: 'go', goes: 'go',
  was: 'be', were: 'be', been: 'be', being: 'be', am: 'be', is: 'be', are: 'be',
  had: 'have', has: 'have', having: 'have',
  did: 'do', does: 'do', done: 'do', doing: 'do',
  drank: 'drink', drunk: 'drink', ate: 'eat', eaten: 'eat',
  took: 'take', taken: 'take', taking: 'take',
  came: 'come', coming: 'come', felt: 'feel', feeling: 'feel',
  got: 'get', gotten: 'get', getting: 'get',
  gave: 'give', given: 'give', giving: 'give',
  kept: 'keep', keeping: 'keep', made: 'make', making: 'make',
  met: 'meet', meeting: 'meet', saw: 'see', seen: 'see', seeing: 'see',
  sent: 'send', sending: 'send', told: 'tell', telling: 'tell',
  brought: 'bring', bringing: 'bring', tried: 'try', tries: 'try', trying: 'try',
  planned: 'plan', planning: 'plan', built: 'build', building: 'build',
  said: 'say', says: 'say', saying: 'say', ran: 'run', running: 'run',
  spoke: 'speak', spoken: 'speak', speaking: 'speak',
  wrote: 'write', written: 'write', writing: 'write',
  bought: 'buy', buying: 'buy', thought: 'think', thinking: 'think',
  knew: 'know', known: 'know', knowing: 'know',
  found: 'find', finding: 'find', left: 'leave', leaving: 'leave',
  became: 'become', began: 'begin', begun: 'begin',
  broke: 'break', broken: 'break', chose: 'choose', chosen: 'choose',
  drove: 'drive', driven: 'drive', flew: 'fly', flown: 'fly',
  forgot: 'forget', forgotten: 'forget', hid: 'hide', hidden: 'hide',
  rode: 'ride', ridden: 'ride', rose: 'rise', risen: 'rise',
  shook: 'shake', shaken: 'shake', showed: 'show', shown: 'show',
  sang: 'sing', sung: 'sing', swam: 'swim', swum: 'swim',
  threw: 'throw', thrown: 'throw', wore: 'wear', worn: 'wear',
  won: 'win', winning: 'win', cannot: 'can',
  loaves: 'loaf', bigger: 'big', biggest: 'big',
  earlier: 'early', earliest: 'early', photos: 'photo',
}

function lemmas(w) {
  const set = []
  const add = (x) => { if (x.length > 1 && x !== w && !set.includes(x)) set.push(x) }
  if (IRREGULAR_BASE[w]) add(IRREGULAR_BASE[w])
  if (w.endsWith('ies') && w.length > 4) add(w.slice(0, -3) + 'y')
  if (w.endsWith('es')) { add(w.slice(0, -2)); add(w.slice(0, -1)) }
  if (w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1))
  if (w.endsWith('ing') && w.length > 5) { add(w.slice(0, -3)); add(w.slice(0, -3) + 'e') }
  if (w.endsWith('ed') && w.length > 4) { add(w.slice(0, -2)); add(w.slice(0, -1)) }
  if (w.endsWith('er') && w.length > 4) add(w.slice(0, -2))
  if (w.endsWith('est') && w.length > 5) add(w.slice(0, -3))
  if (w.endsWith('ly') && w.length > 4) add(w.slice(0, -2))
  if (w.endsWith('ful') && w.length > 6) add(w.slice(0, -3))
  return set
}

/* ---------- 课程 ---------- */
const idx = readJson(path.join(CONTENT, 'curriculum', 'index.json'))
const units = idx.stages.flatMap((s) => s.units)
const STAGE_RATE = { 1: 0.75, 2: 0.85, 3: 0.95, 4: 1.0, 5: 1.1 }
const STAGE_ROUNDS = { 1: [2], 2: [3], 3: [3, 4], 4: [4], 5: [4, 5] }

let articleStats = { noCn: 0, chunkGap: 0, unusedNew: 0, noGrammar: 0 }
let quizStats = { total: 0 }
let dialogueStats = { unreachable: 0, noFail: 0, noSuccess: 0 }
let listenStats = { badCorrect: 0, leak: 0, badRate: 0, badRounds: 0 }
let newWordStats = { orderMismatch: 0, tooLate: 0, missing: 0, proper: 0, resolvedOk: 0 }
const tooLateList = []
const poolMismatchByUnit = new Map()
let examStats = { sets: 0, questions: 0, bad: 0, missing: 0 }
let v2Stats = { sentences: 0, withTags: 0, withExercises: 0, exercises: 0, lessonGrammar: 0 }

const inRange = (u, order) => order >= u.wordRange[0] && order < u.wordRange[1]

for (const u of units) {
  const dir = path.join(CONTENT, 'curriculum', u.id)

  /* article */
  const a = readJson(path.join(dir, 'article.json'))
  const d = readJson(path.join(dir, 'dialogue.json'))
  const l = readJson(path.join(dir, 'listen.json'))
  const g = readJson(path.join(dir, 'grammar.json'))
  const allTextRaw = (
    a.sentences.map((s) => s.text).join(' ') + ' ' +
    Object.values(d.nodes).map((n) => n.line).join(' ') + ' ' +
    l.rounds.map((r) => r.line).join(' ') + ' ' +
    (g.examples ?? []).map((e) => e.en).join(' ')
  )
  const allText = allTextRaw.toLowerCase()
  const properNames = new Set(
    (allTextRaw.match(/[A-Z][a-z]+/g) ?? []).map((x) => x.toLowerCase()),
  )

  const declared = new Map()
  for (const w of a.newWords) {
    const key = w.toLowerCase()
    if (declared.has(key)) { err(`${u.id}/article: newWords 重复 ${w}`); continue }
    declared.set(key, w)
    const exact = bank.get(key)
    const candidates = exact
      ? [exact]
      : lemmas(key).map((x) => bank.get(x)).filter(Boolean).sort((x, y) => x.order - y.order)
    if (!candidates.length) {
      if (properNames.has(key) || REVIEWED_PROPER_NOUNS.has(key)) {
        newWordStats.proper++
        // 已人工复核的专有名词不告警(复核记录见 docs/content-review-log.md)
        if (!REVIEWED_PROPER_NOUNS.has(key)) {
          warn(`${u.id}/article: newWords「${w}」不在词库(按专有名词处理)`)
        }
      } else {
        newWordStats.missing++
        err(`${u.id}/article: newWords「${w}」不在词库且找不到原形,点击查词将无结果`)
      }
      continue
    }
    const base = candidates[0]
    if (inRange(u, base.order)) {
      newWordStats.resolvedOk++
    } else {
      // 词库按 (词书, 词书内排名) 排序,与真实教学顺序并不完全一致(如 hello 排名 1880),
      // 因此 order 与单元词池不一致只作人工复核提示,不视为硬错误。
      newWordStats.orderMismatch++
      poolMismatchByUnit.set(u.id, (poolMismatchByUnit.get(u.id) ?? 0) + 1)
      if (base.order >= u.wordRange[1]) {
        newWordStats.tooLate++
        tooLateList.push(`${u.id}:「${w}」${exact ? '' : `(原形 ${base.word})`}order=${base.order} 超出词池 ${u.wordRange}`)
      }
    }
  }
  for (const w of declared.keys()) {
    if (!allText.includes(w)) {
      articleStats.unusedNew++
      warn(`${u.id}/article: newWords「${w}」在本单元文章/对话/听力/例句中均未出现(词汇预习为无效词)`)
    }
  }
  if (a.lessonGrammar?.length) v2Stats.lessonGrammar += a.lessonGrammar.length
  a.sentences.forEach((s, si) => {
    v2Stats.sentences++
    if (s.grammarTags?.length) v2Stats.withTags++
    if (s.exercises?.length) {
      v2Stats.withExercises++
      v2Stats.exercises += s.exercises.length
    }
    if (!s.translation?.trim()) { articleStats.noCn++; err(`${u.id}/article: sentences[${si}] 缺翻译`) }
    if (!s.grammar?.length) articleStats.noGrammar++
    const covered = tokenize(s.chunks.map((c) => c.text).join(' '))
    const tokens = tokenize(s.text)
    if (covered.join(' ') !== tokens.join(' ')) {
      articleStats.chunkGap++
      warn(`${u.id}/article: sentences[${si}] chunks 与整句 token 不一致`)
    }
    const lowerText = s.text.toLowerCase()
    let pos = 0
    for (const c of s.chunks) {
      const at = lowerText.indexOf(c.text.toLowerCase(), pos)
      if (at < 0) warn(`${u.id}/article: sentences[${si}] chunk「${c.text.slice(0, 30)}」非原句连续片段`)
      else pos = at + c.text.length
    }
  })

  /* grammar */
  quizStats.total += g.quiz.length
  if (g.quiz.length !== 5) warn(`${u.id}/grammar: quiz ${g.quiz.length} 题(应为 5)`)
  if (!g.explanation?.trim()) err(`${u.id}/grammar: explanation 为空`)
  if (!g.examples?.length) warn(`${u.id}/grammar: 无例句`)
  g.quiz.forEach((q, qi) => {
    if (q.answer < 0 || q.answer >= q.options.length) err(`${u.id}/grammar: quiz[${qi}] answer 越界`)
    if (!q.note?.trim()) warn(`${u.id}/grammar: quiz[${qi}] 缺解析`)
  })

  /* dialogue */
  const reach = new Set([d.start])
  let changed = true
  while (changed) {
    changed = false
    for (const nid of [...reach]) {
      for (const o of d.nodes[nid]?.options ?? []) {
        if (o.next && !reach.has(o.next)) { reach.add(o.next); changed = true }
      }
    }
  }
  const ends = Object.values(d.nodes).filter((n) => n.end)
  if (!ends.some((n) => n.success)) { dialogueStats.noSuccess++; err(`${u.id}/dialogue: 缺少 success 结局`) }
  if (!ends.some((n) => n.success === false)) { dialogueStats.noFail++; warn(`${u.id}/dialogue: 缺少明确 fail 结局`) }
  for (const nid of Object.keys(d.nodes)) {
    if (!reach.has(nid)) { dialogueStats.unreachable++; warn(`${u.id}/dialogue: 节点 ${nid} 从 start 不可达`) }
  }

  /* listen */
  if (l.rate !== STAGE_RATE[u.stage]) { listenStats.badRate++; warn(`${u.id}/listen: rate=${l.rate}(阶段建议 ${STAGE_RATE[u.stage]})`) }
  if (!STAGE_ROUNDS[u.stage].includes(l.rounds.length)) { listenStats.badRounds++; warn(`${u.id}/listen: ${l.rounds.length} 轮(阶段建议 ${STAGE_ROUNDS[u.stage].join('/')})`) }
  l.rounds.forEach((r, ri) => {
    if (r.options.filter((o) => o.correct).length !== 1) { listenStats.badCorrect++; err(`${u.id}/listen: round[${ri}] 正确项 != 1`) }
    for (const o of r.options) {
      const x = o.text.toLowerCase()
      const y = r.line.toLowerCase()
      if (x.includes(y) || y.includes(x)) { listenStats.leak++; warn(`${u.id}/listen: round[${ri}] 台词与选项疑似互含`) }
    }
  })

  /* exam(语法精读 v2:每单元真题组,批量补充中) */
  const examPath = path.join(dir, 'exam.json')
  if (fs.existsSync(examPath)) {
    try {
      const e = readJson(examPath)
      examStats.sets++
      e.questions.forEach((q, qi) => {
        examStats.questions++
        if (!(q.answer >= 0 && q.answer < q.options.length)) {
          examStats.bad++
          err(`${u.id}/exam: questions[${qi}] answer 越界`)
        }
        if (!q.analysis?.trim()) warn(`${u.id}/exam: questions[${qi}] 缺解析`)
      })
    } catch {
      err(`${u.id}/exam.json: JSON 解析失败`)
    }
  } else {
    examStats.missing++
  }
}

console.log(`\n课程统计:`)
console.log(`  文章: 缺翻译 ${articleStats.noCn} | chunks 不一致 ${articleStats.chunkGap} | 全单元未复现的新词 ${articleStats.unusedNew} | 缺语法点句子 ${articleStats.noGrammar}`)
console.log(`  newWords: 词池一致 ${newWordStats.resolvedOk} | 词池不一致(人工复核) ${newWordStats.orderMismatch}(其中超出词池 ${newWordStats.tooLate}) | 专有名词 ${newWordStats.proper} | 完全缺失 ${newWordStats.missing}`)
console.log(`  语法: ${units.length} 课 / ${quizStats.total} 题`)
console.log(`  语法精读 v2: ${v2Stats.sentences} 句 | 带语法标签 ${v2Stats.withTags} 句 | 带练习 ${v2Stats.withExercises} 句(${v2Stats.exercises} 题) | 速览条目 ${v2Stats.lessonGrammar}`)
console.log(`  真题组: ${examStats.sets}/48 单元 | ${examStats.questions} 题 | 异常 ${examStats.bad}`)
console.log(`  对话: 不可达节点 ${dialogueStats.unreachable} | 缺 success ${dialogueStats.noSuccess} | 缺 fail ${dialogueStats.noFail}`)
console.log(`  听力: 正确项异常 ${listenStats.badCorrect} | 疑似泄题 ${listenStats.leak} | rate 偏离 ${listenStats.badRate} | 轮次偏离 ${listenStats.badRounds}`)
const mismatchUnits = [...poolMismatchByUnit.entries()].sort((a, b) => b[1] - a[1])
if (mismatchUnits.length) {
  console.log(`\nnewWords 与本单元词池不一致的单元(共 ${newWordStats.orderMismatch} 词,词库按词书排名排序≠教学顺序,请人工复核):`)
  for (const [uid, n] of mismatchUnits) console.log(`   ${uid}: ${n} 词`)
}
if (tooLateList.length) {
  console.log(`\n超出词池的新词明细(共 ${tooLateList.length}):`)
  tooLateList.forEach((t) => console.log('   ' + t))
}

/* ---------- 真题 ---------- */
if (process.argv.includes('--zhenti')) {
  const zdir = path.join(CONTENT, 'zhenti')
  let qTotal = 0
  let qMissing = 0
  let qNoAnalysis = 0
  let clozeBad = 0
  for (const y of fs.readdirSync(zdir)) {
    if (!/^\d{4}$/.test(y)) continue
    for (const fn of fs.readdirSync(path.join(zdir, y))) {
      if (!fn.endsWith('.json')) continue
      const z = readJson(path.join(zdir, y, fn))
      for (const q of z.questions ?? []) {
        qTotal++
        if (![0, 1, 2, 3].includes(q.answer)) qMissing++
        if (!q.analysis?.trim()) qNoAnalysis++
      }
      if (z.section === 'cloze') {
        const blanks = (z.sentences.map((s) => s.text).join(' ').match(/___(\d+)___/g) ?? []).map((b) => Number(b.slice(3, -3)))
        if (blanks.join(',') !== Array.from({ length: 20 }, (_, i) => i + 1).join(',')) clozeBad++
      }
    }
  }
  console.log(`\n真题: ${qTotal} 题 | 缺答案 ${qMissing} | 缺解析 ${qNoAnalysis} | 空位异常 ${clozeBad} 篇`)
  if (qMissing) err(`真题: ${qMissing} 题缺答案`)
  if (clozeBad) err(`真题: ${clozeBad} 篇完形空位异常`)

  // CET-6 语篇与杂志文章
  const cetDir = path.join(zdir, 'cet6')
  const cetIdx = readJson(path.join(cetDir, 'cet6-index.json'))
  let cetMissing = 0
  let cetWords = 0
  for (const it of cetIdx.items) {
    const p = path.join(cetDir, `${it.id}.json`)
    if (!fs.existsSync(p)) { cetMissing++; continue }
    const a = readJson(p)
    cetWords += a.paragraphs?.reduce((s, x) => s + x.split(' ').length, 0) ?? 0
  }
  const magIdx = readJson(path.join(CONTENT, 'intensive', 'reading', 'magazine', 'index.json'))
  let magMissing = 0
  for (const it of magIdx.items) {
    if (!fs.existsSync(path.join(CONTENT, 'intensive', 'reading', 'magazine', `${it.id}.json`))) magMissing++
  }
  console.log(`CET-6 语篇: ${cetIdx.items.length} 篇 / ${cetWords.toLocaleString()} 词 | 缺文件 ${cetMissing} | 杂志文章 ${magIdx.items.length} 篇 | 缺文件 ${magMissing}`)
  if (cetMissing) err(`CET-6 语篇缺文件 ${cetMissing}`)
  if (magMissing) err(`杂志文章缺文件 ${magMissing}`)
}

/* ---------- NCE 精读库 ---------- */
const nceIdx = readJson(path.join(CONTENT, 'intensive', 'nce', 'index.json'))
{
  let nceMissing = 0
  let nceChars = 0
  for (const b of nceIdx.books) {
    for (const l of b.lessons) {
      const fp = path.join(CONTENT, 'intensive', 'nce', b.id, `${l.id.replace(`${b.id}-`, '')}.json`)
      if (!fs.existsSync(fp)) { nceMissing++; continue }
      nceChars += fs.readFileSync(fp, 'utf8').length
    }
  }
  console.log(`NCE 精读库: ${nceIdx.books.reduce((a, b) => a + b.lessons.length, 0)} 课 / ${(nceChars / 1024).toFixed(0)} KB | 缺文件 ${nceMissing}`)
  if (nceMissing) err(`NCE 精读库缺文件 ${nceMissing}`)
}

console.log(`\n==== 结果: ${errors.length} 错误, ${warnings.length} 警告 ====`)
process.exit(errors.length ? 1 : 0)
