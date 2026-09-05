import { useCallback, useEffect, useState } from 'react'
import RainCanvas from './components/RainCanvas'
import GlassClock from './components/GlassClock'
import PlayerBar from './components/PlayerBar'
import { useRainAudio } from './hooks/useRainAudio'
import { load, save } from './lib/storage'
import type { Palette } from './lib/color'

type BgMode = 'rain' | 'anime'

export default function App() {
  const audio = useRainAudio()
  const [bgMode, setBgMode] = useState<BgMode>(load('rain.bgMode', 'rain'))
  const [bgNonce, setBgNonce] = useState(0)
  const [showSeconds, setShowSeconds] = useState<boolean>(load('rain.sec', true))

  const onPalette = useCallback((p: Palette) => {
    const root = document.documentElement
    root.style.setProperty('--accent', p.accent)
    root.style.setProperty('--accent-rgb', p.accentRgb.join(','))
    root.style.setProperty('--soft', p.soft)
    root.style.setProperty('--mist', p.mist)
  }, [])

  // 首次先给一个默认雨窗绿，背景解码后再被主色覆盖
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', 'hsl(152 42% 64%)')
    document.documentElement.style.setProperty('--accent-rgb', '126,201,170')
  }, [])

  const changeBgMode = (m: BgMode) => {
    setBgMode(m)
    save('rain.bgMode', m)
    setBgNonce((n) => n + 1)
  }
  const shuffleBg = () => setBgNonce((n) => n + 1)

  return (
    <div className="app">
      <RainCanvas mode={bgMode} nonce={bgNonce} onPalette={onPalette} />
      <div className="vignette" />

      {audio.entered && (
        <div className="ui-layer">
          <GlassClock showSeconds={showSeconds} />
          <PlayerBar
            audio={audio}
            bgMode={bgMode}
            onBgMode={changeBgMode}
            onShuffleBg={shuffleBg}
            showSeconds={showSeconds}
            onShowSeconds={(b) => {
              setShowSeconds(b)
              save('rain.sec', b)
            }}
          />
        </div>
      )}

      {!audio.entered && (
        <div className="entry" onClick={() => void audio.enter()}>
          <div className="entry-card">
            <div className="entry-title">听雨</div>
            <div className="entry-sub">点击进入 · 雨窗旁的宁静时刻</div>
            <div className="entry-pulse" />
          </div>
        </div>
      )}
    </div>
  )
}
