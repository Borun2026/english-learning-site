// import_cet.mjs —— 从 wangqiyue26-lab/english-reading 的 data.js 提取真题语篇与杂志文章
// 输出:
//   public/content/zhenti/cet6/{id}.json + cet6-index.json      (CET-6 真题语篇, 2024-2025)
//   public/content/intensive/reading/magazine/{id}.json + index.json (经济学人/纽约客/大西洋/连线)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'raw_materials', 'english_reading', 'data.js')
const CET_OUT = path.join(ROOT, 'public', 'content', 'zhenti', 'cet6')
const MAG_OUT = path.join(ROOT, 'public', 'content', 'intensive', 'reading', 'magazine')

const code = fs.readFileSync(SRC, 'utf8')
const Data = new Function(code + '\n; return Data;')()

/** 清理正文中的水印页码(如 "5  https://zhenti.burningvocabulary.cn")与完形空位 "( )" */
function cleanText(t) {
  return String(t ?? '')
    .replace(/\n?\s*\d+\s*https?:\/\/\S+/g, '\n')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s*\(\s*\)\s*/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function paragraphs(t) {
  return cleanText(t).split(/\n+/).map((p) => p.trim()).filter(Boolean)
}

function yearOf(journalZh) {
  const m = String(journalZh ?? '').match(/20\d{2}/)
  return m ? Number(m[0]) : null
}

const articles = Data.articles ?? []
const cet6 = articles.filter((a) => a.journalKey === 'cet6')
const mags = articles.filter((a) => a.journalKey !== 'cet6')

fs.mkdirSync(CET_OUT, { recursive: true })
fs.mkdirSync(MAG_OUT, { recursive: true })

const cetItems = []
for (const a of cet6) {
  const item = {
    id: a.id,
    type: 'cet6-passage',
    year: yearOf(a.journalZh),
    source: `${a.journalZh} · ${a.source ?? ''}`.trim(),
    title: a.title,
    difficulty: a.difficulty,
    difficultyLabel: a.difficultyLabel,
    wordCount: a.wordCount,
    tags: a.tags ?? [],
    paragraphs: paragraphs(a.content),
  }
  fs.writeFileSync(path.join(CET_OUT, `${a.id}.json`), JSON.stringify(item, null, 1))
  cetItems.push({ id: a.id, year: item.year, source: item.source, title: a.title, difficulty: a.difficulty, wordCount: a.wordCount })
}

const magItems = []
for (const a of mags) {
  const item = {
    id: a.id,
    type: 'magazine',
    journal: a.journal,
    journalEn: a.journalEn,
    title: a.title,
    date: a.date,
    difficulty: a.difficulty,
    difficultyLabel: a.difficultyLabel,
    wordCount: a.wordCount,
    tags: a.tags ?? [],
    paragraphs: paragraphs(a.content),
  }
  fs.writeFileSync(path.join(MAG_OUT, `${a.id}.json`), JSON.stringify(item, null, 1))
  magItems.push({ id: a.id, journal: a.journal, journalEn: a.journalEn, title: a.title, difficulty: a.difficulty, wordCount: a.wordCount })
}

fs.writeFileSync(
  path.join(CET_OUT, 'cet6-index.json'),
  JSON.stringify({ version: 1, type: 'cet6-passages', source: 'wangqiyue26-lab/english-reading(仅供本地个人学习)', items: cetItems }, null, 1),
)
fs.writeFileSync(
  path.join(MAG_OUT, 'index.json'),
  JSON.stringify({ version: 1, type: 'magazine-articles', source: 'wangqiyue26-lab/english-reading(仅供本地个人学习)', items: magItems }, null, 1),
)

const byJournal = magItems.reduce((acc, m) => {
  acc[m.journal] = (acc[m.journal] ?? 0) + 1
  return acc
}, {})
console.log(`CET-6 语篇: ${cetItems.length} 篇`)
console.log(`杂志文章: ${magItems.length} 篇`, JSON.stringify(byJournal))
console.log('sample:', JSON.stringify(cetItems[0]).slice(0, 220))
