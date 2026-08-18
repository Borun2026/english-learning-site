import { LEVEL_NAMES } from '../lib/wordLevel'

/** 「词级高亮」开关 + 图例(文章精读 / 资料库 / 真题共用) */
export default function WordLevelLegend({
  on,
  loading,
  onChange,
}: {
  on: boolean
  loading: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="wl-bar">
      <label className="check-label wl-check">
        <input
          type="checkbox"
          checked={on}
          disabled={loading}
          onChange={(e) => onChange(e.target.checked)}
        />
        {loading ? '词级高亮加载中…' : '词级高亮'}
      </label>
      {on && !loading && (
        <span className="wl-legend">
          {([2, 3, 4, 5] as const).map((lv) => (
            <span key={lv} className={'wl-badge lv' + lv}>
              {LEVEL_NAMES[lv]}
            </span>
          ))}
          <span className="wl-badge freq">🔥 考研高频</span>
          <span className="dim" style={{ fontSize: 12 }}>
            级别取自词库;高频 = 考研真题词频 TOP 1000
          </span>
        </span>
      )}
    </div>
  )
}
