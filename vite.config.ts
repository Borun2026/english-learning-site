import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 本地 AI 代理(仅开发模式):
 * 浏览器直连 AI 供应商常被 CORS 拦截(Failed to fetch),
 * 这里把 POST /__ai_proxy 转发到目标 https 端点,规避跨域。
 * 仅允许 https 目标;本工具仅本地个人使用。
 */
function aiCorsProxy(): Plugin {
  return {
    name: 'ai-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/__ai_proxy', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('POST only')
          return
        }
        let raw = ''
        req.on('data', (c) => {
          raw += c
          if (raw.length > 20 * 1024 * 1024) req.destroy()
        })
        req.on('end', async () => {
          try {
            const { url, headers, body } = JSON.parse(raw)
            const target = new URL(String(url))
            if (target.protocol !== 'https:') {
              res.statusCode = 400
              res.end('only https targets allowed')
              return
            }
            const upstream = await fetch(target, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
              body,
            })
            res.statusCode = upstream.status
            res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
            const text = await upstream.text()
            res.end(text)
          } catch (e) {
            res.statusCode = 502
            res.end(`proxy error: ${(e as Error).message}`)
          }
        })
      })
    },
  }
}

/**
 * 本地 Piper 代理(仅开发模式,P5-1):
 * 浏览器直连本地 Piper http_server(127.0.0.1:5000)会被 CORS 拦截,
 * 这里把 POST /__piper_proxy 转发到目标端点。
 * 仅允许 localhost/127.0.0.1 的 http(s) 目标,防止被用作开放代理。
 */
function piperProxy(): Plugin {
  return {
    name: 'piper-local-proxy',
    configureServer(server) {
      server.middlewares.use('/__piper_proxy', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('POST only')
          return
        }
        let raw = ''
        req.on('data', (c) => {
          raw += c
          if (raw.length > 20 * 1024 * 1024) req.destroy()
        })
        req.on('end', async () => {
          try {
            const { url, method, body } = JSON.parse(raw)
            const target = new URL(String(url))
            const host = target.hostname.replace(/^\[|\]$/g, '')
            const isLocal = host === '127.0.0.1' || host === 'localhost' || host === '::1'
            const isHttp = target.protocol === 'http:' || target.protocol === 'https:'
            if (!isLocal || !isHttp) {
              res.statusCode = 400
              res.end('only http(s) localhost targets allowed')
              return
            }
            const upMethod = method === 'GET' ? 'GET' : 'POST'
            const upstream = await fetch(target, {
              method: upMethod,
              headers: upMethod === 'POST' ? { 'Content-Type': 'text/plain; charset=utf-8' } : undefined,
              body: upMethod === 'POST' ? body : undefined,
            })
            const buf = Buffer.from(await upstream.arrayBuffer())
            res.statusCode = upstream.status
            res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream')
            res.end(buf)
          } catch (e) {
            res.statusCode = 502
            res.end(`proxy error: ${(e as Error).message}`)
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), aiCorsProxy(), piperProxy()],
  server: {
    host: '127.0.0.1',
    port: 5273,
    strictPort: true,
    open: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
    watch: {
      // 忽略编辑器/工具临时目录,避免 EBUSY 崩溃(此前多次发生在 .xxx.tmpdir)
      ignored: ['**/.*.tmpdir/**', '**/.tmp_*', '**/raw_materials/**'],
    },
  },
})
