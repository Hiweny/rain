import { useClock } from '../hooks/useClock'
import { useQuote } from '../hooks/useQuote'

/** 顶部锁屏风时钟：纯文字直接落在雨景上，无玻璃容器 */
export default function Clock() {
  const t = useClock(false)
  const { quote } = useQuote()

  return (
    <div className="clock-block">
      <div className="clock-time">
        <span>{t.hh}</span>
        <span className="clock-colon">:</span>
        <span>{t.mm}</span>
      </div>
      <div className="clock-date">
        {t.weekday} · {t.dateText}
      </div>
      {quote && (
        <div className="quote" key={quote.text}>
          <span className="quote-text">{quote.text}</span>
          {quote.from && <span className="quote-from">{quote.from}</span>}
        </div>
      )}
    </div>
  )
}
