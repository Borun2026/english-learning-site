import { ACHIEVEMENTS, getStats, xpToNext } from '../lib/stats'

export default function Achievements() {
  const st = getStats()
  const bar = xpToNext(st.xp)
  const pct = (bar.have / bar.need) * 100

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>🏆 成就荣誉墙</h2>
          <span className="tag">
            👑 Lv.{st.level} 大师 · {st.xp} 总 XP · 🔥 连击 {st.streak} 天
          </span>
        </div>
      </div>

      <div style={{ margin: '14px 0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
          <span style={{ color: 'var(--text-muted)' }}>升级进度 (Lv.{st.level} → Lv.{st.level + 1})</span>
          <b style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
            {bar.have} / {bar.need} XP ({pct.toFixed(0)}%)
          </b>
        </div>
        <div className="flash-timer-bar">
          <div className="flash-timer-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="game-grid">
        {ACHIEVEMENTS.map((a) => {
          const on = st.achievements.includes(a.id)
          return (
            <div
              key={a.id}
              className={'game-card ' + (on ? 'achievement-unlocked' : '')}
              style={{
                opacity: on ? 1 : 0.6,
                borderLeft: on ? '4px solid var(--game-yellow)' : undefined,
                background: on ? 'linear-gradient(135deg, #ffffff 0%, #fefce8 100%)' : undefined,
              }}
            >
              <div className="game-icon" style={{ filter: on ? 'none' : 'grayscale(1)' }}>
                {on ? '🏅' : '🔒'}
              </div>
              <div>
                <b style={{ color: on ? '#854d0e' : undefined }}>{a.name}</b>
                <p>{a.desc}</p>
                {on && <span className="tag" style={{ background: '#fef08a', color: '#854d0e', borderColor: '#fde047' }}>✓ 已解锁</span>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
