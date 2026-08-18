// =====================================================================
// 游戏成绩回写(P5-3):对词汇池记 SM-2 复习,并保存模式最佳成绩。
// =====================================================================

import { recordGameScore } from '../storage'
import { addWord, getWordState, requeueWrongWord, reviewWord } from '../vocab'

/** 对局后把单词结果写回词汇池:对的复习一档 good,错的当日重排队 */
export function applyWordResults(rightWords: string[], wrongWords: string[]) {
  for (const w of rightWords) {
    if (getWordState(w)) reviewWord(w, 'good')
    else addWord(w, 'game')
  }
  for (const w of wrongWords) {
    requeueWrongWord(w, 'game')
  }
}

/** 结束一局:记最佳成绩(答对数)与游玩次数 */
export function finishGame(mode: string, correct: number, total: number) {
  recordGameScore(mode, correct, total)
  void import('../stats.ts').then((m) => m.awardXp(6 + Math.min(10, correct), { game: true }))
}
