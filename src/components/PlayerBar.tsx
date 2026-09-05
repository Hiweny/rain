import { useEffect, useRef, useState } from 'react'
import type { useRainAudio } from '../hooks/useRainAudio'
import { fmt } from '../hooks/useRainAudio'
import { load, save } from '../lib/storage'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExitFullscreenIcon,
  FullscreenIcon,
  MuteIcon,
  MusicIcon,
  NextIcon,
  PauseIcon,
  PinIcon,
  PlayIcon,
  PrevIcon,
  RainIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  ShuffleImageIcon,
  SlidersIcon,
  VolumeIcon,
} from '../lib/icons'

type Audio = ReturnType<typeof useRainAudio>
type BgMode = 'rain' | 'anime'

interface Props {
  audio: Audio
  bgMode: BgMode
  onBgMode: (m: BgMode) => void
  onShuffleBg: () => void
  showSeconds: boolean
  onShowSeconds: (b: boolean) => void
}

export default function PlayerBar({ audio, bgMode, onBgMode, onShuffleBg, showSeconds, onShowSeconds }: Props) {
  const [panel, setPanel] = useState(false)
  const [pinned, setPinned] = useState<boolean>(load('rain.pinned', false))
  const [hidden, setHidden] = useState(false)
  const [isFs, setIsFs] = useState(false)
  const [idInput, setIdInput] = useState(audio.playlistId)
  const [interacted, setInteracted] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)

  const isMusic = audio.source === 'music'
  const progress = audio.dur > 0 ? Math.min(100, (audio.ctime / audio.dur) * 100) : 0

  // 自动隐藏：用户已与播放条交互过、且未固定、正在播放、面板关闭时，静止 7s 收成小圆钮
  useEffect(() => {
    if (pinned || !audio.playing || panel || !interacted) {
      setHidden(false)
      return
    }
    let timer = 0
    const arm = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setHidden(true), 7000)
    }
    arm()
    const wake = () => {
      setHidden(false)
      arm()
    }
    window.addEventListener('pointermove', wake)
    window.addEventListener('touchstart', wake, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('touchstart', wake)
    }
  }, [pinned, audio.playing, panel, interacted])

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  const seekFromEvent = (clientX: number) => {
    const el = progressRef.current
    if (!el || audio.dur <= 0) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    audio.seek(ratio * audio.dur)
  }
  const onProgressPointer = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    seekFromEvent(e.clientX)
  }
  const onProgressTouch = (e: React.TouchEvent) => {
    const t = e.touches[0]
    if (t) seekFromEvent(t.clientX)
  }

  const applyId = () => {
    const id = idInput.trim()
    if (id) void audio.setSource('music', id)
  }

  const togglePin = () => {
    const v = !pinned
    setPinned(v)
    save('rain.pinned', v)
  }

  const ModeIcon = audio.mode === 'shuffle' ? ShuffleIcon : audio.mode === 'one' ? RepeatOneIcon : RepeatIcon
  const modeLabel = audio.mode === 'shuffle' ? '随机' : audio.mode === 'one' ? '单曲' : '顺序'

  if (hidden) {
    return (
      <div className="mini-dock">
        <button className="glass mini" onClick={audio.togglePlay} aria-label="播放/暂停">
          {audio.playing ? <PauseIcon className="ico" /> : <PlayIcon className="ico" />}
        </button>
        <button className="glass mini mini-expand" onClick={() => setHidden(false)} aria-label="展开">
          <ChevronUpIcon className="ico sm" />
        </button>
      </div>
    )
  }

  return (
    <div
      ref={dockRef}
      className={`dock ${panel ? 'panel-open' : ''}`}
      onPointerDown={() => setInteracted(true)}
    >
      {panel && (
        <div className="glass panel">
          <div className="panel-group">
            <div className="panel-label">音源</div>
            <div className="seg">
              <button className={!isMusic ? 'on' : ''} onClick={() => audio.setSource('rain')}>
                <RainIcon className="ico sm" /> 雨声
              </button>
              <button className={isMusic ? 'on' : ''} onClick={() => audio.setSource('music')}>
                <MusicIcon className="ico sm" /> 歌单
              </button>
            </div>
          </div>

          {isMusic && (
            <div className="panel-group">
              <div className="panel-label">网易云歌单 ID</div>
              <div className="id-row">
                <input
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value)}
                  placeholder="输入歌单 id"
                  inputMode="numeric"
                  onKeyDown={(e) => e.key === 'Enter' && applyId()}
                />
                <button className="mini-btn" onClick={applyId}>
                  载入
                </button>
              </div>
              {audio.loadingList && <div className="hint">正在加载歌单…</div>}
              {audio.listError && <div className="hint err">{audio.listError}</div>}
            </div>
          )}

          <div className="panel-group">
            <div className="panel-label">音量</div>
            <div className="vol-row">
              <button className="icon-btn" onClick={audio.toggleMute} aria-label="静音">
                {audio.muted || audio.volume === 0 ? <MuteIcon className="ico sm" /> : <VolumeIcon className="ico sm" />}
              </button>
              <input
                className="slider"
                type="range"
                min={0}
                max={1}
                step={0.01}
                style={{ ['--fill' as string]: `${(audio.muted ? 0 : audio.volume) * 100}%` }}
                value={audio.muted ? 0 : audio.volume}
                onChange={(e) => audio.setVolume(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="panel-group">
            <div className="panel-label">背景</div>
            <div className="seg">
              <button className={bgMode === 'rain' ? 'on' : ''} onClick={() => onBgMode('rain')}>
                雨窗
              </button>
              <button className={bgMode === 'anime' ? 'on' : ''} onClick={() => onBgMode('anime')}>
                动漫
              </button>
            </div>
            <button className="text-btn" onClick={onShuffleBg}>
              <ShuffleImageIcon className="ico sm" /> 换一张
            </button>
          </div>

          <div className="panel-grid">
            <Toggle label="显示秒" on={showSeconds} onChange={onShowSeconds} />
            <button className="row-btn" onClick={toggleFullscreen}>
              {isFs ? <ExitFullscreenIcon className="ico sm" /> : <FullscreenIcon className="ico sm" />}
              {isFs ? '退出全屏' : '全屏'}
            </button>
            <Toggle label="固定播放条" on={pinned} onChange={togglePin} />
            {isMusic && (
              <button className="row-btn" onClick={audio.cycleMode}>
                <ModeIcon className="ico sm" /> 播放：{modeLabel}
              </button>
            )}
            <button className="row-btn" onClick={() => setHidden(true)}>
              <ChevronDownIcon className="ico sm" /> 收起（只留时钟）
            </button>
            <button className="row-btn" onClick={() => setPanel(false)}>
              完成
            </button>
          </div>
        </div>
      )}

      <div className="glass bar">
        <div
          className={`progress ${audio.dur > 0 ? '' : 'disabled'}`}
          ref={progressRef}
          onPointerDown={onProgressPointer}
          onPointerMove={(e) => e.buttons === 1 && onProgressPointer(e)}
          onTouchStart={onProgressTouch}
          onTouchMove={onProgressTouch}
        >
          <div className="fill" style={{ width: `${progress}%` }} />
          <div className="thumb" style={{ left: `${progress}%` }} />
        </div>

        <div className="bar-row">
          <div className="meta">
            {isMusic ? (
              audio.current ? (
                <>
                  <div className="t">{audio.current.name}</div>
                  <div className="a">{audio.current.artist}</div>
                </>
              ) : (
                <>
                  <div className="t">{audio.loadingList ? '加载歌单中…' : '歌单音乐'}</div>
                  <div className="a">网易云 · {audio.tracks.length} 首</div>
                </>
              )
            ) : (
              <>
                <div className="t">雨声</div>
                <div className="a">Rainy Window · 循环</div>
              </>
            )}
          </div>

          <div className="transport">
            {isMusic && (
              <button className="icon-btn" onClick={audio.prev} aria-label="上一首">
                <PrevIcon className="ico" />
              </button>
            )}
            <button className="play-btn" onClick={audio.togglePlay} aria-label="播放/暂停">
              {audio.playing ? <PauseIcon className="ico" /> : <PlayIcon className="ico" />}
            </button>
            {isMusic && (
              <button className="icon-btn" onClick={audio.next} aria-label="下一首">
                <NextIcon className="ico" />
              </button>
            )}
          </div>

          <div className="actions">
            <span className="time">
              {fmt(audio.ctime)}
              <span className="dur"> / {fmt(audio.dur)}</span>
            </span>
            {isMusic && (
              <button className="icon-btn" onClick={audio.cycleMode} aria-label="播放模式">
                <ModeIcon className="ico sm" />
              </button>
            )}
            <button
              className={`icon-btn ${panel ? 'on' : ''}`}
              onClick={() => setPanel((v) => !v)}
              aria-label="更多控制"
            >
              <SlidersIcon className="ico sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (b: boolean) => void }) {
  return (
    <button className={`row-btn toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span className="switch">
        <span className="knob" />
      </span>
      {label}
    </button>
  )
}
