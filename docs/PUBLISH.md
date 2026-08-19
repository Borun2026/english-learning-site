# 构建与发布(PUBLISH)

> 适用:本地部署 / `vite preview` / 任意静态托管。AI 功能在静态部署下需配合独立代理,见 README「AI 跨域代理」。

## 1. 构建

```bash
npm install --registry=https://registry.npmmirror.com
npm run build        # tsc 类型检查 + vite build → dist/
```

产物(2026-08-16 实测):入口 JS 266KB(gzip 90.62KB)+ CSS 20KB(gzip 4.76KB)+ index.html 0.69KB;
**首页首屏静态资源约 96KB(压缩后),远低于 350KB 预算**。页面级分包 18 个 JS chunk,
除首页外 12 个路由均为 React.lazy 按需加载。

## 2. 本地预览(全流程验证)

```bash
npm run preview      # 默认 http://localhost:4173
```

`vite preview` 已内置 SPA fallback:`/plan`、`/unit/s1u1`、`/zhenti/2019-reading-1`
等前端路由直接刷新/访问均返回 index.html(2026-08-16 实测 7 条路由全部 200)。

## 3. 静态托管发布流程

1. `npm run build` 生成 `dist/`;
2. 将 `dist/` 全部内容上传至静态托管根目录(**必须配置 SPA fallback**,否则刷新 404):

nginx 示例:

```nginx
server {
    root /var/www/english-learning-site;
    location / {
        try_files $uri $uri/ /index.html;   # SPA fallback
    }
}
```

3. **建议开启 gzip/brotli**(nginx `gzip on;` 或托管平台默认压缩)。`public/content/` 共 15.2MB JSON,
   全部按需懒加载(词库/词典已按字母分片,无需再分片),压缩后可显著减少传输量;
4. AI 功能:静态托管没有 Vite 内置代理,浏览器直连部分供应商会被 CORS 拦截 → 本机运行
   `npm run proxy`,并在「设置 → 独立 AI 代理地址」填 `http://127.0.0.1:8787`。

## 4. 大 JSON gzip/分片评估结论(2026-08-16)

| 数据 | 大小 | 加载方式 | 结论 |
|---|---|---|---|
| wordbank a-z | ≈3.7MB | 按字母分片 + 按需懒加载(查词/词级高亮) | **无需再分片**;托管层开启 gzip 即可 |
| dict a-z | ≈2.8MB | 按字母分片 + 按需懒加载(查词) | 同上 |
| grammar-reference | 405KB | 语法树页懒加载 | 同上 |
| CET6 114 篇 / 外刊 199 篇 / TED 35 篇 / NCE 190 课 | 每篇独立文件 | 资料库按篇懒加载 | 同上 |
| writing/s5 三库 | ≈437KB | 写作页懒加载 | 同上 |

首屏只加载 index.html + CSS + 入口 JS,不加载任何大 JSON。

## 5. 语音朗读(TTS,2026-08-16 新增)

三种引擎自动降级(本地 Piper 服务 → 浏览器 Piper → 系统语音),设置页可选:

| 引擎 | 说明 | 部署要求 |
|------|------|---------|
| 浏览器 Piper(默认) | vits-web 在浏览器内合成自然音,声音模型首次点击朗读自动下载(官方 HF → hf-mirror.com 镜像回退)缓存到 OPFS,之后**断网可用** | 必须 **localhost 或 HTTPS** 访问(OPFS 为安全上下文 API);静态托管需配 HTTPS 证书 |
| 本地 Piper 服务 | 本机 `python -m piper.http_server --model en_US-lessac-medium.onnx`(默认 5000),音质更好 | 官方服务无 CORS 头:开发模式经 Vite `/__piper_proxy`,生产模式经 `npm run proxy` 的 `/piper` 端点(仅放行 localhost http) |
| 系统语音 | Web Speech API,永远兜底,保留逐词高亮 | 无 |

推理所需 piper_phonemize / onnxruntime wasm 由库从 jsdelivr / cdnjs 加载(immutable 长缓存),首次加载后断网可用;声音模型本身不随仓库分发(不入库)。
