/// <reference types="vite/client" />

// raindrop-fx 使用 `export =` 导出一个类，这里放宽 setBackground 的入参类型
// （运行时接受 HTMLImageElement / ImageBitmap 等 TexImageSource）
declare module 'raindrop-fx' {
  interface RaindropOptions {
    canvas: HTMLCanvasElement
    [key: string]: unknown
  }
  export default class RaindropFX {
    options: Record<string, unknown>
    constructor(options: Partial<RaindropOptions> & { canvas: HTMLCanvasElement })
    start(): Promise<void>
    stop(): void
    resize(width: number, height: number): void
    setBackground(background: unknown): Promise<void>
  }
}
