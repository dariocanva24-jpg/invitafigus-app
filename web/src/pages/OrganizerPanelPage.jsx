import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Users, UserX, Copy, Check, RefreshCw, Share2, Lock, MessageSquare } from 'lucide-react'
import { useApp } from '../context/AppContext'

const keyFor = (slug) => `invitafigus_panel_${slug}`

export default function OrganizerPanelPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { getEventBySlug } = useApp()

  const [key, setKey] = useState('')
  const [inputKey, setInputKey] = useState('')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  const event = getEventBySlug(slug)
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/invitacion/${slug}` : ''
  const panelUrl = typeof window !== 'undefined' ? `${window.location.origin}/panel/${slug}` : ''

  useEffect(() => {
    const stored = localStorage.getItem(keyFor(slug))
    if (stored) {
      setKey(stored)
      load(stored)
    }
  }, [slug])

  const copy = async (text, tag) => {
    try { await navigator.clipboard.writeText(text) } catch {}
    setCopied(tag)
    setTimeout(() => setCopied(''), 1800)
  }

  async function load(passKey) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summary', code: slug, key: passKey }),
      })
      const data = await res.json()
      if (res.status === 402 || data.codigo === 'SIN_PAGAR') {
        throw new Error('El panel se abre cuando la invitación está activada. Si ya pagaste, esperá un minuto y volvé a intentar.')
      }
      if (!res.ok) throw new Error(data.error || 'No se pudo abrir el panel')
      setSummary(data)
      localStorage.setItem(keyFor(slug), passKey)
      setKey(passKey)
    } catch (e) {
      setError(e.message)
      localStorage.removeItem(keyFor(slug))
      setKey('')
    } finally {
      setLoading(false)
    }
  }

  const submitKey = (e) => {
    e.preventDefault()
    if (inputKey.trim()) load(inputKey.trim())
  }

  const totals = summary?.totals || { responses: 0, confirmed: 0, declined: 0, guests: 0, people: 0 }

  if (!key) {
    return (
      <div className="min-h-screen bg-[#0a0e27] text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <button onClick={() => navigate('/')} className="mb-6 flex items-center gap-2 text-sm text-white/50 hover:text-white/80">
            <ArrowLeft size={16} /> Volver al inicio
          </button>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#FFD700]/15">
              <Lock size={26} className="text-[#FFD700]" />
            </div>
            <h1 className="text-center text-2xl font-black font-bebas tracking-wider">Panel del organizador</h1>
            <p className="mt-2 text-center text-sm text-white/50">
              Ingresá la clave que te dimos al crear la invitación. Solo vos podés ver la lista de invitados.
            </p>
            <form onSubmit={submitKey} className="mt-6 space-y-3">
              <input
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Clave del panel"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-center tracking-widest text-white outline-none focus:border-[#FFD700]/60"
              />
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#FFD700] py-3 font-bold text-[#0a0e27] disabled:opacity-50">
                {loading ? 'Entrando…' : 'Entrar al panel'}
              </button>
            </form>
            {error && <p className="mt-3 text-center text-xs text-red-300">{error}</p>}
            <p className="mt-4 text-center text-[11px] text-white/30">Código de invitación: {slug}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white">
      <div className="mx-auto max-w-md px-4 py-6 pb-16">
        <button onClick={() => navigate('/')} className="mb-4 flex items-center gap-2 text-sm text-white/50 hover:text-white/80">
          <ArrowLeft size={16} /> Inicio
        </button>

        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-[.3em] text-[#FFD700]">Panel del organizador</p>
          <h1 className="mt-1 text-3xl font-black font-bebas tracking-wider">
            {event?.childName ? `Cumple de ${event.childName}` : 'Mi invitación'}
          </h1>
          <p className="mt-1 text-xs text-white/40">Código: {slug}</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-green-500/25 bg-green-500/10 p-4">
            <div className="flex items-center gap-2 text-green-300"><Users size={16} /><span className="text-[10px] font-bold uppercase tracking-widest">Asisten</span></div>
            <p className="mt-2 text-3xl font-black font-bebas">{totals.confirmed}</p>
            <p className="text-[11px] text-green-200/60">+ {totals.guests} acompañantes</p>
          </div>
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4">
            <div className="flex items-center gap-2 text-red-300"><UserX size={16} /><span className="text-[10px] font-bold uppercase tracking-widest">No asisten</span></div>
            <p className="mt-2 text-3xl font-black font-bebas">{totals.declined}</p>
            <p className="text-[11px] text-red-200/60">avisaron que no</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-[#FFD700]/25 bg-[#FFD700]/10 p-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFD700]">Total de gente en la fiesta</span>
            <p className="mt-2 text-4xl font-black font-bebas">{totals.people}</p>
            <p className="text-[11px] text-[#FFD700]/60">
              {totals.confirmed} confirmados + {totals.guests} acompañantes · {totals.responses} respuestas
            </p>
          </div>
        </div>

        <div className="mb-5 flex gap-2">
          <button onClick={() => load(key)} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-sm font-semibold text-white/80 hover:bg-white/5">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
          <button onClick={() => copy(inviteUrl, 'link')} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-sm font-semibold text-white/80 hover:bg-white/5">
            {copied === 'link' ? <Check size={16} /> : <Copy size={16} />} {copied === 'link' ? '¡Copiado!' : 'Copiar link'}
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Link para tus invitados</p>
          <p className="mt-1 break-all text-xs text-[#FFD700]">{inviteUrl}</p>
          <button onClick={() => copy(panelUrl, 'panel')} className="mt-3 text-[11px] text-white/40 underline underline-offset-4 hover:text-white/70">
            {copied === 'panel' ? 'Link del panel copiado' : 'Copiar link de este panel para abrirlo después'}
          </button>
        </div>

        <section className="mb-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-green-300"><Users size={15} /> Confirmados</h2>
          {summary?.confirmed?.length ? (
            <ul className="space-y-2">
              {summary.confirmed.map((row, i) => (
                <li key={i} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{row.name}</p>
                    {row.notes && <p className="text-[11px] text-white/40">{row.notes}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-green-500/15 px-3 py-1 text-[11px] font-bold text-green-300">
                    +{row.guests}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-xs text-white/35">
              Todavía nadie confirmó.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-red-300"><UserX size={15} /> No asisten</h2>
          {summary?.declined?.length ? (
            <ul className="space-y-2">
              {summary.declined.map((row, i) => (
                <li key={i} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-sm font-semibold">{row.name}</p>
                  {row.notes && <p className="text-[11px] text-white/40">{row.notes}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-xs text-white/35">
              Nadie avisó que no va.
            </p>
          )}
        </section>

        <section className="mb-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#FFD700]">
            <MessageSquare size={15} /> Mensajes para el cumpleañero
          </h2>
          {summary?.messages?.length ? (
            <ul className="space-y-2">
              {summary.messages.slice().reverse().map((m, i) => (
                <li key={i} className="rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/[0.06] px-4 py-3">
                  <p className="text-sm leading-relaxed text-white/85">{m.mensaje}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#FFD700]/70">
                    — {m.nombre}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-xs text-white/35">
              Todavía nadie dejó un mensaje. Cuando un invitado confirme y escriba algo, aparece acá.
            </p>
          )}
        </section>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-white/25">
          Este panel se actualiza cuando tocás “Actualizar”. Cada invitado que confirma en la invitación aparece acá al instante.
        </p>
      </div>
    </div>
  )
}
