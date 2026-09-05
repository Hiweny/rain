import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_PLAYLIST_ID, RAIN_AUDIO_URL, fetchPlaylist, type Platform, type Track } from '../lib/meting'
import { load, save } from '../lib/storage'

export type Source = 'rain' | 'music'
export type PlayMode = 'list' | 'shuffle' | 'one'

export function fmt(t: number): string {
  if (!isFinite(t) || t < 0) t = 0
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function useRainAudio() {
  const rainRef = useRef<HTMLAudioElement | null>(null)
  const musicRef = useRef<HTMLAudioElement | null>(null)

  const [source, setSourceState] = useState<Source>(load('rain.source', 'rain'))
  const [playing, setPlaying] = useState(false)

  const [tracks, setTracks] = useState<Track[]>([])
  const [idx, setIdx] = useState(0)
  const [ctime, setCtime] = useState(0)
  const [dur, setDur] = useState(0)

  const [volRain, setVolRainState] = useState<number>(load('rain.volRain', 0.85))
  const [volMusic, setVolMusicState] = useState<number>(load('rain.volMusic', 0.95))
  const [muted, setMuted] = useState(false)
  const [mode, setModeState] = useState<PlayMode>(load('rain.mode', 'list'))
  const [platform] = useState<Platform>('netease')
  const [playlistId, setPlaylistIdState] = useState<string>(load('rain.playlistId', DEFAULT_PLAYLIST_ID))
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState('')

  // 用 ref 保存事件处理器需要的最新值，避免闭包过期
  const sourceRef = useRef(source)
  const modeRef = useRef(mode)
  const idxRef = useRef(idx)
  const tracksRef = useRef(tracks)
  const failedRef = useRef<Set<number>>(new Set())
  sourceRef.current = source
  modeRef.current = mode
  idxRef.current = idx
  tracksRef.current = tracks

  const activeAudio = useCallback((): HTMLAudioElement | null => {
    return (sourceRef.current === 'rain' ? rainRef.current : musicRef.current)
  }, [])

  // 创建两个 audio 元素并绑定一次性事件
  useEffect(() => {
    const rain = new Audio()
    rain.loop = true
    rain.preload = 'none'
    rain.src = RAIN_AUDIO_URL
    rain.volume = volRain
    const music = new Audio()
    music.preload = 'auto'
    music.volume = volMusic
    rainRef.current = rain
    musicRef.current = music

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime = () => {
      const a = activeAudio()
      if (a) setCtime(a.currentTime)
    }
    const onMeta = () => {
      const a = activeAudio()
      if (a) setDur(a.duration || 0)
    }
    const goNext = () => advance(true)
    const onErr = () => {
      // 失效音源（如 VIP）自动跳到下一首，避免卡住
      if (sourceRef.current === 'music') {
        failedRef.current.add(idxRef.current)
        advance(true)
      }
    }
    rain.addEventListener('play', onPlay)
    rain.addEventListener('pause', onPause)
    music.addEventListener('play', onPlay)
    music.addEventListener('pause', onPause)
    music.addEventListener('timeupdate', onTime)
    rain.addEventListener('timeupdate', onTime)
    music.addEventListener('loadedmetadata', onMeta)
    rain.addEventListener('loadedmetadata', onMeta)
    music.addEventListener('ended', goNext)
    music.addEventListener('error', onErr)

    const timer = window.setInterval(() => {
      const a = activeAudio()
      if (a) {
        setCtime(a.currentTime)
        setDur(Number.isFinite(a.duration) ? a.duration : 0)
      }
    }, 500)

    return () => {
      window.clearInterval(timer)
      rain.pause()
      music.pause()
      rain.removeEventListener('play', onPlay)
      rain.removeEventListener('pause', onPause)
      rain.removeEventListener('timeupdate', onTime)
      rain.removeEventListener('loadedmetadata', onMeta)
      music.removeEventListener('play', onPlay)
      music.removeEventListener('pause', onPause)
      music.removeEventListener('timeupdate', onTime)
      music.removeEventListener('loadedmetadata', onMeta)
      music.removeEventListener('ended', goNext)
      music.removeEventListener('error', onErr)
      rainRef.current = null
      musicRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const playActive = useCallback(async () => {
    const a = activeAudio()
    if (!a) return
    try {
      await a.play()
    } catch {
      /* 自动播放被拦截时忽略，等待用户手势 */
    }
  }, [activeAudio])

  const loadPlaylist = useCallback(
    async (id: string) => {
      setLoadingList(true)
      setListError('')
      try {
        const list = await fetchPlaylist(platform, id || DEFAULT_PLAYLIST_ID)
        if (!list.length) throw new Error('歌单为空或不可访问')
        failedRef.current = new Set()
        tracksRef.current = list
        idxRef.current = 0
        setTracks(list)
        setIdx(0)
        setPlaylistIdState(id)
        save('rain.playlistId', id)
        if (musicRef.current) {
          musicRef.current.src = list[0].url
        }
        return list
      } catch (e) {
        setListError('歌单加载失败，已尝试多个音源')
        return []
      } finally {
        setLoadingList(false)
      }
    },
    [platform],
  )

  // 解锁音频播放（浏览器要求用户手势）；若音源是歌单则先确保已拉取
  const unlock = useCallback(async () => {
    if (rainRef.current) rainRef.current.volume = muted ? 0 : volRain
    if (sourceRef.current === 'music' && !tracksRef.current.length) {
      const list = await loadPlaylist(playlistId)
      if (!list.length) return
    }
    await new Promise((r) => setTimeout(r, 30))
    await playActive()
  }, [playActive, muted, volRain, loadPlaylist, playlistId])

  // 页面即显：先尝试自动播放（多数浏览器会拦截），并在首次任意手势时解锁一次
  useEffect(() => {
    void playActive()
    const gestures = ['pointerdown', 'touchstart', 'keydown']
    let done = false
    const onGesture = () => {
      if (done) return
      done = true
      void unlock()
      gestures.forEach((g) => window.removeEventListener(g, onGesture))
    }
    gestures.forEach((g) => window.addEventListener(g, onGesture, { passive: true }))
    return () => gestures.forEach((g) => window.removeEventListener(g, onGesture))
  }, [playActive, unlock])

  const setSource = useCallback(
    async (s: Source, id?: string) => {
      sourceRef.current = s
      setSourceState(s)
      save('rain.source', s)
      rainRef.current?.pause()
      musicRef.current?.pause()
      if (s === 'music') {
        if (id) {
          const list = await loadPlaylist(id)
          if (!list.length) return
        } else if (!tracksRef.current.length) {
          const list = await loadPlaylist(playlistId)
          if (!list.length) return
        }
        if (musicRef.current && !musicRef.current.src && tracksRef.current[0]) {
          musicRef.current.src = tracksRef.current[0].url
        }
      }
      await playActive()
    },
    [loadPlaylist, playlistId, playActive],
  )

  const togglePlay = useCallback(() => {
    const a = activeAudio()
    if (!a) return
    if (a.paused) {
      a.play().catch(() => {})
    } else {
      a.pause()
    }
  }, [activeAudio])

  const advance = useCallback(
    (auto: boolean) => {
      const list = tracksRef.current
      if (!list.length) return
      const m = modeRef.current
      if (m === 'one' && auto) {
        if (musicRef.current) {
          musicRef.current.currentTime = 0
          musicRef.current.play().catch(() => {})
        }
        return
      }
      let nextIdx: number
      if (m === 'shuffle') {
        if (list.length === 1) nextIdx = 0
        else {
          do {
            nextIdx = Math.floor(Math.random() * list.length)
          } while (nextIdx === idxRef.current || failedRef.current.has(nextIdx))
        }
      } else {
        nextIdx = idxRef.current + 1
        if (nextIdx >= list.length) nextIdx = 0
      }
      if (failedRef.current.size >= list.length) {
        failedRef.current.clear()
      }
      setIdx(nextIdx)
      if (musicRef.current) {
        musicRef.current.src = list[nextIdx].url
        musicRef.current.play().catch(() => {})
      }
    },
    [],
  )

  const next = useCallback(() => advance(false), [advance])
  const prev = useCallback(() => {
    const list = tracksRef.current
    if (!list.length) return
    const a = musicRef.current
    // 播放超过 3 秒点上一首回到本曲开头，否则切上一首
    if (a && a.currentTime > 3) {
      a.currentTime = 0
      return
    }
    const p = (idxRef.current - 1 + list.length) % list.length
    setIdx(p)
    if (musicRef.current) {
      musicRef.current.src = list[p].url
      musicRef.current.play().catch(() => {})
    }
  }, [])

  const cycleMode = useCallback(() => {
    const order: PlayMode[] = ['list', 'shuffle', 'one']
    const m = order[(order.indexOf(modeRef.current) + 1) % order.length]
    modeRef.current = m
    setModeState(m)
    save('rain.mode', m)
  }, [])

  const seek = useCallback(
    (t: number) => {
      const a = activeAudio()
      if (a && isFinite(t)) {
        a.currentTime = t
        setCtime(t)
      }
    },
    [activeAudio],
  )

  const applyVol = useCallback(() => {
    if (rainRef.current) rainRef.current.volume = muted ? 0 : volRain
    if (musicRef.current) musicRef.current.volume = muted ? 0 : volMusic
  }, [muted, volRain, volMusic])

  useEffect(applyVol, [applyVol])

  const setVolRain = (v: number) => {
    setVolRainState(v)
    save('rain.volRain', v)
  }
  const setVolMusic = (v: number) => {
    setVolMusicState(v)
    save('rain.volMusic', v)
  }
  const toggleMute = () => setMuted((m) => !m)

  const current = tracks[idx] ?? null
  const volume = source === 'rain' ? volRain : volMusic
  const setVolume = source === 'rain' ? setVolRain : setVolMusic

  return {
    unlock,
    source,
    setSource,
    playing,
    togglePlay,
    tracks,
    current,
    idx,
    ctime,
    dur,
    seek,
    next,
    prev,
    mode,
    cycleMode,
    loadingList,
    listError,
    playlistId,
    loadPlaylist,
    volume,
    setVolume,
    volRain,
    volMusic,
    muted,
    toggleMute,
  }
}
