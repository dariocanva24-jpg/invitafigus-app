import { QRCodeSVG } from 'qrcode.react'
import PlayerCard from '../invitation/PlayerCard'

// ───────────────────────────────────────────────────────────────────────────
// HOJA 2 de la invitación impresa: la invitación completa, a sangre, para
// entregar en mano. Fondo oscuro con luz de estadio, figurita inclinada con
// resplandor, nombre en degradé dorado, franja de datos y QR grande.
//
// En impresión: es una página A4 entera. Los colores se fuerzan con
// print-color-adjust para que la impresora no los aplane.
// ───────────────────────────────────────────────────────────────────────────

const mesCorto = (fecha) => {
  const d = new Date(`${fecha}T12:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return d
    .toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace('.', '')
    .toUpperCase()
}

export default function InvitationFullSheet({ event, url }) {
  const nombre = [event?.childName, event?.nickname && `"${event.nickname}"`, event?.honoreeName]
    .filter(Boolean)
    .join(' ') || 'EL CUMPLEAÑERO'

  return (
    <div
      className="relative mx-auto w-[210mm] overflow-hidden text-white shadow-2xl print:shadow-none"
      style={{
        minHeight: '297mm',
        background:
          'radial-gradient(120% 90% at 50% 36%, #16204a 0%, #0d1433 42%, #070a1c 78%, #050713 100%)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Trama diagonal fina */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(125deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 26px)',
        }}
      />
      {/* Haces de luz de estadio */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'conic-gradient(from 200deg at 50% 34%, transparent 0deg, rgba(255,255,255,0.10) 14deg, transparent 30deg, transparent 150deg, rgba(255,255,255,0.08) 168deg, transparent 186deg)',
          filter: 'blur(28px)',
        }}
      />
      {/* Viñeta */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(80% 60% at 50% 45%, transparent 40%, rgba(0,0,0,0.55) 100%)' }}
      />

      {/* Marco dorado con esquinas */}
      <div className="pointer-events-none absolute inset-[11mm] rounded-[18px] border border-[#FFD700]/25" />
      {[
        'left-[11mm] top-[11mm] border-l-[7px] border-t-[7px] rounded-tl-[6px]',
        'right-[11mm] top-[11mm] border-r-[7px] border-t-[7px] rounded-tr-[6px]',
        'left-[11mm] bottom-[11mm] border-l-[7px] border-b-[7px] rounded-bl-[6px]',
        'right-[11mm] bottom-[11mm] border-r-[7px] border-b-[7px] rounded-br-[6px]',
      ].map((cls) => (
        <span key={cls} className={`pointer-events-none absolute h-[24mm] w-[24mm] border-[#FFD700] ${cls}`} />
      ))}

      {/* CONTENIDO */}
      <div className="relative flex min-h-[297mm] flex-col items-center px-[20mm] py-[18mm]">
        {/* Encabezado */}
        <p className="text-[13px] font-bold uppercase tracking-[0.55em] text-[#FFD700]">InvitaFigus</p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-white/45">Edición 2026</p>
        <span className="mt-3 h-[2px] w-[38mm] bg-gradient-to-r from-transparent via-[#FFD700]/70 to-transparent" />

        {/* Figurita inclinada con resplandor */}
        <div className="relative mt-[10mm] w-[46%]">
          <div
            className="absolute -inset-[6mm] rounded-[40px] blur-2xl"
            style={{ background: 'radial-gradient(closest-side, rgba(255,200,60,0.45), transparent)' }}
          />
          <div className="relative -rotate-[4deg] drop-shadow-[0_18px_30px_rgba(0,0,0,0.65)]">
            <PlayerCard event={event} still />
          </div>
        </div>

        {/* Nombre */}
        <p className="mt-[12mm] text-[12px] uppercase tracking-[0.28em] text-white/55">
          Estás invitado al cumple de
        </p>
        <h1
          className="mt-2 max-w-full text-center text-[42px] font-black uppercase leading-none tracking-wide"
          style={{
            backgroundImage: 'linear-gradient(100deg, #FFF3B0 0%, #FFD700 35%, #FFA500 75%, #FFD98A 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {nombre}
        </h1>

        {/* Franja de datos */}
        <div className="mt-[9mm] grid w-full grid-cols-3 overflow-hidden rounded-2xl border border-[#FFD700]/40 bg-white/[0.05]">
          {[
            ['Fecha', mesCorto(event?.date)],
            ['Hora', event?.time || '—'],
            ['Lugar', event?.location || '—'],
          ].map(([label, value], i) => (
            <div
              key={label}
              className={`px-3 py-4 text-center ${i > 0 ? 'border-l border-[#FFD700]/25' : ''}`}
            >
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#FFD700]/85">{label}</p>
              <p className="mt-1 truncate text-[17px] font-bold uppercase tracking-wide text-white">{value}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.25em] text-white/45">
          {event?.dressCode ? `Vestimenta ${event.dressCode}` : 'Vestimenta deportiva'}
          <span className="mx-2 text-[#FFD700]/60">·</span>
          Traé tu camiseta
        </p>

        {event?.message && (
          <p className="mt-4 max-w-[80%] text-center text-[11px] italic leading-relaxed text-white/50">
            “{event.message}”
          </p>
        )}

        {/* Panel QR */}
        <div className="mt-auto w-full pt-[8mm]">
          <div className="flex items-center gap-6 rounded-2xl border border-white/15 bg-white/[0.05] p-5">
            <div className="shrink-0 rounded-lg bg-white p-1.5">
              <QRCodeSVG value={url} size={104} level="M" bgColor="#ffffff" fgColor="#070a1c" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-black uppercase tracking-wider text-[#FFD700]">
                Confirmá tu asistencia
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/70">
                Escaneá con la cámara del celular y tocá <b className="text-white">“Sí voy”</b>.
                Ahí ves el mapa, la cuenta regresiva y el álbum.
              </p>
              <p className="mt-2 truncate font-mono text-[9px] text-white/40">{url}</p>
            </div>
          </div>
        </div>

        <p className="mt-[7mm] text-center text-[9px] uppercase tracking-[0.3em] text-white/35">
          Invitaciones digitales futboleras · Creado en Jujuy, Argentina
        </p>
      </div>
    </div>
  )
}
