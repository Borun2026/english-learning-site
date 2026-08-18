#!/usr/bin/env node
/**
 * 生产环境独立 AI 代理(零依赖,Node ≥ 18)
 *
 * 背景:浏览器直连 AI 供应商常被 CORS 拦截(Failed to fetch)。
 * 开发模式有 Vite 内置中间件(vite.config.ts 的 /__ai_proxy);
 * 而 `vite preview` / 静态部署没有该中间件,本脚本提供等价服务。
 *
 * 用法:
 *   node scripts/ai-proxy-server.mjs                  # 默认 http://127.0.0.1:8787
 *   node scripts/ai-proxy-server.mjs --port 9000 --host 127.0.0.1
 *
 * 然后在网站「设置 → 独立 AI 代理地址」填入 http://127.0.0.1:8787。
 * 协议与 Vite 内置代理一致:
 *   POST /__ai_proxy  body: {"url":"https://...","headers":{...},"body":"..."}
 *   原样透传上游状态码 / Content-Type / 响应体;仅允许 https 目标,请求体上限 20MB。
 *
 * P5-1 起新增本地 Piper TTS 转发(浏览器直连本地 piper 被 CORS 拦截):
 *   POST /piper  body: {"url":"http://127.0.0.1:5000/","method":"POST","body":"Hello."}
 *   仅允许 localhost/127.0.0.1/[::1] 的 http(s) 目标;POST 按纯文本转发
 *   (piper http_server 协议),GET 用于查询 /voices,响应体按二进制透传。
 *
 * 安全:默认仅监听 127.0.0.1(仅本机可用);允许任意来源跨域调用是为了
 * 支持静态部署页面跨端口访问,因此请勿改为监听公网地址。仅本地个人学习使用。
 */
import http from 'node:http'

const HELP = `
用法: node scripts/ai-proxy-server.mjs [--port 8787] [--host 127.0.0.1] [--help]
  --port  监听端口(默认 8787)
  --host  监听地址(默认 127.0.0.1,仅本机)
`

function argOf(name, fallback) {
  const args = process.argv.slice(2)
  const eq = args.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.slice(name.length + 3)
  const i = args.indexOf(`--${name}`)
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1]
  return fallback
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(HELP)
  process.exit(0)
}

const HOST = String(argOf('host', '127.0.0.1'))
const PORT = Number(argOf('port', '8787'))
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`[ai-proxy] 无效端口: ${argOf('port', '8787')}(应为 1-65535)`)
  process.exit(1)
}

const MAX_BODY = 20 * 1024 * 1024 // 与 Vite 内置代理一致
const UPSTREAM_TIMEOUT_MS = 120_000 // 前端 60s 超时会先断开并中止本地上游请求

function setCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] ?? 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')
}

function fail(res, status, msg) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(msg)
}

const server = http.createServer((req, res) => {
  setCors(req, res)

  // CORS 预检:跨端口/跨来源的 POST application/json 会先发 OPTIONS
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const path = (req.url || '/').split('?')[0]

  if (req.method === 'GET' && path === '/health') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, service: 'ai-proxy-server', uptime: Math.round(process.uptime()) }))
    return
  }

  if (req.method === 'GET' && path === '/') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(
      `AI 代理运行中\n` +
        `POST http://${HOST}:${PORT}/__ai_proxy  body: {"url":"https://...","headers":{...},"body":"..."}\n` +
        `POST http://${HOST}:${PORT}/piper      body: {"url":"http://127.0.0.1:5000/","method":"POST","body":"Hello."}\n` +
        `健康检查:GET http://${HOST}:${PORT}/health\n`,
    )
    return
  }

  if (req.method !== 'POST' || (path !== '/__ai_proxy' && path !== '/piper')) {
    fail(res, 405, 'POST /__ai_proxy or /piper only')
    return
  }
  const isPiper = path === '/piper'

  const chunks = []
  let size = 0
  let tooLarge = false
  req.on('data', (c) => {
    size += c.length
    if (size > MAX_BODY) {
      tooLarge = true
      req.destroy()
      return
    }
    chunks.push(c)
  })
  req.on('error', () => {
    /* 客户端提前断开等,忽略 */
  })
  req.on('end', async () => {
    if (tooLarge) return

    let payload
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      fail(res, 400, 'bad json payload')
      return
    }

    let target
    try {
      target = new URL(String(payload?.url))
    } catch {
      fail(res, 400, 'missing or invalid "url"')
      return
    }
    if (isPiper) {
      // 本地 Piper TTS:仅放行 localhost 的 http(s),GET(/voices)与 POST(合成)都支持
      const host = target.hostname.replace(/^\[|\]$/g, '')
      const isLocal = host === '127.0.0.1' || host === 'localhost' || host === '::1'
      const isHttp = target.protocol === 'http:' || target.protocol === 'https:'
      if (!isLocal || !isHttp) {
        fail(res, 400, 'only http(s) localhost targets allowed for /piper')
        return
      }
    } else if (target.protocol !== 'https:') {
      fail(res, 400, 'only https targets allowed')
      return
    }

    // 客户端断开(含前端 60s 超时)时同步中止上游请求
    // 注意:不能用 req.on('close'),它在请求体读完时就会触发;res 'close' 才表示响应过早关闭
    const controller = new AbortController()
    let settled = false
    const onResClose = () => {
      if (!settled) controller.abort()
    }
    res.on('close', onResClose)
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

    try {
      const upstream = await fetch(target, {
        method: isPiper ? (String(payload?.method) === 'GET' ? 'GET' : 'POST') : 'POST',
        headers: isPiper
          ? payload?.method === 'GET'
            ? undefined
            : { 'Content-Type': 'text/plain; charset=utf-8' }
          : { 'Content-Type': 'application/json', ...(payload.headers ?? {}) },
        body: isPiper ? (payload?.method === 'GET' ? undefined : String(payload?.body ?? '')) : payload.body ?? '',
        signal: controller.signal,
      })
      if (isPiper) {
        // 音频等二进制响应:按字节透传
        const buf = Buffer.from(await upstream.arrayBuffer())
        settled = true
        res.statusCode = upstream.status
        res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream')
        res.end(buf)
      } else {
        // 原样透传上游状态码与响应体(如无效 Key 的 401)
        const text = await upstream.text()
        settled = true
        res.statusCode = upstream.status
        res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
        res.end(text)
      }
    } catch (e) {
      if (res.writableEnded || res.destroyed) return
      const msg = controller.signal.aborted ? 'upstream request aborted or timed out' : (e instanceof Error ? e.message : String(e))
      fail(res, 502, `proxy error: ${msg}`)
    } finally {
      settled = true
      clearTimeout(timer)
      res.off('close', onResClose)
    }
  })
})

server.on('error', (e) => {
  console.error(`[ai-proxy] 启动失败: ${e.message}`)
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  console.log(`[ai-proxy] 独立 AI 代理已启动: http://${HOST}:${PORT}`)
  console.log(`[ai-proxy] 健康检查: http://${HOST}:${PORT}/health`)
  console.log('[ai-proxy] 请在网站「设置 → 独立 AI 代理地址」填入该地址(留空 = 开发走 Vite 内置代理 / 生产直连)')
  console.log('[ai-proxy] 本地 Piper TTS 转发:POST /piper(仅放行 localhost http)')
  console.log('[ai-proxy] 按 Ctrl+C 停止。安全提示:默认仅监听 127.0.0.1,请勿改绑公网地址。')
})

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n[ai-proxy] 收到 ${sig},正在退出…`)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 2000).unref()
  })
}
