import { load, save } from './storage'

const BASE = import.meta.env.BASE_URL // '/rain/'
export const RAIN_COUNT = 12
const RAIN_INDEX_KEY = 'rain.bgIndex'

/** 本地雨窗绿图（同源，可直接作为 WebGL 纹理）。每次刷新轮流切换。 */
export function nextRainImage(): string {
  const idx = load<number>(RAIN_INDEX_KEY, 0)
  const current = ((idx % RAIN_COUNT) + RAIN_COUNT) % RAIN_COUNT
  save(RAIN_INDEX_KEY, current + 1)
  return `${BASE}assets/bz/${current + 1}.jpg`
}

/**
 * 动漫随机图源（均无需 Key），按优先级顺序回退：
 *  1) loliapi：302 到随机镜像图，全链路带 Access-Control-Allow-Origin:*；
 *     注意它【不接受】query 参数（会 302 到 404），响应为 no-cache，天然每次随机。
 *  2) t.alcy.cc / 3) moe.jitsu.top：最终图不带跨域头，浏览器 fetch 通常被 CORS 拦截，
 *     仅在 loliapi 不可用时尽力兜底，失败即跳过。
 */
function animeCandidates(portrait: boolean): string[] {
  const loli = portrait
    ? ['https://www.loliapi.com/acg/pe', 'https://www.loliapi.com/acg/']
    : ['https://www.loliapi.com/acg/pc', 'https://www.loliapi.com/acg/']
  return [...loli, 'https://t.alcy.cc/mp/', 'https://moe.jitsu.top/img/']
}

export async function fetchBlob(url: string, timeoutMs = 12000): Promise<Blob> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const resp = await fetch(url, {
      mode: 'cors',
      signal: ctrl.signal,
      credentials: 'omit',
      cache: 'no-store',
      headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' },
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const blob = await resp.blob()
    if (!blob.type.startsWith('image/')) throw new Error('not an image')
    return blob
  } finally {
    clearTimeout(timer)
  }
}

/** 依次尝试动漫图源，返回第一张成功的图片 Blob */
export async function loadAnimeBlob(portrait: boolean): Promise<Blob> {
  const candidates = animeCandidates(portrait)
  let lastErr: unknown = null
  for (const url of candidates) {
    try {
      return await fetchBlob(url)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('all anime sources failed')
}

export async function fetchBitmap(url: string, timeoutMs = 12000): Promise<ImageBitmap> {
  const blob = await fetchBlob(url, timeoutMs)
  return createImageBitmap(blob)
}

export function isPortrait(): boolean {
  return typeof window !== 'undefined' && window.innerHeight >= window.innerWidth
}
