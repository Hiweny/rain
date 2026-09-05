import { useCallback, useEffect, useState } from 'react'
import RainCanvas from './components/RainCanvas'
import Clock from './components/Clock'
import PlayerBar from './components/PlayerBar'
import { useRainAudio } from './hooks/useRainAudio'
import { load, save } from './lib/storage'
import type { Palette } from './lib/color'

type BgMode = 'rain' | 'anime'

export default function App() {
  const audio = useRainAudio()
  const [bgMode, setBgMode] = useState<BgMode>(load('rain.bgMode', 'rain'))
  const [bgNonce, setBgNonce] = useState(0)

  // 动漫阅图模式偏好
  const [animeRain, setAnimeRain] = useState<boolean>(load('rain.animeRain', true))
  const [dim, setDim] = useState<number>(load('rain.animeDim', 0))
  const [cycle, setCycle] = useState<boolean>(load('rain.animeCycle', false))

  const onPalette = useCallback((p: Palette) => {
    const root = document.documentElement
    root.style.setProperty('--accent', p.accent)
    root.style.setProperty('--accent-rgb', p.accentRgb.join(','))
    root.style.setProperty('--soft', p.soft)
    root.style.setProperty('--mist', p.mist)
  }, [])

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

  // 动漫轮播
  useEffect(() => {
    if (!(bgMode === 'anime' && cycle)) return
    const id = window.setInterval(() => setBgNonce((n) => n + 1), 18000)
    return () => window.clearInterval(id)
  }, [bgMode, cycle])

  // 雨窗模式恒有雨；动漫模式按开关
  const rainOn = bgMode === 'rain' || animeRain

  return (
    <div className="app">
      <RainCanvas mode={bgMode} nonce={bgNonce} rainOn={rainOn} dim={dim} onPalette={onPalette} />
      <div className="vignette" />

      <div className="ui-top">
        <Clock />
      </div>

      <PlayerBar
        audio={audio}
        bgMode={bgMode}
        onBgMode={changeBgMode}
        onShuffleBg={shuffleBg}
        animeRain={animeRain}
        setAnimeRain={(v) => {
          setAnimeRain(v)
          save('rain.animeRain', v)
        }}
        dim={dim}
        setDim={(v) => {
          setDim(v)
          save('rain.animeDim', v)
        }}
        cycle={cycle}
        setCycle={(v) => {
          setCycle(v)
          save('rain.animeCycle', v)
        }}
      />
    </div>
  )
}
