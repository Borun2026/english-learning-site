import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { AppContext } from '../App'
import { AI_PRESETS, addCoachMemory, importData, loadData, removeAiProfile, removeCoachMemory, setAiConfig, setAiProfile, setTts, upsertAiProfile, useDataVersion } from '../lib/storage'
import {
  BROWSER_VOICES,
  browserAvailable,
  downloadBrowserVoice,
  getVoices,
  initSpeech,
  listLocalVoices,
  listStoredBrowserVoices,
  onVoicesChanged,
  removeBrowserVoice,
  speak,
  testLocalPiper,
  type LocalPiperVoice,
} from '../lib/speech'
import { testConnection } from '../lib/ai/provider'
import type { AiConfigProfile, TtsConfig, TtsEngineKind } from '../lib/types'

export default function Settings() {
  const { onSpeak } = useOutletContext<AppContext>()
  const [data, setData] = useState(loadData())
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [importText, setImportText] = useState('')
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([])
  const [storedBrowser, setStoredBrowser] = useState<string[]>([])
  const [downloadPct, setDownloadPct] = useState<Record<string, number>>({})
  const [piperTest, setPiperTest] = useState<{ status: 'idle' | 'busy' | 'ok' | 'fail'; msg: string }>({ status: 'idle', msg: '' })
  const [localVoices, setLocalVoices] = useState<LocalPiperVoice[]>([])
  // 语音朗读草稿:选择先进入草稿,点「应用设置」才写入 localStorage 并全局生效
  const [ttsDraft, setTtsDraft] = useState<TtsConfig>(() => ({ ...loadData().tts }))
  // 已保存 AI 配置档案:名称 + 正在编辑的档案 id(编辑态保存 = 更新原条目)
  const [profileName, setProfileName] = useState('')
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [memDraft, setMemDraft] = useState('')

  // 跨标签页同步:其他页面保存后本页数据即时刷新
  const dv = useDataVersion()
  useEffect(() => {
    const d = loadData()
    setData(d)
    setTtsDraft({ ...d.tts })
  }, [dv])

  const cfg = data.aiConfig
  const preset = AI_PRESETS.find((x) => x.key === cfg.provider) ?? AI_PRESETS[AI_PRESETS.length - 1]
  const [customModel, setCustomModel] = useState(false)
  const modelOptions = preset.models?.length ? preset.models : []
  const groups: [string, typeof AI_PRESETS][] = []
  for (const p of AI_PRESETS) {
    const g = groups[groups.length - 1]
    if (g && g[0] === (p.group ?? '')) g[1].push(p)
    else groups.push([p.group ?? '', [p]])
  }

  useEffect(() => {
    initSpeech()
    const refresh = () => setSystemVoices(getVoices().filter((v) => v.lang.startsWith('en')))
    refresh()
    listStoredBrowserVoices().then(setStoredBrowser)
    return onVoicesChanged(refresh)
  }, [])

  // 切到本地引擎时顺带拉取一次声音列表(按草稿地址)
  useEffect(() => {
    if (ttsDraft.engine === 'local') {
      listLocalVoices(ttsDraft.piperBase).then((r) => {
        if (r.ok) setLocalVoices(r.voices)
      })
    }
  }, [ttsDraft.engine, ttsDraft.piperBase])

  const refreshStored = async () => setStoredBrowser(await listStoredBrowserVoices())

  const downloadVoice = async (id: string) => {
    setDownloadPct((p) => ({ ...p, [id]: 0 }))
    try {
      await downloadBrowserVoice(id, (pct) => setDownloadPct((p) => ({ ...p, [id]: pct })))
      await refreshStored()
    } catch (e) {
      alert('下载失败:' + ((e as Error).message ?? '').slice(0, 120))
    } finally {
      setDownloadPct((p) => {
        const next = { ...p }
        delete next[id]
        return next
      })
    }
  }

  const runPiperTest = async () => {
    setPiperTest({ status: 'busy', msg: '测试中…' })
    const r = await testLocalPiper(ttsDraft.piperBase)
    if (r.ok) {
      setLocalVoices(r.voices)
      setPiperTest({
        status: 'ok',
        msg: `✅ 本地 Piper 服务可用${r.voices.length > 0 ? `(发现 ${r.voices.length} 个声音)` : '(基础服务,声音由启动时模型决定)'}`,
      })
    } else {
      setPiperTest({ status: 'fail', msg: `❌ ${(r.error ?? '').slice(0, 140)}` })
    }
  }

  const save = (patch: Partial<typeof cfg>) => {
    const next = { ...data.aiConfig, ...patch }
    setAiConfig(next)
    setData((d) => ({ ...d, aiConfig: next }))
  }

  const test = async () => {
    setTesting(true)
    setTestResult('')
    try {
      const ms = await testConnection(cfg)
      setTestResult(`✅ 连接成功,耗时 ${ms}ms`)
    } catch (e) {
      setTestResult(`❌ ${(e as Error).message.slice(0, 120)}`)
    }
    setTesting(false)
  }

  /* ---------- 已保存 AI 配置档案 ---------- */

  const syncCustomModelFlag = (config: AiConfigProfile['config']) => {
    const pp = AI_PRESETS.find((x) => x.key === config.provider)
    const inPreset = !!config.model && !!pp?.models?.length && pp.models.includes(config.model)
    setCustomModel(!!config.model && !inPreset)
  }

  const saveProfile = () => {
    const now = Date.now()
    const existing = editingProfileId ? data.aiProfiles.find((p) => p.id === editingProfileId) : null
    const name = profileName.trim() || `${preset.label} · ${cfg.model || '未设模型'}`
    const profile: AiConfigProfile = {
      id: editingProfileId ?? `ap-${now}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      config: cfg,
    }
    upsertAiProfile(profile)
    setData(loadData())
    setProfileName('')
    setEditingProfileId(null)
  }

  const useProfile = (p: AiConfigProfile) => {
    setAiConfig(p.config)
    setData(loadData())
    syncCustomModelFlag(p.config)
    setEditingProfileId(null)
    setProfileName('')
  }

  const editProfile = (p: AiConfigProfile) => {
    setAiConfig(p.config)
    setData(loadData())
    syncCustomModelFlag(p.config)
    setEditingProfileId(p.id)
    setProfileName(p.name)
  }

  const deleteProfile = (id: string) => {
    if (!window.confirm('删除这条已保存的 AI 配置?(不影响当前已填写的表单)')) return
    removeAiProfile(id)
    if (editingProfileId === id) {
      setEditingProfileId(null)
      setProfileName('')
    }
    setData(loadData())
  }

  const patchTts = (patch: Partial<TtsConfig>) => setTtsDraft((d) => ({ ...d, ...patch }))

  const ttsApplied = data.tts
  const ttsDirty =
    ttsDraft.engine !== ttsApplied.engine ||
    ttsDraft.voiceId !== ttsApplied.voiceId ||
    ttsDraft.rate !== ttsApplied.rate ||
    ttsDraft.piperBase !== ttsApplied.piperBase ||
    ttsDraft.autoReadAi !== ttsApplied.autoReadAi

  const applyTts = () => {
    setTts(ttsDraft)
    setData(loadData())
  }

  // 试听按当前草稿预览(不落盘);点「应用设置」后全局生效
  const trySpeak = () => speak('Hello, this is a voice test.', { rate: ttsDraft.rate, ttsOverride: ttsDraft })

  return (
    <section className="card">
      <div className="card-head">
        <h2>⚙️ 设置</h2>
      </div>

      <h4>AI 模型配置(OpenAI 兼容)</h4>
      <p className="hint">配置后可解锁:AI 情景对话 / 任意文章 AI 解析 / 查词 AI 兜底。不配置也不影响离线学习。</p>
      <div className="form-row">
        <label>
          服务商
          <select
            value={cfg.provider}
            onChange={(e) => {
              const p = AI_PRESETS.find((x) => x.key === e.target.value)!
              setCustomModel(false)
              save({ provider: p.key, baseURL: p.baseURL, model: p.defaultModel, apiFormat: p.apiFormat ?? 'chat' })
            }}
          >
            {groups.map(([group, list]) => (
              <optgroup key={group || 'default'} label={group || '其他'}>
                {list.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      {preset.note && <p className="hint">💡 {preset.note}</p>}
      {preset.apiKeyUrl && (
        <p className="hint">
          🔑 获取 API Key:
          <a href={preset.apiKeyUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 4 }}>
            {preset.label} ↗
          </a>
        </p>
      )}
      {preset.chatCompatible === false && (
        <div className="feedback no">⚠️ 该供应商为 Codex 格式接口,本站 AI 功能走 OpenAI Chat 协议,暂不可用于对话/解析/翻译。</div>
      )}
      {preset.apiFormat === 'responses' && (
        <p className="hint">🔌 接口格式:Codex / OpenAI Responses(自动请求 /responses,已兼容本站全部 AI 功能)。</p>
      )}
      <div className="form-row">
        <label>
          Base URL
          <input value={cfg.baseURL} onChange={(e) => save({ baseURL: e.target.value })} placeholder="https://api.xxx.com/v1" />
        </label>
        <label>
          接口格式
          <select
            value={cfg.apiFormat ?? 'chat'}
            onChange={(e) => save({ apiFormat: e.target.value as 'chat' | 'responses' })}
          >
            <option value="chat">OpenAI Chat Completions</option>
            <option value="responses">Codex / OpenAI Responses</option>
          </select>
        </label>
        <label>
          模型套餐
          {modelOptions.length > 0 ? (
            <>
              <select
                value={customModel ? '__custom__' : cfg.model}
                onChange={(e) => {
                  if (e.target.value === '__custom__') setCustomModel(true)
                  else save({ model: e.target.value })
                }}
              >
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="__custom__">其他(手动输入)…</option>
              </select>
              {customModel && <input value={cfg.model} onChange={(e) => save({ model: e.target.value })} placeholder="model-name" />}
            </>
          ) : (
            <input value={cfg.model} onChange={(e) => save({ model: e.target.value })} placeholder="model-name" />
          )}
        </label>
      </div>
      <div className="form-row">
        <label className="grow">
          独立 AI 代理地址(生产环境)
          <input
            value={cfg.proxyBase ?? ''}
            onChange={(e) => save({ proxyBase: e.target.value })}
            placeholder="http://127.0.0.1:8787(留空 = 开发走内置代理 / 生产直连)"
          />
        </label>
      </div>
      <p className="hint">
        🛰️ 静态部署 / vite preview 没有 Vite 内置代理,被 CORS 拦截时在本机运行
        <code>node scripts/ai-proxy-server.mjs</code>,再把它打印的地址填到此处(仅本机个人使用)。
      </p>
      <div className="form-row">
        <label>
          API Key
          <input type="password" value={cfg.apiKey} onChange={(e) => save({ apiKey: e.target.value })} placeholder="sk-..." />
        </label>
        <button className="btn" onClick={test} disabled={testing || !cfg.apiKey}>
          {testing ? '测试中…' : '🔌 测试连接'}
        </button>
      </div>
      {testResult && (
        <div className={'feedback ' + (testResult.startsWith('✅') ? 'ok' : 'no')}>{testResult}</div>
      )}
      <div className="form-row">
        <label className="check-label">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => save({ enabled: e.target.checked })} />
          启用 AI 查词兜底(词库未收录的词,点击后交给 AI 生成音标/释义/例句)
        </label>
      </div>
      <p className="hint">配置仅保存在本机浏览器 localStorage,不会上传。</p>

      <h4>💾 已保存的 AI 配置</h4>
      <p className="hint">
        把当前「服务商 + BaseURL + 接口格式 + 模型 + API Key + 代理」整组保存;下次直接点「使用」即可切换,也可「编辑」后更新。
        手动输入的模型同样保存,不会丢失。
      </p>
      <div className="form-row">
        <label className="grow">
          配置名称{editingProfileId ? '(正在编辑已保存配置)' : ''}
          <input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder={`留空自动命名:${preset.label} · ${cfg.model || '未设模型'}`}
          />
        </label>
        <button className="btn" onClick={saveProfile}>
          {editingProfileId ? '💾 更新此配置' : '💾 保存当前配置'}
        </button>
        {editingProfileId && (
          <button
            className="btn ghost"
            onClick={() => {
              setEditingProfileId(null)
              setProfileName('')
            }}
          >
            取消编辑
          </button>
        )}
      </div>
      {data.aiProfiles.length === 0 ? (
        <p className="hint">还没有保存的配置。填好上方的 Key/模型后点「💾 保存当前配置」。</p>
      ) : (
        <div className="profile-list">
          {data.aiProfiles.map((p) => {
            const pp = AI_PRESETS.find((x) => x.key === p.config.provider)
            const maskedKey = p.config.apiKey
              ? `${p.config.apiKey.slice(0, 4)}••••${p.config.apiKey.slice(-4)}`
              : '未填 Key'
            const active =
              p.config.provider === cfg.provider &&
              p.config.baseURL === cfg.baseURL &&
              p.config.model === cfg.model &&
              p.config.apiKey === cfg.apiKey
            return (
              <div key={p.id} className={'profile-row' + (active ? ' on' : '')}>
                <div className="profile-info">
                  <b>{p.name}</b>
                  <span className="dim">
                    {pp?.label ?? p.config.provider} · {p.config.model || '未设模型'} · {maskedKey} ·{' '}
                    {p.config.apiFormat === 'responses' ? 'Responses' : 'Chat'}
                  </span>
                  {active && <span className="tag">当前使用</span>}
                </div>
                <div className="row-btns" style={{ margin: 0 }}>
                  <button className="btn small ghost" onClick={() => useProfile(p)}>
                    ✅ 使用
                  </button>
                  <button className="btn small ghost" onClick={() => editProfile(p)}>
                    ✏️ 编辑
                  </button>
                  <button className="btn small ghost" onClick={() => deleteProfile(p.id)}>
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <h4>🎓 AI 教练画像</h4>
      {data.aiProfile.level ? (
        <div className="coach-chip">
          <span className="score-badge">{data.aiProfile.level}</span>
          {data.aiProfile.weakPoints.length > 0 && (
            <span className="dim">
              薄弱点:{data.aiProfile.weakPoints.slice(0, 4).join('、')}
            </span>
          )}
          <span className="dim">错误记录 {data.aiProfile.errors.length} 条 · 评估 {data.aiProfile.history.length} 次</span>
          <button
            className="btn small ghost"
            onClick={() => {
              setAiProfile({ level: '', levelNote: '', weakPoints: [], errors: [], history: [], memories: [] })
              setData(loadData())
            }}
          >
            🗑 重置画像
          </button>
        </div>
      ) : (
        <p className="hint">
          尚无画像。在「AI 对话」开启教练模式完成一轮对话,或在「AI 解析」解析文章后自动生成;画像随「导出进度」一并备份。
        </p>
      )}
      {data.aiProfile.levelNote && <p className="hint">📝 评估依据:{data.aiProfile.levelNote}</p>}
      <h4>📌 教练记忆</h4>
      <p className="hint">记下想让教练长期记住的点(口音/薄弱语法/目标场景),生成练习时会优先带入。最多 20 条。</p>
      <div className="form-row">
        <input
          value={memDraft}
          placeholder="例如:虚拟语气总是用错 / 想练学术讨论"
          onChange={(e) => setMemDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && memDraft.trim()) {
              addCoachMemory(memDraft)
              setMemDraft('')
              setData(loadData())
            }
          }}
        />
        <button
          className="btn small"
          onClick={() => {
            if (!memDraft.trim()) return
            addCoachMemory(memDraft)
            setMemDraft('')
            setData(loadData())
          }}
        >
          添加
        </button>
      </div>
      <div className="wordbook">
        {(data.aiProfile.memories ?? []).map((m) => (
          <span key={m.id} className="wb-item">
            {m.text}
            <button
              className="icon-btn wb-del"
              onClick={() => {
                removeCoachMemory(m.id)
                setData(loadData())
              }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <div className="card-head">
        <h4>语音朗读</h4>
        <div className="row-btns">
          {ttsDirty && (
            <span className="tag" style={{ color: '#b45309' }}>
              ⚠ 有未应用的更改
            </span>
          )}
          <button className={'btn small' + (ttsDirty ? '' : ' ghost')} onClick={applyTts} disabled={!ttsDirty}>
            ✅ 应用设置
          </button>
        </div>
      </div>
      <p className="hint">先选好引擎/音色/语速,点「✅ 应用设置」后全局生效并持久保存;试听按当前选择预览。</p>
      <div className="form-row">
        <label>
          朗读引擎
          <select value={ttsDraft.engine} onChange={(e) => patchTts({ engine: e.target.value as TtsEngineKind })}>
            <option value="browser">浏览器 Piper(自然音 · 离线可用 · 默认)</option>
            <option value="local">本地 Piper 服务(音质更好 · 需本机运行 piper)</option>
            <option value="system">系统语音(Web Speech 兜底)</option>
          </select>
        </label>
        <label>
          语速
          <input
            type="range"
            min="0.6"
            max="1.2"
            step="0.05"
            value={ttsDraft.rate}
            onChange={(e) => patchTts({ rate: Number(e.target.value) })}
          />
          <span className="rate-val">{ttsDraft.rate.toFixed(2)}x</span>
        </label>
        <button className="btn ghost" onClick={trySpeak}>
          🔊 试听
        </button>
      </div>

      {ttsDraft.engine === 'browser' && (
        <>
          <div className="form-row">
            <label>
              英语音色(中文内容自动用 Huayan 中文音色)
              <select
                value={ttsDraft.voiceId === 'en_GB-alba-medium' ? ttsDraft.voiceId : 'en_US-lessac-medium'}
                onChange={(e) => patchTts({ voiceId: e.target.value })}
              >
                {BROWSER_VOICES.filter((v) => v.lang === 'en').map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="check-label">
              <input type="checkbox" checked={ttsDraft.autoReadAi} onChange={(e) => patchTts({ autoReadAi: e.target.checked })} />
              AI 对话中自动朗读 NPC/AI 新台词
            </label>
          </div>
          <p className="hint">
            首次朗读会自动把声音模型下载到浏览器存储(每个约 60-70MB),之后断网可用;也可在下方提前下载。
          </p>
          <div className="form-row">
            {BROWSER_VOICES.map((v) => {
              const stored = storedBrowser.includes(v.id)
              const pct = downloadPct[v.id]
              return (
                <label key={v.id} className="voice-row">
                  <span>
                    {v.label}
                    <span className="dim"> {stored ? '✅ 已下载' : pct != null ? `⏳ 下载中 ${pct}%` : '未下载'}</span>
                  </span>
                  {stored ? (
                    <button
                      className="btn small ghost"
                      onClick={() => {
                        removeBrowserVoice(v.id).then(refreshStored)
                      }}
                    >
                      🗑 删除
                    </button>
                  ) : (
                    <button
                      className="btn small"
                      onClick={() => downloadVoice(v.id)}
                      disabled={pct != null || !browserAvailable()}
                    >
                      {pct != null ? `下载中 ${pct}%` : '⬇️ 下载'}
                    </button>
                  )}
                </label>
              )
            })}
          </div>
          {!browserAvailable() && (
            <div className="feedback no">⚠️ 当前环境不支持浏览器 Piper(需用 localhost 或 HTTPS 访问才有 OPFS 存储)。</div>
          )}
        </>
      )}

      {ttsDraft.engine === 'local' && (
        <>
          <div className="form-row">
            <label className="grow">
              本地 Piper 服务地址
              <input
                value={ttsDraft.piperBase}
                onChange={(e) => patchTts({ piperBase: e.target.value })}
                placeholder="http://127.0.0.1:5000"
              />
            </label>
            <button className="btn ghost" onClick={runPiperTest} disabled={piperTest.status === 'busy'}>
              {piperTest.status === 'busy' ? '测试中…' : '🔌 测试服务'}
            </button>
          </div>
          {piperTest.status !== 'idle' && (
            <div className={'feedback ' + (piperTest.status === 'ok' ? 'ok' : piperTest.status === 'fail' ? 'no' : '')}>
              {piperTest.msg}
            </div>
          )}
          {localVoices.length > 0 && (
            <div className="form-row">
              <label>
                声音(供参考;基础 piper 服务的实际声音由启动时模型决定)
                <select value={ttsDraft.voiceId} onChange={(e) => patchTts({ voiceId: e.target.value })}>
                  {localVoices.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.name} ({v.key})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <p className="hint">
            💡 本地服务启动方式:<code>python -m piper.http_server --model en_US-lessac-medium.onnx</code>(默认端口 5000)。
            官方服务无 CORS 头,本站开发模式经 Vite 内置代理、生产环境经独立代理转发,无需额外配置。
          </p>
        </>
      )}

      {ttsDraft.engine === 'system' && (
        <div className="form-row">
          <label>
            英语音色
            <select value={ttsDraft.voiceId} onChange={(e) => patchTts({ voiceId: e.target.value })}>
              <option value="">自动选择</option>
              {systemVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>
          <label className="check-label">
            <input type="checkbox" checked={ttsDraft.autoReadAi} onChange={(e) => patchTts({ autoReadAi: e.target.checked })} />
            AI 对话中自动朗读 NPC/AI 新台词
          </label>
        </div>
      )}
      <p className="hint">三档引擎自动降级:本地 Piper 失败 → 浏览器 Piper → 系统语音;点击单词/句子/AI 台词均可朗读。</p>

      <h4>数据管理</h4>
      <p className="hint">
        备份包含:学习进度/生词本/词汇池/AI 配置与已保存配置档案/语音朗读设置/教练画像/段落批注/写作批改缓存/学习计划与打卡。导入旧版本备份会自动补全缺失字段(旧 voiceURI 自动迁移,旧生词本词转词汇池)。
      </p>
      <div className="form-row">
        <button
          className="btn ghost"
          onClick={() => {
            const blob = new Blob([JSON.stringify(loadData(), null, 2)], { type: 'application/json' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = 'english-learning-backup.json'
            a.click()
          }}
        >
          ⬇️ 导出进度
        </button>
        <label className="import-label">
          ⬆️ 导入
          <input
            type="file"
            accept=".json"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const text = await f.text()
              const r = importData(text)
              if (r.ok) {
                alert('导入成功' + (r.migrated.length ? `\n已自动迁移补全旧字段:${r.migrated.join('、')}` : ''))
                setData(loadData())
              } else alert('导入失败:文件格式不正确')
            }}
          />
        </label>
      </div>
      <div className="form-row">
        <label className="grow">
          <textarea rows={4} placeholder="或粘贴备份 JSON 到这里…" value={importText} onChange={(e) => setImportText(e.target.value)} />
        </label>
        <button
          className="btn"
          onClick={() => {
            const r = importData(importText)
            if (r.ok) {
              alert('导入成功' + (r.migrated.length ? `\n已自动迁移补全旧字段:${r.migrated.join('、')}` : ''))
              setData(loadData())
              setImportText('')
            } else alert('导入失败:JSON 格式不正确')
          }}
        >
          导入文本
        </button>
      </div>
    </section>
  )
}
