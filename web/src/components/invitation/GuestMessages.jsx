import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Quote } from 'lucide-react'

// Mensajes que los invitados le dejan al cumpleañero.
// Salen de las notas del formulario de confirmación: no hace falta otra hoja.
// Si nadie dejó mensaje todavía, no se muestra nada (no queda un cartel vacío).
export default function GuestMessages({ messages = [], max = 6 }) {
  const [abierto, setAbierto] = useState(false)

  const limpios = (Array.isArray(messages) ? messages : []).filter((m) => {
    const texto = String(m?.mensaje || '').trim()
    return texto.length >= 4
  })

  if (limpios.length === 0) return null

  const visibles = abierto ? limpios : limpios.slice(-max).reverse()

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#FFD700]/25 bg-gradient-to-b from-[#101a3a] to-[#0a0e27] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-black font-bebas tracking-wider text-white">
          <MessageSquare size={17} className="text-[#FFD700]" />
          Mensajes para el cumpleañero
        </h3>
        <span className="shrink-0 rounded-full bg-[#FFD700]/15 px-3 py-1 text-[10px] font-bold text-[#FFD700]">
          {limpios.length}
        </span>
      </div>

      <ul className="space-y-2.5">
        {visibles.map((m, i) => (
          <motion.li
            key={`${m.nombre}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
          >
            <Quote size={12} className="mb-1 text-[#FFD700]/60" />
            <p className="text-sm leading-relaxed text-white/85">{String(m.mensaje).slice(0, 300)}</p>
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              — {String(m.nombre || 'Un invitado').slice(0, 40)}
            </p>
          </motion.li>
        ))}
      </ul>

      {limpios.length > max && (
        <button
          onClick={() => setAbierto((v) => !v)}
          className="mt-3 w-full rounded-xl border border-white/15 py-2.5 text-xs font-semibold text-white/70 hover:bg-white/5"
        >
          {abierto ? 'Ver menos' : `Ver los ${limpios.length} mensajes`}
        </button>
      )}
    </div>
  )
}
