import AlmaIsotipo from '../brand/AlmaIsotipo.jsx'

const ALMA_URL = import.meta.env.VITE_ALMA_URL || 'https://invitastudio-vert.vercel.app'

export default function AlmaCrossSellCard() {
  return (
    <section className="mt-10 text-left" aria-labelledby="alma-cross-sell-title">
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-7 sm:px-8"
        style={{
          background: 'linear-gradient(145deg, #fbf6ec 0%, #f2e9d8 55%, #eee2cb 100%)',
          border: '1px solid rgba(176, 141, 74, 0.45)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.8), 0 18px 40px rgba(0,0,0,.28)',
          color: '#2b2118',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'repeating-linear-gradient(135deg, rgba(176,141,74,.09) 0 1px, transparent 1px 9px)',
          }}
        />
        <div className="relative">
          <AlmaIsotipo size={44} className="text-[#8a6b35]" />

          <p
            id="alma-cross-sell-title"
            className="mt-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a6b35]"
          >
            INVITA CON EL ALMA · DIVISIÓN EVENTOS SOCIALES
          </p>

          <h3 className="mt-3 font-serif text-2xl leading-tight text-[#2b2118] sm:text-[26px]">
            ¿Próximamente un Bautismo, Comunión, XV o Boda en la familia?
          </h3>

          <p className="mt-3 text-[13px] leading-relaxed text-[#5b4b3c]">
            Conocé nuestra línea de invitaciones digitales de autor: apertura de sobre interactiva en 3D,
            música personalizada, confirmación de asistencia en tiempo real y gestión inteligente de mesas.
          </p>

          <a
            href={ALMA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-3 border-b border-[#8a6b35] pb-1 text-[13px] font-semibold tracking-wide text-[#6d5429] transition-colors hover:text-[#2b2118]"
          >
            Conocer Invita con el Alma
            <span aria-hidden="true" className="text-base leading-none">→</span>
          </a>
        </div>
      </div>
    </section>
  )
}
