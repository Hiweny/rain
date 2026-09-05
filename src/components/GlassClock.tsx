import LiquidGlass from 'liquid-glass-react'
import { useClock } from '../hooks/useClock'

interface Props {
  showSeconds: boolean
}

export default function GlassClock({ showSeconds }: Props) {
  const t = useClock(showSeconds)
  return (
    <div className="clock-anchor">
      <LiquidGlass
        style={{ position: 'absolute', top: '50%', left: '50%' }}
        displacementScale={22}
        blurAmount={0.05}
        saturation={150}
        aberrationIntensity={1.3}
        elasticity={0.1}
        cornerRadius={32}
        padding="0px"
      >
        <div className="clock-inner">
          <div className="clock-time">
            <span>{t.hh}</span>
            <span className="clock-colon">:</span>
            <span>{t.mm}</span>
            {showSeconds && <span className="clock-sec">:{t.ss}</span>}
          </div>
          <div className="clock-date">
            {t.ampm} · {t.weekday} · {t.dateText}
          </div>
        </div>
      </LiquidGlass>
    </div>
  )
}
