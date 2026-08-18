/** 统一 fetch 封装:失败时抛出中文友好错误,便于页面展示 */
export async function fetchJson<T>(url: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new Error('无法连接本地服务。请确认已运行: npm run dev(或双击 start.bat),然后访问 http://127.0.0.1:5273')
  }
  if (!res.ok) {
    throw new Error(`数据加载失败(HTTP ${res.status}): ${url}`)
  }
  return (await res.json()) as T
}
