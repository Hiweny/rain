import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_PLAYLIST_ID,
  RAIN_AUDIO_URL,
  autoQuality,
  fetchPlaylist,
  type Platform,
  type Track,
} from '../lib/meting'
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
  const [quality, setQualityState] = useState<string>(load('rain.quality', autoQuality()))
  const qualityRef = useRef(quality)
  qualityRef.current = quality
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState('')

  // 用 ref 保存事件处理器需要的最新值，避免闭包过期
  const sourceRef = useRef(source)
  const modeRef = useRef(mode)
  const idxRef = useRef(idx)
  const tracksRef = useRef(tracks)
  const failedRef = useRef<Set<number>>(new Set())
  // 进度记忆：刷新/重进后恢复到上次位置
  const playlistIdRef = useRef(playlistId)
  const rainSeekRef = useRef<number | null>(load<number>('rain.posRain', 0) || null)
  const musicSeekRef = useRef<number | null>(null)
  const lastPersistRef = useRef(0)
  playlistIdRef.current = playlistId
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

    // 把待恢复的进度在元数据就绪后跳转一次
    const applyPendingSeek = (a: HTMLAudioElement, pending: { current: number | null }) => {
      if (pending.current == null) return
      const t = pending.current
      pending.current = null
      if (isFinite(a.duration) && a.duration > 1 && t > 1 && t < a.duration - 1) {
        try {
          a.currentTime = t
        } catch {
          /* ignore */
        }
      }
    }
    const onMeta = () => {
      const a = activeAudio()
      if (!a) return
      setDur(a.duration || 0)
      if (a === rain) applyPendingSeek(a, rainSeekRef)
      if (a === music) applyPendingSeek(a, musicSeekRef)
    }
    const goNext = () => advance(true)
    const onErr = () => {
      // 失效音源（如 VIP）自动跳到下一首，避免卡住
      if (sourceRef.current === 'music') {
        failedRef.current.add(idxRef.current)
        advance(true)
      }
    }
    // 持久化播放进度（节流，页面隐藏/暂停时强制写一次）
    const persist = (force = false) => {
      const now = Date.now()
      if (!force && now - lastPersistRef.current < 2500) return
      lastPersistRef.current = now
      if (rainRef.current && isFinite(rainRef.current.currentTime) && rainRef.current.duration) {
        save('rain.posRain', rainRef.current.currentTime)
      }
      const m = musicRef.current
      if (m && isFinite(m.currentTime) && tracksRef.current.length) {
        save('rain.posMusic', { id: playlistIdRef.current, idx: idxRef.current, t: m.currentTime })
      }
    }
    const onPageHide = () => persist(true)
    const onPersistPause = () => persist(true)
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
    rain.addEventListener('pause', onPersistPause)
    music.addEventListener('pause', onPersistPause)
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onPageHide)

    const timer = window.setInterval(() => {
      const a = activeAudio()
      if (a) {
        setCtime(a.currentTime)
        setDur(Number.isFinite(a.duration) ? a.duration : 0)
        persist()
      }
    }, 500)

    return () => {
      persist(true)
      window.clearInterval(timer)
      rain.pause()
      music.pause()
      rain.removeEventListener('play', onPlay)
      rain.removeEventListener('pause', onPause)
      rain.removeEventListener('timeupdate', onTime)
      rain.removeEventListener('loadedmetadata', onMeta)
      rain.removeEventListener('pause', onPersistPause)
      music.removeEventListener('play', onPlay)
      music.removeEventListener('pause', onPause)
      music.removeEventListener('timeupdate', onTime)
      music.removeEventListener('loadedmetadata', onMeta)
      music.removeEventListener('ended', goNext)
      music.removeEventListener('error', onErr)
      music.removeEventListener('pause', onPersistPause)
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onPageHide)
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
        const list = await fetchPlaylist(platform, id || DEFAULT_PLAYLIST_ID, qualityRef.current)
        if (!list.length) throw new Error('歌单为空或不可访问')
        failedRef.current = new Set()
        tracksRef.current = list
        // 同一歌单则恢复到上次的曲目与进度；新歌单从头开始
        const saved = load<{ id: string; idx: number; t: number } | null>('rain.posMusic', null)
        let startIdx = 0
        let startT: number | null = null
        if (saved && saved.id === id && Number.isInteger(saved.idx) && saved.idx >= 0 && saved.idx < list.length) {
          startIdx = saved.idx
          startT = saved.t && saved.t > 2 ? saved.t : null
        }
        idxRef.current = startIdx
        setTracks(list)
        setIdx(startIdx)
        setPlaylistIdState(id)
        save('rain.playlistId', id)
        musicSeekRef.current = startT
        if (musicRef.current) {
          musicRef.current.src = list[startIdx].url
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
      musicSeekRef.current = null
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
    musicSeekRef.current = null
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

  // 切换音质：持久化并用新码率重新拉取歌单（会尽量续播当前曲目与进度）
  const setQuality = useCallback(
    async (q: string) => {
      qualityRef.current = q
      setQualityState(q)
      save('rain.quality', q)
      await loadPlaylist(playlistIdRef.current)
      await playActive()
    },
    [loadPlaylist, playActive],
  )

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
    quality,
    setQuality,
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
