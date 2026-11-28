import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { fetchAllInvitations, activateInvitationRemote, deleteInvitationRemote, updateInvitationField } from '../services/googleSheetsApi'
import { whatsappLinks } from '../config/whatsapp'
import TeamManager from '../components/admin/TeamManager'
import PaymentAudit from '../components/admin/PaymentAudit'


// Una foto sirve solo si es una IMAGEN real. Las carpetas de Drive
// (drive.google.com/drive/folders/...) no se pueden mostrar.
const isRealPhoto = (url) => {
  const value = String(url || '').trim()
  if (!value) return false
  if (/\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(value)) return true
  if (/drive\.google\.com\/.*[?&]id=/.test(value)) return true
  if (/lh3\.googleusercontent\.com/.test(value)) return true
  if (value.startsWith('data:image/')) return true
  return false
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { shareWhatsApp } = useApp()
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [error, setError] = useState('')
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingSlug, setEditingSlug] = useState(null)
  const [editingRowIndex, setEditingRowIndex] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [rsvpCounts, setRsvpCounts] = useState({})
  const [config, setConfig] = useState(null)
  const [tab, setTab] = useState('pedidos')
  const [backupMsg, setBackupMsg] = useState('')
  const [showSheetGuide, setShowSheetGuide] = useState(false)

  // Diagnóstico: si falta alguna variable en Vercel lo avisamos antes de entrar.
  useEffect(() => {
    fetch('/api/admin-login')
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => setConfig({ ready: false, missing: ['conexión con el servidor'] }))
  }, [])

  useEffect(() => {
    if (!invitations.length) return
    let active = true
    Promise.all(invitations.map(async (inv) => {
      try {
        const response = await fetch(`/api/rsvp?slug=${encodeURIComponent(inv.slug)}`)
        const data = await response.json()
        return [inv.slug, data.ok ? data.count : null]
      } catch {
        return [inv.slug, null]
      }
    })).then((entries) => { if (active) setRsvpCounts(Object.fromEntries(entries)) })
    return () => { active = false }
  }, [invitations])

  const loadInvitations = async () => {
    setLoading(true)
    try {
      const data = await fetchAllInvitations()
      const rawList = Array.isArray(data) ? data : (Array.isArray(data?.rows) ? data.rows : [])
      // La planilla de respuestas del formulario trae los datos "crudos":
      // acá los ordenamos y calculamos el slug para cada pedido.
      const slugify = (value) => String(value || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const list = rawList.map((inv) => {
        const nombre = inv.nombre || ''
        const edad = String(inv.edad || '').replace(/\D/g, '')
        const equipo = inv.equipo || ''
        return {
          ...inv,
          nombre,
          edad,
          equipo,
          slug: inv.slug || [slugify(nombre), slugify(edad), slugify(equipo)].filter(Boolean).join('-'),
          estado: String(inv.estado || 'PENDIENTE').toUpperCase(),
          foto_url: inv.foto_url || '',
          views: Number(inv.views) || 0,
        }
      })
      setInvitations(list)
      if (!Array.isArray(data) && data?.warning === 'MISSING_APPS_SCRIPT_URL') {
        setError('Entraste bien ✅ pero falta conectar la planilla (APPS_SCRIPT_URL). Mientras tanto la lista aparece vacía.')
      } else {
        setError('')
      }
    } catch (err) {
      setError('Error al cargar invitaciones: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      loadInvitations()
    }
  }, [isLoggedIn])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo ingresar')
      setIsLoggedIn(true)
      setPassword('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin-logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
    setIsLoggedIn(false)
    setInvitations([])
  }

  const handleActivate = async (rowIndex) => {
    try {
      await activateInvitationRemote(rowIndex)
      await new Promise(resolve => setTimeout(resolve, 2000))
      await loadInvitations()
    } catch (err) {
      setError('Error al activar: ' + err.message)
    }
  }

   const handleDelete = async (rowIndex) => {
    if (!window.confirm('¿Eliminar esta invitación?')) return
    try {
      await deleteInvitationRemote(rowIndex)
      await new Promise(resolve => setTimeout(resolve, 2000))
      await loadInvitations()
    } catch (err) {
      setError('Error al eliminar: ' + err.message)
    }
  }

  const handleEdit = (inv) => {
    setEditingSlug(inv.slug)
    setEditingRowIndex(inv.rowIndex)
    setEditForm({
  fecha: inv.fecha || '',
  hora: inv.hora || '',
  lugar: inv.lugar || '',
  mensaje: inv.mensaje || '',
  equipo: inv.equipo || '',
  estado: inv.estado || 'PENDIENTE',
  foto_url: inv.foto_url || '',
  apellido: inv.apellido || '',
})
  }

  const handleSaveEdit = async () => {
    try {
      for (const [field, value] of Object.entries(editForm)) {
        await updateInvitationField(editingRowIndex, field, value)
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
      setEditingSlug(null)
      setEditingRowIndex(null)
      await loadInvitations()
    } catch (err) {
      setError('Error al guardar: ' + err.message)
    }
  }

  // Respaldo local: descarga un archivo con todas las invitaciones.
  // Sirve como red de seguridad si la planilla no está conectada.
  const exportBackup = () => {
    try {
      const data = JSON.parse(localStorage.getItem('invitafigus_data') || '{"invitations":[]}')
      const payload = {
        exportado: new Date().toISOString(),
        invitaciones: data.invitations || [],
        pedidos: invitations,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invitafigus-respaldo-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setBackupMsg('✅ Respaldo descargado en tu carpeta de Descargas.')
    } catch {
      setBackupMsg('⚠ No se pudo generar el respaldo.')
    }
  }

  const importBackup = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const list = parsed.invitaciones || parsed.invitations || (Array.isArray(parsed) ? parsed : [])
      if (!Array.isArray(list) || !list.length) throw new Error('El archivo no tiene invitaciones')
      const current = JSON.parse(localStorage.getItem('invitafigus_data') || '{"invitations":[]}')
      const byslug = new Map([...(current.invitations || []), ...list].map((inv) => [inv.slug, inv]))
      localStorage.setItem('invitafigus_data', JSON.stringify({ ...current, invitations: [...byslug.values()] }))
      setBackupMsg(`✅ Se cargaron ${list.length} invitaciones desde el respaldo.`)
      await loadInvitations()
    } catch (err) {
      setBackupMsg('⚠ Archivo inválido: ' + err.message)
    }
    event.target.value = ''
  }

  const copyLink = (slug) => {
    const url = `${window.location.origin}/invitacion/${slug}`
    navigator.clipboard.writeText(url)
    alert('Link copiado: ' + url)
  }

  const openWhatsApp = (inv) => {
    const url = `${window.location.origin}/invitacion/${inv.slug}`
    window.open(whatsappLinks.delivery(inv, url), '_blank')
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black font-bebas text-[#FFD700] tracking-wider">INVITAFIGUS</h1>
            <p className="text-white/40 text-sm mt-2">Panel de Administración</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[#FFD700]/50 focus:outline-none transition-colors"
            />
            {config && config.ready === false && config.missing?.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
                <p className="text-amber-300 text-[11px] font-bold uppercase tracking-widest">Falta configurar en Vercel</p>
                <ul className="mt-2 space-y-1">
                  {config.missing.map((item) => (
                    <li key={item} className="text-amber-100/80 text-xs font-mono">· {item}</li>
                  ))}
                </ul>
                <p className="mt-2 text-amber-100/50 text-[11px] leading-relaxed">
                  Vercel → proyecto web → Settings → Environment Variables. Después tocá Redeploy.
                </p>
              </div>
            )}
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#FFD700] text-[#0a0e27] font-bold hover:bg-[#e6c200] transition-colors"
            >
              Ingresar
            </button>
          </form>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 mt-4 text-white/40 text-sm hover:text-white/60 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black font-bebas text-[#FFD700] tracking-wider">PANEL ADMIN</h1>
            <p className="text-white/40 text-sm">CRM - Gestión de invitaciones</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadInvitations}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors"
            >
              🔄 Actualizar
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors"
            >
              Volver al inicio
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/20 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        {error && tab === 'pedidos' && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Pestañas */}
        <div className="mb-5 flex gap-2">
          <button
            onClick={() => setTab('pedidos')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === 'pedidos' ? 'bg-[#FFD700] text-[#0a0e27]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
          >
            Pedidos
          </button>
          <button
            onClick={() => setTab('equipos')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === 'equipos' ? 'bg-[#FFD700] text-[#0a0e27]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
          >
            Equipos y escudos
          </button>
          <button
            onClick={() => setTab('pagos')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === 'pagos' ? 'bg-[#FFD700] text-[#0a0e27]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
          >
            Pagos y origen
          </button>
        </div>

        {tab === 'equipos' && <TeamManager />}
        {tab === 'pagos' && <PaymentAudit />}

        {/* Planilla no conectada: guía paso a paso para crearla en 5 minutos */}
        {tab === 'pedidos' && config?.missing?.includes('APPS_SCRIPT_URL') && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-amber-300 text-sm font-bold">La planilla todavía no está conectada</p>
                <p className="text-amber-100/60 text-xs mt-1">
                  El panel funciona, pero la lista de pedidos aparece vacía hasta conectar Google Sheets.
                </p>
              </div>
              <button
                onClick={() => setShowSheetGuide((v) => !v)}
                className="rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/10"
              >
                {showSheetGuide ? 'Ocultar guía' : 'Cómo conectarla'}
              </button>
            </div>

            {showSheetGuide && (
              <div className="mt-4 space-y-2 text-xs text-amber-50/80 leading-relaxed">
                <p><b>1.</b> Abrí una planilla nueva en <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="underline text-amber-200">sheets.new</a> y ponele de nombre <i>InvitaFigus pedidos</i>.</p>
                <p><b>2.</b> En la primera fila escribí estas columnas, una por celda: <span className="font-mono">slug · nombre · apellido · apodo · edad · equipo · fecha · hora · lugar · telefono · email · mensaje · vestimenta · estado · foto_url</span></p>
                <p><b>3.</b> Menú <b>Extensiones → Apps Script</b>. Borrá todo y pegá el código que te pasé en la guía.</p>
                <p><b>4.</b> <b>Implementar → Nueva implementación → Aplicación web</b>; en “Quién tiene acceso” elegí <b>Cualquier persona</b>. Copiá la URL que termina en <span className="font-mono">/exec</span>.</p>
                <p><b>5.</b> Vercel → Settings → Environment Variables → <span className="font-mono">APPS_SCRIPT_URL</span> = esa URL → <b>Redeploy</b>.</p>
              </div>
            )}
          </div>
        )}

        {/* Respaldo: siempre disponible, no depende de la planilla */}
        <div className={`mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 ${tab === 'pedidos' ? '' : 'hidden'}`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-white/80 text-sm font-bold">Respaldo de pedidos</p>
              <p className="text-white/35 text-xs mt-1">Descargá una copia de todo lo que hay guardado en este navegador.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportBackup} className="rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20">
                ⬇ Descargar respaldo
              </button>
              <label className="cursor-pointer rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10">
                ⬆ Restaurar
                <input type="file" accept="application/json" onChange={importBackup} className="hidden" />
              </label>
            </div>
          </div>
          {backupMsg && <p className="mt-3 text-xs text-[#FFD700]/85">{backupMsg}</p>}
        </div>

        {tab === 'pedidos' && (loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/40">Cargando invitaciones...</p>
          </div>
        ) : invitations.length === 0 ? (
          <p className="text-white/40 text-center py-12">No hay invitaciones en Google Sheets</p>
        ) : (
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.slug}
                className={`rounded-xl p-4 border ${
                  inv.estado === 'ACTIVA'
                    ? 'border-green-500/30 bg-green-500/5'
                    : inv.estado === 'ELIMINADA'
                    ? 'border-red-500/30 bg-red-500/5 opacity-50'
                    : 'border-[#FFD700]/30 bg-[#FFD700]/5'
                }`}
              >
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-[200px]">
                    {isRealPhoto(inv.foto_url) ? (
                      <img
                        src={inv.foto_url}
                        alt={inv.nombre}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-xl">
                        ⚽
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-white">
                        {inv.nombre} {inv.apellido ? ' ' + inv.apellido : ''}
                        {inv.apodo && ` "${inv.apodo}"`}
                      </p>
                      <p className="text-white/40 text-sm">
                        {inv.edad} años · {inv.equipo} · {inv.fecha}
                      </p>
                      <p className="text-white/40 text-xs mt-1">
                        📍 {inv.lugar || 'Sin lugar'} · 🕐 {inv.hora || 'Sin hora'}
                      </p>
                      <p className="mt-1 text-xs text-emerald-300/80">
                        ✅ {rsvpCounts[inv.slug]?.confirmed || 0} confirmaciones guardadas
                        {rsvpCounts[inv.slug]?.guests ? ` · ${rsvpCounts[inv.slug].guests} acompañantes` : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            inv.estado === 'ACTIVA'
                              ? 'bg-green-500/20 text-green-400'
                              : inv.estado === 'ELIMINADA'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-[#FFD700]/20 text-[#FFD700]'
                          }`}
                        >
                          {inv.estado || 'PENDIENTE'}
                        </span>
                        <span className="text-[10px] text-white/30">
                          👁 {inv.views || 0} vistas
                        </span>
                        {inv.telefono && (
                          <span className="text-[10px] text-white/30">
                            📱 {inv.telefono}
                          </span>
                        )}
                        {inv.email && (
                          <span className="text-[10px] text-white/30">
                            ✉️ {inv.email}
                          </span>
                        )}
                        {!isRealPhoto(inv.foto_url) && (
                          <span className="text-[10px] text-orange-400">
                            📷 Foto pendiente
                          </span>
                        )}
                        {isRealPhoto(inv.foto_url) && (
                          <span className="text-[10px] text-green-400">
                            📷 Foto cargada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {inv.estado !== 'ACTIVA' && inv.estado !== 'ELIMINADA' && (
                      <button
                        onClick={() => handleActivate(inv.rowIndex)}
                        className="px-3 py-1.5 rounded-lg bg-[#FFD700] text-[#0a0e27] font-bold text-xs hover:bg-[#e6c200] transition-colors"
                      >
                        Activar
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(inv)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs hover:bg-white/10 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        const url = window.prompt('Pegá el link DIRECTO de la imagen (debe ser una FOTO, no una carpeta).\nEjemplo: https://drive.google.com/uc?export=view&id=1AbC...')
                        if (!url) return
                        updateInvitationField(inv.rowIndex, 'foto_url', url.trim())
                          .then(() => loadInvitations())
                          .catch((err) => setError('No se pudo guardar la foto: ' + err.message))
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#FFD700]/15 border border-[#FFD700]/40 text-[#FFD700] text-xs hover:bg-[#FFD700]/25 transition-colors"
                    >
                      📷 Foto
                    </button>
                    <button
                      onClick={() => copyLink(inv.slug)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs hover:bg-white/10 transition-colors"
                    >
                      Copiar link
                    </button>
                    {inv.telefono && (
                      <button
                        onClick={() => openWhatsApp(inv)}
                        className="px-3 py-1.5 rounded-lg bg-[#22c55e]/20 border border-[#22c55e]/30 text-[#22c55e] text-xs hover:bg-[#22c55e]/30 transition-colors"
                      >
                        WhatsApp
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(inv.rowIndex)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Modal de edición */}
        {editingSlug && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1f3a] rounded-2xl border border-white/10 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-[#FFD700] mb-4">Editar invitación</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-white/60 text-xs mb-1 block">Fecha</label>
                  <input
                    type="date"
                    value={editForm.fecha}
                    onChange={(e) => setEditForm({...editForm, fecha: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1 block">Hora</label>
                  <input
                    type="text"
                    value={editForm.hora}
                    onChange={(e) => setEditForm({...editForm, hora: e.target.value})}
                    placeholder="15:00 - 19:00"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1 block">Lugar</label>
                  <input
                    type="text"
                    value={editForm.lugar}
                    onChange={(e) => setEditForm({...editForm, lugar: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1 block">Mensaje</label>
                  <textarea
                    value={editForm.mensaje}
                    onChange={(e) => setEditForm({...editForm, mensaje: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1 block">Equipo</label>
                  <input
                    type="text"
                    value={editForm.equipo}
                    onChange={(e) => setEditForm({...editForm, equipo: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1 block">Estado</label>
                  <select
                    value={editForm.estado}
                    onChange={(e) => setEditForm({...editForm, estado: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                  >
                    <option value="BORRADOR">BORRADOR</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="ACTIVA">ACTIVA</option>
                    <option value="PAUSADA">PAUSADA</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1 block">URL de la foto (Drive)</label>
                  <input
                    type="text"
                    value={editForm.foto_url || ''}
                    onChange={(e) => setEditForm({...editForm, foto_url: e.target.value})}
                    placeholder="https://drive.google.com/uc?export=view&id=1AbC..."
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2.5 rounded-lg bg-[#FFD700] text-[#0a0e27] font-bold text-sm hover:bg-[#e6c200] transition-colors"
                >
                  Guardar cambios
                </button>
                <button
                  onClick={() => {
                    setEditingSlug(null)
                    setEditingRowIndex(null)
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}