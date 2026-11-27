import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Plus, Minus, Loader2, MessageCircle, Users } from 'lucide-react'
import { whatsappLinks } from '../../config/whatsapp'

export default function RSVPForm({ event }) {
  const [form, setForm] = useState({ name: '', whatsapp: '', status: 'confirmed', guests: 0, notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [count, setCount] = useState({ total: 0, confirmed: 0, guests: 0 })
  const [notified, setNotified] = useState(false)

  const slug = event?.slug

  const loadCount = async () => {
    if (!slug) return
    try {
      const response = await fetch(`/api/rsvp?slug=${encodeURIComponent(slug)}`)
      if (!response.ok) return
      const data = await response.json()
      if (data.ok) setCount(data.count)
    } catch {
      // Si no hay conexión, el formulario sigue funcionando.
    }
  }

  useEffect(() => { loadCount() }, [slug])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slug }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la respuesta')
      setNotified(Boolean(data.notified))
      if (data.count) setCount(data.count)
      setSubmitted(true)
      await loadCount()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const notifyWhatsApp = () => {
    if (!event?.contactWhatsApp) return
    window.open(whatsappLinks.rsvp({
      name: form.name,
      slug,
      guests: form.guests,
      status: form.status,
      phone: event.contactWhatsApp,
    }), '_blank')
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
          border: '1px solid rgba(34,197,94,0.3)',
          boxShadow: '0 0 30px rgba(34,197,94,0.2)',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(34,197,94,0.2)', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}
        >
          <Check size={32} className="text-green-400" />
        </motion.div>
        <h3 className="text-2xl font-bold text-green-300 mb-2 font-bebas tracking-wider"
          style={{ textShadow: '0 0 20px rgba(34,197,94,0.5)' }}>
          {form.status === 'confirmed' ? '¡CONFIRMADO!' : 'RESPUESTA GUARDADA'}
        </h3>
        <p className="text-green-200/80">
          {form.status === 'confirmed'
            ? 'Gracias por confirmar. Tu respuesta quedó guardada.'
            : 'Gracias por avisarnos. Tu respuesta quedó guardada.'}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/20 px-4 py-2 text-xs text-green-100/80">
          <Users size={14} />
          {count.confirmed} confirmados · {count.guests} acompañantes
        </div>
        <div className="mt-6 flex flex-col gap-2">
          {notified ? (
            <p className="inline-flex items-center gap-2 text-sm text-green-200/90">
              <Check size={16} /> Avisamos al operador por WhatsApp (InvitaFigus).
            </p>
          ) : (
            event?.contactWhatsApp && form.status === 'confirmed' && (
              <button
                onClick={notifyWhatsApp}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-white"
                style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)', boxShadow: '0 8px 32px rgba(34,197,94,0.4)' }}
              >
                <MessageCircle size={18} /> Avisar por WhatsApp
              </button>
            )
          )}
          <button
            onClick={() => { setSubmitted(false); setForm({ name: '', whatsapp: '', status: 'confirmed', guests: 0, notes: '' }) }}
            className="text-sm text-white/50 hover:text-white"
          >
            Cambiar mi respuesta
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="relative rounded-3xl p-6 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(0,212,255,0.05), rgba(255,107,53,0.05))',
        border: '1px solid rgba(0,212,255,0.2)',
        boxShadow: '0 0 30px rgba(0,212,255,0.1)',
      }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(0,212,255,0.03) 50%, transparent 60%)',
          backgroundSize: '200% 200%',
          animation: 'shine 4s ease-in-out infinite',
        }} />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2 font-bebas tracking-wider"
          style={{ textShadow: '0 0 10px rgba(0,212,255,0.3)' }}>
          <span className="text-cyan-400">✉</span> CONFIRMAR ASISTENCIA
        </h3>
        <span className="shrink-0 rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-white/50">
          {count.confirmed} YA CONFIRMARON
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4 relative z-10">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Tu nombre *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
            minLength={2}
            maxLength={80}
            className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            placeholder="Tu nombre"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">WhatsApp *</label>
          <input
            type="tel"
            value={form.whatsapp}
            onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
            required
            className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            placeholder="+54911..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">¿Vas a asistir?</label>
          <div className="flex gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setForm((p) => ({ ...p, status: 'confirmed' }))}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${form.status === 'confirmed' ? 'text-white' : 'text-white/50'}`}
              style={form.status === 'confirmed'
                ? { background: 'linear-gradient(90deg, #22c55e, #16a34a)', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }
                : { background: 'rgba(255,255,255,0.05)' }}>
              <Check size={16} /> Sí voy
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setForm((p) => ({ ...p, status: 'declined' }))}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${form.status === 'declined' ? 'text-white' : 'text-white/50'}`}
              style={form.status === 'declined'
                ? { background: 'linear-gradient(90deg, #ef4444, #dc2626)', boxShadow: '0 0 20px rgba(239,68,68,0.3)' }
                : { background: 'rgba(255,255,255,0.05)' }}>
              <X size={16} /> No puedo
            </motion.button>
          </div>
        </div>

        {form.status === 'confirmed' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <label className="block text-sm font-medium text-white/70 mb-2">¿Cuántos acompañantes?</label>
            <div className="flex items-center gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setForm((p) => ({ ...p, guests: Math.max(0, p.guests - 1) }))}
                className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              ><Minus size={20} /></motion.button>
              <input
                type="number"
                min="0"
                max="20"
                value={form.guests}
                readOnly
                className="flex-1 rounded-xl bg-white/5 border border-white/10 text-white text-center px-4 py-3 text-lg font-bold outline-none"
              />
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setForm((p) => ({ ...p, guests: Math.min(20, p.guests + 1) }))}
                className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              ><Plus size={20} /></motion.button>
            </div>
            <p className="text-white/30 text-xs mt-2 text-center">Tocá + o - para cambiar la cantidad</p>
          </motion.div>
        )}

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Notas (opcional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            rows={2}
            maxLength={300}
            className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
            placeholder="Alguna nota especial..."
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
        )}

        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ scale: submitting ? 1 : 1.02 }}
          whileTap={{ scale: submitting ? 1 : 0.98 }}
          className="w-full py-4 rounded-full font-bold text-white uppercase tracking-wider text-sm disabled:opacity-60"
          style={{ background: 'linear-gradient(90deg, #FF6B35, #ec4899)', boxShadow: '0 8px 32px rgba(255,107,53,0.4)' }}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2"><Loader2 size={17} className="animate-spin" /> Guardando...</span>
          ) : (form.status === 'confirmed' ? 'Confirmar Asistencia' : 'Enviar Respuesta')}
        </motion.button>
        <p className="text-center text-[11px] text-white/30">Tu respuesta se guarda de verdad. Después podés avisar por WhatsApp.</p>
      </form>
    </div>
  )
}
