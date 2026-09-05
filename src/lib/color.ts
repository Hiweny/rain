// 从背景位图提取主色，生成一套克制、优雅、能在深色玻璃上清晰可见的配色
export interface Palette {
  /** 强调色 hsl 字符串，用于进度条/微光 */
  accent: string
  /** 强调色 rgb 数组，用于拼装 rgba() */
  accentRgb: [number, number, number]
  /** 更柔和、偏亮的强调色，用于文字/高光 */
  soft: string
  /** 玻璃冷雾底色 rgba */
  mist: string
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h /= 6
  }
  return [h * 360, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let r: number
  let g: number
  let b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue(p, q, h + 1 / 3)
    g = hue(p, q, h)
    b = hue(p, q, h - 1 / 3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

export async function extractPalette(source: ImageBitmap): Promise<Palette> {
  const W = 40
  const H = 40
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return fallback()
  ctx.drawImage(source, 0, 0, W, H)
  const { data } = ctx.getImageData(0, 0, W, H)

  let r = 0
  let g = 0
  let b = 0
  let wsum = 0
  for (let i = 0; i < data.length; i += 4) {
    const R = data[i]
    const G = data[i + 1]
    const B = data[i + 2]
    const lum = (R + G + B) / 3
    if (lum < 16 || lum > 238) continue // 跳过近黑/近白
    const mx = Math.max(R, G, B)
    const mn = Math.min(R, G, B)
    const weight = 1 + (mx - mn) / 255 // 越饱和权重越高
    r += R * weight
    g += G * weight
    b += B * weight
    wsum += weight
  }
  if (wsum === 0) return fallback()
  const [hue, sat] = rgbToHsl(r / wsum, g / wsum, b / wsum)

  // 固定明度区间，保证在深色雨窗玻璃上始终是优雅、可读的微光
  const accentS = Math.min(0.58, Math.max(0.3, sat * 0.9 + 0.18))
  const accentL = 0.62
  const softL = 0.78
  const accentRgb = hslToRgb(hue, accentS, accentL)
  const softRgb = hslToRgb(hue, accentS * 0.8, softL)
  const mistRgb = hslToRgb(hue, 0.35, 0.12)
  return {
    accent: `hsl(${hue.toFixed(0)} ${(accentS * 100).toFixed(0)}% ${(accentL * 100).toFixed(0)}%)`,
    accentRgb,
    soft: `rgb(${softRgb.join(',')})`,
    mist: `rgba(${mistRgb.join(',')},0.16)`,
  }
}

function fallback(): Palette {
  // 雨窗绿兜底
  return {
    accent: 'hsl(152 42% 62%)',
    accentRgb: [122, 200, 168],
    soft: 'rgb(178,224,202)',
    mist: 'rgba(20,46,36,0.16)',
  }
}
