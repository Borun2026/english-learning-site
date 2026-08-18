import { useEffect, useState } from 'react'
import { loadData, useDataVersion } from '../lib/storage'
import OrderSentence from '../lib/game/orderSentence'
import Typing from '../lib/game/typing'
import Matching from '../lib/game/matching'
import Spelling from '../lib/game/spelling'
import FlashRun from '../lib/game/flashRun'
import Daily from '../lib/game/daily'

type ModeKey = 'orderSentence' | 'typing' | 'matching' | 'spelling' | 'flashRun' | 'daily'

const MODES: { key: ModeKey; icon: string; title: string; desc: string }[] = [
  { key: 'orderSentence', icon: '🧩', title: '连词成句', desc: '把打乱的词块(含干扰块)拼成正确句子,来自 48 单元对话与听力台词' },
  { key: 'typing', icon: '⌨️', title: '打字操练', desc: '看词打字,键盘全程可操作,练拼写手感' },
  { key: 'matching', icon: '🔗', title: '词义配对', desc: '单词 ↔ 中文释义 6 组配对,争取零失误' },
  { key: 'spelling', icon: '✍️', title: '拼写挑战', desc: '看中文、听发音,拼出完整单词' },
  { key: 'flashRun', icon: '⚡', title: '闪卡快跑', desc: '60 秒快速判断认识/不认识,不认识的当场进错词队' },
  { key: 'daily', icon: '📅', title: '每日挑战', desc: '按日期固定的 10 题混合挑战,反复刷新最佳成绩' },
]

export default function VocabGames() {
  const [mode, setMode] = useState<ModeKey | null>(null)
  const [data, setData] = useState(loadData())
  const dv = useDataVersion()
  useEffect(() => {
    setData(loadData())
  }, [dv])

  if (mode) {
    const back = () => setMode(null)
    if (mode === 'orderSentence') return <OrderSentence onExit={back} />
    if (mode === 'typing') return <Typing onExit={back} />
    if (mode === 'matching') return <Matching onExit={back} />
    if (mode === 'spelling') return <Spelling onExit={back} />
    if (mode === 'flashRun') return <FlashRun onExit={back} />
    if (mode === 'daily') return <Daily onExit={back} />
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>🎮 趣味记单词中心</h2>
          <span className="tag">6 种模式全部离线可玩 · 成绩回写词汇池(对词记 good、错词进今日重排队)</span>
        </div>
      </div>
      <div className="game-grid">
        {MODES.map((m) => {
          const best = data.gameBest[m.key]
          return (
            <button key={m.key} className="game-card" onClick={() => setMode(m.key)}>
              <div className="game-icon">{m.icon}</div>
              <div>
                <b>{m.title}</b>
                <p className="dim">{m.desc}</p>
                {best && (
                  <span className="tag">
                    最佳 {best.best} · 玩过 {best.plays} 次
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      <p className="hint">
        出题词源:优先你的词汇池(学习中/复习中、今日到期在前),不足时从 9251 词库随机补充——游戏即复习。
        未配置 AI 时「🤖 AI 讲讲」自动隐藏,不影响游玩。
      </p>
    </section>
  )
}
