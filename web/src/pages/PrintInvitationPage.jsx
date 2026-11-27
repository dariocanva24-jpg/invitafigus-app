import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchInvitationBySlug } from '../services/googleSheetsApi'
import PlayerCard from '../components/invitation/PlayerCard'
import InvitationFullSheet from '../components/print/InvitationFullSheet'
import { QRCodeSVG } from 'qrcode.react'
import { whatsappLinks } from '../config/whatsapp'

// ───────────────────────────────────────────────────────────────────────────
// Invitación IMPRESA (para entregar en mano o mandar en PDF).
//
// No es una captura de pantalla: es una hoja A4 pensada para imprimir, con la
// figurita, los datos del cumple y un QR con el link de la invitación digital.

// ───────────────────────────────────────────────────────────────────────────

function QR({ value, size = 128 }) {
  return (
    <div className="shrink-0 bg-white p-1">
      <QRCodeSVG value={value} size={size} level="M" bgColor="#ffffff" fgColor="#0a0e27" />
    </div>
  )
}

// El QR se genera con qrcode.react (JavaScript puro, sin servicios externos),
// así que funciona igual impreso, en PDF o en una imprenta sin internet.
const mesLargo = (fecha) => {
  const d = new Date(`${fecha}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PrintInvitationPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    fetchInvitationBySlug(slug)
      .then((remote) => {
        if (!vivo) return
        if (!remote || remote.expired) { setEvent(null); return }
        setEvent({
          slug,
          childName: remote.nombre || '',
          nickname: remote.apodo || '',
          honoreeName: remote['Apellido\n'] || remote.Apellido || '',
          honoreeAge: remote.edad || '',
          team: remote.equipo || 'argentina',
          date: remote.fecha || '',
          time: remote.hora || '',
          location: remote.lugar || '',
          contactWhatsApp: remote.telefono || '',
          dressCode: remote.vestimenta || '',
          message: remote.mensaje || '',
          honoreePhoto: remote.foto_url || '',
        })
      })
      .catch(() => setEvent(null))
      .finally(() => vivo && setLoading(false))
    return () => { vivo = false }
  }, [slug])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0a0e27] text-white/60">Cargando…</div>
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0e27] px-6 text-center text-white">
        <p className="text-lg font-bold">No encontramos esta invitación</p>
        <p className="text-sm text-white/50">Puede que todavía esté pendiente de pago o que el link esté mal escrito.</p>
        <button onClick={() => navigate('/')} className="rounded-full bg-[#FFD700] px-6 py-3 text-sm font-bold text-[#0a0e27]">
          Volver al inicio
        </button>
      </div>
    )
  }

  const url = `${window.location.origin}/invitacion/${slug}`

  return (
    <div className="print-sheets min-h-screen bg-[#111827] py-8 print:bg-white print:py-0">
      {/* Barra de acciones: no se imprime */}
      <div className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <button onClick={() => navigate(-1)} className="text-sm text-white/60 hover:text-white">← Volver</button>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-full bg-[#FFD700] px-5 py-2.5 text-sm font-bold text-[#0a0e27]"
          >
            Imprimir / Guardar en PDF
          </button>
          <button
            onClick={() => window.open(whatsappLinks.support(), '_blank')}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80"
          >
            Pedir por WhatsApp
          </button>
        </div>
      </div>

      {/* HOJA 1 — credencial con la figurita */}
      <div className="print-sheet mx-auto w-[210mm] max-w-full bg-white text-[#0a0e27] shadow-2xl print:w-[210mm] print:shadow-none">
        <div className="flex min-h-[297mm] flex-col p-[12mm] text-[10px]">
          {/* Encabezado */}
          <div className="flex items-center justify-between border-b-2 border-[#0a0e27] pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#0a0e27]/60">InvitaFigus</p>
              <p className="font-bebas text-2xl tracking-wide">INVITACIÓN OFICIAL</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-[#0a0e27]/50">Edición</p>
              <p className="font-bebas text-xl">{new Date().getFullYear()}</p>
            </div>
          </div>

          {/* Cuerpo */}
          <div className="mt-6 flex flex-1 gap-6">
            {/* Figurita */}
            <div className="w-[80mm] shrink-0">
              <div className="rounded-xl bg-[#0a0e27] p-2">
                <PlayerCard event={event} still />
              </div>
              <p className="mt-2 text-center text-[9px] uppercase tracking-widest text-[#0a0e27]/40">
                Figurita oficial del cumple
              </p>
            </div>

            {/* Datos */}
            <div className="flex flex-1 flex-col">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#0a0e27]/50">
                Estás invitado al cumple de
              </p>
              <h1 className="mt-1 font-bebas text-4xl leading-none tracking-wide">
                {[event.childName, event.nickname && `"${event.nickname}"`, event.honoreeName].filter(Boolean).join(' ') || 'El cumpleañero'}
              </h1>

              <div className="mt-4 space-y-2 text-sm">
                <p className="flex gap-2">
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#0a0e27]/40">Fecha</span>
                  <span className="font-semibold capitalize">{mesLargo(event.date) || '—'}</span>
                </p>
                <p className="flex gap-2">
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#0a0e27]/40">Hora</span>
                  <span className="font-semibold">{event.time || '—'}</span>
                </p>
                <p className="flex gap-2">
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#0a0e27]/40">Lugar</span>
                  <span className="font-semibold">{event.location || '—'}</span>
                </p>
                {event.dressCode && (
                  <p className="flex gap-2">
                    <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#0a0e27]/40">Vestimenta</span>
                    <span className="font-semibold">{event.dressCode}</span>
                  </p>
                )}
              </div>

              {event.message && (
                <p className="mt-4 border-l-2 border-[#FFD700] pl-3 text-xs italic leading-relaxed text-[#0a0e27]/70">
                  “{event.message}”
                </p>
              )}

              {/* QR + instrucciones */}
              <div className="mt-auto flex items-end gap-4 border-t border-[#0a0e27]/15 pt-4">
                <QR value={url} size={128} />
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0a0e27]/50">
                    Confirmá tu asistencia
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#0a0e27]/70">
                    Escaneá el código con la cámara del celular y tocá <b>“Sí voy”</b>.
                    Ahí ves el mapa, la cuenta regresiva y el álbum completo.
                  </p>
                  <p className="mt-2 break-all font-mono text-[9px] text-[#0a0e27]/45">{url}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pie */}
          <div className="mt-6 flex items-center justify-between border-t border-[#0a0e27]/15 pt-3 text-[9px] uppercase tracking-widest text-[#0a0e27]/45">
            <span>Invitación digital + impresa · InvitaFigus</span>
            <span className="font-mono normal-case tracking-normal">{slug}</span>
          </div>
        </div>
      </div>

      {/* HOJA 2 — la invitación completa, a sangre */}
      <div className="print-sheet mx-auto mt-8 w-[210mm] max-w-full print:mt-0">
        <InvitationFullSheet event={event} url={url} />
      </div>

      <p className="mx-auto mt-4 max-w-[210mm] px-4 text-center text-xs text-white/40 print:hidden">
        Son <b className="text-white/70">2 hojas</b>: la primera es la <b>credencial con la figurita</b> y la segunda la
        <b> invitación completa</b> para entregar en mano. En el cartel de impresión elegí
        <b> “Guardar como PDF”</b> para mandarla por WhatsApp, o papel <b>A4</b> y <b>“Escala: 100%”</b> para imprimirla.
      </p>
    </div>
  )
}
