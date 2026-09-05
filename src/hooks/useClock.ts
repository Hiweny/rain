import { useEffect, useState } from 'react'

export interface ClockTime {
  hh: string
  mm: string
  ss: string
  dateText: string
  weekday: string
  ampm: string
}

const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function read(): ClockTime {
  const d = new Date()
  const h24 = d.getHours()
  return {
    hh: h24.toString().padStart(2, '0'),
    mm: d.getMinutes().toString().padStart(2, '0'),
    ss: d.getSeconds().toString().padStart(2, '0'),
    ampm: h24 < 6 ? '凌晨' : h24 < 12 ? '上午' : h24 < 14 ? '中午' : h24 < 18 ? '下午' : '夜晚',
    dateText: `${d.getMonth() + 1} 月 ${d.getDate()} 日`,
    weekday: WEEK[d.getDay()],
  }
}

export function useClock(showSeconds = true) {
  const [t, setT] = useState<ClockTime>(read)
  useEffect(() => {
    const tick = () => setT(read())
    tick()
    const id = window.setInterval(tick, showSeconds ? 1000 : 2000)
    return () => window.clearInterval(id)
  }, [showSeconds])
  return t
}
