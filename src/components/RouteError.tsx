import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'

export default function RouteError() {
  const err = useRouteError()
  const navigate = useNavigate()
  let msg = '未知错误'
  if (isRouteErrorResponse(err)) {
    msg = err.statusText || String(err.data ?? err.status)
  } else if (err instanceof Error) {
    msg = err.message
  } else if (err != null) {
    msg = String(err)
  }
  msg = msg.slice(0, 300)

  return (
    <div className="page">
      <section className="card">
        <div className="card-head">
          <h2>页面出错了</h2>
        </div>
        <div className="feedback no">{msg}</div>
        <div className="row-btns">
          <button className="btn" onClick={() => navigate('/')}>
            回首页
          </button>
          <button className="btn ghost" onClick={() => window.location.reload()}>
            刷新
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              try {
                void navigator.clipboard.writeText(msg).catch(() => {
                  prompt('复制错误', msg)
                })
              } catch {
                prompt('复制错误', msg)
              }
            }}
          >
            复制错误
          </button>
        </div>
      </section>
    </div>
  )
}
