import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Camera, Check, X, Star, Calendar, Clock, MapPin } from 'lucide-react'
import { useApp } from '../context/AppContext'
import PlayerCard from '../components/invitation/PlayerCard'
import Watermark from '../components/invitation/Watermark'
import { sendToGoogleForm } from '../services/googleForm'
import { teams as baseTeams } from '../data/teams'
import { useAllTeams } from '../services/dynamicTeams'
import { whatsappLinks, chatUrl } from '../config/whatsapp'
import AlmaCrossSellCard from '../components/crossSell/AlmaCrossSellCard.jsx'
import CountdownTimer from '../components/invitation/CountdownTimer.jsx'
import SparkleField from '../components/brand/SparkleField.jsx'


export default function CreatePage() {
  const teams = useAllTeams()
  const navigate = useNavigate()
  const { createInvitation } = useApp()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const fileInputRef = useRef(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [createdInvitation, setCreatedInvitation] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState('idle')
  const [paymentId, setPaymentId] = useState('')
  const [paymentMessage, setPaymentMessage] = useState('')
  const [customTeamName, setCustomTeamName] = useState('')
  const [panelKey, setPanelKey] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved | pending
  const [showManualVerify, setShowManualVerify] = useState(false)
  const [searchParams] = useSearchParams()

  const [formData, setFormData] = useState({
    childName: '',
    honoreeName: '',
    honoreeAge: '',
    nickname: '',
    team: 'argentina',
    date: '',
    startTime: '',
    endTime: '',
    address: '',
    location: '',
    contactWhatsApp: '',
    email: '',
    honoreePhoto: '',
    message: '',
    dressCode: '',
  })

  const [errors, setErrors] = useState({})

  const totalSteps = 5

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleNext = () => {
    if (validateStep()) {
      if (step < totalSteps) {
        setStep(step + 1)
      } else {
        handlePreview()
      }
    }
  }

  const validateStep = () => {
    const newErrors = {}
    switch (step) {
      case 1:
        if (!formData.honoreePhoto) newErrors.honoreePhoto = 'Subí una foto'
        break
      case 2:
        if (!formData.team) newErrors.team = 'Elegí un equipo'
        if (formData.team === 'custom' && !customTeamName.trim()) newErrors.customTeam = 'Escribí el nombre del equipo'
        break
      case 3:
        if (!formData.childName.trim()) newErrors.childName = 'El nombre es obligatorio'
        if (!formData.honoreeAge) newErrors.honoreeAge = 'La edad es obligatoria'
        break
      case 4:
        if (!formData.date) newErrors.date = 'La fecha es obligatoria'
        if (!formData.startTime) newErrors.startTime = 'El horario de inicio es obligatorio'
        if (!formData.endTime) newErrors.endTime = 'El horario de fin es obligatorio'
        if (!formData.address) newErrors.address = 'La dirección es obligatoria'
        break
      case 5:
        if (!formData.email) newErrors.email = 'El email es obligatorio'
        break
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result)
        setFormData({ ...formData, honoreePhoto: reader.result })
        setErrors({ ...errors, honoreePhoto: null })
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePreview = async () => {
    setIsLoading(true)
    try {
      await sendToGoogleForm({
        nombre: formData.childName,
        apellido: formData.honoreeName,
        apodo: formData.nickname,
        edad: formData.honoreeAge,
        equipo: formData.team === 'custom' ? (customTeamName.trim() || 'Equipo personalizado') : (teams.find(t => t.id === formData.team)?.name || formData.team),
        fecha: formData.date,
        hora: `${formData.startTime} - ${formData.endTime}`,
        lugar: formData.location || formData.address,
        lugar2: formData.location || formData.address,
        contacto: `${formData.honoreeName || formData.childName} (padre/madre)`,
        telefono: formData.contactWhatsApp,
        email: formData.email,
        mensaje: formData.message,
        vestimenta: formData.dressCode
      })
    } catch (error) {
      console.error('Error sendToGoogleForm:', error)
    }

    setTimeout(() => {
      try {
        const invitation = createInvitation({
          ...formData,
          honoreeAge: parseInt(formData.honoreeAge),
          time: `${formData.startTime} - ${formData.endTime}`,
          slug: `${formData.childName.toLowerCase().replace(/\s+/g, '-')}-${formData.honoreeAge}-${formData.team === 'custom' ? 'personalizado' : formData.team}`,
          customTeamName: formData.team === 'custom' ? customTeamName.trim() : '',
          status: 'preview',
        })
        setCreatedInvitation(invitation)
        // Clave privada del panel del organizador (asistentes / no asistentes).
        fetch('/api/panel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'issue', code: invitation.slug }),
        }).then(r => r.json()).then(data => {
          if (data?.key) {
            setPanelKey(data.key)
            localStorage.setItem(`invitafigus_panel_${invitation.slug}`, data.key)
          }
        }).catch(() => {})
        setStep(6)
        setIsLoading(false)
      } catch (error) {
        console.error('Error en createInvitation:', error)
        setIsLoading(false)
      }
    }, 2500)
  }

  // Guarda el pedido en la planilla (estado PENDIENTE) para que el operador
  // pueda activarlo aunque el cliente cierre el navegador o pierda el link.
  const saveOrder = async (code) => {
    if (!code) return
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          paymentId: paymentId || '',
          invitation: {
            ...formData,
            slug: code,
            customTeamName: customTeamName.trim(),
            time: `${formData.startTime} - ${formData.endTime}`,
            honoreeAge: parseInt(formData.honoreeAge, 10) || '',
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      setSaveStatus(data.saved ? 'saved' : 'pending')
    } catch {
      setSaveStatus('pending')
    }
  }

  // Flujo de pago senior: intenta crear preferencia Checkout Pro (retorno automático),
  // si no hay token de MP configurado usa el link de pago estático como fallback.
  // Guardamos el código para poder verificar al volver sin pedir el nº de operación.
  const openPayment = async () => {
    const code = createdInvitation?.slug || `${formData.childName.toLowerCase().replace(/\s+/g, '-')}-${formData.honoreeAge}-${formData.team === 'custom' ? 'personalizado' : formData.team}`
    try {
      localStorage.setItem('invitafigus_pending_payment', JSON.stringify({ code, ts: Date.now() }))
    } catch {}
    setPaymentStatus('pending')
    setPaymentMessage('Te abrimos Mercado Pago en otra pestaña. Cuando termines, volvé acá: verificamos solos, sin que escribas nada.')
    saveOrder(code)
    setShowPaymentModal(false)
    setStep(7)
    // Abrimos la pestaña en el mismo gesto del click (si esperamos al fetch,
    // el navegador bloquea el popup). Después le ponemos la URL definitiva.
    const tab = window.open('about:blank', '_blank')
    const goTo = (url) => {
      if (tab && !tab.closed) tab.location.href = url
      else window.open(url, '_blank')
    }
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', code, baseUrl: window.location.origin }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.initPoint) {
        goTo(data.initPoint)
        return
      }
      // Fallback: link de pago estático (se verifica por polling del estado)
      goTo('https://mpago.la/1X2RD5k')
    } catch {
      goTo('https://mpago.la/1X2RD5k')
    }
  }

  // Polling automático: cada 4s pregunta si el pago ya se acreditó. Así el usuario
  // no tiene que buscar el número de operación.
  useEffect(() => {
    if (step !== 7 || paymentStatus === 'paid') return
    const code = createdInvitation?.slug
    if (!code) return
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', code }),
        })
        const data = await res.json().catch(() => ({}))
        if (data.status === 'paid') {
          setPaymentStatus('paid')
          setPaymentMessage('Pago acreditado. Tu invitación quedó activada.')
          try { localStorage.removeItem('invitafigus_pending_payment') } catch {}
        }
      } catch {}
    }, 4000)
    return () => clearInterval(id)
  }, [step, paymentStatus, createdInvitation?.slug])

  // Retorno de Mercado Pago: ?status=success&payment_id=...&external_reference=codigo
  useEffect(() => {
    const status = searchParams.get('status')
    const pid = searchParams.get('payment_id') || searchParams.get('collection_id')
    const ref = searchParams.get('external_reference')
    if (!status || !createdInvitation?.slug) return
    if (status === 'success' && pid) {
      setPaymentId(String(pid))
      setStep(7)
      setPaymentStatus('checking')
      fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code: ref || createdInvitation.slug, paymentId: String(pid) }),
      }).then(r => r.json()).then(data => {
        if (data.status === 'paid') {
          setPaymentStatus('paid')
          setPaymentMessage('Pago acreditado. Tu invitación quedó activada.')
        } else {
          setPaymentStatus('pending')
          setPaymentMessage('Volviste de Mercado Pago. Estamos verificando tu pago, puede tardar unos minutos.')
        }
      }).catch(() => setPaymentStatus('pending'))
    }
  }, [searchParams, createdInvitation?.slug])

  const verifyPayment = async () => {
    const code = createdInvitation?.slug
    if (!code || !/^\d{5,20}$/.test(paymentId.trim())) {
      setPaymentStatus('error')
      setPaymentMessage('Ingresá el número de operación de Mercado Pago (solo números).')
      return
    }
    setPaymentStatus('checking')
    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code, paymentId: paymentId.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo verificar')
      if (data.status === 'paid') {
        setPaymentStatus('paid')
        setPaymentMessage('Pago acreditado. Tu invitación quedó activada.')
      } else if (data.status === 'manual') {
        setPaymentStatus('manual')
        setPaymentMessage('No hay verificación automática configurada. Envianos el comprobante por WhatsApp con el código de tu pedido.')
      } else {
        setPaymentStatus(data.status || 'pending')
        setPaymentMessage('Mercado Pago todavía no registra ese pago como aprobado. Si recién pagaste, esperá unos minutos e intentá de nuevo.')
      }
    } catch (error) {
      setPaymentStatus('error')
      setPaymentMessage(error.message)
    }
  }

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value })
    if (errors[field]) setErrors({ ...errors, [field]: null })
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-montserrat">
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (step === 6 || step === 7) {
                  if (createdInvitation?.slug) navigate(`/invitacion/${createdInvitation.slug}`)
                  else navigate('/')
                } else if (step > 1) handleBack()
                else navigate('/')
              }}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              aria-label={step === 6 || step === 7 ? 'Ver mi invitación' : 'Volver'}
            >
              {step > 1 && step !== 6 && step !== 7 ? <ChevronLeft size={20} /> : <X size={20} />}
            </button>
            <div>
              {step !== 6 && step !== 7 && (
                <>
                  <span className="text-[10px] text-white/30 tracking-widest uppercase">Paso {step} / {totalSteps}</span>
                  <div className="flex gap-1 mt-1">
                    {[...Array(totalSteps)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-1 rounded-full transition-all duration-300 ${i < step ? 'w-8 bg-[#FFD700]' : 'w-8 bg-white/10'}`}
                      />
                    ))}
                  </div>
                </>
              )}
              {step === 6 && (
                <span className="text-[10px] text-[#FFD700] tracking-widest uppercase">Preview</span>
              )}
              {step === 7 && (
                <span className="text-[10px] text-green-400 tracking-widest uppercase">¡Listo!</span>
              )}
            </div>
          </div>
          {(step === 6 || step === 7) && createdInvitation?.slug ? (
            <button onClick={() => navigate(`/invitacion/${createdInvitation.slug}`)} className="text-[#FFD700] text-xs font-bold hover:underline">Ver invitación</button>
          ) : (
            <button onClick={() => navigate('/')} className="text-white/30 hover:text-white/60 transition-colors"><X size={20} /></button>
          )}
        </div>
      </div>

      <div className="pt-24 pb-32 px-4 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center mb-8">
                <span className="text-[10px] text-[#FFD700] tracking-[0.3em] uppercase">Figurita 1</span>
                <h2 className="text-3xl font-black font-bebas tracking-wider mt-2">Subí una foto</h2>
                <p className="text-white/40 text-sm mt-2">De frente, buena luz, que se vea bien la cara. La magia depende de esto.</p>
              </div>
              <div onClick={() => fileInputRef.current?.click()} className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${errors.honoreePhoto ? 'border-red-500/50 bg-red-500/5' : 'border-white/20 hover:border-[#FFD700]/50 bg-white/[0.02]'}`}>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                {previewUrl ? (
                  <div className="relative">
                    <img src={previewUrl} alt="Preview" className="w-32 h-40 object-cover rounded-xl mx-auto" />
                    <button onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); setFormData({ ...formData, honoreePhoto: '' }) }} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#FFD700]/10 flex items-center justify-center mx-auto mb-4"><Camera size={28} className="text-[#FFD700]" /></div>
                    <p className="text-white/60 font-medium">Tocá para subir foto</p>
                    <p className="text-white/30 text-xs mt-1">JPG, PNG · Máx 5MB</p>
                  </>
                )}
              </div>
              {errors.honoreePhoto && <p className="text-red-400 text-xs text-center">{errors.honoreePhoto}</p>}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FFD700]/5 border border-[#FFD700]/10">
                <Check size={16} className="text-[#FFD700] mt-0.5 flex-shrink-0" />
                <p className="text-white/50 text-xs">La imagen que subas se ELIMINA una vez creada la figurita y NO permanece en nuestro sistema.</p>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center mb-8">
                <span className="text-[10px] text-[#FFD700] tracking-[0.3em] uppercase">Figurita 1</span>
                <h2 className="text-3xl font-black font-bebas tracking-wider mt-2">Elegí el equipo</h2>
                <p className="text-white/40 text-sm mt-2">La camiseta de tu equipo, con escudo propio.</p>
              </div>
              <div className="mb-4 rounded-xl border border-[#FFD700]/25 bg-[#FFD700]/[0.04] p-4 text-center">
                <p className="text-white/70 text-sm font-semibold">¿No está tu equipo?</p>
                <p className="text-white/50 text-xs mt-1">Elegí <b className="text-[#FFD700]">Equipo personalizado</b>, escribí el nombre y después nos mandás el escudo o logo por WhatsApp. Lo preparamos para tu figurita.</p>
              </div>
              <div className="grid max-h-[420px] grid-cols-3 gap-3 overflow-y-auto pr-1">
                <button onClick={() => updateField('team', 'custom')} className={`p-4 rounded-xl border-2 border-dashed transition-all ${formData.team === 'custom' ? 'border-[#FFD700] bg-[#FFD700]/10' : 'border-[#FFD700]/40 bg-[#FFD700]/[0.03] hover:border-[#FFD700]/70'}`}>
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#FFD700]/15 flex items-center justify-center text-xl">✨</div>
                  <p className="text-[10px] text-[#FFD700] text-center font-bold">Equipo personalizado</p>
                </button>
                {teams.map((team) => (
                  <button key={team.id} onClick={() => updateField('team', team.id)} className={`p-4 rounded-xl border transition-all ${formData.team === team.id ? 'border-[#FFD700] bg-[#FFD700]/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}>
                    <div className="w-12 h-12 mx-auto mb-2"><img src={team.shield} alt={team.name} className="w-full h-full object-contain" /></div>
                    <p className="text-[10px] text-white/60 text-center">{team.name}</p>
                  </button>
                ))}
              </div>
              {formData.team === 'custom' && (
                <div className="mt-4 space-y-3">
                  <label className="text-white/60 text-sm block">Nombre del equipo</label>
                  <input type="text" value={customTeamName} onChange={(e) => { setCustomTeamName(e.target.value); if (errors.customTeam) setErrors({ ...errors, customTeam: null }) }} placeholder="Ej: Club Atlético Liniers" className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${errors.customTeam ? 'border-red-500/50' : 'border-white/10'} text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none`} />
                  {errors.customTeam && <p className="text-red-400 text-xs">{errors.customTeam}</p>}
                  <p className="text-white/40 text-xs">En la vista previa vas a ver un escudo provisorio con el nombre. Después de pagar, nos mandás el logo por WhatsApp y te entregamos la invitación final con el escudo real.</p>
                  <a href={whatsappLinks.customTeam(customTeamName || '[NOMBRE]', formData.childName, '')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[#25D366] text-sm font-semibold hover:underline">📱 Mandar nombre y logo por WhatsApp</a>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center mb-8">
                <span className="text-[10px] text-[#FFD700] tracking-[0.3em] uppercase">Figurita 1</span>
                <h2 className="text-3xl font-black font-bebas tracking-wider mt-2">Los datos del crack</h2>
                <p className="text-white/40 text-sm mt-2">Los datos de tu hijo o hija, sin importar la edad. ¡Todos pueden ser la estrella!</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Nombre</label>
                  <input type="text" value={formData.childName} onChange={(e) => updateField('childName', e.target.value)} placeholder="Thiago" className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${errors.childName ? 'border-red-500/50' : 'border-white/10'} text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors`} />
                  {errors.childName && <p className="text-red-400 text-xs mt-1">{errors.childName}</p>}
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Apellido <span className="text-white/30">(opcional)</span></label>
                  <input type="text" value={formData.honoreeName} onChange={(e) => updateField('honoreeName', e.target.value)} placeholder="González" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Apodo <span className="text-white/30">(opcional)</span></label>
                  <input type="text" value={formData.nickname} onChange={(e) => updateField('nickname', e.target.value)} placeholder="El Pulga" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Edad</label>
                  <input type="number" value={formData.honoreeAge} onChange={(e) => updateField('honoreeAge', e.target.value)} placeholder="8" min="1" max="18" className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${errors.honoreeAge ? 'border-red-500/50' : 'border-white/10'} text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors`} />
                  {errors.honoreeAge && <p className="text-red-400 text-xs mt-1">{errors.honoreeAge}</p>}
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center mb-8">
                <span className="text-[10px] text-[#FFD700] tracking-[0.3em] uppercase">Casi listo</span>
                <h2 className="text-3xl font-black font-bebas tracking-wider mt-2">Los datos del cumple</h2>
                <p className="text-white/40 text-sm mt-2">Cuándo, dónde y cómo confirmar.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Fecha del evento</label>
                  <input type="date" value={formData.date} onChange={(e) => updateField('date', e.target.value)} className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${errors.date ? 'border-red-500/50' : 'border-white/10'} text-white focus:border-[#FFD700]/50 focus:outline-none transition-colors`} />
                  {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Desde</label>
                    <input type="time" value={formData.startTime} onChange={(e) => updateField('startTime', e.target.value)} className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${errors.startTime ? 'border-red-500/50' : 'border-white/10'} text-white focus:border-[#FFD700]/50 focus:outline-none transition-colors`} />
                    {errors.startTime && <p className="text-red-400 text-xs mt-1">{errors.startTime}</p>}
                  </div>
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Hasta</label>
                    <input type="time" value={formData.endTime} onChange={(e) => updateField('endTime', e.target.value)} className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${errors.endTime ? 'border-red-500/50' : 'border-white/10'} text-white focus:border-[#FFD700]/50 focus:outline-none transition-colors`} />
                    {errors.endTime && <p className="text-red-400 text-xs mt-1">{errors.endTime}</p>}
                  </div>
                </div>
                {formData.date && formData.startTime && (
                  <div className="relative overflow-hidden rounded-2xl border border-[#FFD700]/25 bg-gradient-to-b from-[#0a0e27] to-[#101a3a] p-5">
                    <SparkleField opacity={0.35} />
                    <div className="relative">
                      <p className="text-center text-[10px] tracking-[.24em] text-[#FFD700]/80 uppercase mb-3">
                        Así lo verán tus invitados
                      </p>
                      <CountdownTimer date={formData.date} time={formData.startTime} compact />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Lugar</label>
                  <input type="text" value={formData.location} onChange={(e) => updateField('location', e.target.value)} placeholder="Club Atlético River Plate" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Dirección</label>
                  <input type="text" value={formData.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Av. Figueroa Alcorta 7597, CABA" className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${errors.address ? 'border-red-500/50' : 'border-white/10'} text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors`} />
                  {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">WhatsApp para confirmar</label>
                  <div className="flex gap-2">
                    <div className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 flex items-center"><span className="text-sm">🇦🇷 +54</span></div>
                    <input type="tel" value={formData.contactWhatsApp} onChange={(e) => updateField('contactWhatsApp', e.target.value.replace(/\D/g, ''))} placeholder="9 11 1234 5678" className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Vestimenta / Pilcha <span className="text-white/30">(opcional)</span></label>
                  <input type="text" value={formData.dressCode} onChange={(e) => updateField('dressCode', e.target.value)} placeholder="Casual, de sport, de gala..." className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors" />
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center mb-8">
                <span className="text-[10px] text-[#FFD700] tracking-[0.3em] uppercase">Casi listo</span>
                <h2 className="text-3xl font-black font-bebas tracking-wider mt-2">¿Le dejás un mensajito?</h2>
                <p className="text-white/40 text-sm mt-2">Un texto corto que aparece debajo de la figurita. Es opcional.</p>
              </div>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Tu mensaje <span className="text-white/30">(opcional)</span></label>
                <textarea value={formData.message} onChange={(e) => updateField('message', e.target.value)} placeholder="¡Nos vemos en mi cumple! Traer pelota ⚽" rows={3} maxLength={100} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors resize-none" />
                <p className="text-white/20 text-xs mt-1 text-right">{formData.message.length}/100</p>
              </div>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Email <span className="text-white/30">(para guardar tu invitación)</span></label>
                <input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} placeholder="vos@email.com" className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${errors.email ? 'border-red-500/50' : 'border-white/10'} text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors`} />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
                <p className="text-white/40 text-xs mb-3 uppercase tracking-wider">Resumen</p>
                <div className="flex items-center gap-3">
                  {previewUrl && <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />}
                  <div>
                    <p className="text-white font-bold text-sm">{formData.childName || 'Tu hijo o hija'}</p>
                    <p className="text-white/40 text-xs">{formData.honoreeAge || '--'} años · {teams.find(t => t.id === formData.team)?.name || 'Argentina'}</p>
                    <p className="text-white/40 text-xs">{formData.startTime && formData.endTime ? `${formData.startTime} - ${formData.endTime}` : '--'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 6 && createdInvitation && (
            <motion.div key="step6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="space-y-6">
              <div className="text-center mb-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFD700]/20 flex items-center justify-center">
                  <Star size={28} className="text-[#FFD700]" />
                </motion.div>
                <h2 className="text-3xl font-black font-bebas tracking-wider">¡Tu figurita está lista!</h2>
                <p className="text-white/40 text-sm mt-2">Vista previa con marca de agua. Al pagar, recibís la versión HD sin marca lista para compartir.</p>
              </div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className="relative">
                  <PlayerCard event={createdInvitation} />
                  <Watermark />
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <Calendar size={16} className="text-[#FFD700]" />
                  <div><p className="text-white/40 text-[10px] uppercase tracking-wider">Fecha</p><p className="text-white text-sm">{formData.date || '--'}</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <Clock size={16} className="text-[#FFD700]" />
                  <div><p className="text-white/40 text-[10px] uppercase tracking-wider">Horario</p><p className="text-white text-sm">{formData.startTime && formData.endTime ? `${formData.startTime} - ${formData.endTime}` : '--'}</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <MapPin size={16} className="text-[#FFD700]" />
                  <div><p className="text-white/40 text-[10px] uppercase tracking-wider">Lugar</p><p className="text-white text-sm">{formData.location || formData.address || '--'}</p></div>
                </div>
              </motion.div>
              <div className="relative overflow-hidden rounded-2xl border border-[#FFD700]/25 bg-gradient-to-b from-[#0a0e27] to-[#101a3a] p-5">
                <SparkleField opacity={0.35} />
                <div className="relative">
                  <CountdownTimer date={formData.date} time={formData.startTime} compact />
                </div>
              </div>
              <div className="pt-4">
                <button onClick={() => setShowPaymentModal(true)} className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#0a0e27] font-bold text-lg tracking-wide hover:opacity-90 transition-all shadow-lg shadow-[#FFD700]/20">
                  Pagar y recibir mi invitación · ARS $10.000
                </button>
                <p className="text-center text-white/30 text-xs mt-3">
                  Una vez que pagues, envianos el comprobante por WhatsApp y te enviamos el link definitivo en minutos.
                </p>
              </div>
            </motion.div>
          )}

          {/* ============================================
              NUEVO: STEP 7 - Pantalla final WhatsApp
              ============================================ */}
          {step === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="space-y-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${paymentStatus === 'paid' ? 'bg-green-500/20' : 'bg-[#FFD700]/10'}`}
              >
                <Check size={40} className={paymentStatus === 'paid' ? 'text-green-400' : 'text-[#FFD700]'} />
              </motion.div>

              <div>
                <h2 className="text-3xl font-black font-bebas tracking-wider text-white">
                  {paymentStatus === 'paid' ? '¡Pago confirmado!' : 'Tu figurita está lista'}
                </h2>
                <p className="text-white/40 text-sm mt-3 max-w-md mx-auto">
                  {paymentStatus === 'paid'
                    ? 'Tu invitación ya está activada. Te respondemos por WhatsApp con el link definitivo.'
                    : 'Abrimos Mercado Pago en otra pestaña. El pago todavía NO fue acreditado: la invitación se activa cuando podamos verificarlo.'}
                </p>
              </div>

              <div className="space-y-4 text-left">
                <a
                  href={whatsappLinks.payment(formData.childName, createdInvitation?.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 rounded-xl bg-[#25D366] text-white font-bold text-lg tracking-wide hover:opacity-90 transition-all shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-3"
                >
                  <span className="text-2xl" aria-hidden="true">📷</span>
                  Enviar foto por WhatsApp
                </a>

                {paymentStatus !== 'paid' && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-white/70 uppercase tracking-widest">Verificación automática</p>
                      <p className="text-white/50 text-xs mt-2 leading-relaxed">
                        Cuando pagás en Mercado Pago, volvés a esta pantalla y <b className="text-white/80">verificamos solos</b> cada pocos segundos. No tenés que escribir ningún número.
                        Código de pedido: <span className="text-[#FFD700]">{createdInvitation?.slug}</span>
                      </p>
                      {paymentMessage && (
                        <p className="mt-3 text-xs text-[#FFD700]/90 leading-relaxed" role="status">{paymentMessage}</p>
                      )}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={async () => {
                            const code = createdInvitation?.slug
                            if (!code) return
                            setPaymentStatus('checking')
                            try {
                              const res = await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status', code }) })
                              const data = await res.json().catch(() => ({}))
                              if (data.status === 'paid') { setPaymentStatus('paid'); setPaymentMessage('Pago acreditado. Tu invitación quedó activada.') }
                              else { setPaymentStatus('pending'); setPaymentMessage('Todavía no figura como pagado. Si recién pagaste, esperá 1-2 minutos y tocá de nuevo. La verificación es automática.') }
                            } catch { setPaymentStatus('pending'); setPaymentMessage('No pudimos consultar el estado. Intentá de nuevo en unos segundos.') }
                          }}
                          disabled={paymentStatus === 'checking'}
                          className="flex-1 rounded-lg bg-[#FFD700] px-4 py-3 text-sm font-bold text-[#1a1a3e] disabled:opacity-50"
                        >
                          {paymentStatus === 'checking' ? 'Verificando…' : 'Ya pagué, verificar'}
                        </button>
                        <button onClick={openPayment} className="rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/5">
                          Reabrir Mercado Pago
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <button onClick={() => setShowManualVerify(v => !v)} className="text-xs text-white/50 underline underline-offset-4 hover:text-white/80">
                        {showManualVerify ? 'Ocultar verificación manual' : '¿Problemas? Verificación manual con número de operación'}
                      </button>
                      {showManualVerify && (
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input type="text" inputMode="numeric" value={paymentId} onChange={(e) => setPaymentId(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Nº de operación (solo números)" className="flex-1 rounded-lg bg-black/40 border border-white/15 px-4 py-3 text-sm text-white outline-none focus:border-[#FFD700]/60" />
                            <button onClick={verifyPayment} disabled={paymentStatus === 'checking'} className="rounded-lg bg-white/10 border border-white/20 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                              {paymentStatus === 'checking' ? 'Verificando…' : 'Verificar'}
                            </button>
                          </div>
                          <p className="text-white/30 text-[11px]">Solo si la verificación automática no funciona. El número está en el comprobante de Mercado Pago.</p>
                        </div>
                      )}
                    </div>

                    <a
                      href={whatsappLinks.paymentProof(createdInvitation?.slug, paymentId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 px-4 py-3 text-sm font-semibold text-[#25D366] hover:bg-[#25D366]/25 transition-colors"
                    >
                      💬 No tengo el número: enviar comprobante por WhatsApp
                    </a>
                  </div>
                )}

                {paymentStatus === 'paid' && createdInvitation?.slug && (
                  <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 space-y-3">
                    <p className="text-green-300 font-bold text-sm">✅ Pago acreditado</p>
                    <p className="text-green-200/70 text-xs leading-relaxed">Tu invitación ya está activa. Compartila con el link y mirá quién confirma en tu panel.</p>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => navigate(`/invitacion/${createdInvitation.slug}`)} className="w-full rounded-lg bg-[#FFD700] px-4 py-3 text-sm font-bold text-[#1a1a3e]">Ver mi invitación</button>
                      <button onClick={() => navigate(`/panel/${createdInvitation.slug}`)} className="w-full rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5">Ver panel de asistentes</button>
                      <button onClick={() => { const url = `${window.location.origin}/invitacion/${createdInvitation.slug}`; navigator.clipboard.writeText(url); alert('Link copiado: ' + url) }} className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm font-semibold text-white/80">Copiar link para compartir</button>
                    </div>
                  </div>
                )}

                {createdInvitation?.slug && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3 text-left">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Panel del organizador · acceso privado</p>
                      <p className="mt-2 text-white/40 text-xs leading-relaxed">
                        Con este código entrás a ver <b className="text-white/80">asistentes</b>, <b className="text-white/80">no asistentes</b> y total de personas.
                        Guardalo, es solo tuyo:
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-black/40 px-4 py-3">
                      <span className="font-mono text-sm tracking-widest text-[#FFD700]">
                        {panelKey || localStorage.getItem(`invitafigus_panel_${createdInvitation.slug}`) || '· · ·'}
                      </span>
                      <button
                        onClick={() => {
                          const k = panelKey || localStorage.getItem(`invitafigus_panel_${createdInvitation.slug}`)
                          if (k) { navigator.clipboard.writeText(k); alert('Clave copiada') }
                        }}
                        className="text-[11px] font-semibold text-white/60 underline underline-offset-4 hover:text-white"
                      >
                        Copiar clave
                      </button>
                    </div>
                    <button onClick={() => navigate(`/panel/${createdInvitation.slug}`)} className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                      Abrir panel del organizador
                    </button>
                    <p className="text-white/25 text-[11px]">
                      Link del panel: /panel/{createdInvitation.slug}
                    </p>
                  </div>
                )}

                <div className={`rounded-xl border p-4 text-xs leading-relaxed ${
                  saveStatus === 'saved' ? 'border-green-500/25 bg-green-500/[0.07] text-green-200/80'
                  : saveStatus === 'saving' ? 'border-white/10 bg-white/[0.03] text-white/50'
                  : 'border-[#FFD700]/25 bg-[#FFD700]/[0.06] text-[#FFD700]/85'
                }`}>
                  {saveStatus === 'saved' && '✅ Pedido guardado en tu nombre. El operador ya lo ve en la planilla con estado PENDIENTE.'}
                  {saveStatus === 'saving' && 'Guardando tu pedido…'}
                  {saveStatus === 'pending' && '⚠ No pudimos guardarlo automáticamente. Mandá la foto por WhatsApp con tu código de pedido y lo cargamos a mano en segundos.'}
                  {saveStatus === 'idle' && 'Tu pedido se guarda al tocar “Pagar y activar ahora”.'}
                </div>

                <p className="text-white/30 text-xs text-center">
                  Te respondemos en minutos con el link definitivo de tu invitación.
                </p>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-3">
                <p className="text-white/40 text-xs">¿Ya enviaste la foto?</p>
                <div className="flex flex-col gap-2">
                  {createdInvitation?.slug && <button onClick={() => navigate(`/invitacion/${createdInvitation.slug}`)} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white hover:bg-white/10">Ver mi invitación</button>}
                  {createdInvitation?.slug && <button onClick={() => navigate(`/panel/${createdInvitation.slug}`)} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white hover:bg-white/10">Ver panel de asistentes</button>}
                  <button onClick={() => navigate('/')} className="w-full py-3 text-white/40 text-sm hover:text-white/70">Volver al inicio</button>
                </div>
              </div>

              <AlmaCrossSellCard />
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/95 backdrop-blur-xl">
            <div className="text-center">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-6">
                <div className="w-24 h-32 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/30 mx-auto flex items-center justify-center relative overflow-hidden">
                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}><Star size={32} className="text-[#FFD700]" /></motion.div>
                  <motion.div className="absolute inset-0 bg-gradient-to-t from-[#FFD700]/20 to-transparent" animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: 2, repeat: Infinity }} />
                </div>
              </motion.div>
              <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-2xl font-black font-bebas text-[#FFD700] mb-2">Creando la figurita...</motion.h3>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-white/40 text-sm">Buscando la mejor pose...</motion.p>
              <div className="w-48 h-1 bg-white/10 rounded-full mx-auto mt-6 overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500]" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2.5, ease: "easeInOut" }} />
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showPaymentModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.85, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }} className="relative z-10 w-full max-w-sm">
                <div className="bg-[#1a1f3a] rounded-2xl border border-[#FFD700]/30 overflow-hidden shadow-2xl shadow-[#FFD700]/10">
                  <div className="relative px-6 pt-8 pb-6 text-center">
                    <div className="absolute inset-0 bg-[#FFD700]/5" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#FFD700]/20 rounded-full blur-3xl" />
                    <div className="relative">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }} className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFD700]/20 flex items-center justify-center border-2 border-[#FFD700]/50"><span className="text-2xl">✨</span></motion.div>
                      <h2 className="text-xl font-bold text-white mb-2">¡Activá tu invitación!</h2>
                      <p className="text-sm text-gray-300">{formData.childName} ya tiene su figurita lista.</p>
                    </div>
                  </div>
                  <div className="px-6 pb-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 text-center">Para activarla definitivamente y recibir:</p>
                    <div className="space-y-2.5">
                      {[{ icon: "🔗", text: "Link permanente" }, { icon: "📱", text: "Confirmaciones por WhatsApp" }, { icon: "🎨", text: "Diseño premium" }, { icon: "🛟", text: "Soporte" }, { icon: "🚀", text: "Invitación lista para compartir" }].map((benefit, index) => (
                        <motion.div key={index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + index * 0.1 }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0a0e27]/60">
                          <span className="text-sm">{benefit.icon}</span><span className="text-sm text-gray-200">{benefit.text}</span><span className="ml-auto text-[#00D4FF]">✓</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div className="px-6 py-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Activala por:</p>
                    <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }} className="text-3xl font-black text-[#FFD700]">ARS $10.000</motion.p>
                    <p className="text-xs text-gray-500 mt-1">Activación única · Sin suscripción</p>
                  </div>
                  <div className="px-6 pb-6 space-y-3">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={openPayment} className="w-full py-3.5 bg-[#FFD700] text-[#0a0e27] font-bold text-base rounded-xl hover:bg-[#e6c200] transition-colors shadow-lg shadow-[#FFD700]/20">Pagar y activar ahora</motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowPaymentModal(false)} className="w-full py-3 bg-transparent text-gray-400 font-medium text-sm rounded-xl border border-gray-700 hover:border-gray-500 hover:text-gray-300 transition-colors">Ver más tarde</motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {step <= 5 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent">
            <div className="max-w-lg mx-auto flex gap-3">
              {step > 1 && <button onClick={handleBack} className="px-6 py-4 rounded-full border border-white/20 text-white font-semibold hover:bg-white/5 transition-all">Atrás</button>}
              <button onClick={handleNext} className="flex-1 py-4 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1a1a3e] font-bold text-lg tracking-wide hover:opacity-90 transition-all shadow-lg shadow-[#FFD700]/20">{step === totalSteps ? 'Ver mi figurita →' : 'Continuar →'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}