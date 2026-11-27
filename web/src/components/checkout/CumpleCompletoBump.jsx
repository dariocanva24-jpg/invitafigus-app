import { Check } from 'lucide-react'

// Bloque del bump "Cumple Completo".
// Reglas fijas de producto:
//  - Desmarcado por defecto.
//  - Sin imagen, sin contador, sin "oferta", sin estadísticas de adopción.
//  - Solo se puede sumar en este paso.
//  - Solo dos cifras posibles: 10.000 o 14.999.

export const PRICE_BASE = 10000
export const PRICE_COMPLETE = 14999
export const BUMP_ADD = PRICE_COMPLETE - PRICE_BASE

const BENEFITS = [
  'Lista de asistentes exportable para el salón',
  'PDF de la figurita para imprimir y regalar',
  'Un segundo diseño con otro equipo',
  'Cambio de fecha sin costo, siempre',
]

const money = (value) => `$${value.toLocaleString('es-AR')}`

export default function CumpleCompletoBump({ checked, onChange, disabled }) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        checked ? 'border-[#FFD700]/60 bg-[#FFD700]/[0.07]' : 'border-white/15 bg-white/[0.03]'
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#FFD700]"
        />
        <span className="flex-1">
          <span className="block text-sm font-bold text-white">
            Sumá el CUMPLE COMPLETO
          </span>
          <span className="mt-0.5 block text-xs text-white/60">
            Total {money(PRICE_COMPLETE)} (sumás {money(BUMP_ADD)} sobre los {money(PRICE_BASE)})
          </span>
        </span>
      </label>

      <ul className="mt-3 space-y-1.5 pl-8">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-xs text-white/60">
            <Check size={13} className="mt-0.5 shrink-0 text-[#FFD700]/80" />
            {benefit}
          </li>
        ))}
      </ul>

      <p className="mt-3 pl-8 text-[11px] text-white/35">Solo se puede sumar en este paso.</p>
    </div>
  )
}
