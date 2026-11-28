import { Sparkles } from 'lucide-react'

// CTA de referido al pie de la invitación pública (pedido de marketing).
// Es el único canal que no depende de pauta ni de algoritmo: lo ve el invitado
// que YA está mirando una invitación, o sea el público más caliente que hay.
// El UTM va fijo en el link para poder atribuir los pedidos que vengan de acá.
export default function ReferralCta() {
  const href = '/crear?utm_source=invitacion&utm_medium=referido&utm_campaign=referido'

  return (
    <a
      href={href}
      className="group block overflow-hidden rounded-2xl border border-[#FFD700]/25 bg-[#FFD700]/[0.06] p-4 text-center transition-colors hover:border-[#FFD700]/50 hover:bg-[#FFD700]/10"
    >
      <p className="flex items-center justify-center gap-2 text-[13px] font-bold text-[#FFD700]">
        <Sparkles size={14} /> ¿Cumple a la vista?
      </p>
      <p className="mt-1 text-xs leading-relaxed text-white/55">
        Creá la figurita de tu hijo o hija en 2 minutos. Ves cómo queda antes de pagar.
      </p>
      <span className="mt-2 inline-block text-[11px] font-black uppercase tracking-widest text-white/70 underline underline-offset-4 group-hover:text-white">
        Crear mi invitación
      </span>
    </a>
  )
}
