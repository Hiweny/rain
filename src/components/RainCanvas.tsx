import { useEffect, useRef } from 'react'
import RaindropFX from 'raindrop-fx'
import { extractPalette, type Palette } from '../lib/color'
import { fetchBitmap, isPortrait, loadAnimeBitmap, nextRainImage } from '../lib/backgrounds'

type BgMode = 'rain' | 'anime'

interface Props {
  mode: BgMode
  nonce: number
  onPalette: (p: Palette) => void
}

export default function RainCanvas({ mode, nonce, onPalette }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fallbackRef = useRef<HTMLDivElement>(null)
  const fxRef = useRef<RaindropFX | null>(null)
  const modeRef = useRef(mode)
  modeRef.current = mode
  const onPaletteRef = useRef(onPalette)
  onPaletteRef.current = onPalette
  const firstRun = useRef(true)

  // 初始化（只跑一次）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    let fx: RaindropFX | null = null

    const supports = (() => {
      try {
        return !!canvas.getContext('webgl2')
      } catch {
        return false
      }
    })()

    // 设备能力分级：触屏或小屏低核数走轻量参数，保证手机端流畅
    const lite =
      window.matchMedia?.('(pointer: coarse)').matches ||
      (window.innerWidth < 760 && (navigator.hardwareConcurrency || 8) <= 6)
    const maxDpr = lite ? 1.5 : 2
    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
      const w = Math.floor(window.innerWidth * dpr)
      const h = Math.floor(window.innerHeight * dpr)
      canvas.width = w
      canvas.height = h
      return { w, h }
    }

    const loadBackground = async (first = false) => {
      try {
        let bmp: ImageBitmap
        let cssFallback = ''
        if (modeRef.current === 'anime') {
          bmp = await loadAnimeBitmap(isPortrait())
        } else {
          const url = nextRainImage()
          cssFallback = url
          bmp = await fetchBitmap(url)
        }
        if (cancelled) return
        const palette = await extractPalette(bmp)
        onPaletteRef.current(palette)
        if (fx) {
          await fx.setBackground(bmp as unknown as Parameters<RaindropFX['setBackground']>[0])
        }
        if (fallbackRef.current) fallbackRef.current.style.backgroundImage = `url(${cssFallback})`
        if (first) void 0
      } catch (e) {
        // 动漫源全挂时退回本地雨窗图，保证有画面
        if (modeRef.current === 'anime') {
          try {
            const bmp = await fetchBitmap(nextRainImage())
            if (!cancelled && fx) {
              const palette = await extractPalette(bmp)
              onPaletteRef.current(palette)
              await fx.setBackground(bmp as unknown as Parameters<RaindropFX['setBackground']>[0])
            }
          } catch {
            /* ignore */
          }
        }
      }
    }

    if (supports) {
      const { w, h } = sizeCanvas()
      try {
        fx = new RaindropFX({
          canvas,
          spawnInterval: lite ? [0.08, 0.28] : [0.06, 0.22],
          spawnSize: lite ? [14, 64] : [18, 86],
          spawnLimit: lite ? 820 : 1600,
          slipRate: 0.05,
          dropletsPerSecond: lite ? 420 : 900,
          dropletSize: lite ? [6, 18] : [8, 24],
          mist: true,
          mistColor: [0.014, 0.022, 0.018, 1],
          backgroundBlurSteps: lite ? 3 : 4,
          mistBlurStep: lite ? 4 : 5,
          gravity: 2200,
          raindropCompose: 'smoother',
        } as ConstructorParameters<typeof RaindropFX>[0])
        fxRef.current = fx
        fx.start().then(() => loadBackground(true))
      } catch {
        fx = null
      }

      const onResize = () => {
        const { w, h } = sizeCanvas()
        fxRef.current?.resize(w, h)
      }
      const onVis = () => {
        if (document.hidden) fxRef.current?.stop()
        else fxRef.current?.start()
      }
      window.addEventListener('resize', onResize)
      window.addEventListener('orientationchange', onResize)
      document.addEventListener('visibilitychange', onVis)

      return () => {
        cancelled = true
        window.removeEventListener('resize', onResize)
        window.removeEventListener('orientationchange', onResize)
        document.removeEventListener('visibilitychange', onVis)
        fxRef.current?.stop()
        fxRef.current = null
      }
    } else {
      // 不支持 WebGL2：降级为静态背景
      if (fallbackRef.current) fallbackRef.current.style.display = 'block'
      canvas.style.display = 'none'
      loadBackground(true)
      return () => {
        cancelled = true
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 切换模式 / 换一张（首次挂载由初始化 effect 负责，这里跳过）
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    if (!fxRef.current) return
    let alive = true
    ;(async () => {
      try {
        const bmp =
          mode === 'anime' ? await loadAnimeBitmap(isPortrait()) : await fetchBitmap(nextRainImage())
        if (!alive) return
        const palette = await extractPalette(bmp)
        onPaletteRef.current(palette)
        await fxRef.current?.setBackground(bmp as unknown as Parameters<RaindropFX['setBackground']>[0])
      } catch {
        /* keep current */
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, nonce])

  return (
    <>
      <canvas ref={canvasRef} className="rain-canvas" />
      <div ref={fallbackRef} className="rain-fallback" />
    </>
  )
}
