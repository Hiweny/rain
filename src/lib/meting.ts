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
  bitrate = 320,
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
