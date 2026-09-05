// 参考 StudyWithMiku 的做法：通过 Meting 兼容接口，用歌单 id 拉取歌曲列表。
// 接口地址可配置 + 多接口故障转移；均已验证带 CORS 头，静态站可直接请求。

export interface Track {
  id?: string
  name: string
  artist: string
  url: string
  pic?: string
  lrc?: string
}

export type Platform = 'netease' | 'tencent'

interface Provider {
  name: string
  base: string
  // 不同接口字段名不同，统一归一化
  fields: {
    name: string[]
    artist: string[]
    url: string[]
    pic: string[]
    lrc: string[]
  }
}

const PROVIDERS: Provider[] = [
  {
    // 首选：StudyWithMiku 同款后端。歌单里的 url 是经其服务器代理的 type=url 流式地址，
    // 对会员歌曲也能取到【完整】音频（直连网易 CDN 的源通常只给约 30~60s 的试听片段）。
    // br=320 即完整 320k mp3；改成 2000 可拿无损 flac，但体积大很多。
    name: 'qijie',
    base: 'https://api.qijieya.cn/meting/',
    fields: { name: ['title', 'name'], artist: ['author', 'artist'], url: ['url'], pic: ['pic', 'cover'], lrc: ['lrc'] },
  },
  {
    name: 'injahow',
    base: 'https://api.injahow.cn/meting/',
    fields: { name: ['name', 'title'], artist: ['artist', 'author'], url: ['url'], pic: ['pic', 'cover'], lrc: ['lrc'] },
  },
  {
    name: 'xiaoguan',
    base: 'https://met.api.xiaoguan.fit/api',
    fields: { name: ['title', 'name'], artist: ['author', 'artist'], url: ['url'], pic: ['pic'], lrc: ['lrc'] },
  },
  {
    name: 'i-meto',
    base: 'https://api.i-meto.com/meting/api',
    fields: { name: ['name', 'title'], artist: ['artist', 'author'], url: ['url'], pic: ['pic', 'cover'], lrc: ['lrc'] },
  },
]

function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v) return v
  }
  return ''
}

function normalize(raw: unknown, provider: Provider): Track[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const o = (item ?? {}) as Record<string, unknown>
      return {
        name: pick(o, provider.fields.name) || '未知曲目',
        artist: pick(o, provider.fields.artist) || '未知艺术家',
        url: pick(o, provider.fields.url),
        pic: pick(o, provider.fields.pic),
        lrc: pick(o, provider.fields.lrc),
      }
    })
    .filter((t) => !!t.url)
}

/**
 * 拉取歌单。歌单 id 不变时，每次打开都会重新请求，
 * 因此你在网易云里增删歌单歌曲，网页下次加载即同步。
 */
export async function fetchPlaylist(
  platform: Platform,
  id: string,
  bitrate: number | string = DEFAULT_BITRATE,
  onProvider?: (name: string) => void,
): Promise<Track[]> {
  let lastErr: unknown = null
  for (const provider of PROVIDERS) {
    try {
      onProvider?.(provider.name)
      const url = `${provider.base}?server=${platform}&type=playlist&id=${encodeURIComponent(id)}&br=${bitrate}`
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 15000)
      const resp = await fetch(url, { signal: ctrl.signal })
      clearTimeout(timer)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const json = await resp.json()
      const tracks = normalize(json, provider)
      if (tracks.length > 0) return tracks
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('歌单获取失败')
}

export const DEFAULT_PLAYLIST_ID = '18284047077'
export const RAIN_AUDIO_URL = 'https://media.rainymood.com/0.mp3'

/**
 * 音质档位（网易云 br 参数，即码率上限 kbps；2000 会返回无损 flac）。
 * 注意：码率越高单首体积越大——无损常在 20~60MB，移动端流量/弱网需谨慎。
 */
export interface QualityOption {
  value: string
  label: string
  hint: string
}
export const QUALITY_OPTIONS: QualityOption[] = [
  { value: '320', label: '标准', hint: '320k · 省流' },
  { value: '740', label: '高音质', hint: '较高码率' },
  { value: '2000', label: '无损', hint: 'FLAC · 体积大' },
]
export const DEFAULT_BITRATE = '740'

/**
 * 按设备与网络自适应挑选初始音质（用户手动选择后会被持久化、不再自动改）：
 * 省流/弱网 → 标准；手机蜂窝 → 高音质；桌面或 Wi‑Fi → 无损。
 */
export function autoQuality(): string {
  if (typeof navigator === 'undefined') return DEFAULT_BITRATE
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string; type?: string }
    }
  ).connection
  if (conn?.saveData) return '320'
  const eff = conn?.effectiveType
  if (eff === 'slow-2g' || eff === '2g' || eff === '3g') return '320'
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  if (conn?.type === 'cellular' || (coarse && conn?.type !== 'wifi')) return '740'
  return coarse ? '740' : '2000'
}
