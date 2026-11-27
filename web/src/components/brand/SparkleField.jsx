// Destellos editoriales estáticos para fondos azules: trazos finos, sin animaciones genéricas.
const STARS = [
  { top: '12%', left: '8%', size: 34, color: '#FFD700' },
  { top: '24%', left: '82%', size: 22, color: '#00D4FF' },
  { top: '68%', left: '14%', size: 18, color: '#FFD700' },
  { top: '78%', left: '72%', size: 30, color: '#00D4FF' },
  { top: '42%', left: '48%', size: 14, color: '#FF6B35' },
]

export default function SparkleField({ opacity = 0.55, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ opacity }}
    >
      <div
        className="absolute -top-40 left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full"
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,212,255,.12), transparent 68%)', filter: 'blur(18px)' }}
      />
      <div
        className="absolute bottom-0 right-[6%] h-[300px] w-[300px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,215,0,.08), transparent 70%)', filter: 'blur(24px)' }}
      />
      {STARS.map((star, index) => (
        <svg
          key={index}
          className="absolute"
          style={{ top: star.top, left: star.left, width: star.size, height: star.size }}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M20 2v11M20 27v11M2 20h11M27 20h11" stroke={star.color} strokeWidth=".9" strokeLinecap="round" opacity=".45" />
          <path d="M20 9 22.2 17.8 31 20l-8.8 2.2L20 31l-2.2-8.8L9 20l8.8-2.2L20 9Z" stroke={star.color} strokeWidth=".8" strokeLinejoin="round" opacity=".8" />
          <circle cx="20" cy="20" r="1.4" fill={star.color} />
        </svg>
      ))}
      <div
        className="absolute inset-x-0 top-1/3 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,.18), transparent)' }}
      />
    </div>
  )
}
