import { useEffect, useRef } from 'react'
import RaindropFX from 'raindrop-fx'
import { extractPalette, type Palette } from '../lib/color'
import { fetchBlob, isPortrait, loadAnimeBlob, nextRainImage } from '../lib/backgrounds'

type BgMode = 'rain' | 'anime'

interface Props {
  mode: BgMode
  nonce: number
  /** 是否渲染 WebGL 雨滴（阅图模式可关） */
  rainOn: boolean
  /** 压暗程度 0..0.65 */
  dim: number
  onPalette: (p: Palette) => void
}

export default function RainCanvas({ mode, nonce, rainOn, dim, onPalette }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const photoRef = useRef<HTMLDivElement>(null)
  const crossRef = useRef<HTMLDivElement>(null)
  const dimRef = useRef<HTMLDivElement>(null)
  const fxRef = useRef<RaindropFX | null>(null)
  const modeRef = useRef(mode)
  const rainOnRef = useRef(rainOn)
  const objUrlRef = useRef<string>('')
  const shownRef = useRef<string>('')
  const onPaletteRef = useRef(onPalette)
  const firstRun = useRef(true)
  modeRef.current = mode
  rainOnRef.current = rainOn
  onPaletteRef.current = onPalette

  /** 取一张图：返回 WebGL 位图 + 用于即时显示的图层 URL */
  async function acquire(target: BgMode, presetRainUrl?: string) {
    let photoUrl = ''
    let bitmap: ImageBitmap
    if (target === 'rain') {
      const url = presetRainUrl ?? nextRainImage()
      photoUrl = url
      bitmap = await createImageBitmap(await fetchBlob(url))
    } else {
      const blob = await loadAnimeBlob(isPortrait())
      if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current)
      photoUrl = URL.createObjectURL(blob)
      objUrlRef.current = photoUrl
      bitmap = await createImageBitmap(blob)
    }
    return { photoUrl, bitmap }
  }

  function setPhoto(url: string) {
    if (photoRef.current && url) photoRef.current.style.backgroundImage = `url("${url}")`
  }

  /**
   * 优雅地呈现新背景：把“当前旧画面”铺在交叉过渡层上，
   * 底层换成新图（同时重建 WebGL 背景），再让旧画面缓慢淡出，
   * 从而遮住 setBackground 重建模糊金字塔时的闪烁/突变。
   */
  function crossfadeTo(photoUrl: string) {
    const layer = crossRef.current
    const prev = shownRef.current
    if (layer && prev && prev !== photoUrl) {
      const wet = rainOnRef.current
      layer.style.backgroundImage = `url("${prev}")`
      layer.style.filter = wet ? 'blur(6px) saturate(1.06) brightness(0.92)' : 'saturate(1.04)'
      layer.style.transform = wet ? 'scale(1.08)' : 'scale(1.02)'
      layer.classList.remove('fading')
      // 强制重排以重启动画
      void layer.offsetWidth
      layer.style.opacity = '1'
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          layer.classList.add('fading')
          layer.style.opacity = '0'
        }),
      )
    }
    setPhoto(photoUrl)
    shownRef.current = photoUrl
  }

  // 初始化（只跑一次）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false

    // 性能分级：触屏/小屏低核数降低密度与分辨率
    const lite =
      window.matchMedia?.('(pointer: coarse)').matches ||
      (window.innerWidth < 760 && (navigator.hardwareConcurrency || 8) <= 6)
    const maxDpr = lite ? 1.5 : 2
    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
    }

    const supports = (() => {
      try {
        return !!canvas.getContext('webgl2')
      } catch {
        return false
      }
    })()

    async function boot() {
      // 1) 先用本地雨窗图把静态图层铺满，杜绝黑屏
      const firstUrl = modeRef.current === 'rain' ? nextRainImage() : ''
      if (firstUrl) {
        setPhoto(firstUrl)
        shownRef.current = firstUrl
      }

      // 2) 解码首图
      let first: { photoUrl: string; bitmap: ImageBitmap }
      try {
        first = await acquire(modeRef.current, firstUrl || undefined)
      } catch {
        const u = nextRainImage()
        first = await acquire('rain', u)
      }
      if (cancelled) return
      setPhoto(first.photoUrl)
      shownRef.current = first.photoUrl
      const palette = await extractPalette(first.bitmap)
      if (cancelled) return
      onPaletteRef.current(palette)

      if (!supports) {
        photoRef.current?.classList.add('sharp')
        return
      }

      // 3) 背景直接传入构造函数，首帧即带图（避免“先黑一下再出图”）
      //    参数对齐 rainymood 官网（即库默认值），仅在低端机下调密度
      sizeCanvas()
      const fx = new RaindropFX({
        canvas,
        background: first.bitmap as unknown as ConstructorParameters<typeof RaindropFX>[0]['background'],
        spawnLimit: lite ? 1100 : 2000,
        dropletsPerSeconds: lite ? 320 : 500,
      } as ConstructorParameters<typeof RaindropFX>[0])
      fxRef.current = fx
      if (rainOnRef.current) {
        await fx.start()
      } else {
        canvas!.style.display = 'none'
        photoRef.current?.classList.add('sharp')
      }
    }

    const onResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
      fxRef.current?.resize(
        Math.floor(window.innerWidth * dpr),
        Math.floor(window.innerHeight * dpr),
      )
    }
    const onVis = () => {
      if (!fxRef.current) return
      if (document.hidden) fxRef.current.stop()
      else if (rainOnRef.current) fxRef.current.start()
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    document.addEventListener('visibilitychange', onVis)
    void boot()

    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      document.removeEventListener('visibilitychange', onVis)
      fxRef.current?.stop()
      fxRef.current = null
      if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 切换模式 / 换一张（带交叉淡入）
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    let alive = true
    ;(async () => {
      try {
        const got = await acquire(mode)
        if (!alive) return
        // 旧画面定格在上层并淡出，底层换新
        crossfadeTo(got.photoUrl)
        const palette = await extractPalette(got.bitmap)
        if (!alive) return
        onPaletteRef.current(palette)
        await fxRef.current?.setBackground(
          got.bitmap as unknown as Parameters<RaindropFX['setBackground']>[0],
        )
      } catch {
        /* 保留当前画面 */
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, nonce])

  // 雨滴开关（阅图模式）
  useEffect(() => {
    const photo = photoRef.current
    if (rainOn) {
      photo?.classList.remove('sharp')
      if (canvasRef.current) canvasRef.current.style.display = ''
      void fxRef.current?.start()
    } else {
      fxRef.current?.stop()
      if (canvasRef.current) canvasRef.current.style.display = 'none'
      photo?.classList.add('sharp')
    }
  }, [rainOn])

  // 亮度（压暗遮罩）
  useEffect(() => {
    if (dimRef.current) dimRef.current.style.opacity = String(dim)
  }, [dim])

  return (
    <>
      <div ref={photoRef} className="bg-photo" />
      <canvas ref={canvasRef} className="rain-canvas" />
      <div ref={crossRef} className="bg-crossfade" />
      <div ref={dimRef} className="dim-overlay" style={{ opacity: dim }} />
    </>
  )
}
