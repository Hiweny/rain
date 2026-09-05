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
 *  1) loliapi：302 到随机镜像图，全链路带 Access-Control-Allow-Origin:*，
 *     可直接 fetch 成干净纹理；注意它【不接受】任何 query 参数（会 302 到 404），
 *     且响应为 cache-control:no-cache，天然每次随机，故用 cache:'no-store' 而非加参数。
 *  2) t.alcy.cc / 3) moe.jitsu.top：最终图不带跨域头，浏览器 fetch 通常会被 CORS 拦截，
 *     仅在 loliapi 不可用时作尽力兜底，失败即跳过，保证不黑屏。
 */
function animeCandidates(portrait: boolean): string[] {
  const loli = portrait
    ? ['https://www.loliapi.com/acg/pe', 'https://www.loliapi.com/acg/']
    : ['https://www.loliapi.com/acg/pc', 'https://www.loliapi.com/acg/']
  return [...loli, 'https://t.alcy.cc/mp/', 'https://moe.jitsu.top/img/']
}

/** 以 CORS 方式取图并解码成 ImageBitmap（保证 WebGL 纹理不被污染） */
export async function fetchBitmap(url: string, timeoutMs = 12000): Promise<ImageBitmap> {
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
    return await createImageBitmap(blob)
  } finally {
    clearTimeout(timer)
  }
}

/** 依次尝试动漫图源，返回第一张成功的位图 */
export async function loadAnimeBitmap(portrait: boolean): Promise<ImageBitmap> {
  const candidates = animeCandidates(portrait)
  let lastErr: unknown = null
  for (const url of candidates) {
    try {
      return await fetchBitmap(url)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('all anime sources failed')
}

export function isPortrait(): boolean {
  return typeof window !== 'undefined' && window.innerHeight >= window.innerWidth
}
