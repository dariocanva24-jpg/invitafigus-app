import { useEffect, useState } from 'react'
import { Shield, Trash2, Upload, Check, AlertCircle } from 'lucide-react'
import { useAllTeams, invalidateDynamicTeams, escudoToSrc } from '../../services/dynamicTeams'

const vacio = { nombre: '', sigla: '', colorPrimario: '#0a0e27', colorSecundario: '#FFD700', escudo: '', esLink: false }

export default function TeamManager() {
  const [form, setForm] = useState(vacio)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [reload, setReload] = useState(0)
  const allTeams = useAllTeams()

  useEffect(() => { invalidateDynamicTeams() }, [reload])

  const propios = allTeams.filter((team) => team.custom)

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const leerArchivo = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    if (file.size > 400 * 1024) {
      setError('El archivo es muy pesado (máx. 400 KB). Pedí el SVG sin la imagen adentro.')
      return
    }
    const text = await file.text()
    if (!text.includes('<svg')) {
      setError('Ese archivo no es un SVG. Abrí el archivo y verificá que empiece con <svg.')
      return
    }
    set('escudo', text)
    set('esLink', false)
    if (!form.nombre) set('nombre', file.name.replace(/\.svg$/i, '').replace(/[-_]/g, ' '))
    setMsg('✅ SVG cargado. Revisá la vista previa y guardá.')
  }

  const guardar = async (e) => {
    e.preventDefault()
    setError(''); setMsg('')
    if (!form.nombre.trim()) { setError('Poné el nombre del equipo.'); return }
    if (!form.escudo.trim()) { setError('Cargá un SVG o pegá el link del escudo.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...form }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = String(data.error || '')
        if (/no v[aá]lid/i.test(msg)) {
          throw new Error('La planilla todavía tiene el código viejo. Actualizá PLANILLA-CODIGO en Apps Script y creá una NUEVA VERSIÓN.')
        }
        throw new Error(msg || 'No se pudo guardar')
      }
      setMsg(`✅ "${form.nombre}" guardado. Ya aparece al crear invitaciones.`)
      setForm(vacio)
      setReload((n) => n + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const borrar = async (id) => {
    if (!window.confirm('¿Quitar este equipo de la lista?')) return
    try {
      await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', id }),
      })
      setReload((n) => n + 1)
      setMsg('Equipo quitado de la lista.')
    } catch (err) {
      setError(err.message)
    }
  }

  const preview = escudoToSrc(form.escudo)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="flex items-center gap-2 text-lg font-black font-bebas tracking-wider text-white">
          <Shield size={20} className="text-[#FFD700]" /> Equipos y escudos
        </h2>
        <p className="mt-1 text-xs text-white/40">
          Agregá cualquier club con su escudo. Los que cargues acá aparecen solos en el paso “Elegí el equipo”.
        </p>

        <form onSubmit={guardar} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/50">Nombre del equipo *</label>
            <input
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Club Atlético Liniers"
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD700]/60"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/50">Sigla (opcional)</label>
            <input
              value={form.sigla}
              onChange={(e) => set('sigla', e.target.value.toUpperCase().slice(0, 4))}
              placeholder="CAL"
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD700]/60"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/50">Color principal</label>
            <input type="color" value={form.colorPrimario} onChange={(e) => set('colorPrimario', e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-white/15 bg-black/40" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/50">Color secundario</label>
            <input type="color" value={form.colorSecundario} onChange={(e) => set('colorSecundario', e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-white/15 bg-black/40" />
          </div>

          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#FFD700]/15 border border-[#FFD700]/40 px-3 py-2 text-xs font-semibold text-[#FFD700] hover:bg-[#FFD700]/25">
                <Upload size={14} /> Subir archivo .svg
                <input type="file" accept=".svg,image/svg+xml" onChange={leerArchivo} className="hidden" />
              </label>
              <span className="text-[11px] text-white/30">o pegá el código SVG o un link abajo</span>
            </div>
            <textarea
              value={form.escudo}
              onChange={(e) => { set('escudo', e.target.value); set('esLink', e.target.value.trim().startsWith('http')) }}
              rows={4}
              placeholder={'Pegá acá el código SVG (<svg ...>) o un link que termine en .svg / .png'}
              className="mt-2 w-full resize-y rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-[11px] text-white outline-none focus:border-[#FFD700]/60"
            />
          </div>

          {preview && (
            <div className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 p-3">
              <img src={preview} alt="Vista previa" className="h-16 w-16 object-contain" />
              <div>
                <p className="text-xs font-semibold text-white/80">Vista previa</p>
                <p className="text-[11px] text-white/35">Así se va a ver el escudo en la figurita.</p>
              </div>
            </div>
          )}

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-[#FFD700] px-5 py-2.5 text-sm font-bold text-[#0a0e27] disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar equipo'}
            </button>
            {msg && <span className="inline-flex items-center gap-1 text-xs text-green-400"><Check size={14} /> {msg}</span>}
            {error && <span className="inline-flex items-center gap-1 text-xs text-red-400"><AlertCircle size={14} /> {error}</span>}
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-white/80">Tus equipos cargados</p>
          <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-white/50">{propios.length}</span>
        </div>
        {propios.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-white/15 px-4 py-6 text-center text-xs text-white/30">
            Todavía no cargaste ninguno. Los 29 equipos de fábrica siguen funcionando igual.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {propios.map((team) => (
              <li key={team.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                <img src={team.shield} alt={team.name} className="h-9 w-9 object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{team.name}</p>
                  <p className="text-[11px] text-white/35">{team.shortName || '—'}</p>
                </div>
                <button onClick={() => borrar(team.id)} className="rounded-md border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10" aria-label="Quitar equipo">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
