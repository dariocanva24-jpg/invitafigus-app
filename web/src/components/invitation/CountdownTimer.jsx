import { useState, useEffect, useMemo } from 'react'

const COLORS = ['#FFD700', '#00D4FF', '#FF6B35', '#a855f7']

const MONTHS = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
}

function parseSpanishDate(value) {
  const clean = String(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
  const long = clean.match(/(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+)?(\d{4})/)
  if (long && MONTHS[long[2]] !== undefined) {
    return new Date(Number(long[3]), MONTHS[long[2]], Number(long[1]))
  }
  const numeric = clean.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
  if (numeric) return new Date(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]))
  return null
}

function targetDateFrom(date, time) {
  if (!date) return null
  const startHour = (typeof time === 'string' ? time.split(' - ')[0] : '') || '00:00'
  if (typeof date !== 'string') {
    const parsed = new Date(date)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  const spanish = parseSpanishDate(date)
  if (spanish) {
    const [h, m] = startHour.split(':').map(Number)
    spanish.setHours(h || 0, m || 0, 0, 0)
    return spanish
  }
  const parsed = new Date(`${date.split('T')[0]}T${startHour}:00`)
  return isNaN(parsed.getTime()) ? null : parsed
}

function prettyDate(date) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function CountdownTimer({ date, time, compact = false }) {
  const target = useMemo(() => targetDateFrom(date, time), [date, time])
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false })

  useEffect(() => {
    if (!target) return
    const calc = () => {
      const diff = target - new Date()
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
        return
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        isExpired: false,
      })
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [target])

  if (!target) return null

  if (timeLeft.isExpired) {
    return (
      <div className={`text-center ${compact ? 'p-3' : 'p-5'}`}>
        <p className="font-bebas tracking-[.28em] text-[10px] text-[#FFD700]/80">EL PARTIDO YA EMPEZÓ</p>
        <p className={`font-bebas tracking-wider text-white ${compact ? 'text-2xl' : 'text-3xl'} mt-1`}>¡El evento ya comenzó!</p>
        <p className="text-white/45 text-xs mt-1">¡No te lo pierdas!</p>
      </div>
    )
  }

  const units = [
    { value: timeLeft.days, label: 'DÍAS' },
    { value: timeLeft.hours, label: 'HRS' },
    { value: timeLeft.minutes, label: 'MIN' },
    { value: timeLeft.seconds, label: 'SEG' },
  ]

  return (
    <div className="text-center">
      <p className="font-bebas tracking-[.28em] text-[10px] text-[#FFD700]/80">FALTAN PARA EL PARTIDO</p>
      <p className="text-white/40 text-[11px] mt-1 mb-4 capitalize">{prettyDate(target)}</p>
      <div className="flex justify-center gap-2 md:gap-3">
        {units.map((unit, i) => (
          <div key={unit.label} className="flex flex-col items-center">
            <div
              className={`relative overflow-hidden rounded-xl flex items-center justify-center ${compact ? 'w-14 h-14' : 'w-16 h-16 md:w-20 md:h-20'}`}
              style={{
                background: `linear-gradient(145deg, ${COLORS[i]}1c, #0a0e27 78%)`,
                border: `1px solid ${COLORS[i]}44`,
                boxShadow: `inset 0 1px 0 ${COLORS[i]}1f`,
              }}
            >
              <span
                className={`relative z-10 font-bebas font-black leading-none ${compact ? 'text-2xl' : 'text-3xl md:text-4xl'}`}
                style={{ color: COLORS[i], textShadow: `0 0 16px ${COLORS[i]}55` }}
              >
                {String(unit.value).padStart(2, '0')}
              </span>
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${COLORS[i]}66, transparent)` }}
              />
            </div>
            <span className="font-bebas tracking-[.2em] text-[9px] text-white/40 mt-2">{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
