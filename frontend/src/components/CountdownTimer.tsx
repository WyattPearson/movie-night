import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

function getTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    total: diff,
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

interface CountdownTimerProps {
  label: string
  target: Date
  color?: 'blue' | 'green' | 'orange' | 'yellow' | 'purple'
}

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-950/60',   border: 'border-blue-800/50',   label: 'text-blue-300',   digit: 'text-blue-100' },
  green:  { bg: 'bg-green-950/60',  border: 'border-green-800/50',  label: 'text-green-300',  digit: 'text-green-100' },
  orange: { bg: 'bg-orange-950/60', border: 'border-orange-800/50', label: 'text-orange-300', digit: 'text-orange-100' },
  yellow: { bg: 'bg-yellow-950/60', border: 'border-yellow-800/50', label: 'text-yellow-300', digit: 'text-yellow-100' },
  purple: { bg: 'bg-purple-950/60', border: 'border-purple-800/50', label: 'text-purple-300', digit: 'text-purple-100' },
}

export default function CountdownTimer({ label, target, color = 'blue' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => getTimeLeft(target))

  useEffect(() => {
    setTimeLeft(getTimeLeft(target))
    const id = setInterval(() => {
      const t = getTimeLeft(target)
      setTimeLeft(t)
      if (!t) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [target])

  if (!timeLeft) return null

  const c = COLOR_MAP[color]

  return (
    <div className={`rounded-2xl border ${c.bg} ${c.border} px-4 py-3 mb-3`}>
      <div className={`flex items-center gap-1.5 mb-2 ${c.label}`}>
        <Timer size={13} />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-end gap-3">
        {timeLeft.days > 0 && (
          <Unit value={timeLeft.days} unit="d" digitClass={c.digit} />
        )}
        <Unit value={timeLeft.hours} unit="h" digitClass={c.digit} />
        <Unit value={timeLeft.minutes} unit="m" digitClass={c.digit} />
        {timeLeft.days === 0 && (
          <Unit value={timeLeft.seconds} unit="s" digitClass={c.digit} />
        )}
      </div>
    </div>
  )
}

function Unit({ value, unit, digitClass }: { value: number; unit: string; digitClass: string }) {
  return (
    <div className="flex items-baseline gap-0.5">
      <span className={`text-2xl font-bold tabular-nums leading-none ${digitClass}`}>{pad(value)}</span>
      <span className="text-xs text-gray-500 font-medium">{unit}</span>
    </div>
  )
}
