import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Sparkles, Camera, Share2, Star, ChevronDown, MessageCircle, Clock, Shield, Zap, Heart, Trophy, X, Check } from 'lucide-react'
import { teams } from '../data/teams'
import { whatsappLinks, chatUrl } from '../config/whatsapp'
import AlmaIsotipo from '../components/brand/AlmaIsotipo.jsx'
import SparkleField from '../components/brand/SparkleField.jsx'

// Número de WhatsApp - CAMBIAR POR TU NÚMERO REAL

// ─── DATOS ─────────────────────────────────────────

const STEPS = [
  { icon: Shield, title: 'Elegí tu equipo', desc: 'Seleccioná el escudo de tu club o selección favorita.' },
  { icon: Camera, title: 'Subí la foto', desc: 'Cargá una foto del cumpleañero. Se verá como una figurita real.' },
  { icon: Share2, title: 'Compartí', desc: 'Enviá el link por WhatsApp, Instagram o donde quieras.' },
]

const EXAMPLES = [
  { name: 'Thiago', age: 8, team: 'argentina', teamName: 'Argentina', rating: 85, photo: '/ejemplos/thiago.webp', stats: { RIT: 85, PAS: 72, DEF: 45, FIS: 78 } },
  { name: 'Benicio', age: 9, team: 'river', teamName: 'River Plate', rating: 91, photo: '/ejemplos/benicio.webp', stats: { RIT: 88, PAS: 85, DEF: 60, FIS: 82 } },
  { name: 'Zoe', age: 7, team: 'boca', teamName: 'Boca Juniors', rating: 87, photo: '/ejemplos/zoe.webp', stats: { RIT: 82, PAS: 78, DEF: 55, FIS: 80 } },
  { name: 'Lautaro', age: 10, team: 'sanlorenzo', teamName: 'San Lorenzo', rating: 89, photo: '/ejemplos/lautaro.webp', stats: { RIT: 86, PAS: 80, DEF: 58, FIS: 84 } },
]

const BENEFITS = [
  { icon: Sparkles, title: 'Invitación original', desc: 'Diferente a todas. Estilo figurita FIFA.' },
  { icon: MessageCircle, title: 'Compartible por WhatsApp', desc: 'Un link. Cero complicaciones.' },
  { icon: Clock, title: 'Cuenta regresiva incluida', desc: 'Todos ven cuánto falta para el gran día.' },
  { icon: Heart, title: 'Confirmación de asistencia', desc: 'Los invitados responden directo a tu celular.' },
  { icon: Shield, title: 'Diseño estilo figurita FIFA', desc: 'Escudo real, stats, rating. Como un juego.' },
  { icon: Zap, title: 'Lista en 2 minutos', desc: 'Sin registro. La ves antes de pagar.' },
]

// RESEÑAS: agregar SOLO textos de clientes reales, con su permiso.
// Formato: { name: 'Mariana G.', role: 'Mamá de Thiago, 8 años', text: '...', stars: 5 }
// Mientras esté vacío, la sección no se muestra en la landing.
const REVIEWS = []

// PRECIO: una sola fuente de verdad para toda la landing.
// Las cifras salen del mismo lugar que cobra el checkout (pricing del servidor).
const PRECIO = '10.000'
const PRECIO_COMPLETO = '14.999'
const BUMP = '4.999'

// ─── MODAL DE PAGO (solo para ejemplo) ─────────────────────────────────

function PaymentModal({ isOpen, onClose, navigate }) {
  const benefits = [
    'La experiencia completa, no una simple imagen',
    'Su página con enlace para mandársela a quien quieras',
    'Sin marca de agua · se abre con un toque',
    'El link queda activo 12 meses',
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)',
              border: '1px solid rgba(255,215,0,0.2)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(255,215,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X size={16} className="text-white/60" />
            </button>

            <div className="p-6 pt-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    boxShadow: '0 0 20px rgba(255,215,0,0.3)',
                  }}>
                  <Trophy size={28} className="text-[#1a1a3e]" />
                </div>
                <h2 className="text-2xl font-black font-bebas tracking-wider text-white mb-2">
                  ACTIVÁ TU INVITACIÓN
                </h2>
                <p className="text-white/40 text-sm">
                  Esto que acabás de ver es exactamente lo que va a vivir quien la reciba.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {benefits.map((benefit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-[#FFD700]/20 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-[#FFD700]" />
                    </div>
                    <span className="text-white/70 text-sm">{benefit}</span>
                  </motion.div>
                ))}
              </div>

              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-white/40 text-lg">ARS</span>
                  <span className="text-5xl font-black text-white font-bebas tracking-tight">10.000</span>
                </div>
                <span className="text-white/30 text-xs">· pago único · sin suscripción</span>
                
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <span className="text-white/50 text-xs">Invitación completa, pago único. Sin suscripción.</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    onClose()
                    navigate('/crear')
                  }}
                  className="w-full py-4 rounded-full font-bold text-[#1a1a3e] text-lg tracking-wide flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                  style={{
                    background: 'linear-gradient(90deg, #FFD700, #FFA500, #FF6B35)',
                    boxShadow: '0 8px 32px rgba(255,215,0,0.3)',
                  }}
                >
                  Crear mi invitación →
                </button>

                <button
                  onClick={() => {
                    onClose()
                    navigate('/invitacion/thiago-8-argentina')
                  }}
                  className="w-full py-3 rounded-full text-white/60 text-sm hover:text-white transition-colors border border-white/10 hover:border-white/20"
                >
                  Seguir viendo el ejemplo
                </button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <Shield size={14} className="text-white/30" />
                <span className="text-white/30 text-xs">Pago seguro · si no te encanta, te devolvemos el dinero</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── COMPONENTES AUXILIARES ───────────────────────

function StatBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-white/50 w-6 font-bold">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-white/70 w-4 text-right font-bold">{value}</span>
    </div>
  )
}

function ExampleCard({ data, onClick }) {
  const team = teams.find(t => t.id === data.team)
  const ratingColor = data.rating >= 90 ? 'from-[#FFD700] to-[#FFA500]' : data.rating >= 85 ? 'from-[#00D4FF] to-[#0099CC]' : 'from-[#A855F7] to-[#EC4899]'

  return (
    <div className="w-full max-w-[260px] mx-auto cursor-pointer" onClick={onClick}>
      <div className="relative rounded-2xl overflow-hidden border border-[#FFD700]/30 bg-gradient-to-b from-[#0a0e27] to-[#1a1f4b] shadow-xl shadow-black/40 hover:shadow-2xl hover:shadow-[#FFD700]/10 transition-all duration-300 hover:-translate-y-1">
          <SparkleField opacity={0.5} />
        <div className="flex items-center justify-between p-3">
          <span className="text-[8px] text-white/40 font-bold tracking-wider">FIFA 2026</span>
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${ratingColor} flex items-center justify-center border border-white/20 shadow-lg`}>
            <span className="text-lg font-black text-white font-bebas">{data.rating}</span>
          </div>
          <div className="w-10 h-12">
            <img src={team?.shield} alt={team?.name} className="w-full h-full object-contain" loading="lazy" />
          </div>
        </div>
        <div className="mx-3 h-36 rounded-xl overflow-hidden bg-gradient-to-b from-[#1a1a3e] to-[#0a0a1a] border border-white/10">
          {data.photo ? (
            <img src={data.photo} alt={`Retrato de ${data.name}`} className="w-full h-full object-cover object-top" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20 text-3xl">⚽</div>
          )}
        </div>
        <div className="text-center py-3">
          <h3 className="text-3xl font-bebas text-[#FFD700] leading-none">{data.name}</h3>
          <p className="text-[#00D4FF] text-[10px] mt-1 font-bold">{data.age} AÑOS · {data.teamName.toUpperCase()}</p>
        </div>
        <div className="mx-3 mb-3 p-2.5 rounded-lg bg-black/30 border border-white/5">
          <StatBar label="RIT" value={data.stats.RIT} color="#FFD700" />
          <StatBar label="PAS" value={data.stats.PAS} color="#00D4FF" />
          <StatBar label="DEF" value={data.stats.DEF} color="#A855F7" />
          <StatBar label="FIS" value={data.stats.FIS} color="#FF6B35" />
        </div>
      </div>
    </div>
  )
}

// ─── HOMEPAGE PRINCIPAL ───────────────────────────

export default function HomePage() {
  const navigate = useNavigate()
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const openWhatsApp = () => {
    window.open(whatsappLinks.support(), '_blank')
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white font-montserrat overflow-x-hidden">
      
      {/* MODAL DE PAGO */}
      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)} 
        navigate={navigate}
      />

      {/* SECCIÓN 1 — HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-12">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#0f0f23] to-[#0a0a1a]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FFD700] rounded-full opacity-[0.03] blur-3xl" />
        <SparkleField opacity={0.7} />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs font-semibold text-white/60 tracking-wider uppercase">Creado en Jujuy, Argentina</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-[5.5rem] font-bebas tracking-wider leading-[0.9] mb-6"
          >
            <span className="text-white">
              Convertí a tu hijo o hija en
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FF6B35] bg-clip-text text-transparent">
              la estrella del partido
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Invitaciones digitales premium estilo FIFA para cumpleañeros de todas las edades. Personalizadas con su foto, su equipo favorito y los datos del evento. ¡Niños, jóvenes y adultos pueden ser la estrella!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            {/* ========== CAMBIO: Va directo al wizard ========== */}
            <button
              onClick={() => navigate('/crear')}
              className="group px-8 py-4 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#ec4899] text-white font-bold text-lg tracking-wide flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-[#FF6B35]/30"
            >
              Crear mi invitación
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/invitacion/thiago-8-argentina')}
              className="px-8 py-4 rounded-full border border-white/20 text-white font-semibold hover:bg-white/5 transition-all flex items-center justify-center gap-2"
            >
              Ver ejemplo
            </button>

            <button
              onClick={openWhatsApp}
              className="px-8 py-4 rounded-full bg-[#22c55e] text-white font-semibold hover:bg-[#16a34a] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#22c55e]/20"
            >
              <MessageCircle size={20} />
              Hablar por WhatsApp
            </button>
          </motion.div>

          {/* A2 — precio visible en el hero */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-6 text-sm text-white/50"
          >
            <span className="font-bold text-[#FFD700]">ARS ${PRECIO}</span> · pago único · sin suscripción
          </motion.p>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <ChevronDown size={24} className="text-white/20" />
        </div>
      </section>

      {/* SECCIÓN 2 — EQUIPOS */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bebas tracking-wider mb-3">
              ELEGÍ TU <span className="text-[#FFD700]">EQUIPO</span>
            </h2>
            <p className="text-white/40 text-sm">{teams.length} equipos para elegir: selecciones y clubes de Argentina y el mundo.</p>
          </motion.div>

          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-6 md:gap-4">
            {teams.map((team, i) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.15, y: -5 }}
                onClick={() => navigate('/crear')}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className="w-16 h-20 md:w-14 md:h-18 transition-transform">
                  <img src={team.shield} alt={team.name} className="w-full h-full object-contain drop-shadow-lg group-hover:drop-shadow-xl" loading="lazy" />
                </div>
                <span className="text-[10px] text-white/50 text-center group-hover:text-white/80 transition-colors">{team.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN 3 — CÓMO FUNCIONA */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#0a0a1a] via-[#0f0f23] to-[#0a0a1a]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bebas tracking-wider mb-3">
              CÓMO <span className="text-[#FFD700]">FUNCIONA</span>
            </h2>
            <p className="text-white/40 text-sm">Tres pasos. Menos de dos minutos.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="relative p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#FFD700]/30 transition-all text-center"
                >
                  <div className="absolute top-4 right-4 text-5xl font-bebas text-white/[0.03] font-black select-none">
                    0{i + 1}
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#ec4899] flex items-center justify-center mx-auto mb-6">
                    <Icon size={28} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-3">{step.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* SECCIÓN 4 — GALERÍA */}
      <section id="galeria" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bebas tracking-wider mb-3">
              ASÍ QUEDAN <span className="text-[#FFD700]">LAS INVITACIONES</span>
            </h2>
            <p className="text-white/40 text-sm">Ejemplos reales de figuritas creadas.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {EXAMPLES.map((ex, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <ExampleCard 
                  data={ex} 
                  onClick={() => setShowPaymentModal(true)}
                />
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button
              onClick={() => navigate('/crear')}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#ec4899] text-white font-bold text-lg tracking-wide hover:opacity-90 transition-all shadow-lg shadow-[#FF6B35]/30"
            >
              Crear la figurita de mi hijo · ${PRECIO}
            </button>
            <p className="mt-3 text-xs text-white/40">Pago único, sin suscripción. La ves antes de pagar.</p>
          </div>

          <div className="mt-10 max-w-3xl mx-auto rounded-2xl border border-[#FFD700]/30 bg-gradient-to-b from-white/[0.05] to-transparent p-7 text-center">
            <svg className="mx-auto mb-4" width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M21 3 35 8v11c0 9-5.6 15.5-14 19C12.6 34.5 7 28 7 19V8L21 3Z" stroke="#FFD700" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M21 13v10M16 18h10" stroke="#FFD700" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <p className="text-[10px] tracking-[.28em] text-[#FFD700]/80 uppercase mb-2">Equipos a medida</p>
            <h3 className="font-bebas text-2xl tracking-wider mb-2">¿No está tu equipo?</h3>
            <p className="text-white/50 text-sm leading-relaxed max-w-xl mx-auto">
              Pasame el nombre y el escudo o logo por WhatsApp y lo preparamos para tu figurita.
              Club, liga barrial o equipo de la escuela: todos juegan.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 text-left">
              {[
                ['1', 'Elegís “Equipo personalizado”', 'Escribís el nombre del club y seguís normal.'],
                ['2', 'Ves la vista previa', 'Aparece un escudo provisorio con las iniciales del club.'],
                ['3', 'Nos mandás el logo', 'Después del pago te llega la invitación final con tu escudo real.'],
              ].map(([n, t1, t2]) => (
                <div key={n} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#FFD700] text-[11px] font-black text-[#0a0e27]">{n}</span>
                  <p className="mt-2 text-xs font-bold text-white/85">{t1}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/40">{t2}</p>
                </div>
              ))}
            </div>
            <a
              href={chatUrl({ intent: 'consulta', detail: 'Quiero un equipo personalizado. Nombre del equipo: [NOMBRE]. Adjunto el escudo o logo por aquí.' })}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#FFD700]/50 px-6 py-2.5 text-sm font-semibold text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors"
            >
              Pedir equipo personalizado <ArrowRight size={16} />
            </a>
          </div>

          <div className="text-center mt-12">
            {/* ========== CAMBIO: Va directo al wizard ========== */}
            <button
              onClick={() => navigate('/crear')}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#ec4899] text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-[#FF6B35]/30"
            >
              Quiero la mía →
            </button>
          </div>
        </div>
      </section>

      {/* SECCIÓN 5 — BENEFICIOS */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#0a0a1a] via-[#0f0f23] to-[#0a0a1a]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bebas tracking-wider mb-3">
              ¿POR QUÉ <span className="text-[#FFD700]">ELEGIR INVITAFIGUS?</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="p-5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#FFD700]/20 transition-all flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-[#FF6B35]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1">{b.title}</h3>
                    <p className="text-white/40 text-xs leading-relaxed">{b.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* SECCIÓN 6 — RESEÑAS REALES
          Solo se muestran reseñas verificadas que el usuario haya cargado en
          REVIEWS. Vacío = la sección no aparece (mejor nada que algo inventado). */}
      {REVIEWS.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bebas tracking-wider mb-3">
                LO QUE DICEN <span className="text-[#FFD700]">LOS PADRES</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {REVIEWS.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10"
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(t.stars)].map((_, s) => (
                      <Star key={s} size={14} className="text-[#FFD700] fill-[#FFD700]" />
                    ))}
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#ec4899] flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{t.name[0]}</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{t.name}</p>
                      <p className="text-white/30 text-xs">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECCIÓN 6.5 — PRECIOS
          Solo dos opciones reales y las mismas cifras que cobra el checkout.
          El valor del panel del organizador es lo que más se pregunta, así que
          va explicado acá y no escondido en una lista de beneficios. */}
      <section id="precios" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-3 text-3xl md:text-4xl font-bebas tracking-wider">
              DOS FORMAS DE <span className="text-[#FFD700]">JUGARLA</span>
            </h2>
            <p className="text-sm text-white/40">Pago único. Sin suscripción. Las dos duran 12 meses.</p>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Plan base */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col rounded-2xl border border-white/12 bg-white/[0.03] p-6"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Invitación</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-black text-white font-bebas tracking-tight">${PRECIO}</span>
                <span className="text-xs text-white/40">ars · una sola vez</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2">
                {[
                  'Figurita con el escudo del equipo que elijas',
                  'Link propio para mandar por WhatsApp',
                  'Cuenta regresiva y datos del cumple',
                  'Confirmación de asistencia de los invitados',
                  'Link activo 12 meses',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/65">
                    <Check size={15} className="mt-0.5 shrink-0 text-[#FFD700]/80" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/crear')}
                className="mt-6 w-full rounded-full border border-white/20 py-3 text-sm font-bold text-white transition-colors hover:bg-white/5"
              >
                Crear mi invitación
              </button>
            </motion.div>

            {/* Plan completo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative flex flex-col rounded-2xl border border-[#FFD700]/40 bg-gradient-to-b from-[#FFD700]/[0.08] to-transparent p-6"
            >
              <span className="absolute -top-3 left-6 rounded-full bg-[#FFD700] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0a0e27]">
                Cumple completo
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFD700]/80">Todo lo de la invitación +</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-black text-white font-bebas tracking-tight">${PRECIO_COMPLETO}</span>
                <span className="text-xs text-white/40">ars · una sola vez</span>
              </div>
              <p className="mt-1 text-xs text-white/40">
                Son ${BUMP} más que la invitación sola. Se elige en un solo paso, sin volver a pagar.
              </p>
              <ul className="mt-5 flex-1 space-y-2">
                {[
                  'Todo lo de la invitación',
                  'Panel del organizador: asistentes, no asistentes y total',
                  'Lista de asistentes exportable para el salón',
                  'PDF de la figurita para imprimir y regalar',
                  'Un segundo diseño con otro equipo',
                  'Cambio de fecha sin costo, siempre',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/75">
                    <Check size={15} className="mt-0.5 shrink-0 text-[#FFD700]" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/crear')}
                className="mt-6 w-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] py-3 text-sm font-bold text-[#0a0e27] transition-opacity hover:opacity-90"
              >
                Crear con cumple completo
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 7 — CTA FINAL */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/5 via-[#ec4899]/5 to-[#FF6B35]/5" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 text-center max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-6xl font-bebas tracking-wider mb-6">
            ¿LISTO PARA CREAR UNA
            <br />
            <span className="text-[#FFD700]">INVITACIÓN INOLVIDABLE?</span>
          </h2>
          <p className="text-white/40 mb-10">
            Tu hijo o hija merece una invitación tan especial como vos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* ========== CAMBIO: Va directo al wizard ========== */}
            <button
              onClick={() => navigate('/crear')}
              className="px-10 py-4 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#ec4899] text-white font-bold text-lg tracking-wide hover:opacity-90 transition-all shadow-xl shadow-[#FF6B35]/30"
            >
              Crear invitación · ${PRECIO}
            </button>

            <button
              onClick={openWhatsApp}
              className="px-10 py-4 rounded-full bg-[#22c55e] text-white font-bold text-lg tracking-wide hover:bg-[#16a34a] transition-all shadow-xl shadow-[#22c55e]/20 flex items-center justify-center gap-2"
            >
              <MessageCircle size={20} />
              Hablar por WhatsApp
            </button>
          </div>

          <p className="mt-8 text-white/30 text-xs">
            Sin registro. La ves antes de pagar. <span className="text-white/60 font-semibold">${PRECIO}, pago único.</span>
          </p>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[#FFD700]" />
            <span className="text-lg font-bebas text-[#FFD700]">INVITAFIGUS</span>
            <span className="text-white/20 text-xs">2026</span>
          </div>
          <p className="text-white/20 text-xs">
            Invitaciones digitales futboleras para hijos, hijas y cumpleañeros de todas las edades
          </p>
        </div>
        <div className="mt-7 flex max-w-5xl mx-auto items-center justify-center gap-2.5 border-t border-white/5 pt-5 md:justify-start">
          <AlmaIsotipo size={22} className="shrink-0 text-[#B08D4A]/70" />
          <p className="text-[11px] text-white/25">
            Bodas, XV, bautismos y eventos sociales:{' '}
            <a
              href={import.meta.env.VITE_ALMA_URL || 'https://invitastudio-vert.vercel.app'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#B08D4A]/80 underline decoration-[#B08D4A]/40 underline-offset-4 transition-colors hover:text-[#D7B56B]"
            >
              Invita con el Alma
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}