import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const PlayIcon = (p: P) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M8 5.5v13a1 1 0 0 0 1.52.85l10.5-6.5a1 1 0 0 0 0-1.7L9.52 4.65A1 1 0 0 0 8 5.5Z" />
  </Svg>
)
export const PauseIcon = (p: P) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <rect x="6.6" y="5" width="3.5" height="14" rx="1.1" />
    <rect x="13.9" y="5" width="3.5" height="14" rx="1.1" />
  </Svg>
)
export const PrevIcon = (p: P) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M18.5 6.4v11.2a.8.8 0 0 1-1.23.67L8 12.67v4.83a.8.8 0 0 1-1.6 0V6.5a.8.8 0 0 1 1.6 0v4.83l9.27-5.6a.8.8 0 0 1 1.23.67Z" />
  </Svg>
)
export const NextIcon = (p: P) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M5.5 6.4v11.2a.8.8 0 0 0 1.23.67L16 12.67v4.83a.8.8 0 0 0 1.6 0V6.5a.8.8 0 0 0-1.6 0v4.83l-9.27-5.6A.8.8 0 0 0 5.5 6.4Z" />
  </Svg>
)
export const ShuffleIcon = (p: P) => (
  <Svg {...p}>
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
    <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
    <path d="m18 14 4 4-4 4" />
  </Svg>
)
export const RepeatIcon = (p: P) => (
  <Svg {...p}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </Svg>
)
export const RepeatOneIcon = (p: P) => (
  <Svg {...p}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    <path d="M12 10.5 10.8 11.6M12 10v4" />
  </Svg>
)
export const VolumeIcon = (p: P) => (
  <Svg {...p}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" stroke="none" />
    <path d="M15.6 8.6a5 5 0 0 1 0 6.8" />
    <path d="M18.4 5.8a9 9 0 0 1 0 12.4" />
  </Svg>
)
export const MuteIcon = (p: P) => (
  <Svg {...p}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" stroke="none" />
    <path d="m22 9-6 6M16 9l6 6" />
  </Svg>
)
export const FullscreenIcon = (p: P) => (
  <Svg {...p}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M16 3h3a2 2 0 0 1 2 2v3" />
    <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </Svg>
)
export const ExitFullscreenIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 8V5a2 2 0 0 1 2-2h3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
  </Svg>
)
export const PinIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 17v5" />
    <path d="M9 3h6a1 1 0 0 1 1 1v6.2l2.3 2.6a1 1 0 0 1-.74 1.6H6.44a1 1 0 0 1-.74-1.6L8 10.2V4a1 1 0 0 1 1-1Z" />
  </Svg>
)
export const ChevronUpIcon = (p: P) => (
  <Svg {...p}>
    <path d="m6 15 6-6 6 6" />
  </Svg>
)
export const ChevronDownIcon = (p: P) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)
export const CloseIcon = (p: P) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
)
export const RainIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4.2 14.2A4 4 0 0 1 5 6.4 5.5 5.5 0 0 1 15.4 7a4 4 0 0 1-.6 7.9" />
    <path d="M8 18v2.5M12 18v2.5M16 18v2.5" />
  </Svg>
)
export const MusicIcon = (p: P) => (
  <Svg {...p}>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </Svg>
)
export const ShuffleImageIcon = (p: P) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </Svg>
)
export const SlidersIcon = (p: P) => (
  <Svg {...p}>
    <line x1="21" y1="6" x2="14" y2="6" />
    <line x1="10" y1="6" x2="3" y2="6" />
    <line x1="21" y1="12" x2="12" y2="12" />
    <line x1="8" y1="12" x2="3" y2="12" />
    <line x1="21" y1="18" x2="16" y2="18" />
    <line x1="12" y1="18" x2="3" y2="18" />
    <circle cx="12" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="14" cy="18" r="2" />
  </Svg>
)
